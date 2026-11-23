package relay

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/pkg/jsplugin"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
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
	"github.com/tidwall/gjson"
)

func TestPrepareResponsesReasoningChannelReplay(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	old := settings.PassThroughRequestEnabled
	settings.PassThroughRequestEnabled = false
	t.Cleanup(func() { settings.PassThroughRequestEnabled = old })
	for _, tc := range []struct {
		name, mode, ua    string
		channel           int
		passthrough, want bool
	}{
		{"explicit opt in", "responses", "", 9601, false, true},
		{"passthrough opt in", "responses", "", 9601, true, true},
		{"same model other instance", "responses", "", 9602, false, false},
		{"off", "off", "", 9601, false, false},
		{"codex client", "responses", "codex_cli_rs/1", 9601, false, false},
		{"codex passthrough", "responses", "codex_cli_rs/1", 9601, true, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw := `{"model":"shared-model","input":[{"role":"user","content":"hi"},{"role":"assistant","content":"answer"},{"role":"user","content":"continue"}]}`
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("POST", "/v1/responses", strings.NewReader(raw))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Request.Header.Set("User-Agent", tc.ua)
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "shared-model")
			common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
			common.SetContextKey(c, constant.ContextKeyChannelId, tc.channel)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, "https://relay.example")
			common.SetContextKey(c, constant.ContextKeyChannelKey, "key")
			common.SetContextKey(c, constant.ContextKeyTokenId, 9600)
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passthrough})
			common.SetContextKey(c, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: tc.mode})
			t.Cleanup(func() { common.CleanupBodyStorage(c) })
			var req dto.OpenAIResponsesRequest
			require.NoError(t, common.Unmarshal([]byte(raw), &req))
			info := relaycommon.GenRelayInfoResponses(c, &req)
			info.InitChannelMeta(c)
			scope := service.ReasoningReplayScopeForChannel(info)
			scope.ChannelID = 9601
			require.True(t, service.CaptureResponsesReasoning(9600, "shared-model", json.RawMessage(`[{"role":"user","content":"hi"}]`), json.RawMessage(`[{"type":"reasoning","content":[{"type":"reasoning_text","text":"cached"}]},{"role":"assistant","content":"answer"}]`), scope))
			_, body, closer, apiErr := PrepareResponsesRequest(c, info, &req)
			require.Nil(t, apiErr)
			defer closer.Close()
			wire, err := io.ReadAll(body)
			require.NoError(t, err)
			assert.Equal(t, tc.want, strings.Contains(string(wire), `"reasoning_text"`))
		})
	}
}

func TestPrepareResponsesReplayKeepsRootAfterPromptKeyIsOmitted(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	previous := settings.PassThroughRequestEnabled
	settings.PassThroughRequestEnabled = false
	t.Cleanup(func() { settings.PassThroughRequestEnabled = previous })

	const model = "gpt-root-session-test"
	const tokenID = 9671
	const channelID = 9672
	firstBody := `{"model":"gpt-root-session-test","prompt_cache_key":"session-p","input":[{"role":"user","content":"first"}]}`
	first, _ := gin.CreateTestContext(httptest.NewRecorder())
	first.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(firstBody))
	first.Set("id", 9670)
	first.Set("token_id", tokenID)
	first.Set("channel_id", channelID)
	common.SetContextKey(first, constant.ContextKeyOriginalModel, model)
	common.SetContextKey(first, constant.ContextKeyUsingGroup, "default")
	common.SetContextKey(first, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
	common.SetContextKey(first, constant.ContextKeyChannelId, channelID)
	common.SetContextKey(first, constant.ContextKeyChannelBaseUrl, "https://upstream.example")
	common.SetContextKey(first, constant.ContextKeyChannelKey, "sk-root-session")
	common.SetContextKey(first, constant.ContextKeyTokenId, tokenID)
	common.SetContextKey(first, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: service.ReasoningReplayModeResponses})
	t.Cleanup(func() { common.CleanupBodyStorage(first) })
	var firstReq dto.OpenAIResponsesRequest
	require.NoError(t, common.Unmarshal([]byte(firstBody), &firstReq))
	firstInfo := relaycommon.GenRelayInfoResponses(first, &firstReq)
	firstInfo.InitChannelMeta(first)
	sessionID, err := service.RecordResponsesAffinityIDs(first, model, "default", "sk-root-session", "resp_first", []string{"rs_first"})
	require.NoError(t, err)
	require.NotEmpty(t, sessionID)

	scope := service.ReasoningReplayScopeForChannel(firstInfo)
	scope.RequestedGroup = "default"
	scope.SessionID = sessionID
	secondInput := json.RawMessage(`[{"role":"user","content":"first"},{"type":"reasoning","id":"rs_first","content":[{"type":"reasoning_text","text":"first-thought"}]},{"role":"assistant","content":"answer-one"},{"role":"user","content":"second"}]`)
	secondOutput := json.RawMessage(`[{"type":"reasoning","id":"rs_second","content":[{"type":"reasoning_text","text":"second-thought"}]},{"role":"assistant","content":"answer-two"}]`)
	require.True(t, service.CaptureResponsesReasoning(tokenID, model, secondInput, secondOutput, scope))

	thirdBody := `{"model":"gpt-root-session-test","prompt_cache_key":"session-p","input":[{"role":"user","content":"first"},{"type":"reasoning","id":"rs_first","content":[{"type":"reasoning_text","text":"first-thought"}]},{"role":"assistant","content":"answer-one"},{"role":"user","content":"second"},{"role":"assistant","content":"answer-two"},{"role":"user","content":"third"}]}`
	third, _ := gin.CreateTestContext(httptest.NewRecorder())
	third.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(thirdBody))
	third.Set("id", 9670)
	third.Set("token_id", tokenID)
	common.SetContextKey(third, constant.ContextKeyOriginalModel, model)
	common.SetContextKey(third, constant.ContextKeyUsingGroup, "default")
	common.SetContextKey(third, constant.ContextKeyChannelType, constant.ChannelTypeOpenAI)
	common.SetContextKey(third, constant.ContextKeyChannelId, channelID)
	common.SetContextKey(third, constant.ContextKeyChannelBaseUrl, "https://upstream.example")
	common.SetContextKey(third, constant.ContextKeyChannelKey, "sk-root-session")
	common.SetContextKey(third, constant.ContextKeyTokenId, tokenID)
	common.SetContextKey(third, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{ReasoningReplay: service.ReasoningReplayModeResponses})
	t.Cleanup(func() { common.CleanupBodyStorage(third) })
	_, found, err := service.ResolveResponsesAffinityIDs(third, model, "default", "", nil)
	require.NoError(t, err)
	require.True(t, found)
	var thirdReq dto.OpenAIResponsesRequest
	require.NoError(t, common.Unmarshal([]byte(thirdBody), &thirdReq))
	thirdInfo := relaycommon.GenRelayInfoResponses(third, &thirdReq)
	_, outgoing, closer, apiErr := PrepareResponsesRequest(third, thirdInfo, &thirdReq)
	require.Nil(t, apiErr)
	t.Cleanup(func() { require.NoError(t, closer.Close()) })
	wire, err := io.ReadAll(outgoing)
	require.NoError(t, err)
	assert.Contains(t, string(wire), `"text":"second-thought"`)
}

func TestPrepareResponsesRequestDeepSeekEffectiveReasoning(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	previous := settings.PassThroughRequestEnabled
	t.Cleanup(func() { settings.PassThroughRequestEnabled = previous })
	settings.PassThroughRequestEnabled = false
	const input = `[{"type":"function_call","call_id":"c1","name":"lookup","arguments":"{}"}]`
	for _, tc := range []struct {
		name, effort, override, endpoint         string
		passthrough, replaceInput, wantReasoning bool
		globalPassthrough                        bool
	}{
		{name: "override enables thinking", effort: "none", override: "high", wantReasoning: true},
		{name: "override disables thinking", effort: "high", override: "none"},
		{name: "override replaces history", effort: "high", override: "high", replaceInput: true, wantReasoning: true},
		{name: "no override", effort: "high", wantReasoning: true},
		{name: "thinking disabled", effort: "none"},
		{name: "third party endpoint", effort: "none", override: "high", endpoint: "https://other.example"},
		{name: "passthrough bypasses overrides and normalization", effort: "none", override: "high", passthrough: true},
		{name: "global passthrough bypasses normalization", effort: "high", globalPassthrough: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			settings.PassThroughRequestEnabled = tc.globalPassthrough
			endpoint := tc.endpoint
			if endpoint == "" {
				endpoint = "https://API.DEEPSEEK.COM:443/v1"
			}
			raw := `{"model":"deepseek-flash","reasoning":{"effort":"` + tc.effort + `"},"input":` + input + `}`
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(raw))
			c.Request.Header.Set("Content-Type", "application/json")
			t.Cleanup(func() { common.CleanupBodyStorage(c) })
			common.SetContextKey(c, constant.ContextKeyOriginalModel, "deepseek-flash")
			common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeDeepSeek)
			common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, endpoint)
			common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{PassThroughBodyEnabled: tc.passthrough})
			if tc.override != "" {
				ops := []any{map[string]any{"path": "reasoning.effort", "mode": "set", "value": tc.override}, map[string]any{"path": "vendor_extension", "mode": "set", "value": "preserved"}}
				if tc.replaceInput {
					var replacement any
					require.NoError(t, common.Unmarshal([]byte(input), &replacement))
					ops = append(ops, map[string]any{"path": "input", "mode": "set", "value": replacement})
				}
				common.SetContextKey(c, constant.ContextKeyChannelParamOverride, map[string]any{"operations": ops})
			}
			var req dto.OpenAIResponsesRequest
			require.NoError(t, common.Unmarshal([]byte(raw), &req))
			info := relaycommon.GenRelayInfoResponses(c, &req)
			_, body, closer, apiErr := PrepareResponsesRequest(c, info, &req)
			require.Nil(t, apiErr)
			t.Cleanup(func() { require.NoError(t, closer.Close()) })
			wire, err := io.ReadAll(body)
			require.NoError(t, err)
			if tc.passthrough || tc.globalPassthrough {
				assert.JSONEq(t, raw, string(wire))
				return
			}
			wantEffort := tc.effort
			if tc.override != "" {
				wantEffort = tc.override
				assert.Equal(t, "preserved", gjson.GetBytes(wire, "vendor_extension").String())
			}
			assert.Equal(t, wantEffort, gjson.GetBytes(wire, "reasoning.effort").String())
			if tc.wantReasoning {
				assert.Equal(t, "reasoning", gjson.GetBytes(wire, "input.0.type").String())
				assert.Equal(t, " ", gjson.GetBytes(wire, "input.0.content.0.text").String())
				assert.Equal(t, "function_call", gjson.GetBytes(wire, "input.1.type").String())
			} else {
				assert.JSONEq(t, input, gjson.GetBytes(wire, "input").Raw)
			}
		})
	}
}

// finalizedEgressPlugin rejects a body whose first input item is reasoning,
// which only the DeepSeek finalizer adds to the test request.
const finalizedEgressPlugin = `export const meta = {apiVersion: 1, key: "rp-finalized-egress", name: "Finalized egress", version: "1.0.0", author: {name: "Test"}};
export function egress(ctx, req) {
  const input = req.body && req.body.input;
  if (Array.isArray(input) && input.length && input[0].type === "reasoning") {
    return {action: "reject", code: "finalized.seen", message: "Egress saw the finalized body"};
  }
  return {action: "continue"};
}`

func TestPrepareResponsesRequestEgressReadsTheFinalizedBody(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	previous := settings.PassThroughRequestEnabled
	t.Cleanup(func() { settings.PassThroughRequestEnabled = previous })
	settings.PassThroughRequestEnabled = false
	require.NoError(t, i18n.Init())
	plugin, err := jsplugin.DefaultRegistry.Register(finalizedEgressPlugin, jsplugin.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = jsplugin.DefaultRegistry.Unregister(plugin.Meta.Key) })
	require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{request_plugin_setting.InstancesOption: `[{"id":"fe","name":"Finalized","plugin":"rp-finalized-egress","enabled":true,"global":true}]`}))
	t.Cleanup(func() {
		require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{request_plugin_setting.InstancesOption: "[]"}))
	})

	raw := `{"model":"deepseek-flash","reasoning":{"effort":"high"},"input":[{"type":"function_call","call_id":"c1","name":"lookup","arguments":"{}"}]}`
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(raw))
	c.Request.Header.Set("Content-Type", "application/json")
	t.Cleanup(func() { common.CleanupBodyStorage(c) })
	common.SetContextKey(c, constant.ContextKeyOriginalModel, "deepseek-flash")
	common.SetContextKey(c, constant.ContextKeyChannelType, constant.ChannelTypeDeepSeek)
	common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, "https://api.deepseek.com")
	common.SetContextKey(c, constant.ContextKeyChannelSetting, dto.ChannelSettings{})
	_, _, apiErr := requestplugin.Ingress(c, types.RelayFormatOpenAIResponses)
	require.Nil(t, apiErr)
	var req dto.OpenAIResponsesRequest
	require.NoError(t, common.Unmarshal([]byte(raw), &req))
	info := relaycommon.GenRelayInfoResponses(c, &req)
	_, _, closer, apiErr := PrepareResponsesRequest(c, info, &req)
	if closer != nil {
		t.Cleanup(func() { _ = closer.Close() })
	}
	require.NotNil(t, apiErr, "egress must read the reasoning item the finalizer added")
	assert.Equal(t, types.ErrorCodeRequestRejected, apiErr.GetErrorCode())
}
