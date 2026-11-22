package service

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/require"
)

func strPtr(s string) *string { return &s }

func chatReq(user, assistant string) *dto.GeneralOpenAIRequest {
	return &dto.GeneralOpenAIRequest{
		Model: "deepseek-flash",
		Messages: []dto.Message{
			{Role: "system", Content: "be brief"},
			{Role: "user", Content: user},
			{Role: "assistant", Content: assistant},
			{Role: "user", Content: "继续"},
		},
	}
}

func TestChatReasoningReplayRoundTrip(t *testing.T) {
	req := chatReq("explain raft", "leader election works by ...")
	require.True(t, CaptureChatReasoning(9101, "deepseek-flash", req, "step 1: compare terms; step 2: vote"))

	// The client replays the same history without reasoning content.
	next := chatReq("explain raft", "leader election works by ...")
	require.True(t, ReplayChatReasoning(9101, "deepseek-flash", ReasoningReplayModeAll, next))

	assistant := next.Messages[2]
	require.NotNil(t, assistant.ReasoningContent)
	require.Equal(t, "step 1: compare terms; step 2: vote", *assistant.ReasoningContent)
	require.True(t, strings.TrimSpace(assistant.GetReasoningContent()) != "")
}

func TestChatReasoningReplayKeepsClientReasoning(t *testing.T) {
	req := chatReq("conv-keep", "answer")
	require.True(t, CaptureChatReasoning(9102, "m", req, "cached-thought"))

	next := chatReq("conv-keep", "answer")
	next.Messages[2].ReasoningContent = strPtr("client-thought")
	require.False(t, ReplayChatReasoning(9102, "m", ReasoningReplayModeAll, next))
	require.Equal(t, "client-thought", *next.Messages[2].ReasoningContent)
}

func TestChatReasoningReplayModeOffAndChatOnly(t *testing.T) {
	req := chatReq("conv-mode", "answer")
	require.True(t, CaptureChatReasoning(9103, "m", req, "thought"))

	off := chatReq("conv-mode", "answer")
	require.False(t, ReplayChatReasoning(9103, "m", ReasoningReplayModeOff, off))
	require.Nil(t, off.Messages[2].ReasoningContent)

	chatOnly := chatReq("conv-mode", "answer")
	require.True(t, ReplayChatReasoning(9103, "m", ReasoningReplayModeChat, chatOnly))
}

func TestChatReasoningReplayIsolatesConversations(t *testing.T) {
	require.True(t, CaptureChatReasoning(9104, "m", chatReq("conversation A", "a1"), "thought-A"))

	other := chatReq("conversation B", "b1")
	require.False(t, ReplayChatReasoning(9104, "m", ReasoningReplayModeAll, other))
	require.Nil(t, other.Messages[2].ReasoningContent)

	same := chatReq("conversation A", "a1")
	require.True(t, ReplayChatReasoning(9104, "m", ReasoningReplayModeAll, same))
}

func TestChatReasoningReplaySkipsEmptyCache(t *testing.T) {
	req := chatReq("never captured", "x")
	require.False(t, ReplayChatReasoning(9105, "m", ReasoningReplayModeAll, req))
	require.Nil(t, req.Messages[2].ReasoningContent)
}

func TestReasoningReplayModeNormalization(t *testing.T) {
	cases := map[string]string{
		"":          ReasoningReplayModeAll,
		"auto":      ReasoningReplayModeAll,
		"on":        ReasoningReplayModeAll,
		" OFF ":     ReasoningReplayModeOff,
		"chat":      ReasoningReplayModeChat,
		"responses": ReasoningReplayModeResponses,
		"all":       ReasoningReplayModeAll,
		"bogus":     ReasoningReplayModeAll,
	}
	for raw, want := range cases {
		require.Equal(t, want, NormalizeReasoningReplayMode(raw), raw)
	}
	require.True(t, ReasoningReplayAllows("chat", ReasoningReplayModeChat))
	require.False(t, ReasoningReplayAllows("chat", ReasoningReplayModeResponses))
	require.True(t, ReasoningReplayAllows("all", ReasoningReplayModeResponses))
	require.False(t, ReasoningReplayAllows("off", ReasoningReplayModeChat))
}

func TestResponsesReasoningReplayInsertsReasoningItem(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"hello"}]`)
	output := json.RawMessage(`[{"type":"reasoning","summary":[{"type":"summary_text","text":"considered options"}]},{"type":"message","role":"assistant","content":"hi"}]`)
	require.True(t, CaptureResponsesReasoning(9106, "gpt-6-luna", input, output))

	body := []byte(`{"model":"gpt-6-luna","input":[` +
		`{"type":"message","role":"user","content":"hello"},` +
		`{"type":"message","role":"assistant","content":"hi"},` +
		`{"type":"message","role":"user","content":"again"}]}`)

	patched, ok := ReplayResponsesReasoning(9106, "gpt-6-luna", ReasoningReplayModeAll, body)
	require.True(t, ok)

	var payload struct {
		Input []map[string]any `json:"input"`
	}
	require.NoError(t, json.Unmarshal(patched, &payload))
	require.Len(t, payload.Input, 4)
	require.Equal(t, "reasoning", payload.Input[1]["type"])
	summary, ok := payload.Input[1]["summary"].([]any)
	require.True(t, ok)
	require.Len(t, summary, 1)
	require.Equal(t, "considered options", summary[0].(map[string]any)["text"])
	require.Equal(t, "assistant", payload.Input[2]["role"])
}

func TestResponsesReasoningReplayRespectsMode(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"mode-check"}]`)
	output := json.RawMessage(`[{"type":"reasoning","summary":[{"type":"summary_text","text":"t"}]}]`)
	require.True(t, CaptureResponsesReasoning(9107, "m", input, output))

	body := []byte(`{"input":[{"type":"message","role":"user","content":"mode-check"},{"type":"message","role":"assistant","content":"x"}]}`)
	if _, ok := ReplayResponsesReasoning(9107, "m", ReasoningReplayModeChat, body); ok {
		t.Fatal("chat-only mode must not touch a Responses body")
	}
	if _, ok := ReplayResponsesReasoning(9107, "m", ReasoningReplayModeOff, body); ok {
		t.Fatal("off must not touch a Responses body")
	}
	_, ok := ReplayResponsesReasoning(9107, "m", ReasoningReplayModeResponses, body)
	require.True(t, ok)
}

// Stateful thinking upstreams validate the opaque blob they issued; replay has
// to hand back the item verbatim instead of a synthesized summary.
func TestResponsesReasoningReplayKeepsOpaqueState(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"opaque-1"}]`)
	output := []byte(`{"output":[` +
		`{"type":"reasoning","id":"rs_abc","summary":[],"encrypted_content":"cipher-blob","content":[{"type":"reasoning_text","text":"think"}]},` +
		`{"type":"message","role":"assistant","content":"done"}]}`)
	require.True(t, CaptureResponsesReasoningRaw(9201, "deepseek-flash", input, output))

	body := []byte(`{"input":[{"type":"message","role":"user","content":"opaque-1"},{"type":"message","role":"assistant","content":"done"},{"type":"message","role":"user","content":"next"}]}`)
	patched, ok := ReplayResponsesReasoning(9201, "deepseek-flash", ReasoningReplayModeAll, body)
	require.True(t, ok)

	var payload struct {
		Input []map[string]any `json:"input"`
	}
	require.NoError(t, json.Unmarshal(patched, &payload))
	require.Len(t, payload.Input, 4)
	item := payload.Input[1]
	require.Equal(t, "reasoning", item["type"])
	require.Equal(t, "rs_abc", item["id"])
	require.Equal(t, "cipher-blob", item["encrypted_content"])
}

// Stream events wrap the object in "response"; capture must handle both shapes.
func TestCaptureResponsesReasoningRawAcceptsStreamEvent(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"stream-1"}]`)
	event := []byte(`{"type":"response.completed","response":{"output":[{"type":"reasoning","id":"rs_stream","encrypted_content":"blob-2","summary":[{"type":"summary_text","text":"s"}]}]}}`)
	require.True(t, CaptureResponsesReasoningRaw(9202, "m", input, event))

	body := []byte(`{"input":[{"type":"message","role":"user","content":"stream-1"},{"type":"message","role":"assistant","content":"a"}]}`)
	patched, ok := ReplayResponsesReasoning(9202, "m", ReasoningReplayModeAll, body)
	require.True(t, ok)
	require.Contains(t, string(patched), "blob-2")
}

// Codex already echoes upstream reasoning items; injecting another copy breaks
// the stateful chain.
func TestResponsesReasoningReplaySkipsCodexClient(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"codex-1"}]`)
	output := []byte(`{"output":[{"type":"reasoning","id":"rs_x","encrypted_content":"blob-x"}]}`)
	require.True(t, CaptureResponsesReasoningRaw(9203, "m", input, output))

	body := []byte(`{"input":[{"type":"message","role":"user","content":"codex-1"},{"type":"message","role":"assistant","content":"a"}]}`)
	patched, ok := ReplayResponsesReasoningWithPolicy(9203, "m", ReasoningReplayModeAll, body, true)
	require.False(t, ok)
	require.Equal(t, body, patched)
}

// A client that already sent a reasoning item keeps the chain it built.
func TestResponsesReasoningReplaySkipsExistingReasoningItem(t *testing.T) {
	input := json.RawMessage(`[{"type":"message","role":"user","content":"keep-1"}]`)
	output := []byte(`{"output":[{"type":"reasoning","id":"rs_k","encrypted_content":"blob-k"}]}`)
	require.True(t, CaptureResponsesReasoningRaw(9204, "m", input, output))

	body := []byte(`{"input":[{"type":"message","role":"user","content":"keep-1"},{"type":"reasoning","id":"rs_client","encrypted_content":"blob-c"},{"type":"message","role":"assistant","content":"a"}]}`)
	patched, ok := ReplayResponsesReasoningWithPolicy(9204, "m", ReasoningReplayModeAll, body, false)
	require.False(t, ok)
	require.Equal(t, body, patched)
}

func TestIsCodexClient(t *testing.T) {
	require.True(t, IsCodexClient("codex_cli_rs/0.48.0 (Linux 6.12; x86_64)"))
	require.True(t, IsCodexClient("OpenAI-Codex/1.2"))
	require.False(t, IsCodexClient("Hermes/2.1 (telegram)"))
	require.False(t, IsCodexClient("curl/8.5.0"))
	require.False(t, IsCodexClient(""))
}
