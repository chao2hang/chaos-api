package service

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/pkg/requestpatch"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"testing"
)

func TestChatReasoningHeaderIdentity(t *testing.T) {
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 9911, ChannelType: 43, ApiKey: "configured-key"}, Request: &dto.GeneralOpenAIRequest{Model: "m"}}
	for _, overrides := range []map[string]any{
		{"Authorization": "{client_header:X-Upstream-Authorization}"}, {"*": ""}, {"re:^X-": ""}, {"regex:^X-": ""},
	} {
		info.HeadersOverride = overrides
		strip, replay := ReasoningReplayPolicyForChannel(info, "chat")
		assert.False(t, strip, "client-owned DeepSeek state must survive")
		assert.False(t, replay)
		assert.Zero(t, ReasoningReplayScopeForChannel(info).ChannelID)
	}
	info.HeadersOverride = map[string]any{"Authorization": "Bearer account-a"}
	scopeA := ReasoningReplayScopeForChannel(info)
	info.HeadersOverride = map[string]any{"Authorization": "Bearer account-b"}
	scopeB := ReasoningReplayScopeForChannel(info)
	assert.NotEqual(t, reasoningReplayKey(1, "m", "history", scopeA), reasoningReplayKey(1, "m", "history", scopeB))
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	MarkChatReasoningReplay(c, info)
	assert.True(t, ChatReasoningReplayHeadersMatch(c, info))
	info.RequestPluginHeaders = []requestpatch.Effect{{Set: map[string]string{"X-Upstream-Account": "late-account"}}}
	assert.False(t, ChatReasoningReplayHeadersMatch(c, info))
	ResetChatReasoningReplay(c)
	assert.True(t, ChatReasoningReplayHeadersMatch(c, info))
}

func TestReasoningPolicyIsPerChannel(t *testing.T) {
	for _, tc := range []struct {
		name                        string
		kind                        int
		endpoint, mode, surface, ua string
		stripSetting, strip, replay bool
	}{
		{name: "deepseek official", kind: 43, endpoint: "https://api.deepseek.com", surface: "chat", replay: true},
		{name: "deepseek default endpoint", kind: 43, surface: "chat", replay: true},
		{name: "deepseek replay off preserves client", kind: 43, mode: "off", surface: "chat"},
		{name: "custom endpoint not inferred from deepseek model", kind: 43, endpoint: "https://api.groq.com/openai", surface: "chat", strip: true},
		{name: "groq standard", kind: 1, endpoint: "https://api.groq.com/openai", surface: "chat", strip: true},
		{name: "codex2api opt in", kind: 1, endpoint: "http://fixture", mode: "chat", surface: "chat", replay: true},
		{name: "same type other instance off", kind: 1, endpoint: "http://fixture", mode: "off", surface: "chat", strip: true},
		{name: "responses mode does not opt into chat", kind: 1, mode: "responses", surface: "chat", strip: true},
		{name: "chat mode does not replay responses", kind: 1, mode: "chat", surface: "responses"},
		{name: "explicit strip wins", kind: 43, surface: "chat", stripSetting: true, strip: true},
		{name: "native codex client", kind: 57, surface: "responses", ua: "codex_cli_rs/1"},
		{name: "native codex generic client", kind: 57, surface: "responses", replay: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 22, ChannelType: tc.kind, ChannelBaseUrl: tc.endpoint, ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplay: tc.mode, StripReasoningContent: tc.stripSetting}}, RequestHeaders: map[string]string{"User-Agent": tc.ua}}
			strip, replay := ReasoningReplayPolicyForChannel(info, tc.surface)
			assert.Equal(t, tc.strip, strip)
			assert.Equal(t, tc.replay, replay)
		})
	}
	assert.Equal(t, ReasoningReplayModeAuto, NormalizeReasoningReplayMode("bogus"))
	assert.False(t, ReasoningReplayAllows("off", "chat"))
	assert.True(t, IsCodexClient("OpenAI-Codex/1.2"))
	assert.False(t, IsCodexClient("curl/8"))
}
func TestChatReasoningReplayCompleteHistory(t *testing.T) {
	scope := ReasoningReplayScope{ChannelID: 2201, Credential: "secret-a"}
	first := &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "same opening"}}}
	thought1 := " first raw thought "
	assistant1 := dto.Message{Role: "assistant", Content: "answer-a", ReasoningContent: &thought1}
	require.True(t, CaptureChatReasoningTurn(71, "shared-model", scope, first, assistant1))
	second := &dto.GeneralOpenAIRequest{Messages: []dto.Message{first.Messages[0], {Role: "assistant", Content: "answer-a"}, {Role: "user", Content: "continue"}}}
	thought2 := "second thought"
	assistant2 := dto.Message{Role: "assistant", Content: "answer-b", ReasoningContent: &thought2}
	require.True(t, CaptureChatReasoningTurn(71, "shared-model", scope, second, assistant2))
	third := &dto.GeneralOpenAIRequest{Messages: append(append([]dto.Message{}, second.Messages...), dto.Message{Role: "assistant", Content: "answer-b"}, dto.Message{Role: "user", Content: "last"})}
	require.True(t, ReplayChatReasoning(71, "shared-model", "chat", third, scope))
	assert.Equal(t, thought1, third.Messages[1].GetReasoningContent())
	assert.Equal(t, thought2, third.Messages[3].GetReasoningContent())
	for _, tc := range []struct {
		name  string
		scope ReasoningReplayScope
		token int
		model string
	}{
		{"channel", ReasoningReplayScope{ChannelID: 2202, Credential: "secret-a"}, 71, "shared-model"},
		{"credential", ReasoningReplayScope{ChannelID: 2201, Credential: "secret-b"}, 71, "shared-model"},
		{"session", ReasoningReplayScope{ChannelID: 2201, Credential: "secret-a", SessionID: "another"}, 71, "shared-model"},
		{"group", ReasoningReplayScope{ChannelID: 2201, Credential: "secret-a", RequestedGroup: "other"}, 71, "shared-model"},
		{"token", scope, 72, "shared-model"}, {"model", scope, 71, "other-model"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			copyReq := &dto.GeneralOpenAIRequest{Messages: append([]dto.Message{}, second.Messages...)}
			assert.False(t, ReplayChatReasoning(tc.token, tc.model, "all", copyReq, tc.scope))
			assert.Nil(t, copyReq.Messages[1].ReasoningContent)
		})
	}
	branch := &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "same opening"}, {Role: "assistant", Content: "different answer"}}}
	assert.False(t, ReplayChatReasoning(71, "shared-model", "all", branch, scope))
	client := "client thought"
	second.Messages[1].ReasoningContent = &client
	assert.False(t, ReplayChatReasoning(71, "shared-model", "all", second, scope))
	assert.Equal(t, client, second.Messages[1].GetReasoningContent())
	// Identical visible output with different hidden thinking is ambiguous.
	conflicting := "different hidden state"
	assistant1.ReasoningContent = &conflicting
	assert.False(t, CaptureChatReasoningTurn(71, "shared-model", scope, first, assistant1))
	second.Messages[1].ReasoningContent = nil
	assert.False(t, ReplayChatReasoning(71, "shared-model", "all", second, scope))
	assert.False(t, CaptureChatReasoningTurn(71, "shared-model", scope, first, dto.Message{Role: "assistant", Content: "answer-a", ReasoningContent: &thought1}))
	assert.False(t, ReplayChatReasoning(71, "shared-model", "all", second))
	assert.False(t, CaptureChatReasoning(71, "shared-model", first, "unsafe legacy"))
}
func TestResponsesReasoningReplayOpaqueAndTools(t *testing.T) {
	scope := ReasoningReplayScope{ChannelID: 2203, Credential: "opaque-owner", SessionID: "owned-session"}
	input := json.RawMessage(`[{"role":"user","content":"lookup"}]`)
	output := json.RawMessage(`[{"type":"reasoning","id":"rs1","encrypted_content":"cipher","content":[{"type":"reasoning_text","text":"original"}]},{"type":"function_call","id":"fc1","call_id":"call1","name":"lookup","arguments":"{}"}]`)
	require.True(t, CaptureResponsesReasoning(73, "shared-model", input, output, scope))
	body := []byte(`{"input":[{"role":"user","content":"lookup"},{"type":"function_call","call_id":"call1","name":"lookup","arguments":"{}"},{"type":"function_call_output","call_id":"call1","output":"result"}],"vendor":9007199254740993}`)
	patched, changed := ReplayResponsesReasoning(73, "shared-model", "responses", body, scope)
	require.True(t, changed)
	assert.Contains(t, string(patched), `"encrypted_content":"cipher"`)
	assert.Contains(t, string(patched), `9007199254740993`)
	var parsed struct {
		Input []map[string]any `json:"input"`
	}
	require.NoError(t, common.Unmarshal(patched, &parsed))
	require.Len(t, parsed.Input, 4)
	assert.Equal(t, "reasoning", parsed.Input[1]["type"])
	again, changed := ReplayResponsesReasoning(73, "shared-model", "responses", patched, scope)
	assert.False(t, changed)
	assert.Equal(t, patched, again)
	_, changed = ReplayResponsesReasoningWithPolicy(73, "shared-model", "all", body, true, scope)
	assert.False(t, changed)
	scope.SessionID = ""
	assert.False(t, CaptureResponsesReasoning(73, "shared-model", input, output, scope))
	_, changed = ReplayResponsesReasoning(73, "shared-model", "all", body, scope)
	assert.False(t, changed)
}
func TestResponsesReasoningReplayPartialHistory(t *testing.T) {
	scope := ReasoningReplayScope{ChannelID: 2204, Credential: "plaintext"}
	input := json.RawMessage(`[{"role":"user","content":"start"}]`)
	first := json.RawMessage(`[{"type":"reasoning","id":"r1","content":[{"type":"reasoning_text","text":"thought1"}]},{"type":"message","role":"assistant","id":"m1","status":"completed","content":[{"type":"output_text","text":"answer1","annotations":[]}]}]`)
	require.True(t, CaptureResponsesReasoning(74, "model", input, first, scope))
	secondInput := json.RawMessage(`[{"role":"user","content":"start"},{"role":"assistant","content":"answer1"},{"role":"user","content":"next"}]`)
	event := []byte(`{"response":{"output":[{"type":"reasoning","id":"r2","content":[{"type":"reasoning_text","text":"thought2"}]},{"type":"message","role":"assistant","content":"answer2"}]}}`)
	require.True(t, CaptureResponsesReasoningRaw(74, "model", secondInput, event, scope))
	body := []byte(`{"input":[{"role":"user","content":"start"},{"type":"reasoning","id":"r1","content":[{"type":"reasoning_text","text":"client1"}]},{"role":"assistant","content":"answer1"},{"role":"user","content":"next"},{"role":"assistant","content":"answer2"},{"role":"user","content":"last"}]}`)
	patched, changed := ReplayResponsesReasoning(74, "model", "responses", body, scope)
	require.True(t, changed)
	assert.Contains(t, string(patched), "client1")
	assert.Contains(t, string(patched), "thought2")
	assert.NotContains(t, string(patched), "thought1")
}

func TestResponsesReasoningReplayStringFirstTurn(t *testing.T) {
	scope := ReasoningReplayScope{ChannelID: 2210, Credential: "string-first-turn"}
	output := []byte(`{"output":[{"type":"reasoning","id":"rs1","content":[{"type":"reasoning_text","text":"real thought"}]},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"hello"}]}]}`)
	require.True(t, CaptureResponsesReasoningRaw(99, "model", json.RawMessage(`"hello"`), output, scope))
	body := []byte(`{"input":[{"role":"user","content":[{"type":"input_text","text":"hello"}]},{"role":"assistant","content":"hello"},{"role":"user","content":"next"}]}`)
	patched, changed := ReplayResponsesReasoning(99, "model", "responses", body, scope)
	require.True(t, changed)
	assert.Contains(t, string(patched), "real thought")
}

func TestReasoningReplayScopeUsesSelectedChannel(t *testing.T) {
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 100, ChannelType: constant.ChannelTypeDeepSeek, ApiKey: "secret", UpstreamModelName: "actual"}, RequestHeaders: map[string]string{"X-Session-ID": "session-a"}}
	scope := ReasoningReplayScopeForChannel(info)
	assert.Equal(t, 100, scope.ChannelID)
	assert.Equal(t, "x-session-id:session-a", scope.SessionID)
	assert.Equal(t, "actual", scope.UpstreamModel)
	assert.Equal(t, "https://api.deepseek.com", scope.Endpoint)
	key := reasoningReplayKey(1, "alias", "history", scope)
	assert.NotContains(t, key, "secret")
	assert.NotContains(t, key, "session-a")
}
