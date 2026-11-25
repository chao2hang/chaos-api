package service

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func boolPtr(v bool) *bool { return &v }

func deepSeekChannelInfo(channelID int, apiKey string) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelId:      channelID,
			ChannelType:    constant.ChannelTypeDeepSeek,
			ChannelBaseUrl: "https://api.deepseek.com",
			ApiKey:         apiKey,
		},
		Request: &dto.GeneralOpenAIRequest{Model: "deepseek-reasoner"},
	}
}

func TestReasoningReplaySharedAcrossOfficialDeepSeekChannels(t *testing.T) {
	infoA := deepSeekChannelInfo(100, "key-a")
	infoB := deepSeekChannelInfo(200, "key-b")
	scopeA := ReasoningReplayScopeForChannel(infoA)
	scopeB := ReasoningReplayScopeForChannel(infoB)
	require.True(t, scopeA.SharedChannel)
	require.True(t, scopeB.SharedChannel)
	keyA := reasoningReplayKey(7, "deepseek-reasoner", "history", scopeA)
	keyB := reasoningReplayKey(7, "deepseek-reasoner", "history", scopeB)
	assert.NotEmpty(t, keyA)
	assert.Equal(t, keyA, keyB)

	req := &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "opening"}}}
	reasoning := "hidden thought"
	require.True(t, CaptureChatReasoningTurn(7, "deepseek-reasoner", scopeA, req, dto.Message{Role: "assistant", Content: "answer", ReasoningContent: &reasoning}))
	next := &dto.GeneralOpenAIRequest{Messages: []dto.Message{req.Messages[0], {Role: "assistant", Content: "answer"}, {Role: "user", Content: "continue"}}}
	assert.True(t, ReplayChatReasoning(7, "deepseek-reasoner", "chat", next, scopeB))
	assert.Equal(t, reasoning, next.Messages[1].GetReasoningContent())
}

func TestReasoningReplayCrossChannelDisabledIsPerChannel(t *testing.T) {
	infoA := deepSeekChannelInfo(100, "key-a")
	infoB := deepSeekChannelInfo(200, "key-b")
	infoA.ChannelOtherSettings.ReasoningReplayCrossChannel = boolPtr(false)
	infoB.ChannelOtherSettings.ReasoningReplayCrossChannel = boolPtr(false)
	scopeA := ReasoningReplayScopeForChannel(infoA)
	scopeB := ReasoningReplayScopeForChannel(infoB)
	assert.False(t, scopeA.SharedChannel)
	assert.False(t, scopeB.SharedChannel)
	keyA := reasoningReplayKey(7, "deepseek-reasoner", "history", scopeA)
	keyB := reasoningReplayKey(7, "deepseek-reasoner", "history", scopeB)
	assert.NotEmpty(t, keyA)
	assert.NotEqual(t, keyA, keyB)

	req := &dto.GeneralOpenAIRequest{Messages: []dto.Message{{Role: "user", Content: "opening"}}}
	reasoning := "hidden thought"
	require.True(t, CaptureChatReasoningTurn(7, "deepseek-reasoner", scopeA, req, dto.Message{Role: "assistant", Content: "answer", ReasoningContent: &reasoning}))
	next := &dto.GeneralOpenAIRequest{Messages: []dto.Message{req.Messages[0], {Role: "assistant", Content: "answer"}, {Role: "user", Content: "continue"}}}
	assert.False(t, ReplayChatReasoning(7, "deepseek-reasoner", "chat", next, scopeB))
	assert.Nil(t, next.Messages[1].ReasoningContent)
}

func TestReasoningReplayCrossChannelRequiresOfficialEndpoint(t *testing.T) {
	infoA := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 100, ChannelType: constant.ChannelTypeDeepSeek, ChannelBaseUrl: "https://api.groq.com/openai", ApiKey: "key-a"}, Request: &dto.GeneralOpenAIRequest{Model: "deepseek-reasoner"}}
	infoB := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 200, ChannelType: constant.ChannelTypeDeepSeek, ChannelBaseUrl: "https://api.groq.com/openai", ApiKey: "key-b"}, Request: &dto.GeneralOpenAIRequest{Model: "deepseek-reasoner"}}
	scopeA := ReasoningReplayScopeForChannel(infoA)
	scopeB := ReasoningReplayScopeForChannel(infoB)
	assert.False(t, scopeA.SharedChannel)
	assert.False(t, scopeB.SharedChannel)
	assert.NotEqual(t, reasoningReplayKey(7, "m", "history", scopeA), reasoningReplayKey(7, "m", "history", scopeB))
}

func TestReasoningReplayCrossChannelIgnoredForOtherChannelTypes(t *testing.T) {
	infoA := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 100, ChannelType: constant.ChannelTypeOpenAI, ChannelBaseUrl: "https://api.openai.com", ApiKey: "key-a", ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplayCrossChannel: boolPtr(true)}}, Request: &dto.GeneralOpenAIRequest{Model: "gpt-5"}}
	infoB := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 200, ChannelType: constant.ChannelTypeOpenAI, ChannelBaseUrl: "https://api.openai.com", ApiKey: "key-b", ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplayCrossChannel: boolPtr(true)}}, Request: &dto.GeneralOpenAIRequest{Model: "gpt-5"}}
	scopeA := ReasoningReplayScopeForChannel(infoA)
	scopeB := ReasoningReplayScopeForChannel(infoB)
	assert.False(t, scopeA.SharedChannel)
	assert.False(t, scopeB.SharedChannel)
	assert.NotEqual(t, reasoningReplayKey(7, "m", "history", scopeA), reasoningReplayKey(7, "m", "history", scopeB))
}
