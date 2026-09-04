package constant

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetChannelBaseURLIsBoundsSafe(t *testing.T) {
	assert.Empty(t, GetChannelBaseURL(ChannelTypeTaskPlugin))
	assert.Empty(t, GetChannelBaseURL(9999))
}

func TestVolcengineChannelSpecialBases(t *testing.T) {
	plans := []string{
		"doubao-coding-plan",
		"ark-coding-plan",
		"volc-coding-plan",
		"https://ark.cn-beijing.volces.com/api/coding",
		"https://ark.cn-beijing.volces.com/api/coding/v3",
	}
	for _, p := range plans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://ark.cn-beijing.volces.com/api/coding", base.ClaudeBaseURL)
		assert.Equal(t, "https://ark.cn-beijing.volces.com/api/coding/v3", base.OpenAIBaseURL)
	}

	agentPlans := []string{
		"doubao-agent-plan",
		"ark-agent-plan",
		"volc-agent-plan",
		"https://ark.cn-beijing.volces.com/api/plan",
		"https://ark.cn-beijing.volces.com/api/plan/v3",
	}
	for _, p := range agentPlans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://ark.cn-beijing.volces.com/api/plan", base.ClaudeBaseURL)
		assert.Equal(t, "https://ark.cn-beijing.volces.com/api/plan/v3", base.OpenAIBaseURL)
	}
}

func TestDomesticCodingPlanSpecialBases(t *testing.T) {
	minimaxPlans := []string{
		"minimax-coding-plan",
		"https://api.minimax.cn/anthropic",
	}
	for _, p := range minimaxPlans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://api.minimax.cn/anthropic", base.ClaudeBaseURL)
		assert.Equal(t, "https://api.minimax.cn/v1", base.OpenAIBaseURL)
	}

	minimaxIntlPlans := []string{
		"minimax-coding-plan-international",
		"https://api.minimax.io/anthropic",
	}
	for _, p := range minimaxIntlPlans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://api.minimax.io/anthropic", base.ClaudeBaseURL)
		assert.Equal(t, "https://api.minimax.io/v1", base.OpenAIBaseURL)
	}

	bailianPlans := []string{
		"bailian-coding-plan",
		"qwen-coding-plan",
		"https://coding.dashscope.aliyuncs.com/apps/anthropic",
		"https://coding.dashscope.aliyuncs.com/v1",
	}
	for _, p := range bailianPlans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://coding.dashscope.aliyuncs.com/apps/anthropic", base.ClaudeBaseURL)
		assert.Equal(t, "https://coding.dashscope.aliyuncs.com/v1", base.OpenAIBaseURL)
	}

	kimiPlatformPlans := []string{
		"kimi-api-platform",
		"https://api.moonshot.cn/anthropic",
	}
	for _, p := range kimiPlatformPlans {
		base, ok := ChannelSpecialBases[p]
		assert.True(t, ok, "expected plan %s in ChannelSpecialBases", p)
		assert.Equal(t, "https://api.moonshot.cn/anthropic", base.ClaudeBaseURL)
		assert.Equal(t, "https://api.moonshot.cn/v1", base.OpenAIBaseURL)
	}
}
