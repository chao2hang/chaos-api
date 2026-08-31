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
