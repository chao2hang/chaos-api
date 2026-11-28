package relay

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/jsplugin"
	"github.com/QuantumNous/new-api/pkg/requestpatch"
	"github.com/QuantumNous/new-api/relay/channel"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relay/requestplugin"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/QuantumNous/new-api/setting/request_plugin_setting"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const reasoningContentOutboundPlugin = `export const meta = {apiVersion: 1, key: "rp-strip-reasoning-test", name: "Strip reasoning test", version: "1.0.0", author: {name: "Test"}};
export function outbound() {
  return {action: "continue", effects: [{type: "json.patch", ops: [
    {op: "add", path: "/messages/0/reasoning_content", value: "plugin injected"},
    {op: "add", path: "/plugin_marker", value: true}
  ]}]};
}`

func TestTextHelperAppliesReasoningContentSettingToOutboundChatRequests(t *testing.T) {
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })

	globalSettings := model_setting.GetGlobalSettings()
	previousPassThrough := globalSettings.PassThroughRequestEnabled
	previousResponsesPolicy := globalSettings.ChatCompletionsToResponsesPolicy
	globalSettings.PassThroughRequestEnabled = false
	globalSettings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{}
	t.Cleanup(func() {
		globalSettings.PassThroughRequestEnabled = previousPassThrough
		globalSettings.ChatCompletionsToResponsesPolicy = previousResponsesPolicy
	})

	previousInstances, err := common.Marshal(request_plugin_setting.GetInstances())
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
			request_plugin_setting.InstancesOption: string(previousInstances),
		}))
	})

	require.NoError(t, i18n.Init())
	plugin, err := jsplugin.DefaultRegistry.Register(reasoningContentOutboundPlugin, jsplugin.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = jsplugin.DefaultRegistry.Unregister(plugin.Meta.Key) })

	const clientMessages = `"messages":[{"role":"assistant","content":"answer","reasoning_content":"client thought"}]`
	const noReasoningMessages = `"messages":[{"role":"assistant","content":"answer"}]`
	cases := []struct {
		name                 string
		messages             string
		strip                bool
		passThrough          bool
		replayMode           string
		injectWithPlugin     bool
		injectWithOverride   bool
		wantReasoningContent string
		wantPluginMarker     bool
		wantOverrideMarker   bool
	}{
		{
			name:        "normal chat request strips assistant field when enabled",
			messages:    clientMessages,
			strip:       true,
			passThrough: false,
		},
		{
			name:        "pass-through chat request strips assistant field when enabled",
			messages:    clientMessages,
			strip:       true,
			passThrough: true,
		},
		{
			name:                 "normal chat request preserves assistant field when replay is forced",
			messages:             clientMessages,
			replayMode:           "force",
			wantReasoningContent: "client thought",
		},
		{
			name:                 "pass-through chat request preserves assistant field when replay is forced",
			messages:             clientMessages,
			passThrough:          true,
			replayMode:           "force",
			wantReasoningContent: "client thought",
		},
		{
			name:               "strip runs after outbound plugin and parameter override",
			messages:           noReasoningMessages,
			strip:              true,
			injectWithPlugin:   true,
			injectWithOverride: true,
			wantPluginMarker:   true,
			wantOverrideMarker: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			instances := "[]"
			if tc.injectWithPlugin {
				instances = `[{"id":"strip-reasoning","name":"Strip reasoning","plugin":"rp-strip-reasoning-test","enabled":true,"global":true,"config":{}}]`
			}
			require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
				request_plugin_setting.InstancesOption: instances,
			}))

			received := make(chan []byte, 1)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, readErr := io.ReadAll(r.Body)
				if readErr == nil {
					received <- body
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				_, _ = io.WriteString(w, `{"error":{"message":"test upstream rejection","type":"invalid_request_error","code":"bad_request"}}`)
			}))
			t.Cleanup(upstream.Close)

			body := fmt.Sprintf(`{"model":"gpt-4o",%s}`, tc.messages)
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "gpt-4o")
			common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, upstream.URL)
			common.SetContextKey(c, constant.ContextKeyChannelKey, "sk-test")
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passThrough})
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{StripReasoningContent: tc.strip, ReasoningReplay: tc.replayMode})
			if tc.injectWithOverride {
				common.SetContextKey(c, constant.ContextKeyChannelParamOverride, map[string]any{
					"operations": []any{
						map[string]any{"path": "messages.0.reasoning_content", "mode": "set", "value": "override injected"},
						map[string]any{"path": "override_marker", "mode": "set", "value": true},
					},
				})
			}
			t.Cleanup(func() { common.CleanupBodyStorage(c) })

			steps, records, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAI)
			require.Nil(t, apiErr)
			request, err := helper.GetAndValidateTextRequest(c, relayconstant.RelayModeChatCompletions)
			require.NoError(t, err)
			info := relaycommon.GenRelayInfoOpenAI(c, request)
			info.SetRequestPluginIngress(steps, records)

			apiErr = TextHelper(c, info)
			require.NotNil(t, apiErr, "the fixture upstream rejects the request after recording its body")
			var forwarded []byte
			select {
			case forwarded = <-received:
			default:
				t.Fatal("upstream did not receive the chat request")
			}

			var actual struct {
				Messages []struct {
					ReasoningContent *string `json:"reasoning_content"`
				} `json:"messages"`
				PluginMarker   bool `json:"plugin_marker"`
				OverrideMarker bool `json:"override_marker"`
			}
			require.NoError(t, common.Unmarshal(forwarded, &actual))
			require.Len(t, actual.Messages, 1)
			if tc.wantReasoningContent == "" {
				assert.Nil(t, actual.Messages[0].ReasoningContent)
			} else {
				require.NotNil(t, actual.Messages[0].ReasoningContent)
				assert.Equal(t, tc.wantReasoningContent, *actual.Messages[0].ReasoningContent)
			}
			assert.Equal(t, tc.wantPluginMarker, actual.PluginMarker)
			assert.Equal(t, tc.wantOverrideMarker, actual.OverrideMarker)
		})
	}
}

// TestTextHelperReplaysCachedReasoningForStatefulUpstream covers the codex2api
// failure mode: the upstream rejects a continuation whose assistant message
// dropped its thinking text, and the gateway re-attaches the cached text.
func TestTextHelperReplaysCachedReasoningForStatefulUpstream(t *testing.T) {
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })

	globalSettings := model_setting.GetGlobalSettings()
	previousPassThrough := globalSettings.PassThroughRequestEnabled
	previousResponsesPolicy := globalSettings.ChatCompletionsToResponsesPolicy
	globalSettings.PassThroughRequestEnabled = false
	globalSettings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{}
	t.Cleanup(func() {
		globalSettings.PassThroughRequestEnabled = previousPassThrough
		globalSettings.ChatCompletionsToResponsesPolicy = previousResponsesPolicy
	})

	cases := []struct {
		name        string
		replayMode  string
		wantReason  string
		passThrough bool
		channelID   int
	}{
		{name: "force replays cached reasoning on a standard channel", replayMode: "force", wantReason: "step 1, step 2", channelID: 9301},
		{name: "pass through replays cached reasoning", replayMode: "chat", passThrough: true, wantReason: "step 1, step 2", channelID: 9301},
		{name: "another same-model channel cannot reuse state", replayMode: "chat", channelID: 9302},
		{name: "default leaves a standard channel untouched", replayMode: "", channelID: 9301},
		{name: "off keeps the request untouched", replayMode: "off", channelID: 9301},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			received := make(chan []byte, 1)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, readErr := io.ReadAll(r.Body)
				if readErr == nil {
					received <- body
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				_, _ = io.WriteString(w, `{"error":{"message":"fixture rejection","type":"invalid_request_error","code":"bad_request"}}`)
			}))
			t.Cleanup(upstream.Close)

			body := `{"model":"deepseek-flash","messages":[{"role":"user","content":"summarize the plan"},{"role":"assistant","content":"the plan is ..."},{"role":"user","content":"and then?"}]}`
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "deepseek-flash")
			common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, upstream.URL)
			common.SetContextKey(c, constant.ContextKeyChannelKey, "sk-test")
			common.SetContextKey(c, constant.ContextKeyTokenId, 9301)
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passThrough})
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: tc.replayMode})
			t.Cleanup(func() { common.CleanupBodyStorage(c) })

			steps, records, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAI)
			require.Nil(t, apiErr)
			request, err := helper.GetAndValidateTextRequest(c, relayconstant.RelayModeChatCompletions)
			require.NoError(t, err)
			common.SetContextKey(c, constant.ContextKeyChannelId, 9301)
			info := relaycommon.GenRelayInfoOpenAI(c, request)
			info.SetRequestPluginIngress(steps, records)
			info.InitChannelMeta(c)
			thought := "step 1, step 2"
			captureScope := service.ReasoningReplayScopeForChannel(info)
			captureScope.RequestedGroup = "default"
			require.True(t, service.CaptureChatReasoningTurn(9301, "deepseek-flash", captureScope, &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "summarize the plan"}}}, dto.Message{Role: "assistant", Content: "the plan is ...", ReasoningContent: &thought}))

			info.ChannelId = tc.channelID
			common.SetContextKey(c, constant.ContextKeyChannelId, tc.channelID)
			apiErr = TextHelper(c, info)
			require.NotNil(t, apiErr, "the fixture upstream rejects after recording the body")

			var forwarded []byte
			select {
			case forwarded = <-received:
			default:
				t.Fatal("upstream did not receive the chat request")
			}

			var actual struct {
				Messages []struct {
					Role             string  `json:"role"`
					ReasoningContent *string `json:"reasoning_content"`
				} `json:"messages"`
			}
			require.NoError(t, common.Unmarshal(forwarded, &actual))
			require.Len(t, actual.Messages, 3)
			assistant := actual.Messages[1]
			require.Equal(t, "assistant", assistant.Role)
			if tc.wantReason == "" {
				assert.Nil(t, assistant.ReasoningContent, "off mode must not inject reasoning")
			} else {
				require.NotNil(t, assistant.ReasoningContent)
				assert.Equal(t, tc.wantReason, *assistant.ReasoningContent)
			}
		})
	}
}

// reasoningRoundTripper captures the real outbound request without network I/O.
type reasoningRoundTripper func(*http.Request) (*http.Response, error)

func (f reasoningRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestTextHelperReasoningRejectsChatToResponsesConversion(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	previous := settings.ChatCompletionsToResponsesPolicy
	oldPass := settings.PassThroughRequestEnabled
	settings.PassThroughRequestEnabled = false
	settings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{Enabled: true, AllChannels: true, ModelPatterns: []string{".*"}}
	t.Cleanup(func() {
		settings.ChatCompletionsToResponsesPolicy = previous
		settings.PassThroughRequestEnabled = oldPass
	})
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"shared-model","messages":[{"role":"user","content":"hello"}]}`))
	common.SetContextKey(c, constant.ContextKeyOriginalModel, "shared-model")
	common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
	common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: "chat"})
	info := relaycommon.GenRelayInfoOpenAI(c, &dto.GeneralOpenAIRequest{Model: "shared-model", Messages: []dto.Message{{Role: "user", Content: "hello"}}})
	apiErr := TextHelper(c, info)
	require.NotNil(t, apiErr)
	assert.Equal(t, 400, apiErr.StatusCode)
	assert.Contains(t, apiErr.Error(), "native chat upstream")
}

func TestTextHelperReasoningSameModelChannelInstances(t *testing.T) {
	require.NoError(t, i18n.Init())
	settings := model_setting.GetGlobalSettings()
	oldPolicy, oldPass := settings.ChatCompletionsToResponsesPolicy, settings.PassThroughRequestEnabled
	settings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{}
	settings.PassThroughRequestEnabled = false
	t.Cleanup(func() {
		settings.ChatCompletionsToResponsesPolicy = oldPolicy
		settings.PassThroughRequestEnabled = oldPass
	})
	service.InitHttpClient()
	client := service.GetHttpClient()
	oldTransport := client.Transport
	t.Cleanup(func() { client.Transport = oldTransport })
	for _, tc := range []struct {
		name                               string
		channel, kind                      int
		endpoint, mode, clientReason, want string
		passthrough                        bool
	}{
		{"official", 9501, 43, "https://api.deepseek.com", "", "client thought", "client thought", false},
		{"official passthrough", 9501, 43, "https://api.deepseek.com", "", "client thought", "client thought", true},
		{"groq", 9502, 1, "https://api.groq.com/openai", "", "client thought", "", false},
		{"groq passthrough", 9502, 1, "https://api.groq.com/openai", "", "client thought", "", true},
		{"LiteLLM opt in replays missing reasoning", 9503, 1, "https://litellm.example", "chat", "", "cached thought", false},
		{"LiteLLM passthrough replays missing reasoning", 9503, 1, "https://litellm.example", "chat", "", "cached thought", true},
		{"LiteLLM preserves client reasoning", 9503, 1, "https://litellm.example", "chat", "client thought", "client thought", false},
		{"LiteLLM DeepSeek channel type uses the same policy", 9503, 43, "https://litellm.example", "chat", "", "cached thought", false},
		{"same model separate opt in channel", 9504, 1, "https://litellm.example", "chat", "", "", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			received := []byte(nil)
			client.Transport = reasoningRoundTripper(func(r *http.Request) (*http.Response, error) {
				var err error
				received, err = io.ReadAll(r.Body)
				return &http.Response{StatusCode: 400, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(`{"error":{"message":"fixture","type":"invalid_request_error"}}`)), Request: r}, err
			})
			messages := []dto.Message{{Role: "user", Content: "same opening"}, {Role: "assistant", Content: "same answer"}, {Role: "user", Content: "next"}}
			if tc.clientReason != "" {
				messages[1].ReasoningContent = &tc.clientReason
			}
			req := &dto.GeneralOpenAIRequest{Model: "shared-model", Messages: messages}
			raw, err := common.Marshal(req)
			require.NoError(t, err)
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(string(raw)))
			c.Request.Header.Set("Content-Type", "application/json")
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "shared-model")
			common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			common.SetContextKey(c, constant.ContextKeyChannelType, tc.kind)
			common.SetContextKey(c, constant.ContextKeyChannelId, tc.channel)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, tc.endpoint)
			common.SetContextKey(c, constant.ContextKeyChannelKey, "key")
			common.SetContextKey(c, constant.ContextKeyTokenId, 9500)
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passthrough})
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: tc.mode})
			t.Cleanup(func() { common.CleanupBodyStorage(c) })
			info := relaycommon.GenRelayInfoOpenAI(c, req)
			info.InitChannelMeta(c)
			captureScope := service.ReasoningReplayScopeForChannel(info)
			captureScope.RequestedGroup = "default"
			captureScope.ChannelID = 9503
			captureScope.Endpoint = "https://litellm.example"
			thought := "cached thought"
			require.True(t, service.CaptureChatReasoningTurn(9500, "shared-model", captureScope, &dto.GeneralOpenAIRequest{Messages: messages[:1]}, dto.Message{Role: "assistant", Content: "same answer", ReasoningContent: &thought}))
			require.NotNil(t, TextHelper(c, info))
			require.NotEmpty(t, received)
			var actual dto.GeneralOpenAIRequest
			require.NoError(t, common.Unmarshal(received, &actual))
			assert.Equal(t, tc.want, actual.Messages[1].GetReasoningContent())
		})
	}
}

// assistant reasoning_content outright, so the default policy strips it even
// when the channel has no explicit strip_reasoning_content setting.
type lateChatReasoningHeaderAdaptor struct {
	openai.Adaptor
	late func(*relaycommon.RelayInfo)
}

func (a *lateChatReasoningHeaderAdaptor) SetupRequestHeader(c *gin.Context, header *http.Header, info *relaycommon.RelayInfo) error {
	if err := a.Adaptor.SetupRequestHeader(c, header, info); err != nil {
		return err
	}
	if a.late != nil {
		a.late(info)
	}
	return nil
}

type signedChatReasoningHeaderAdaptor struct {
	lateChatReasoningHeaderAdaptor
}

func (*signedChatReasoningHeaderAdaptor) SignUpstreamRequest(_ *gin.Context, _ *relaycommon.RelayInfo, _ string, _ *url.URL, header http.Header) error {
	header.Set("Authorization", "Bearer signed-for-another-account")
	return nil
}

func TestChatReasoningReplayRejectsLateHeaderEffectsBeforeSend(t *testing.T) {
	for _, tc := range []struct {
		name     string
		late     func(*relaycommon.RelayInfo)
		signed   bool
		wantSend bool
	}{
		{name: "static same value", late: func(info *relaycommon.RelayInfo) {
			info.HeadersOverride = map[string]any{"X-Upstream-Account": "account-a"}
		}, wantSend: true},
		{name: "late plugin set", late: func(info *relaycommon.RelayInfo) {
			info.RequestPluginHeaders = []requestpatch.Effect{{Set: map[string]string{"X-Upstream-Account": "account-b"}}}
		}},
		{name: "late plugin remove", late: func(info *relaycommon.RelayInfo) {
			info.RequestPluginHeaders = []requestpatch.Effect{{Remove: []string{"X-Upstream-Account"}}}
		}},
		{name: "signed upstream may change account", signed: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			received := 0
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				received++
				raw, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				assert.Contains(t, string(raw), "account-a thought")
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{}`)
			}))
			t.Cleanup(upstream.Close)
			req := &dto.GeneralOpenAIRequest{Model: "m", Messages: []dto.Message{{Role: "user", Content: "opening"}, {Role: "assistant", Content: "answer"}}}
			info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 9913, ChannelType: constant.ChannelTypeOpenAI, ApiKey: "configured", ChannelBaseUrl: upstream.URL, UpstreamModelName: "m", HeadersOverride: map[string]any{"X-Upstream-Account": "account-a"}}, RelayMode: relayconstant.RelayModeChatCompletions, RelayFormat: types.RelayFormatOpenAI, RequestURLPath: "/v1/chat/completions", Request: req}
			scope := service.ReasoningReplayScopeForChannel(info)
			thought := "account-a thought"
			require.True(t, service.CaptureChatReasoningTurn(9913, "m", scope, &dto.GeneralOpenAIRequest{Messages: req.Messages[:1]}, dto.Message{Role: "assistant", Content: "answer", ReasoningContent: &thought}))
			raw, err := common.Marshal(req)
			require.NoError(t, err)
			replayed, changed := service.ReplayChatReasoningBody(9913, "m", "chat", raw, scope)
			require.True(t, changed)
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(string(replayed)))
			service.MarkChatReasoningReplay(c, info)
			var adaptor channel.Adaptor = &lateChatReasoningHeaderAdaptor{late: tc.late}
			if tc.signed {
				adaptor = &signedChatReasoningHeaderAdaptor{}
			}
			response, err := channel.DoApiRequest(adaptor, c, info, strings.NewReader(string(replayed)))
			if tc.wantSend {
				require.NoError(t, err)
				require.NotNil(t, response)
				response.Body.Close()
				assert.Equal(t, 1, received)
			} else {
				require.Error(t, err)
				var apiErr *types.NewAPIError
				require.ErrorAs(t, err, &apiErr)
				assert.Equal(t, http.StatusConflict, apiErr.StatusCode)
				assert.True(t, types.IsSkipRetryError(apiErr))
				assert.Zero(t, received)
			}
			service.ResetChatReasoningReplay(c)
			assert.True(t, service.ChatReasoningReplayHeadersMatch(c, info))
		})
	}
}

func TestTextHelperChatReasoningDoesNotCrossHeaderAccounts(t *testing.T) {
	require.NoError(t, i18n.Init())
	settings := model_setting.GetGlobalSettings()
	oldPolicy, oldPass := settings.ChatCompletionsToResponsesPolicy, settings.PassThroughRequestEnabled
	settings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{}
	settings.PassThroughRequestEnabled = false
	t.Cleanup(func() {
		settings.ChatCompletionsToResponsesPolicy = oldPolicy
		settings.PassThroughRequestEnabled = oldPass
	})
	service.InitHttpClient()
	client := service.GetHttpClient()
	oldTransport := client.Transport
	t.Cleanup(func() { client.Transport = oldTransport })
	for _, tc := range []struct {
		name                           string
		passthrough, dynamic, official bool
	}{
		{name: "dynamic normal", dynamic: true}, {name: "dynamic passthrough", dynamic: true, passthrough: true},
		{name: "static normal"}, {name: "static passthrough", passthrough: true},
		{name: "DeepSeek dynamic preserves client", dynamic: true, official: true}, {name: "DeepSeek dynamic passthrough preserves client", dynamic: true, passthrough: true, official: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var received []byte
			var authorization string
			client.Transport = reasoningRoundTripper(func(r *http.Request) (*http.Response, error) {
				var err error
				received, err = io.ReadAll(r.Body)
				authorization = r.Header.Get("Authorization")
				return &http.Response{StatusCode: 400, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(`{"error":{"message":"fixture","type":"invalid_request_error"}}`)), Request: r}, err
			})
			req := &dto.GeneralOpenAIRequest{Model: "same-model", Messages: []dto.Message{{Role: "user", Content: "opening"}, {Role: "assistant", Content: "answer"}, {Role: "user", Content: "next"}}}
			if tc.official {
				thought := "client supplied"
				req.Messages[1].ReasoningContent = &thought
			}
			raw, err := common.Marshal(req)
			require.NoError(t, err)
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(string(raw)))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Request.Header.Set("X-Upstream-Authorization", "Bearer account-b")
			kind, endpoint := constant.ChannelTypeOpenAI, "https://relay.example"
			if tc.official {
				kind = constant.ChannelTypeDeepSeek
				endpoint = "https://api.deepseek.com"
			}
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "same-model")
			common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			common.SetContextKey(c, constant.ContextKeyChannelType, kind)
			common.SetContextKey(c, constant.ContextKeyChannelId, 9912)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, endpoint)
			common.SetContextKey(c, constant.ContextKeyChannelKey, "configured-key")
			common.SetContextKey(c, constant.ContextKeyTokenId, 9912)
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passthrough})
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: "chat"})
			common.SetContextKey(c, constant.ContextKeyChannelHeaderOverride, map[string]any{"Authorization": "Bearer account-a"})
			t.Cleanup(func() { common.CleanupBodyStorage(c) })
			info := relaycommon.GenRelayInfoOpenAI(c, req)
			info.InitChannelMeta(c)
			scope := service.ReasoningReplayScopeForChannel(info)
			scope.RequestedGroup = "default"
			thought := "private account-a thinking"
			require.True(t, service.CaptureChatReasoningTurn(9912, "same-model", scope, &dto.GeneralOpenAIRequest{Messages: req.Messages[:1]}, dto.Message{Role: "assistant", Content: "answer", ReasoningContent: &thought}))
			override := "Bearer account-b"
			if tc.dynamic {
				override = "{client_header:X-Upstream-Authorization}"
			}
			common.SetContextKey(c, constant.ContextKeyChannelHeaderOverride, map[string]any{"Authorization": override})
			require.NotNil(t, TextHelper(c, info))
			require.NotEmpty(t, received)
			assert.Equal(t, "Bearer account-b", authorization)
			assert.NotContains(t, string(received), thought)
			var actual dto.GeneralOpenAIRequest
			require.NoError(t, common.Unmarshal(received, &actual))
			if tc.official {
				assert.Equal(t, "client supplied", actual.Messages[1].GetReasoningContent())
			} else {
				assert.Empty(t, actual.Messages[1].GetReasoningContent())
			}
		})
	}
}

func TestTextHelperStripsReasoningContentOnStandardUpstreams(t *testing.T) {
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })

	globalSettings := model_setting.GetGlobalSettings()
	previousPassThrough := globalSettings.PassThroughRequestEnabled
	globalSettings.PassThroughRequestEnabled = false
	t.Cleanup(func() { globalSettings.PassThroughRequestEnabled = previousPassThrough })
	require.NoError(t, i18n.Init())

	received := make(chan []byte, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, readErr := io.ReadAll(r.Body)
		if readErr == nil {
			received <- body
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = io.WriteString(w, `{"error":{"message":"reasoning_content is not supported","type":"invalid_request_error","code":"bad_request"}}`)
	}))
	t.Cleanup(upstream.Close)

	body := `{"model":"qwen/qwen3.8-27b","messages":[{"role":"user","content":"hi"},{"role":"assistant","content":"answer","reasoning_content":"client thought"},{"role":"user","content":"next"}]}`
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	common.SetContextKey(c, constant.ContextKeyOriginalModel, "qwen/qwen3.8-27b")
	common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
	common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
	common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, upstream.URL)
	common.SetContextKey(c, constant.ContextKeyChannelKey, "gsk-test")
	common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{})
	t.Cleanup(func() { common.CleanupBodyStorage(c) })

	steps, records, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAI)
	require.Nil(t, apiErr)
	request, err := helper.GetAndValidateTextRequest(c, relayconstant.RelayModeChatCompletions)
	require.NoError(t, err)
	info := relaycommon.GenRelayInfoOpenAI(c, request)
	info.SetRequestPluginIngress(steps, records)

	apiErr = TextHelper(c, info)
	require.NotNil(t, apiErr, "the fixture rejects after recording the body")

	var forwarded []byte
	select {
	case forwarded = <-received:
	default:
		t.Fatal("upstream did not receive the chat request")
	}
	require.NotContains(t, string(forwarded), "reasoning_content")
	require.Contains(t, string(forwarded), `"content":"answer"`)
}

// #28 end to end: the upstream rejects function tools combined with a non-none
// reasoning_effort on gpt-6 chat, so the gateway must drop the effort and still
// deliver the tool call.
func TestTextHelperResolvesToolsReasoningConflictOnGpt6(t *testing.T) {
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })

	globalSettings := model_setting.GetGlobalSettings()
	previousPassThrough := globalSettings.PassThroughRequestEnabled
	previousPolicy := globalSettings.ChatCompletionsToResponsesPolicy
	globalSettings.PassThroughRequestEnabled = false
	globalSettings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{}
	t.Cleanup(func() {
		globalSettings.PassThroughRequestEnabled = previousPassThrough
		globalSettings.ChatCompletionsToResponsesPolicy = previousPolicy
	})
	require.NoError(t, i18n.Init())

	database := setupRelayChannelDB(t)
	require.NoError(t, database.AutoMigrate(&model.User{}, &model.Token{}, &model.Log{}))
	previousRedis := common.RedisEnabled
	common.RedisEnabled = false
	previousLogDB := model.LOG_DB
	model.LOG_DB = database
	t.Cleanup(func() {
		common.RedisEnabled = previousRedis
		model.LOG_DB = previousLogDB
	})

	const successBody = `{"id":"chatcmpl-1","object":"chat.completion","created":1,"model":"gpt-6-luna","choices":[{"index":0,"message":{"role":"assistant","content":"ok"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`

	cases := []struct {
		name       string
		settings   dto.ChannelOtherSettings
		wantStatus int
		wantEffort bool
		wantTools  bool
	}{
		{name: "default drops the effort and keeps tools", wantStatus: http.StatusOK, wantEffort: false, wantTools: true},
		{name: "strip_tools keeps the effort", settings: dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: dto.ToolsReasoningConflictStripTools}, wantStatus: http.StatusOK, wantEffort: true, wantTools: false},
		{name: "passthrough still fails upstream", settings: dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: dto.ToolsReasoningConflictPassthrough}, wantStatus: http.StatusBadRequest, wantEffort: true, wantTools: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			received := make(chan []byte, 1)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, readErr := io.ReadAll(r.Body)
				if readErr == nil {
					received <- body
				}
				// Behaves like the real gpt-6 chat endpoint: tools plus a non-none
				// reasoning_effort is a hard 400.
				hasTools := strings.Contains(string(body), `"tools"`)
				hasEffort := strings.Contains(string(body), `"reasoning_effort"`)
				w.Header().Set("Content-Type", "application/json")
				if hasTools && hasEffort {
					w.WriteHeader(http.StatusBadRequest)
					_, _ = io.WriteString(w, `{"error":{"message":"Function tools with reasoning_effort are not supported for gpt-6-luna in /v1/chat/completions.","type":"invalid_request_error","param":"reasoning_effort"}}`)
					return
				}
				w.WriteHeader(http.StatusOK)
				_, _ = io.WriteString(w, successBody)
			}))
			t.Cleanup(upstream.Close)

			body := `{"model":"gpt-6-luna","reasoning_effort":"medium","messages":[{"role":"user","content":"list files"}],"tools":[{"type":"function","function":{"name":"ls","parameters":{"type":"object"}}}]}`
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "gpt-6-luna")
			common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, upstream.URL)
			common.SetContextKey(c, constant.ContextKeyChannelKey, "sk-test")
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, tc.settings)
			t.Cleanup(func() { common.CleanupBodyStorage(c) })

			steps, records, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAI)
			require.Nil(t, apiErr)
			request, err := helper.GetAndValidateTextRequest(c, relayconstant.RelayModeChatCompletions)
			require.NoError(t, err)
			info := relaycommon.GenRelayInfoOpenAI(c, request)
			info.SetRequestPluginIngress(steps, records)

			apiErr = TextHelper(c, info)
			if tc.wantStatus == http.StatusOK {
				require.Nil(t, apiErr, "the gateway must resolve the conflict: %v", apiErr)
				require.Equal(t, http.StatusOK, recorder.Code)
			} else {
				require.NotNil(t, apiErr)
				require.Equal(t, http.StatusBadRequest, apiErr.StatusCode)
			}

			var forwarded []byte
			select {
			case forwarded = <-received:
			default:
				t.Fatal("upstream did not receive the chat request")
			}
			require.Equal(t, tc.wantTools, strings.Contains(string(forwarded), `"tools"`), string(forwarded))
			require.Equal(t, tc.wantEffort, strings.Contains(string(forwarded), `"reasoning_effort"`), string(forwarded))
		})
	}
}
