package relay

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/pkg/jsplugin"
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
			name:                 "normal chat request preserves assistant field when disabled",
			messages:             clientMessages,
			wantReasoningContent: "client thought",
		},
		{
			name:                 "pass-through chat request preserves assistant field when disabled",
			messages:             clientMessages,
			passThrough:          true,
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
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{StripReasoningContent: tc.strip})
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

	history := &dto.GeneralOpenAIRequest{
		Model: "deepseek-flash",
		Messages: []dto.Message{
			{Role: "user", Content: "summarize the plan"},
			{Role: "assistant", Content: "the plan is ..."},
		},
	}
	require.True(t, service.CaptureChatReasoning(9301, "deepseek-flash", history, "step 1, step 2"))

	cases := []struct {
		name       string
		replayMode string
		wantReason string
	}{
		{name: "default replays cached reasoning", replayMode: "", wantReason: "step 1, step 2"},
		{name: "chat mode replays", replayMode: "chat", wantReason: "step 1, step 2"},
		{name: "off keeps the request untouched", replayMode: "off"},
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
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: tc.replayMode})
			t.Cleanup(func() { common.CleanupBodyStorage(c) })

			steps, records, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAI)
			require.Nil(t, apiErr)
			request, err := helper.GetAndValidateTextRequest(c, relayconstant.RelayModeChatCompletions)
			require.NoError(t, err)
			info := relaycommon.GenRelayInfoOpenAI(c, request)
			info.SetRequestPluginIngress(steps, records)

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
