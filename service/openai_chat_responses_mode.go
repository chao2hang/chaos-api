package service

import (
	"net/url"
	"strings"
	"sync"

	"github.com/MoeForge/moego/regexp"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/model_setting"
)

// Chat→Responses upgrade policy is host routing logic (it decides *whether*
// to convert, reading host settings), so it lives here, not in relayconvert.

var chatResponsesRegexCache sync.Map // map[string]*regexp.Regexp

func matchAnyModelPattern(patterns []string, model string) bool {
	if len(patterns) == 0 || model == "" {
		return false
	}
	for _, pattern := range patterns {
		if pattern == "" {
			continue
		}
		re, ok := chatResponsesRegexCache.Load(pattern)
		if !ok {
			compiled, err := regexp.Compile(pattern)
			if err != nil {
				// Treat invalid patterns as non-matching to avoid breaking runtime traffic.
				continue
			}
			re = compiled
			chatResponsesRegexCache.Store(pattern, re)
		}
		if re.(*regexp.Regexp).MatchString(model) {
			return true
		}
	}
	return false
}

func ShouldChatCompletionsUseResponsesPolicy(policy model_setting.ChatCompletionsToResponsesPolicy, channelID int, channelType int, model string) bool {
	if !policy.IsChannelEnabled(channelID, channelType) {
		return false
	}
	return matchAnyModelPattern(policy.ModelPatterns, model)
}

func ShouldChatCompletionsUseResponsesGlobal(channelID int, channelType int, model string) bool {
	return ShouldChatCompletionsUseResponsesPolicy(
		model_setting.GetGlobalSettings().ChatCompletionsToResponsesPolicy,
		channelID,
		channelType,
		model,
	)
}

// IsOfficialOpenAIChannel reports whether the selected channel targets the
// official OpenAI API over HTTPS (api.openai.com, default port).
func IsOfficialOpenAIChannel(info *relaycommon.RelayInfo) bool {
	if info == nil || info.ChannelMeta == nil {
		return false
	}
	baseURL := info.ChannelBaseUrl
	if baseURL == "" {
		baseURL = constant.GetChannelBaseURL(info.ChannelType)
	}
	endpoint, err := url.Parse(baseURL)
	return info.ChannelType == constant.ChannelTypeOpenAI &&
		err == nil &&
		endpoint.Scheme == "https" &&
		strings.EqualFold(endpoint.Hostname(), "api.openai.com") &&
		(endpoint.Port() == "" || endpoint.Port() == "443")
}

// ShouldChatCompletionsUseResponses decides the outbound wire for a chat
// completions request: global policy opt-in, or an official OpenAI channel
// receiving a responses-only model.
func ShouldChatCompletionsUseResponses(info *relaycommon.RelayInfo) bool {
	if info == nil {
		return false
	}
	if ShouldChatCompletionsUseResponsesGlobal(info.ChannelId, info.ChannelType, info.OriginModelName) {
		return true
	}
	if info.ChannelOtherSettings.DisableChatToResponsesAutoRoute {
		return false
	}
	model := info.GetUpstreamModelName()
	if model == "" {
		model = info.GetOriginModelName()
	}
	return IsOfficialOpenAIChannel(info) && common.IsOpenAIResponsesOnlyModel(model)
}
