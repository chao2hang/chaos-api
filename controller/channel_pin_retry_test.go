package controller

import (
	"errors"
	"fmt"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestShouldRetryHonorsPinRetryMode(t *testing.T) {
	openaiErr := types.NewOpenAIError(errors.New("upstream"), types.ErrorCodeBadResponseStatusCode, http.StatusInternalServerError)

	c := newPinRetryContext()
	assert.True(t, service.ShouldRetryRelayError(c, openaiErr, 1))

	origin := newPinRetryContext()
	service.GetChannelConstraints(origin).AddPin(dto.ChannelPin{
		ChannelId: 2,
		Source:    dto.PinSourceOriginTask,
		Rank:      dto.PinRankOriginTask,
		RetryMode: dto.PinRetrySameChannel,
	})
	assert.True(t, service.ShouldRetryRelayError(origin, openaiErr, 1), "origin pin retries on the same channel")

	token := newPinRetryContext()
	service.GetChannelConstraints(token).AddPin(dto.ChannelPin{
		ChannelId: 1,
		Source:    dto.PinSourceToken,
		Rank:      dto.PinRankToken,
		RetryMode: dto.PinRetrySingleAttempt,
	})
	assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "pinned_channel", Source: "channel_constraint"}, service.DecideRelayRetry(token, openaiErr, 1), "token pin suppresses retry")
}

func TestShouldRetryTaskRelayHonorsPinRetryMode(t *testing.T) {
	taskErr := &dto.TaskError{StatusCode: http.StatusInternalServerError}

	c := newPinRetryContext()
	assert.Equal(t, "retry", decideTaskRetry(c, taskErr, 1).Action)

	origin := newPinRetryContext()
	service.GetChannelConstraints(origin).AddPin(dto.ChannelPin{
		ChannelId: 2,
		Source:    dto.PinSourceOriginTask,
		Rank:      dto.PinRankOriginTask,
		RetryMode: dto.PinRetrySameChannel,
	})
	assert.Equal(t, "retry", decideTaskRetry(origin, taskErr, 1).Action)

	token := newPinRetryContext()
	service.GetChannelConstraints(token).AddPin(dto.ChannelPin{
		ChannelId: 1,
		Source:    dto.PinSourceToken,
		Rank:      dto.PinRankToken,
		RetryMode: dto.PinRetrySingleAttempt,
	})
	assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "pinned_channel", Source: "channel_constraint"}, decideTaskRetry(token, taskErr, 1))
}

func TestSameChannelPinsMergeToStricterRetryMode(t *testing.T) {
	c := newPinRetryContext()
	constraints := service.GetChannelConstraints(c)
	constraints.AddPin(dto.ChannelPin{
		ChannelId: 7,
		Source:    dto.PinSourceOriginTask,
		Rank:      dto.PinRankOriginTask,
		RetryMode: dto.PinRetrySameChannel,
	})
	constraints.AddPin(dto.ChannelPin{
		ChannelId: 7,
		Source:    dto.PinSourceToken,
		Rank:      dto.PinRankToken,
		RetryMode: dto.PinRetrySingleAttempt,
	})
	pin, found, overridden := constraints.ResolvedPin()
	require.True(t, found)
	assert.Equal(t, 7, pin.ChannelId)
	assert.Equal(t, dto.PinRetrySingleAttempt, pin.RetryMode)
	assert.Empty(t, overridden)
	assert.False(t, service.ShouldRetryRelayError(c, types.NewOpenAIError(errors.New("upstream"), types.ErrorCodeBadResponseStatusCode, http.StatusInternalServerError), 1))
}

func newPinRetryContext() *gin.Context {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	return c
}

func TestRequestPolicyConfigReturnsSettingsWithoutMigration(t *testing.T) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	GetRequestPolicy(ctx)
	assert.Equal(t, http.StatusOK, recorder.Code)
	var response struct {
		Success bool           `json:"success"`
		Data    map[string]any `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	assert.True(t, response.Success)
	assert.Contains(t, response.Data, "options")
	assert.NotContains(t, response.Data, "migration")
	assert.NotContains(t, response.Data, "differences")
}

func TestChannelAffinityRetryPriorities(t *testing.T) {
	for _, dialect := range []struct{ kind, env string }{{"sqlite", ""}, {"mysql", "TEST_MYSQL_DSN"}, {"postgres", "TEST_POSTGRES_DSN"}} {
		t.Run(dialect.kind, func(t *testing.T) {
			dsn := ""
			if dialect.env != "" {
				dsn = os.Getenv(dialect.env)
				if dsn == "" {
					t.Skipf("%s not configured", dialect.env)
				}
			}
			db := modelManagementDB(t, dialect.kind, dsn)
			previousRetryTimes := common.RetryTimes
			previousGroups := setting.UserUsableGroups2JSONString()
			previousMaxGroups := setting.GetMaxTokenAutoGroups()
			affinity := operation_setting.GetChannelAffinitySetting()
			previousAffinity := *affinity
			t.Cleanup(func() {
				common.RetryTimes = previousRetryTimes
				*affinity = previousAffinity
				require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
				require.NoError(t, setting.UpdateMaxTokenAutoGroups(fmt.Sprint(previousMaxGroups)))
			})
			require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP","empty":"Empty"}`))
			require.NoError(t, setting.UpdateMaxTokenAutoGroups("2"))
			require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1,"vip":1,"empty":1}`))
			const modelName = "affinity-retry-test"
			for _, spec := range []struct {
				id       int
				priority int64
				group    string
			}{{24, 4, "default"}, {27, 3, "default"}, {30, 2, "default"}, {34, 4, "vip"}, {37, 3, "vip"}} {
				channel := model.Channel{
					Id: spec.id, Name: fmt.Sprintf("channel-%d", spec.id), Type: constant.ChannelTypeOpenAI,
					Key: "test-only", Status: common.ChannelStatusEnabled, Models: modelName, Group: spec.group,
					Priority: common.GetPointer(spec.priority), Weight: common.GetPointer(uint(1)),
				}
				require.NoError(t, db.Create(&channel).Error)
				require.NoError(t, channel.AddAbilities(db))
			}
			for _, cached := range []bool{false, true} {
				common.MemoryCacheEnabled = cached
				model.InitChannelCache()
				for _, tc := range []struct {
					name, mode string
					binding    int
					retries    int
					autoGroups []string
					crossGroup bool
					want       []int
				}{
					{name: "ordinary routing", mode: "off", retries: 2, want: []int{24, 27, 30}},
					{name: "affinity miss", mode: "prefer", retries: 2, want: []int{24, 27, 30}},
					{name: "affinity hit", mode: "prefer", binding: 27, retries: 2, want: []int{27, 24, 27}},
					{name: "no retry budget", mode: "prefer", binding: 27, want: []int{27}},
					{name: "one retry", mode: "prefer", binding: 27, retries: 1, want: []int{27, 24}},
					{name: "strict session", mode: "strict", binding: 27, retries: 2, want: []int{27}},
					{name: "auto group", mode: "prefer", binding: 27, retries: 1, autoGroups: []string{"default", "vip"}, want: []int{27, 24}},
					{name: "cross group", mode: "prefer", binding: 27, retries: 1, autoGroups: []string{"default", "vip"}, crossGroup: true, want: []int{27, 24, 34, 37}},
					{name: "skip empty group", mode: "prefer", binding: 27, retries: 1, autoGroups: []string{"empty", "default"}, want: []int{27, 24, 27}},
				} {
					t.Run(fmt.Sprintf("cache=%t/%s", cached, tc.name), func(t *testing.T) {
						common.RetryTimes = tc.retries
						*affinity = operation_setting.ChannelAffinitySetting{
							Enabled: true, DefaultTTLSeconds: 60, MaxEntries: 100,
							Rules: []operation_setting.ChannelAffinityRule{{
								Name: t.Name(), ModelRegex: []string{"^" + modelName + "$"}, SessionMode: tc.mode,
								KeySources: []operation_setting.ChannelAffinityKeySource{{Type: "request_header", Key: "X-Session"}},
							}},
						}
						ctx := newPinRetryContext()
						ctx.Request.Header.Set("X-Session", t.Name())
						group := "default"
						common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
						if tc.autoGroups != nil {
							group = "auto"
							common.SetContextKey(ctx, constant.ContextKeyTokenAutoGroups, tc.autoGroups)
							common.SetContextKey(ctx, constant.ContextKeyTokenCrossGroupRetry, tc.crossGroup)
						}
						if tc.binding != 0 {
							_, found := service.GetPreferredChannelByAffinity(ctx, modelName, group)
							require.False(t, found)
							service.RecordChannelAffinity(ctx, tc.binding)
							t.Cleanup(func() { service.ClearCurrentChannelAffinityCache(ctx) })
						}
						// HTTP distribution and the relay loop use separate RetryParam values.
						channel, _, selectionErr := service.SelectChannelForRequest(ctx, modelName, &service.RetryParam{Ctx: ctx, TokenGroup: group, ModelName: modelName})
						require.Nil(t, selectionErr)
						require.NotNil(t, channel)
						retry := &service.RetryParam{Ctx: ctx, TokenGroup: group, ModelName: modelName}
						upstreamErr := types.NewOpenAIError(errors.New("upstream failure"), types.ErrorCodeBadResponseStatusCode, http.StatusInternalServerError)
						var attempts []int
						for ; retry.GetRetry() <= common.RetryTimes; retry.IncreaseRetry() {
							if len(attempts) > 0 {
								var err error
								channel, _, err = service.CacheGetRandomSatisfiedChannel(retry)
								require.NoError(t, err)
								if channel == nil {
									break
								}
							}
							service.AppendUsedChannel(ctx, channel.Id)
							attempts = append(attempts, channel.Id)
							require.LessOrEqual(t, len(attempts), len(tc.want), "retry budget must not increase")
							if service.DecideRelayRetry(ctx, upstreamErr, common.RetryTimes-retry.GetRetry()).Action != "retry" {
								break
							}
						}
						assert.Equal(t, tc.want, attempts)
					})
				}
			}
		})
	}
}

func TestEncryptedResponsesReasoningRequiresAffinityBinding(t *testing.T) {
	require.NoError(t, i18n.Init())
	previousMemoryCache := common.MemoryCacheEnabled
	t.Cleanup(func() {
		common.MemoryCacheEnabled = previousMemoryCache
		if previousMemoryCache {
			model.InitChannelCache()
		}
	})
	db := modelManagementDB(t, "sqlite", "")
	previousGroups := setting.UserUsableGroups2JSONString()
	previousGroupRatios := ratio_setting.GroupRatio2JSONString()
	affinity := operation_setting.GetChannelAffinitySetting()
	previousAffinity := *affinity
	var affinityContext *gin.Context
	var fallbackAffinityContext *gin.Context
	t.Cleanup(func() {
		if affinityContext != nil {
			service.ClearCurrentChannelAffinityCache(affinityContext)
		}
		if fallbackAffinityContext != nil {
			service.ClearCurrentChannelAffinityCache(fallbackAffinityContext)
		}
		*affinity = previousAffinity
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
		require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(previousGroupRatios))
	})
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1}`))

	const modelName = "gpt-encrypted-affinity-test"
	*affinity = operation_setting.ChannelAffinitySetting{
		Enabled:           true,
		SwitchOnSuccess:   true,
		MaxEntries:        100,
		DefaultTTLSeconds: 60,
		Rules: []operation_setting.ChannelAffinityRule{{
			Name:        "encrypted-reasoning-test",
			ModelRegex:  []string{"^" + modelName + "$"},
			PathRegex:   []string{"^/v1/responses$"},
			KeySources:  []operation_setting.ChannelAffinityKeySource{{Type: "gjson", Path: "prompt_cache_key"}},
			SessionMode: "prefer",
		}},
	}
	common.MemoryCacheEnabled = true
	for _, channelID := range []int{9101, 9102} {
		priority := int64(10)
		if channelID == 9102 {
			priority = 5
		}
		channel := model.Channel{
			Id: channelID, Name: fmt.Sprintf("encrypted-affinity-%d", channelID), Type: constant.ChannelTypeOpenAI,
			Key: "test-only", Status: common.ChannelStatusEnabled, Models: modelName, Group: "default",
			Priority: common.GetPointer(priority), Weight: common.GetPointer(uint(1)),
		}
		require.NoError(t, db.Create(&channel).Error)
		require.NoError(t, channel.AddAbilities(db))
	}
	model.InitChannelCache()

	var selectedChannels []int
	var encryptedRetryDecision service.PolicyDecision
	router := gin.New()
	router.POST("/v1/responses", func(c *gin.Context) {
		common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
		common.SetContextKey(c, constant.ContextKeyUserGroup, "default")
		userID := 1
		if c.Request.Header.Get("X-Test-User") == "other" {
			userID = 2
		}
		c.Set("id", userID)
		tokenID := 7001
		if value := c.Request.Header.Get("X-Test-Token"); value != "" {
			tokenID, _ = strconv.Atoi(value)
		}
		c.Set("token_id", tokenID)
		if c.Request.Header.Get("X-Test-Pin") != "" {
			service.GetChannelConstraints(c).AddPin(dto.ChannelPin{
				ChannelId: 9102, Source: dto.PinSourceToken, Rank: dto.PinRankToken, RetryMode: dto.PinRetrySingleAttempt,
			})
		}
	}, middleware.Distribute(), func(c *gin.Context) {
		selectedChannels = append(selectedChannels, c.GetInt("channel_id"))
		if c.Request.Header.Get("X-Test-Bind") != "" {
			fallbackAffinityContext = c
		}
		if c.Request.Header.Get("X-Test-Encrypted") != "" {
			upstreamError := types.NewOpenAIError(errors.New("upstream failure"), types.ErrorCodeBadResponseStatusCode, http.StatusInternalServerError)
			encryptedRetryDecision = service.DecideRelayRetry(c, upstreamError, 1)
		} else if affinityContext == nil {
			affinityContext = c
		}
		c.Status(http.StatusOK)
	})

	send := func(body, remoteAddr string, encrypted, pinned bool, user string) *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
		request.RemoteAddr = remoteAddr
		request.Header.Set("Content-Type", "application/json")
		if encrypted {
			request.Header.Set("X-Test-Encrypted", "true")
		}
		if pinned {
			request.Header.Set("X-Test-Pin", "true")
		}
		if user != "" {
			request.Header.Set("X-Test-User", user)
		}
		router.ServeHTTP(recorder, request)
		return recorder
	}

	affinityKey := "encrypted-reasoning-session-test"
	initial := fmt.Sprintf(`{"model":%q,"prompt_cache_key":%q,"input":"hello"}`, modelName, affinityKey)
	firstResponse := send(initial, "203.0.113.10:1234", false, false, "")
	require.Equal(t, http.StatusOK, firstResponse.Code, firstResponse.Body.String())
	require.Len(t, selectedChannels, 1)
	boundChannelID := selectedChannels[0]
	assert.Contains(t, []int{9101, 9102}, boundChannelID)
	_, err := service.RecordResponsesAffinityIDs(affinityContext, modelName, "default", common.GetContextKeyString(affinityContext, constant.ContextKeyChannelKey), "resp_opaque", []string{"rs_opaque"})
	require.NoError(t, err)

	encryptedContinuation := fmt.Sprintf(`{"model":%q,"prompt_cache_key":%q,"input":[{"type":"reasoning","id":"rs_opaque","summary":[],"encrypted_content":"opaque-ciphertext"}]}`, modelName, affinityKey)
	secondResponse := send(encryptedContinuation, "203.0.113.11:5678", true, false, "")
	require.Equal(t, http.StatusOK, secondResponse.Code, secondResponse.Body.String())
	require.Len(t, selectedChannels, 2)
	assert.Equal(t, boundChannelID, selectedChannels[1], "a changed client IP must not move the reasoning item to another channel")
	assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "strict_session", Source: "encrypted_reasoning"}, encryptedRetryDecision)

	previousOnly := send(fmt.Sprintf(`{"model":%q,"previous_response_id":"resp_opaque","input":"continue without encrypted input"}`, modelName), "203.0.113.18:1234", false, false, "")
	require.Equal(t, http.StatusOK, previousOnly.Code, previousOnly.Body.String())
	require.Len(t, selectedChannels, 3)
	assert.Equal(t, boundChannelID, selectedChannels[2], "previous_response_id alone must keep the upstream account")

	promptOnly := send(fmt.Sprintf(`{"model":%q,"prompt_cache_key":%q,"input":"another ordinary turn"}`, modelName, affinityKey), "203.0.113.20:1234", false, false, "")
	require.Equal(t, http.StatusOK, promptOnly.Code, promptOnly.Body.String())
	require.Len(t, selectedChannels, 4)
	assert.Equal(t, boundChannelID, selectedChannels[3], "a known prompt key must pin even without encrypted input or previous_response_id")

	beforeRejectedRequests := len(selectedChannels)
	otherUserSameKey := send(encryptedContinuation, "203.0.113.17:1234", true, false, "other")
	assert.Equal(t, http.StatusConflict, otherUserSameKey.Code, "another user must not inherit this session's channel binding")
	assert.Len(t, selectedChannels, beforeRejectedRequests)

	for _, requestBody := range []string{
		fmt.Sprintf(`{"model":%q,"input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName),
		fmt.Sprintf(`{"model":%q,"prompt_cache_key":null,"input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName),
		fmt.Sprintf(`{"model":%q,"prompt_cache_key":"  ","input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName),
		fmt.Sprintf(`{"model":%q,"prompt_cache_key":123,"input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName),
		fmt.Sprintf(`{"model":%q,"prompt_cache_key":%q,"input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName, affinityKey),
		fmt.Sprintf(`{"model":%q,"prompt_cache_key":%q,"previous_response_id":"resp_opaque","input":[{"type":"reasoning","id":"rs_opaque","encrypted_content":"known"},{"type":"reasoning","encrypted_content":"unidentified"}]}`, modelName, affinityKey),
	} {
		missingKeyResponse := send(requestBody, "203.0.113.12:1234", true, false, "")
		assert.Equal(t, http.StatusBadRequest, missingKeyResponse.Code)
		assert.Contains(t, missingKeyResponse.Body.String(), "prompt_cache_key")
		assert.Len(t, selectedChannels, beforeRejectedRequests, "missing-key requests must stop before channel selection")
	}

	unknownPrevious := send(fmt.Sprintf(`{"model":%q,"previous_response_id":"resp_unknown","input":"follow-up"}`, modelName), "203.0.113.19:1234", false, false, "")
	assert.Equal(t, http.StatusConflict, unknownPrevious.Code, "unknown previous_response_id must fail closed")
	assert.Len(t, selectedChannels, beforeRejectedRequests)

	unknownKeyRequest := fmt.Sprintf(`{"model":%q,"prompt_cache_key":"unknown-session-key","input":[{"type":"reasoning","id":"rs_unknown_binding","encrypted_content":"opaque-ciphertext"}]}`, modelName)
	unknownBindingResponse := send(unknownKeyRequest, "203.0.113.13:1234", true, false, "")
	assert.Equal(t, http.StatusConflict, unknownBindingResponse.Code)
	assert.Len(t, selectedChannels, beforeRejectedRequests, "an unknown binding must not fall back to random channel selection")

	pinnedConflictResponse := send(encryptedContinuation, "203.0.113.14:1234", true, true, "")
	assert.Equal(t, http.StatusConflict, pinnedConflictResponse.Code)
	assert.Len(t, selectedChannels, beforeRejectedRequests, "an explicit pin must not override the session's original channel")

	plainReasoning := fmt.Sprintf(`{"model":%q,"input":[{"type":"reasoning","id":"rs_without_cipher","summary":[]}]}`, modelName)
	plainResponse := send(plainReasoning, "203.0.113.15:1234", false, false, "")
	assert.Equal(t, http.StatusOK, plainResponse.Code, plainResponse.Body.String())
	assert.Len(t, selectedChannels, beforeRejectedRequests+1, "reasoning IDs without encrypted content keep ordinary routing")

	require.NoError(t, db.Model(&model.Channel{}).Where("id = ?", boundChannelID).Update("status", common.ChannelStatusAutoDisabled).Error)
	model.InitChannelCache()
	disabledBindingResponse := send(encryptedContinuation, "203.0.113.16:1234", true, false, "")
	assert.Equal(t, http.StatusServiceUnavailable, disabledBindingResponse.Code)
	assert.Len(t, selectedChannels, beforeRejectedRequests+1, "a disabled bound channel must not fall back to another account")

	// Without a prompt key, the first turn must expose a response/reasoning
	// identifier that the client returns on a later encrypted turn.
	*affinity = operation_setting.ChannelAffinitySetting{
		Enabled:           true,
		SwitchOnSuccess:   true,
		MaxEntries:        100,
		DefaultTTLSeconds: 60,
		Rules: []operation_setting.ChannelAffinityRule{{
			Name:       "responses session trace",
			ModelRegex: []string{"^" + modelName + "$"},
			PathRegex:  []string{"^/v1/responses$"},
			KeySources: []operation_setting.ChannelAffinityKeySource{
				{Type: "gjson", Path: "prompt_cache_key"},
				{Type: "context_int", Key: "token_id"},
			},
			IncludeModelName: true,
		}},
	}
	sendWithToken := func(body string, tokenID int, encrypted, bind bool) *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("X-Test-Token", strconv.Itoa(tokenID))
		if encrypted {
			request.Header.Set("X-Test-Encrypted", "true")
		}
		if bind {
			request.Header.Set("X-Test-Bind", "true")
		}
		router.ServeHTTP(recorder, request)
		return recorder
	}

	beforeFallback := len(selectedChannels)
	fallbackFirst := sendWithToken(fmt.Sprintf(`{"model":%q,"input":"hello"}`, modelName), 7701, false, true)
	require.Equal(t, http.StatusOK, fallbackFirst.Code, fallbackFirst.Body.String())
	require.Len(t, selectedChannels, beforeFallback+1)
	fallbackChannelID := selectedChannels[beforeFallback]
	_, err = service.RecordResponsesAffinityIDs(fallbackAffinityContext, modelName, "default", common.GetContextKeyString(fallbackAffinityContext, constant.ContextKeyChannelKey), "resp_fallback", []string{"rs_fallback"})
	require.NoError(t, err)

	fallbackContinuation := fmt.Sprintf(`{"model":%q,"input":[{"type":"reasoning","id":"rs_fallback","encrypted_content":"opaque-ciphertext"}]}`, modelName)
	fallbackSecond := sendWithToken(fallbackContinuation, 7701, true, false)
	require.Equal(t, http.StatusOK, fallbackSecond.Code, fallbackSecond.Body.String())
	require.Len(t, selectedChannels, beforeFallback+2)
	assert.Equal(t, fallbackChannelID, selectedChannels[beforeFallback+1], "a continuation without prompt_cache_key must stay on the first-turn channel")
	assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "strict_session", Source: "encrypted_reasoning"}, encryptedRetryDecision)

	fallbackOtherToken := sendWithToken(fallbackContinuation, 7702, true, false)
	assert.Equal(t, http.StatusConflict, fallbackOtherToken.Code, "another token must not inherit the session's channel binding")
	assert.Len(t, selectedChannels, beforeFallback+2)

	nullKey := sendWithToken(fmt.Sprintf(`{"model":%q,"prompt_cache_key":null,"input":[{"type":"reasoning","id":"rs_fallback","encrypted_content":"opaque-ciphertext"}]}`, modelName), 7701, true, false)
	require.Equal(t, http.StatusOK, nullKey.Code, nullKey.Body.String())
	require.Len(t, selectedChannels, beforeFallback+3)
	assert.Equal(t, fallbackChannelID, selectedChannels[beforeFallback+2], "a null prompt_cache_key must still route by the upstream reasoning ID")

	malformedKey := sendWithToken(fmt.Sprintf(`{"model":%q,"prompt_cache_key":123,"input":[{"type":"reasoning","encrypted_content":"opaque-ciphertext"}]}`, modelName), 7701, true, false)
	assert.Equal(t, http.StatusBadRequest, malformedKey.Code)
	assert.Contains(t, malformedKey.Body.String(), "prompt_cache_key")
	assert.Len(t, selectedChannels, beforeFallback+3, "a malformed prompt_cache_key must stop before channel selection")
}

func TestResponsesAffinityBindingReauthorizesRouting(t *testing.T) {
	require.NoError(t, i18n.Init())
	for _, dialect := range []struct{ kind, env string }{{"sqlite", ""}, {"mysql", "TEST_MYSQL_DSN"}, {"postgres", "TEST_POSTGRES_DSN"}} {
		t.Run(dialect.kind, func(t *testing.T) {
			dsn := os.Getenv(dialect.env)
			if dialect.env != "" && dsn == "" {
				t.Skipf("%s not configured", dialect.env)
			}
			db := modelManagementDB(t, dialect.kind, dsn)
			previousMemory := common.MemoryCacheEnabled
			previousGroups := setting.UserUsableGroups2JSONString()
			previousRatios := ratio_setting.GroupRatio2JSONString()
			affinity := operation_setting.GetChannelAffinitySetting()
			previousAffinity := *affinity
			t.Cleanup(func() {
				common.MemoryCacheEnabled = previousMemory
				*affinity = previousAffinity
				require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
				require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(previousRatios))
				if previousMemory {
					model.InitChannelCache()
				}
			})
			require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP"}`))
			require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1,"vip":3}`))
			const modelName = "gpt-bound-route-test"
			*affinity = operation_setting.ChannelAffinitySetting{
				Enabled: true, MaxEntries: 100, DefaultTTLSeconds: 60,
				Rules: []operation_setting.ChannelAffinityRule{{
					Name: "responses session trace", ModelRegex: []string{"^" + modelName + "$"}, PathRegex: []string{"^/v1/responses$"},
					KeySources:  []operation_setting.ChannelAffinityKeySource{{Type: "gjson", Path: "prompt_cache_key"}, {Type: "context_int", Key: "token_id"}},
					SessionMode: "off", IncludeModelName: true, IncludeUsingGroup: true,
					ParamOverrideTemplate: map[string]any{"temperature": 0.2},
				}},
			}
			for _, spec := range []struct {
				id       int
				priority int64
			}{{9201, 10}, {9202, 5}} {
				channel := model.Channel{Id: spec.id, Name: fmt.Sprintf("binding-%d", spec.id), Type: constant.ChannelTypeOpenAI,
					Key: "key-A\nkey-B", ChannelInfo: model.ChannelInfo{IsMultiKey: true, MultiKeyMode: constant.MultiKeyModePolling},
					Status: common.ChannelStatusEnabled, Models: modelName, Group: "default,vip", Priority: common.GetPointer(spec.priority),
					ParamOverride: common.GetPointer(fmt.Sprintf(`{"provider_marker":%d}`, spec.id))}
				require.NoError(t, db.Create(&channel).Error)
				require.NoError(t, channel.AddAbilities(db))
			}
			for _, cached := range []bool{false, true} {
				for _, group := range []string{"default", "auto"} {
					t.Run(fmt.Sprintf("cache=%t/group=%s", cached, group), func(t *testing.T) {
						common.MemoryCacheEnabled = cached
						require.NoError(t, db.Model(&model.Channel{}).Where("id = ?", 9202).Update("priority", 5).Error)
						require.NoError(t, db.Model(&model.Ability{}).Where("channel_id = ?", 9202).Update("priority", 5).Error)
						model.InitChannelCache()
						allowedGroups := []string{"vip", "default"}
						var selectedKey, selectedGroup string
						var selectedID, attempts int
						var template map[string]any
						var decision service.PolicyDecision
						router := gin.New()
						tokenID := 8200
						if cached {
							tokenID++
						}
						if group == "auto" {
							tokenID += 2
						}
						router.POST("/v1/responses", func(c *gin.Context) {
							c.Set("id", 8210)
							c.Set("token_id", tokenID)
							common.SetContextKey(c, constant.ContextKeyUsingGroup, group)
							common.SetContextKey(c, constant.ContextKeyUserGroup, "default")
							common.SetContextKey(c, constant.ContextKeyTokenAutoGroups, allowedGroups)
						}, middleware.Distribute(), func(c *gin.Context) {
							attempts++
							selectedID = c.GetInt("channel_id")
							selectedKey = common.GetContextKeyString(c, constant.ContextKeyChannelKey)
							selectedGroup = group
							if group == "auto" {
								selectedGroup = common.GetContextKeyString(c, constant.ContextKeyAutoGroup)
							}
							template, _ = common.GetContextKeyType[map[string]any](c, constant.ContextKeyChannelParamOverride)
							decision = service.DecideRelayRetry(c, types.NewOpenAIError(errors.New("upstream"), types.ErrorCodeBadResponseStatusCode, 500), 1)
							if c.Request.Header.Get("X-Test-Record") != "" {
								_, err := service.RecordResponsesAffinityIDs(c, modelName, group, selectedKey, fmt.Sprintf("resp-routing-%d-%s", tokenID, dialect.kind), []string{fmt.Sprintf("rs-routing-%d-%s", tokenID, dialect.kind)})
								require.NoError(t, err)
							}
							c.Status(http.StatusOK)
						})
						send := func(body string, record bool) *httptest.ResponseRecorder {
							rec := httptest.NewRecorder()
							req := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
							req.Header.Set("Content-Type", "application/json")
							if record {
								req.Header.Set("X-Test-Record", "true")
							}
							router.ServeHTTP(rec, req)
							return rec
						}
						first := send(fmt.Sprintf(`{"model":%q,"prompt_cache_key":"routing-prompt","input":"hello"}`, modelName), true)
						require.Equal(t, http.StatusOK, first.Code, first.Body.String())
						assert.Equal(t, 9201, selectedID, "first turns must use the best normal priority")
						assert.Equal(t, 0.2, template["temperature"])
						assert.EqualValues(t, 9201, template["provider_marker"], "same-model channels retain their own override configuration")
						firstKey, firstGroup := selectedKey, selectedGroup
						require.NoError(t, db.Model(&model.Channel{}).Where("id = ?", 9202).Update("priority", 20).Error)
						require.NoError(t, db.Model(&model.Ability{}).Where("channel_id = ?", 9202).Update("priority", 20).Error)
						model.InitChannelCache()
						independent := send(fmt.Sprintf(`{"model":%q,"input":"separate conversation without cache key"}`, modelName), false)
						require.Equal(t, http.StatusOK, independent.Code, independent.Body.String())
						assert.Equal(t, 9202, selectedID, "another first turn on the same token must follow current priorities")
						assert.EqualValues(t, 9202, template["provider_marker"])
						if group == "auto" {
							assert.Equal(t, "vip", firstGroup)
						}
						channel, err := model.GetChannelById(9201, true)
						require.NoError(t, err)
						channel.Key = "key-B\nkey-A"
						channel.ChannelInfo.MultiKeyPollingIndex = 0
						require.NoError(t, db.Model(channel).Updates(map[string]any{"key": channel.Key, "channel_info": channel.ChannelInfo}).Error)
						model.InitChannelCache()
						continuation := fmt.Sprintf(`{"model":%q,"prompt_cache_key":"routing-prompt","previous_response_id":%q,"input":[{"type":"reasoning","id":%q,"encrypted_content":"opaque"}]}`, modelName, fmt.Sprintf("resp-routing-%d-%s", tokenID, dialect.kind), fmt.Sprintf("rs-routing-%d-%s", tokenID, dialect.kind))
						next := send(continuation, false)
						require.Equal(t, http.StatusOK, next.Code, next.Body.String())
						assert.Equal(t, firstKey, selectedKey, "reordering keys must not rotate the session credential")
						assert.Equal(t, firstGroup, selectedGroup, "the pinned auto turn must restore its pricing group")
						assert.Equal(t, 0.2, template["temperature"], "strict ID routing must preserve matched rule templates")
						assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "strict_session", Source: "encrypted_reasoning"}, decision)
						previousOnly := send(fmt.Sprintf(`{"model":%q,"prompt_cache_key":"routing-prompt","previous_response_id":%q,"input":"continue"}`, modelName, fmt.Sprintf("resp-routing-%d-%s", tokenID, dialect.kind)), false)
						require.Equal(t, http.StatusOK, previousOnly.Code, previousOnly.Body.String())
						assert.Equal(t, firstKey, selectedKey)
						assert.Equal(t, firstGroup, selectedGroup)
						assert.Equal(t, 0.2, template["temperature"])
						assert.Equal(t, service.PolicyDecision{Action: "stop", Reason: "strict_session", Source: "previous_response_id"}, decision)
						beforeRejected := attempts
						boundIndex := 0
						if firstKey == "key-A" {
							boundIndex = 1
						}
						channel.ChannelInfo.MultiKeyStatusList = map[int]int{boundIndex: common.ChannelStatusAutoDisabled}
						require.NoError(t, db.Model(channel).Update("channel_info", channel.ChannelInfo).Error)
						model.InitChannelCache()
						assert.Equal(t, http.StatusServiceUnavailable, send(continuation, false).Code, "disabled bound keys must not rotate")
						channel.ChannelInfo.MultiKeyStatusList = nil
						require.NoError(t, db.Model(channel).Update("channel_info", channel.ChannelInfo).Error)
						model.InitChannelCache()
						if group == "auto" {
							allowedGroups = []string{"default"}
							assert.Equal(t, http.StatusServiceUnavailable, send(continuation, false).Code, "revoked auto groups must not fall back")
							allowedGroups = []string{"vip", "default"}
						}
						for _, removed := range []string{"group", "models"} {
							if removed == "group" {
								channel.Group = "retired"
							} else {
								channel.Models = "gpt-other-model"
							}
							require.NoError(t, db.Model(channel).Updates(map[string]any{"group": channel.Group, "models": channel.Models}).Error)
							require.NoError(t, channel.UpdateAbilities(db))
							model.InitChannelCache()
							assert.Equal(t, http.StatusServiceUnavailable, send(continuation, false).Code, "a cached pin cannot revive removed %s eligibility", removed)
							channel.Group, channel.Models = "default,vip", modelName
							require.NoError(t, db.Model(channel).Updates(map[string]any{"group": channel.Group, "models": channel.Models}).Error)
							require.NoError(t, channel.UpdateAbilities(db))
						}
						assert.Equal(t, beforeRejected, attempts)
					})
				}
			}
		})
	}
}

func TestRequestPolicyRoutingDatabaseMatrix(t *testing.T) {
	require.NoError(t, i18n.Init())
	for _, dialect := range []struct{ kind, env string }{{"sqlite", ""}, {"mysql", "TEST_MYSQL_DSN"}, {"postgres", "TEST_POSTGRES_DSN"}} {
		t.Run(dialect.kind, func(t *testing.T) {
			dsn := ""
			if dialect.env != "" {
				dsn = os.Getenv(dialect.env)
				if dsn == "" {
					t.Skipf("%s not configured", dialect.env)
				}
			}
			db := modelManagementDB(t, dialect.kind, dsn)
			previousGroups := setting.UserUsableGroups2JSONString()
			previousRatios, err := common.Marshal(ratio_setting.GetGroupRatioCopy())
			require.NoError(t, err)
			require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
			require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1}`))
			t.Cleanup(func() {
				require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
				require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(string(previousRatios)))
			})
			// Channel 1 holds the session binding but is no longer usable.
			channels := []model.Channel{
				{Id: 1, Name: "A", Type: 1, Key: "test-only", Status: common.ChannelStatusAutoDisabled, Models: "policy-test", Group: "default", Priority: common.GetPointer(int64(10))},
				{Id: 2, Name: "B", Type: 1, Key: "test-only", Status: common.ChannelStatusEnabled, Models: "policy-test", Group: "default", Priority: common.GetPointer(int64(5))},
			}
			for i := range channels {
				require.NoError(t, db.Create(&channels[i]).Error)
				require.NoError(t, channels[i].AddAbilities(db))
			}
			affinity := operation_setting.GetChannelAffinitySetting()
			previousAffinity := *affinity
			t.Cleanup(func() { *affinity = previousAffinity })
			for _, cached := range []bool{false, true} {
				for _, keep := range []bool{false, true} {
					for _, tc := range []struct {
						globalMode, ruleMode string
						blocked              bool
					}{
						{"strict", "inherit", true},
						{"prefer", "strict", true},
						{"prefer", "inherit", false},
						{"strict", "prefer", false},
					} {
						t.Run(fmt.Sprintf("cache=%t/keep=%t/global=%s/rule=%s", cached, keep, tc.globalMode, tc.ruleMode), func(t *testing.T) {
							common.MemoryCacheEnabled = cached
							model.InitChannelCache()
							snapshot, err := model.BuildRequestPolicy(map[string]string{
								"channel_affinity_setting.enabled":                  "true",
								"channel_affinity_setting.session_mode":             tc.globalMode,
								"channel_affinity_setting.keep_on_channel_disabled": fmt.Sprint(keep),
								"channel_affinity_setting.rules":                    fmt.Sprintf(`[{"name":"session","model_regex":[".*"],"key_sources":[{"type":"request_header","key":"X-Session"}],"session_mode":%q}]`, tc.ruleMode),
							})
							require.NoError(t, err)
							*affinity = snapshot.Affinity
							seed := newPinRetryContext()
							seed.Request.Header.Set("X-Session", t.Name())
							_, found := service.GetPreferredChannelByAffinity(seed, "policy-test", "default")
							require.False(t, found)
							seed.Set("channel_id", 1)
							service.RecordChannelAffinity(seed, 1)
							t.Cleanup(func() { service.ClearCurrentChannelAffinityCache(seed) })
							bound, found := service.GetPreferredChannelByAffinity(seed, "policy-test", "default")
							require.True(t, found)
							require.Equal(t, 1, bound)

							request := newPinRetryContext()
							request.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"policy-test"}`))
							request.Request.Header.Set("Content-Type", "application/json")
							request.Request.Header.Set("X-Session", t.Name())
							common.SetContextKey(request, constant.ContextKeyUsingGroup, "default")
							middleware.Distribute()(request)
							events := service.RequestPolicy(request).Events()
							assert.True(t, slices.ContainsFunc(events, func(event service.PolicyEvent) bool { return event.Decision.Reason == "session_rule_matched" }), "decision events are recorded for every request")
							bound, found = service.GetPreferredChannelByAffinity(seed, "policy-test", "default")
							if tc.blocked {
								assert.Equal(t, http.StatusServiceUnavailable, request.Writer.Status())
								assert.True(t, request.IsAborted())
								assert.Equal(t, keep, found, "binding retention is independent of strict request handling")
								if found {
									assert.Equal(t, 1, bound)
								}
								return
							}
							assert.False(t, request.IsAborted())
							assert.Equal(t, 2, common.GetContextKeyInt(request, constant.ContextKeyChannelId), "prefer falls back to the next eligible channel")
							require.True(t, found)
							assert.Equal(t, 2, bound, "a successful fallback rebinds the session")
						})
					}
				}
			}
		})
	}
}
