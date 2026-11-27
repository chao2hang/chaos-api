package service

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The official DeepSeek pool validates presence, not identity, so a client that
// rewrites every earlier turn (tool ids, ordering, truncation) still has to be
// served. The history-free slot is the last resort: it is keyed only by
// token/model/scope and matched on the assistant text the client echoed.
func TestChatReasoningRecentSlotRescuesFullRewrite(t *testing.T) {
	scope := ReasoningReplayScope{ChannelID: 2401, Credential: "pool-key", SharedChannel: true}
	req := &dto.GeneralOpenAIRequest{Messages: []dto.Message{
		{Role: "user", Content: "list the files"},
	}}
	thought := "I should check the working directory first."
	answer := "Here are the files in your working directory: package.json, src, dist."
	assistant := dto.Message{Role: "assistant", Content: answer, ReasoningContent: &thought}
	require.True(t, CaptureChatReasoningTurn(91, "deepseek-v4-pro", scope, req, assistant))

	// Same visible answer, every anchor destroyed: different prompt text, extra
	// turns, rewritten tool ids, truncated tail.
	rewritten := &dto.GeneralOpenAIRequest{Messages: []dto.Message{
		{Role: "system", Content: "rewritten preamble"},
		{Role: "user", Content: "completely different opening"},
		{Role: "assistant", ToolCalls: []byte(`[{"id":"call_rewritten","type":"function","function":{"name":"ls","arguments":"{}"}}]`)},
		{Role: "tool", Content: "package.json src dist", ToolCallId: "call_rewritten"},
		{Role: "assistant", Content: answer[:40]},
		{Role: "user", Content: "thanks"},
	}}
	require.True(t, ReplayChatReasoning(91, "deepseek-v4-pro", "chat", rewritten, scope))
	assert.Equal(t, thought, rewritten.Messages[4].GetReasoningContent())

	// A different answer must not borrow it.
	other := &dto.GeneralOpenAIRequest{Messages: []dto.Message{
		{Role: "user", Content: "x"},
		{Role: "assistant", Content: "Totally unrelated output that should not match anything."},
	}}
	assert.False(t, ReplayChatReasoning(91, "deepseek-v4-pro", "chat", other, scope))
}

// The history-free slot is only kept for the official DeepSeek pool; a
// third-party channel must never borrow text from a different account.
func TestChatReasoningRecentSlotIsPoolOnly(t *testing.T) {
	scoped := ReasoningReplayScope{ChannelID: 2402, Credential: "k", SharedChannel: false}
	req := &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "hi"}}}
	thought := "private thought"
	assistant := dto.Message{Role: "assistant", Content: "a long enough answer to be matchable by prefix", ReasoningContent: &thought}
	require.True(t, CaptureChatReasoningTurn(92, "m", scoped, req, assistant))
	assert.Empty(t, recallChatReasoningRecent(92, "m", &dto.Message{Content: "a long enough answer to be matchable by prefix"}, scoped))
}

// #27 root cause: the retry loop retried the same protocol 400 across the pool.
func TestReasoningReplayProtocolErrorStopsRetry(t *testing.T) {
	upstream := types.NewOpenAIError(
		assert.AnError,
		types.ErrorCodeBadResponseStatusCode,
		400,
	)
	upstream.SetMessage("The `reasoning_content` in the thinking mode must be passed back to the API.")

	require.True(t, IsReasoningReplayProtocolError(upstream))
	decision := DecideRelayRetry(nil, upstream, 3)
	assert.Equal(t, "stop", decision.Action)
	assert.Equal(t, "reasoning_replay_miss", decision.Reason)

	RecordReasoningReplayMiss(2403)
	RecordReasoningReplayMiss(2403)
	assert.Equal(t, int64(2), ReasoningReplayMissCount(2403))
	ResetReasoningReplayMissCount(2403)
	assert.Zero(t, ReasoningReplayMissCount(2403))

	// A real channel fault still retries: a channel-coded error is not the
	// replay-miss signature.
	channelErr := types.NewOpenAIError(assert.AnError, types.ErrorCodeChannelInvalidKey, 401)
	assert.False(t, IsReasoningReplayProtocolError(channelErr))
	assert.Equal(t, "retry", DecideRelayRetry(nil, channelErr, 3).Action)
}

// A Codex-flagged client against the official pool must still get thinking
// filled in, while a third-party channel keeps the old behaviour.
func TestReasoningPolicyCodexUAAgainstOfficialPool(t *testing.T) {
	official := &relaycommon.RelayInfo{
		ChannelMeta:    &relaycommon.ChannelMeta{ChannelId: 2404, ChannelType: constant.ChannelTypeDeepSeek, ChannelBaseUrl: "https://api.deepseek.com", ApiKey: "k"},
		RequestHeaders: map[string]string{"User-Agent": "codex_cli_rs/0.4.1"},
		Request:        &dto.GeneralOpenAIRequest{Model: "deepseek-v4-pro"},
	}
	strip, replay := ReasoningReplayPolicyForChannel(official, "chat")
	assert.False(t, strip)
	assert.True(t, replay)
	assert.True(t, ReasoningReplayScopeForChannel(official).SharedChannel)
}
