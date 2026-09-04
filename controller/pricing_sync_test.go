package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeModelName(t *testing.T) {
	cases := map[string]string{
		"OpenAI/GPT-4o":              "gpt-4o",
		"anthropic/claude-3.5":       "claude-3-5",
		"@cf/qwen/qwen2.5_72b":       "qwen2-5-72b",
		"thinkingmachines/Inkling:x": "inkling",
		"  DeepSeek-V3  ":            "deepseek-v3",
	}
	for input, want := range cases {
		assert.Equal(t, want, normalizeModelName(input), "input: %s", input)
	}
}

func TestModelNameSimilarity(t *testing.T) {
	exact := []struct{ a, b string }{
		{"gpt-4o", "gpt-4o"},
		{"OpenAI/gpt-4o", "gpt-4o"},
		{"claude-sonnet-4-5", "Claude.Sonnet.4.5"},
	}
	for _, c := range exact {
		assert.GreaterOrEqual(t, modelNameSimilarity(c.a, c.b), 0.999, "%s vs %s", c.a, c.b)
	}

	// 日期版本后缀应能匹配到无日期版本
	assert.GreaterOrEqual(t, modelNameSimilarity(
		"claude-sonnet-4-5-20250929", "claude-sonnet-4-5"), 0.9)

	// 推理强度后缀
	assert.GreaterOrEqual(t, modelNameSimilarity(
		"claude-opus-4-6-high", "claude-opus-4-6"), 0.9)

	// 前缀包含（>= 0.6 才会作为候选返回）
	assert.GreaterOrEqual(t, modelNameSimilarity(
		"deepseek-v3-0324", "deepseek-v3"), 0.6)

	// 完全无关
	assert.Less(t, modelNameSimilarity("gpt-4o", "qwen-max"), 0.6)
	assert.Equal(t, 0.0, modelNameSimilarity("", ""))
}

func TestMatchUpstreamPricing(t *testing.T) {
	upstream := []upstreamPricingEntry{
		{ModelName: "claude-sonnet-4-5", RatioModel: ptr(2.5)},
		{ModelName: "claude-sonnet-4-5-20250929", RatioModel: ptr(2.5)},
		{ModelName: "gpt-4o", RatioModel: ptr(1.25)},
		{ModelName: "qwen-max", RatioModel: ptr(1.6)},
	}

	candidates := matchUpstreamPricing("claude-sonnet-4-5-20250929", upstream, 5, 0.6)
	assert.NotEmpty(t, candidates)
	assert.GreaterOrEqual(t, candidates[0].Score, 0.999)

	candidates = matchUpstreamPricing("totally-unknown-model", upstream, 5, 0.6)
	assert.Empty(t, candidates)
}

func ptr(v float64) *float64 {
	return &v
}
