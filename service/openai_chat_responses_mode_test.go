package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openAIChannelInfo(baseURL, upstreamModel string) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelId:         1,
			ChannelType:       constant.ChannelTypeOpenAI,
			ChannelBaseUrl:    baseURL,
			UpstreamModelName: upstreamModel,
		},
		Request: &dto.GeneralOpenAIRequest{Model: upstreamModel},
	}
}

func TestShouldChatCompletionsUseResponsesOfficialOpenAI(t *testing.T) {
	for _, model := range []string{"o3", "gpt-5-nano", "gpt-5.4-nano", "gpt-6-astra", "o3-2025-04-16"} {
		assert.True(t, ShouldChatCompletionsUseResponses(openAIChannelInfo("https://api.openai.com", model)), model)
	}
	for _, model := range []string{"gpt-4.1", "gpt-5", "o3-mini", ""} {
		assert.False(t, ShouldChatCompletionsUseResponses(openAIChannelInfo("https://api.openai.com", model)), model)
	}
	// The upstream model wins when set, and the origin model is only a fallback.
	info := openAIChannelInfo("https://api.openai.com", "gpt-4.1")
	info.OriginModelName = "o3"
	assert.False(t, ShouldChatCompletionsUseResponses(info))
	info.UpstreamModelName = ""
	assert.True(t, ShouldChatCompletionsUseResponses(info))

	// Default OpenAI base URL applies when the channel leaves it empty.
	info = openAIChannelInfo("", "o3")
	assert.True(t, ShouldChatCompletionsUseResponses(info))

	assert.False(t, ShouldChatCompletionsUseResponses(nil))
}

func TestShouldChatCompletionsUseResponsesNonOfficialEndpoint(t *testing.T) {
	info := openAIChannelInfo("https://api.groq.com/openai", "o3")
	assert.True(t, info.ChannelType == constant.ChannelTypeOpenAI)
	assert.False(t, IsOfficialOpenAIChannel(info))
	assert.False(t, ShouldChatCompletionsUseResponses(info))

	httpInfo := openAIChannelInfo("http://api.openai.com", "o3")
	assert.False(t, IsOfficialOpenAIChannel(httpInfo))
	assert.False(t, ShouldChatCompletionsUseResponses(httpInfo))
}

func TestShouldChatCompletionsUseResponsesChannelOptOut(t *testing.T) {
	info := openAIChannelInfo("https://api.openai.com", "o3")
	info.ChannelOtherSettings.DisableChatToResponsesAutoRoute = true
	assert.False(t, ShouldChatCompletionsUseResponses(info))
}

func TestShouldChatCompletionsUseResponsesGlobalPolicyStillWins(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	previous := settings.ChatCompletionsToResponsesPolicy
	t.Cleanup(func() { settings.ChatCompletionsToResponsesPolicy = previous })

	settings.ChatCompletionsToResponsesPolicy = model_setting.ChatCompletionsToResponsesPolicy{
		Enabled:       true,
		AllChannels:   true,
		ModelPatterns: []string{"^gpt-4.1$"},
	}

	originModel := "gpt-4.1"
	info := &relaycommon.RelayInfo{
		OriginModelName: originModel,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelId:         2,
			ChannelType:       constant.ChannelTypeOpenAI,
			ChannelBaseUrl:    "https://api.groq.com/openai",
			UpstreamModelName: originModel,
		},
		Request: &dto.GeneralOpenAIRequest{Model: originModel},
	}
	assert.True(t, ShouldChatCompletionsUseResponses(info))

	// A channel-level opt-out must not override the explicit global policy.
	info.ChannelOtherSettings.DisableChatToResponsesAutoRoute = true
	assert.True(t, ShouldChatCompletionsUseResponses(info))
	require.False(t, common.IsOpenAIResponsesOnlyModel(originModel))
}
