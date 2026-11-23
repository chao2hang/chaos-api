package service

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChannelAffinityBindingSurvivesRedisInitializationAndRestart(t *testing.T) {
	previousRedisEnabled, previousRedisClient := common.RedisEnabled, common.RDB
	common.RedisEnabled = true
	common.RDB = nil
	t.Cleanup(func() { common.RedisEnabled, common.RDB = previousRedisEnabled, previousRedisClient })

	server := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { require.NoError(t, redisClient.Close()) })

	// Construct the cache before Redis initialization, matching the startup
	// ordering that previously captured a nil client forever.
	firstCache := newChannelAffinityCache()
	common.RDB = redisClient
	const bindingKey = "codex cli trace:gpt-5:default:user:42:restart-test"
	require.NoError(t, firstCache.SetWithTTL(bindingKey, 9528, time.Minute))
	assert.True(t, server.Exists(firstCache.FullKey(bindingKey)))

	// A newly constructed cache represents a process restart or another replica.
	channelID, found, err := newChannelAffinityCache().Get(bindingKey)
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, 9528, channelID)
}

func buildChannelAffinityTemplateContextForTest(meta channelAffinityMeta) *gin.Context {
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	setChannelAffinityContext(ctx, meta)
	return ctx
}

func TestApplyChannelAffinityOverrideTemplate_NoTemplate(t *testing.T) {
	ctx := buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
		RuleName: "rule-no-template",
	})
	base := map[string]any{
		"temperature": 0.7,
	}

	merged, applied := ApplyChannelAffinityOverrideTemplate(ctx, base)
	require.False(t, applied)
	require.Equal(t, base, merged)
}

func TestApplyChannelAffinityOverrideTemplate_MergeTemplate(t *testing.T) {
	ctx := buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
		RuleName: "rule-with-template",
		ParamTemplate: map[string]any{
			"temperature": 0.2,
			"top_p":       0.95,
		},
		UsingGroup:     "default",
		ModelName:      "gpt-4.1",
		RequestPath:    "/v1/responses",
		KeySourceType:  "gjson",
		KeySourcePath:  "prompt_cache_key",
		KeyHint:        "abcd...wxyz",
		KeyFingerprint: "abcd1234",
	})
	base := map[string]any{
		"temperature": 0.7,
		"max_tokens":  2000,
	}

	merged, applied := ApplyChannelAffinityOverrideTemplate(ctx, base)
	require.True(t, applied)
	require.Equal(t, 0.7, merged["temperature"])
	require.Equal(t, 0.95, merged["top_p"])
	require.Equal(t, 2000, merged["max_tokens"])
	require.Equal(t, 0.7, base["temperature"])

	anyInfo, ok := ctx.Get(ginKeyChannelAffinityLogInfo)
	require.True(t, ok)
	info, ok := anyInfo.(map[string]any)
	require.True(t, ok)
	overrideInfoAny, ok := info["override_template"]
	require.True(t, ok)
	overrideInfo, ok := overrideInfoAny.(map[string]any)
	require.True(t, ok)
	require.Equal(t, true, overrideInfo["applied"])
	require.Equal(t, "rule-with-template", overrideInfo["rule_name"])
	require.EqualValues(t, 2, overrideInfo["param_override_keys"])
}

func TestApplyChannelAffinityOverrideTemplate_MergeOperations(t *testing.T) {
	ctx := buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
		RuleName: "rule-with-ops-template",
		ParamTemplate: map[string]any{
			"operations": []map[string]any{
				{
					"mode":  "pass_headers",
					"value": []string{"Originator"},
				},
			},
		},
	})
	base := map[string]any{
		"temperature": 0.7,
		"operations": []map[string]any{
			{
				"path":  "model",
				"mode":  "trim_prefix",
				"value": "openai/",
			},
		},
	}

	merged, applied := ApplyChannelAffinityOverrideTemplate(ctx, base)
	require.True(t, applied)
	require.Equal(t, 0.7, merged["temperature"])

	opsAny, ok := merged["operations"]
	require.True(t, ok)
	ops, ok := opsAny.([]any)
	require.True(t, ok)
	require.Len(t, ops, 2)

	firstOp, ok := ops[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "pass_headers", firstOp["mode"])

	secondOp, ok := ops[1].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "trim_prefix", secondOp["mode"])
}

func TestShouldSkipRetryAfterChannelAffinityFailure(t *testing.T) {
	tests := []struct {
		name string
		ctx  func() *gin.Context
		want bool
	}{
		{
			name: "nil context",
			ctx: func() *gin.Context {
				return nil
			},
			want: false,
		},
		{
			name: "explicit skip retry flag in context",
			ctx: func() *gin.Context {
				ctx := buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
					RuleName:   "rule-explicit-flag",
					SkipRetry:  false,
					UsingGroup: "default",
					ModelName:  "gpt-5",
				})
				ctx.Set(ginKeyChannelAffinitySkipRetry, true)
				return ctx
			},
			want: true,
		},
		{
			name: "fallback to matched rule meta",
			ctx: func() *gin.Context {
				return buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
					RuleName:   "rule-skip-retry",
					SkipRetry:  true,
					UsingGroup: "default",
					ModelName:  "gpt-5",
				})
			},
			want: true,
		},
		{
			name: "no flag and no skip retry meta",
			ctx: func() *gin.Context {
				return buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
					RuleName:   "rule-no-skip-retry",
					SkipRetry:  false,
					UsingGroup: "default",
					ModelName:  "gpt-5",
				})
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, ShouldSkipRetryAfterChannelAffinityFailure(tt.ctx()))
		})
	}
}

func TestExtractChannelAffinityValue_RequestHeader(t *testing.T) {
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	ctx.Request.Header.Set("X-Affinity-Key", " tenant-123 ")

	value := extractChannelAffinityValue(ctx, operation_setting.ChannelAffinityKeySource{
		Type: "request_header",
		Key:  "X-Affinity-Key",
	})

	require.Equal(t, "tenant-123", value)
}

func TestExtractChannelAffinityValue_JSONFile(t *testing.T) {
	previous := common.GetDiskCacheConfig()
	common.SetDiskCacheConfig(common.DiskCacheConfig{Enabled: true, ThresholdMB: 0, MaxSizeMB: 16, Path: t.TempDir()})
	t.Cleanup(func() { common.SetDiskCacheConfig(previous) })
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"image":"`+strings.Repeat("A", 1<<20)+`","metadata":{"key":" tenant-123 ","count":0,"enabled":false},"items":[{"id":"chosen"}]}`))
	t.Cleanup(func() { common.CleanupBodyStorage(c) })
	for _, tc := range []struct{ path, want string }{
		{"metadata.key", "tenant-123"},
		{"metadata.count", "0"},
		{"metadata.enabled", "false"},
		{"items.0.id", "chosen"},
		{`items.#(id=="chosen").id`, "chosen"},
		{"absent", ""},
	} {
		assert.Equal(t, tc.want, extractChannelAffinityValue(c, operation_setting.ChannelAffinityKeySource{Type: "gjson", Path: tc.path}), tc.path)
	}
}

func TestGetPreferredChannelByAffinity_RequestHeaderKeySource(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rule := operation_setting.ChannelAffinityRule{
		Name:       "header-affinity",
		ModelRegex: []string{"^gpt-.*$"},
		PathRegex:  []string{"/v1/responses"},
		KeySources: []operation_setting.ChannelAffinityKeySource{
			{Type: "request_header", Key: "X-Affinity-Key"},
		},
		IncludeRuleName:  true,
		IncludeModelName: true,
	}

	affinityValue := fmt.Sprintf("header-hit-%d", time.Now().UnixNano())
	cacheKeySuffix := buildChannelAffinityCacheKeySuffix(rule, "gpt-5", "default", affinityValue, 0)

	cache := getChannelAffinityCache()
	require.NoError(t, cache.SetWithTTL(cacheKeySuffix, 9528, time.Minute))
	t.Cleanup(func() {
		_, _ = cache.DeleteMany([]string{cacheKeySuffix})
	})

	setting := operation_setting.GetChannelAffinitySetting()
	originalRules := setting.Rules
	setting.Rules = append([]operation_setting.ChannelAffinityRule{rule}, originalRules...)
	t.Cleanup(func() {
		setting.Rules = originalRules
	})

	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	ctx.Request.Header.Set("X-Affinity-Key", affinityValue)

	channelID, found := GetPreferredChannelByAffinity(ctx, "gpt-5", "default")
	require.True(t, found)
	require.Equal(t, 9528, channelID)

	meta, ok := getChannelAffinityMeta(ctx)
	require.True(t, ok)
	require.Equal(t, "request_header", meta.KeySourceType)
	require.Equal(t, "X-Affinity-Key", meta.KeySourceKey)
	require.Equal(t, buildChannelAffinityKeyHint(affinityValue), meta.KeyHint)
}

func TestResponsesPromptCacheAffinityUsesLongRetention(t *testing.T) {
	setting := operation_setting.GetChannelAffinitySetting()
	previousSetting := *setting
	t.Cleanup(func() { *setting = previousSetting })
	*setting = operation_setting.ChannelAffinitySetting{
		Enabled:           true,
		DefaultTTLSeconds: 60,
		Rules: []operation_setting.ChannelAffinityRule{{
			Name:       "responses-prompt-cache",
			ModelRegex: []string{"^gpt-.*$"},
			PathRegex:  []string{"^/v1/responses$"},
			KeySources: []operation_setting.ChannelAffinityKeySource{{Type: "gjson", Path: "prompt_cache_key"}},
		}},
	}

	affinityValue := fmt.Sprintf("long-lived-thread-%d", time.Now().UnixNano())
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(fmt.Sprintf(`{"prompt_cache_key":%q}`, affinityValue)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	t.Cleanup(func() { common.CleanupBodyStorage(ctx) })

	channelID, matched, err := ResolvePreferredChannelByAffinity(ctx, "gpt-6-luna", "default")
	require.NoError(t, err)
	require.True(t, matched)
	require.Zero(t, channelID, "the first request has not recorded a channel yet")

	meta, ok := getChannelAffinityMeta(ctx)
	require.True(t, ok)
	require.GreaterOrEqual(t, meta.TTLSeconds, 90*24*60*60)
}

func TestResponsesAffinityIDsKeepConversationsAndTokensSeparate(t *testing.T) {
	const modelName = "gpt-affinity-isolation"
	makeContext := func(userID, tokenID, channelID int, promptKey string) *gin.Context {
		ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
		ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(fmt.Sprintf(`{"prompt_cache_key":%q}`, promptKey)))
		ctx.Request.Header.Set("Content-Type", "application/json")
		ctx.Set("id", userID)
		ctx.Set("token_id", tokenID)
		ctx.Set("channel_id", channelID)
		t.Cleanup(func() { common.CleanupBodyStorage(ctx) })
		return ctx
	}
	first := makeContext(341, 9341, 51, "prompt-A")
	firstSession, err := RecordResponsesAffinityIDs(first, modelName, "default", "upstream-key-A", "resp-A", []string{"rs-A"})
	require.NoError(t, err)
	require.NotEmpty(t, firstSession)
	channelID, fingerprint, sessionID, ok := CurrentResponsesAffinityScope(first)
	require.True(t, ok)
	assert.Equal(t, 51, channelID)
	assert.Len(t, fingerprint, 64)
	assert.Equal(t, firstSession, sessionID)

	multiKeyChannel := &model.Channel{Key: "upstream-key-B\nupstream-key-A", ChannelInfo: model.ChannelInfo{IsMultiKey: true}}
	key, index, found := multiKeyChannel.GetEnabledKeyByFingerprint(fingerprint)
	require.True(t, found)
	assert.Equal(t, "upstream-key-A", key)
	assert.Equal(t, 1, index, "reordered multi-key channels must recover the same credential")
	multiKeyChannel.ChannelInfo.MultiKeyStatusList = map[int]int{1: common.ChannelStatusAutoDisabled}
	_, _, found = multiKeyChannel.GetEnabledKeyByFingerprint(fingerprint)
	assert.False(t, found, "a disabled bound credential must never rotate to a different key")

	second := makeContext(341, 9341, 52, "prompt-B")
	secondSession, err := RecordResponsesAffinityIDs(second, modelName, "default", "upstream-key-B", "resp-B", []string{"rs-B"})
	require.NoError(t, err)
	assert.NotEqual(t, firstSession, secondSession)

	for _, tc := range []struct {
		name  string
		user  int
		token int
		model string
		group string
		id    string
		want  int
	}{
		{"first conversation", 341, 9341, modelName, "default", "rs-A", 51},
		{"second conversation", 341, 9341, modelName, "default", "rs-B", 52},
		{"different token", 341, 9342, modelName, "default", "rs-A", 0},
		{"different user", 342, 9341, modelName, "default", "rs-A", 0},
		{"different model", 341, 9341, "gpt-other", "default", "rs-A", 0},
		{"different group", 341, 9341, modelName, "premium", "rs-A", 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx := makeContext(tc.user, tc.token, 0, "")
			binding, found, resolveErr := ResolveResponsesAffinityIDs(ctx, tc.model, tc.group, "", []string{tc.id})
			require.NoError(t, resolveErr)
			assert.Equal(t, tc.want > 0, found)
			assert.Equal(t, tc.want, binding.ChannelID)
		})
	}
	conflict := makeContext(341, 9341, 0, "")
	_, _, err = ResolveResponsesAffinityIDs(conflict, modelName, "default", "resp-A", []string{"rs-B"})
	require.ErrorIs(t, err, ErrResponsesAffinityConflict)
	duplicate := makeContext(341, 9341, 53, "")
	_, err = RecordResponsesAffinityIDs(duplicate, modelName, "default", "upstream-key-C", "resp-A", []string{"rs-A"})
	require.Error(t, err, "the same upstream ID cannot silently move to another account")
	promptOnly := makeContext(341, 9341, 0, "prompt-A")
	promptBinding, found, err := ResolveResponsesAffinityIDs(promptOnly, modelName, "default", "", nil)
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, 51, promptBinding.ChannelID)
	unknownWithPrompt := makeContext(341, 9341, 0, "prompt-A")
	_, found, err = ResolveResponsesAffinityIDs(unknownWithPrompt, modelName, "default", "", []string{"rs-not-recorded"})
	require.NoError(t, err)
	assert.False(t, found, "an unknown encrypted item must not inherit an unrelated prompt binding")
	t.Cleanup(func() {
		cache := getResponsesAffinityCache()
		keys := []string{
			responsesAffinityCacheKey(341, 9341, modelName, "default", "response", "resp-A"),
			responsesAffinityCacheKey(341, 9341, modelName, "default", "reasoning", "rs-A"),
			responsesAffinityCacheKey(341, 9341, modelName, "default", "prompt", "prompt-A"),
			responsesAffinityCacheKey(341, 9341, modelName, "default", "response", "resp-B"),
			responsesAffinityCacheKey(341, 9341, modelName, "default", "reasoning", "rs-B"),
			responsesAffinityCacheKey(341, 9341, modelName, "default", "prompt", "prompt-B"),
		}
		_, _ = cache.DeleteMany(keys)
	})
}

func TestResponsesAffinityRedisRejectsConflictsAtomically(t *testing.T) {
	previousEnabled, previousClient := common.RedisEnabled, common.RDB
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	common.RedisEnabled, common.RDB = true, client
	t.Cleanup(func() {
		common.RedisEnabled, common.RDB = previousEnabled, previousClient
		require.NoError(t, client.Close())
	})
	makeContext := func(channelID int) *gin.Context {
		ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
		ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{}`))
		ctx.Request.Header.Set("Content-Type", "application/json")
		ctx.Set("id", 551)
		ctx.Set("token_id", 9551)
		ctx.Set("channel_id", channelID)
		t.Cleanup(func() { common.CleanupBodyStorage(ctx) })
		return ctx
	}
	first := makeContext(51)
	outbound := httptest.NewRequest(http.MethodPost, "https://upstream.example/v1/responses", nil)
	outbound.Header.Set("Authorization", "Bearer final-override-A")
	require.NoError(t, ValidateResponsesOutboundIdentity(first, outbound))
	_, err := RecordResponsesAffinityIDs(first, "gpt-redis-affinity", "default", "credential-A", "resp-existing", []string{"rs-existing"})
	require.NoError(t, err)
	conflicting := makeContext(52)
	_, err = RecordResponsesAffinityIDs(conflicting, "gpt-redis-affinity", "default", "credential-B", "resp-must-not-appear", []string{"rs-existing"})
	require.ErrorIs(t, err, ErrResponsesAffinityConflict)
	probe := makeContext(0)
	_, found, err := ResolveResponsesAffinityIDs(probe, "gpt-redis-affinity", "default", "resp-must-not-appear", nil)
	require.NoError(t, err)
	assert.False(t, found, "a later ID conflict must not leave an earlier response ID cached")
	bound, found, err := ResolveResponsesAffinityIDs(probe, "gpt-redis-affinity", "default", "resp-existing", []string{"rs-existing"})
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, 51, bound.ChannelID)
	assert.Equal(t, "default", bound.ResolvedGroup)
	require.Len(t, bound.OutboundIdentityFingerprint, 64, "Redis must retain the actual outbound identity, not only the configured key")
	require.NoError(t, ValidateResponsesOutboundIdentity(probe, outbound))
	changed := outbound.Clone(outbound.Context())
	// Signers may assign directly to http.Header with noncanonical casing.
	// These fields still go on the wire and must not disappear from identity.
	changed.Header = http.Header{"authorization": {"Bearer final-override-A"}}
	require.NoError(t, ValidateResponsesOutboundIdentity(probe, changed))
	changed.Header["authorization"] = []string{"Bearer final-override-B"}
	identityErr := ValidateResponsesOutboundIdentity(probe, changed)
	var apiErr *types.NewAPIError
	require.ErrorAs(t, identityErr, &apiErr)
	assert.Equal(t, http.StatusConflict, apiErr.StatusCode)
	assert.True(t, types.IsSkipRetryError(apiErr))
	assert.NotContains(t, server.Dump(), "final-override-A", "Redis must not store usable outbound credentials")

	// Competing replicas must publish either complete ID set, never a partial
	// response alias from the losing writer. Both callers share only Redis.
	start := make(chan struct{})
	results := make(chan struct {
		channelID int
		err       error
	}, 2)
	for _, channelID := range []int{61, 62} {
		ctx := makeContext(channelID)
		go func() {
			<-start
			_, writeErr := RecordResponsesAffinityIDs(ctx, "gpt-redis-affinity", "default", fmt.Sprintf("credential-%d", channelID), fmt.Sprintf("resp-race-%d", channelID), []string{"rs-race-shared"})
			results <- struct {
				channelID int
				err       error
			}{channelID, writeErr}
		}()
	}
	close(start)
	winner, loser := <-results, <-results
	if winner.err != nil {
		winner, loser = loser, winner
	}
	require.NoError(t, winner.err)
	require.ErrorIs(t, loser.err, ErrResponsesAffinityConflict)
	_, found, err = ResolveResponsesAffinityIDs(makeContext(0), "gpt-redis-affinity", "default", fmt.Sprintf("resp-race-%d", loser.channelID), nil)
	require.NoError(t, err)
	assert.False(t, found)
	bound, found, err = ResolveResponsesAffinityIDs(makeContext(0), "gpt-redis-affinity", "default", fmt.Sprintf("resp-race-%d", winner.channelID), []string{"rs-race-shared"})
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, winner.channelID, bound.ChannelID)
}

func TestResponsesAffinityLegacyTokenRuleDoesNotChooseFirstTurn(t *testing.T) {
	setting := operation_setting.GetChannelAffinitySetting()
	previous := *setting
	t.Cleanup(func() { *setting = previous })
	rule := operation_setting.ChannelAffinityRule{
		Name: "responses session trace", ModelRegex: []string{"^gpt-legacy-first-turn$"}, PathRegex: []string{"^/v1/responses$"},
		KeySources:       []operation_setting.ChannelAffinityKeySource{{Type: "gjson", Path: "prompt_cache_key"}, {Type: "context_int", Key: "token_id"}},
		IncludeModelName: true, IncludeUsingGroup: true, IncludeRuleName: true,
	}
	*setting = operation_setting.ChannelAffinitySetting{Enabled: true, DefaultTTLSeconds: 60, Rules: []operation_setting.ChannelAffinityRule{rule}}
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"input":"new conversation"}`))
	ctx.Set("id", 671)
	ctx.Set("token_id", 9671)
	t.Cleanup(func() { common.CleanupBodyStorage(ctx) })
	key := buildChannelAffinityCacheKeySuffix(rule, "gpt-legacy-first-turn", "default", "9671", 671)
	require.NoError(t, getChannelAffinityCache().SetWithTTL(key, 99, time.Minute))
	t.Cleanup(func() { _, _ = getChannelAffinityCache().DeleteMany([]string{key}) })
	channelID, matched, err := ResolvePreferredChannelByAffinity(ctx, "gpt-legacy-first-turn", "default")
	require.NoError(t, err)
	assert.False(t, matched, "the persisted token fallback is not a conversation selector")
	assert.Zero(t, channelID)
}

func TestClearCurrentChannelAffinityCache(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cacheKeySuffix := fmt.Sprintf("codex cli trace:default:clear-current-%d", time.Now().UnixNano())
	cacheKeyFull := channelAffinityCacheNamespace + ":" + cacheKeySuffix
	cache := getChannelAffinityCache()
	require.NoError(t, cache.SetWithTTL(cacheKeySuffix, 9527, time.Minute))
	t.Cleanup(func() {
		_, _ = cache.DeleteMany([]string{cacheKeySuffix})
	})

	ctx := buildChannelAffinityTemplateContextForTest(channelAffinityMeta{
		CacheKey:   cacheKeyFull,
		TTLSeconds: 60,
		RuleName:   "codex cli trace",
		SkipRetry:  true,
	})
	require.True(t, ShouldSkipRetryAfterChannelAffinityFailure(ctx))

	deleted := ClearCurrentChannelAffinityCache(ctx)
	require.True(t, deleted)
	_, found, err := cache.Get(cacheKeySuffix)
	require.NoError(t, err)
	require.False(t, found)
	require.False(t, ShouldSkipRetryAfterChannelAffinityFailure(ctx))
}

func TestChannelAffinityHitCodexTemplatePassHeadersEffective(t *testing.T) {
	gin.SetMode(gin.TestMode)

	setting := operation_setting.GetChannelAffinitySetting()
	require.NotNil(t, setting)

	var codexRule *operation_setting.ChannelAffinityRule
	for i := range setting.Rules {
		rule := &setting.Rules[i]
		if strings.EqualFold(strings.TrimSpace(rule.Name), "codex cli trace") {
			codexRule = rule
			break
		}
	}
	require.NotNil(t, codexRule)

	affinityValue := fmt.Sprintf("pc-hit-%d", time.Now().UnixNano())
	cacheKeySuffix := buildChannelAffinityCacheKeySuffix(*codexRule, "gpt-5", "default", affinityValue, 0)

	cache := getChannelAffinityCache()
	require.NoError(t, cache.SetWithTTL(cacheKeySuffix, 9527, time.Minute))
	t.Cleanup(func() {
		_, _ = cache.DeleteMany([]string{cacheKeySuffix})
	})

	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(fmt.Sprintf(`{"prompt_cache_key":"%s"}`, affinityValue)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("User-Agent", "codex_cli_rs/0.61.0")

	channelID, found := GetPreferredChannelByAffinity(ctx, "gpt-5", "default")
	require.True(t, found)
	require.Equal(t, 9527, channelID)

	baseOverride := map[string]any{
		"temperature": 0.2,
	}
	mergedOverride, applied := ApplyChannelAffinityOverrideTemplate(ctx, baseOverride)
	require.True(t, applied)
	require.Equal(t, 0.2, mergedOverride["temperature"])

	info := &relaycommon.RelayInfo{
		RequestHeaders: map[string]string{
			"Originator": "Codex CLI",
			"Session_id": "sess-123",
			"User-Agent": "codex-cli-test",
		},
		ChannelMeta: &relaycommon.ChannelMeta{
			ParamOverride: mergedOverride,
			HeadersOverride: map[string]any{
				"X-Static": "legacy-static",
			},
		},
	}

	_, err := relaycommon.ApplyParamOverrideWithRelayInfo([]byte(`{"model":"gpt-5"}`), info)
	require.NoError(t, err)
	require.True(t, info.UseRuntimeHeadersOverride)

	require.Equal(t, "legacy-static", info.RuntimeHeadersOverride["x-static"])
	require.Equal(t, "Codex CLI", info.RuntimeHeadersOverride["originator"])
	require.Equal(t, "sess-123", info.RuntimeHeadersOverride["session_id"])
	require.Equal(t, "codex-cli-test", info.RuntimeHeadersOverride["user-agent"])

	_, exists := info.RuntimeHeadersOverride["x-codex-beta-features"]
	require.False(t, exists)
	_, exists = info.RuntimeHeadersOverride["x-codex-turn-metadata"]
	require.False(t, exists)

	// A non-Codex Responses client keeps its own session trace rule instead of
	// inheriting Codex header passthrough.
	vscodeCtx, _ := gin.CreateTestContext(httptest.NewRecorder())
	vscodeCtx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(fmt.Sprintf(`{"prompt_cache_key":"%s"}`, affinityValue)))
	vscodeCtx.Request.Header.Set("Content-Type", "application/json")
	vscodeCtx.Request.Header.Set("User-Agent", "vscode/1.104.0")
	t.Cleanup(func() { common.CleanupBodyStorage(vscodeCtx) })
	_, matched, err := ResolvePreferredChannelByAffinity(vscodeCtx, "gpt-5", "default")
	require.NoError(t, err)
	require.True(t, matched)
	vscodeMeta, ok := getChannelAffinityMeta(vscodeCtx)
	require.True(t, ok)
	require.NotEqual(t, "codex cli trace", vscodeMeta.RuleName)
	_, applied = ApplyChannelAffinityOverrideTemplate(vscodeCtx, map[string]any{})
	require.False(t, applied, "non-Codex clients must not inherit Codex header passthrough")
}

func TestMidjourneyPolicyAcceptance(t *testing.T) {
	for _, tc := range []struct {
		name       string
		status     int
		code       int
		properties map[string]any
		requestErr error
		accepted   bool
		reason     string
	}{
		{name: "submitted", status: 200, code: 1, accepted: true},
		{name: "existing task", status: 200, code: 21, accepted: true},
		{name: "queued", status: 200, code: 22, accepted: true},
		{name: "HTTP 200 with rejected prompt", status: 200, code: 24, reason: "non_retryable_error"},
		{name: "failed existing task", status: 200, code: 21, properties: map[string]any{"status": "FAILURE"}, reason: "task_accepted"},
		{name: "HTTP failure", status: 502, code: 1, reason: "non_retryable_error"},
		{name: "ambiguous transport failure", status: 502, requestErr: errors.New("connection reset"), reason: "non_retryable_error"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			ctx.Request = httptest.NewRequest(http.MethodPost, "/mj/submit/imagine", strings.NewReader(`{}`))
			ctx.Set("channel_id", 7)
			state := RequestPolicy(ctx)
			state.BeginAttempt(&model.Channel{Id: 7}, "default")
			response := &dto.MidjourneyResponseWithStatusCode{StatusCode: tc.status, Response: dto.MidjourneyResponse{Code: tc.code, Properties: tc.properties}}
			accepted := RecordMidjourneyPolicyResponse(ctx, response, tc.requestErr)
			assert.Equal(t, tc.accepted, accepted)
			assert.False(t, state.Successful, "acceptance alone must not bind before local processing finishes")
			if accepted {
				MarkRequestPolicySuccess(ctx, nil)
				assert.True(t, state.Successful)
				return
			}
			events := state.Events()
			require.Len(t, events, 3)
			assert.Equal(t, PolicyDecision{Action: "failure", Reason: "upstream_failure", Source: "upstream"}, events[1].Decision)
			assert.Equal(t, tc.status, events[1].Status)
			assert.Equal(t, PolicyDecision{Action: "stop", Reason: tc.reason, Source: "system"}, events[2].Decision, "submissions are never replayed")
		})
	}
}

func TestSessionRulesInheritOrOverrideGlobalDefault(t *testing.T) {
	setting := operation_setting.GetChannelAffinitySetting()
	previous := *setting
	t.Cleanup(func() { *setting = previous })
	for _, globalMode := range []string{"", "off", "prefer", "strict"} {
		for _, tc := range []struct {
			name, mode, expected string
			skipRetry            bool
		}{
			{name: "inherit", mode: "inherit", expected: globalMode},
			{name: "override-strict", mode: "strict", expected: "strict"},
			{name: "override-prefer", mode: "prefer", expected: "prefer", skipRetry: true},
			{name: "override-off", mode: "off", expected: "off", skipRetry: true},
			{name: "legacy-strict", expected: "strict", skipRetry: true},
			{name: "legacy-prefer", expected: "prefer"},
		} {
			t.Run(globalMode+"/"+tc.name, func(t *testing.T) {
				expected := tc.expected
				if expected == "" {
					expected = "prefer"
				}
				source := "session_rule"
				if tc.mode == "inherit" {
					source = "global"
				}
				rule := operation_setting.ChannelAffinityRule{
					Name: tc.name, ModelRegex: []string{"^test-model$"},
					KeySources:  []operation_setting.ChannelAffinityKeySource{{Type: "request_header", Key: "X-Session"}},
					SessionMode: tc.mode, SkipRetryOnFailure: tc.skipRetry,
					ParamOverrideTemplate: map[string]any{"temperature": 0}, IncludeRuleName: true,
				}
				encoded, err := common.Marshal([]operation_setting.ChannelAffinityRule{rule})
				require.NoError(t, err)
				snapshot, err := model.BuildRequestPolicy(map[string]string{"RetryTimes": "2", "channel_affinity_setting.enabled": "true", "channel_affinity_setting.session_mode": globalMode, "channel_affinity_setting.rules": string(encoded)})
				require.NoError(t, err)
				*setting = snapshot.Affinity
				key := t.Name()
				cacheKey := buildChannelAffinityCacheKeySuffix(rule, "test-model", "default", key, 0)
				cache := getChannelAffinityCache()
				require.NoError(t, cache.SetWithTTL(cacheKey, 1, time.Minute))
				t.Cleanup(func() { _, err := cache.DeleteMany([]string{cacheKey}); assert.NoError(t, err) })
				ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
				ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
				ctx.Request.Header.Set("X-Session", key)
				state := RequestPolicy(ctx)
				channelID, found := GetPreferredChannelByAffinity(ctx, "test-model", "default")
				assert.Equal(t, expected != "off", found)
				if found {
					assert.Equal(t, 1, channelID)
				}
				assert.Equal(t, expected, state.SessionMode)
				assert.Equal(t, source, state.SessionModeSource)
				assert.Equal(t, expected == "strict", ShouldSkipRetryAfterChannelAffinityFailure(ctx))
				decision := DecideRelayRetry(ctx, types.NewOpenAIError(errors.New("upstream"), types.ErrorCodeBadResponseStatusCode, http.StatusTooManyRequests), 2)
				if expected == "strict" {
					assert.Equal(t, PolicyDecision{Action: "stop", Reason: "strict_session", Source: source}, decision)
				} else {
					assert.Equal(t, "retry", decision.Action)
				}
				events := state.Events()
				require.Len(t, events, 1)
				assert.Equal(t, PolicyDecision{Action: "match", Reason: "session_rule_matched", Source: "session_rule"}, events[0].Decision)
				assert.Equal(t, tc.name, events[0].Rule)
				transformed, applied := ApplyChannelAffinityOverrideTemplate(ctx, nil)
				assert.True(t, applied, "session behavior does not disable request transforms")
				assert.EqualValues(t, 0, transformed["temperature"])
				if expected == "off" {
					ctx.Set("channel_id", 9)
					RecordChannelAffinity(ctx, 9)
					cached, found, err := cache.Get(cacheKey)
					require.NoError(t, err)
					assert.True(t, found)
					assert.Equal(t, 1, cached, "off does not refresh session bindings")
					_, err = cache.DeleteMany([]string{cacheKey})
					require.NoError(t, err)
					RecordChannelAffinity(ctx, 9)
					_, found, err = cache.Get(cacheKey)
					require.NoError(t, err)
					assert.False(t, found, "off does not establish session bindings")
				}
			})
		}
	}
}
