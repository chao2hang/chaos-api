package common

import (
	"strings"
	"testing"

	"github.com/MoeForge/moego/ojson"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const chatToolsEffortBody = `{"model":"gpt-6-luna","reasoning_effort":"medium","messages":[{"role":"user","content":"list files"}],"tools":[{"type":"function","function":{"name":"ls","parameters":{"type":"object"}}}],"tool_choice":"auto"}`

func TestResolveToolsReasoningConflictDefaultStripsEffort(t *testing.T) {
	out, result, err := ResolveToolsReasoningConflict([]byte(chatToolsEffortBody), dto.ChannelOtherSettings{}, "gpt-6-luna")
	require.NoError(t, err)
	require.True(t, result.Changed)
	assert.Equal(t, dto.ToolsReasoningConflictStripEffort, result.Policy)

	assert.False(t, ojson.GetBytes(out, "reasoning_effort").Exists(), "the effort must be gone")
	assert.True(t, ojson.GetBytes(out, "tools").IsArray(), "tools must survive: the client asked for a function call")
	// Everything else is byte-identical, including key order.
	assert.True(t, strings.HasPrefix(string(out), `{"model":"gpt-6-luna","messages":`), "unexpected body: %s", out)
}

func TestResolveToolsReasoningConflictStripTools(t *testing.T) {
	settings := dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: dto.ToolsReasoningConflictStripTools}
	out, result, err := ResolveToolsReasoningConflict([]byte(chatToolsEffortBody), settings, "gpt-6-luna")
	require.NoError(t, err)
	require.True(t, result.Changed)

	for _, member := range []string{"tools", "tool_choice"} {
		assert.False(t, ojson.GetBytes(out, member).Exists(), "%s must be gone", member)
	}
	assert.Equal(t, "medium", ojson.GetBytes(out, "reasoning_effort").String())
}

func TestResolveToolsReasoningConflictPassthrough(t *testing.T) {
	settings := dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: dto.ToolsReasoningConflictPassthrough}
	out, result, err := ResolveToolsReasoningConflict([]byte(chatToolsEffortBody), settings, "gpt-6-luna")
	require.NoError(t, err)
	assert.False(t, result.Changed)
	assert.Equal(t, chatToolsEffortBody, string(out))
}

func TestResolveToolsReasoningConflictLeavesLegalCombinations(t *testing.T) {
	cases := []struct {
		name  string
		body  string
		model string
	}{
		{
			name:  "effort none is the documented opt-out",
			body:  `{"model":"gpt-6-luna","reasoning_effort":"none","messages":[{"role":"user","content":"x"}],"tools":[{"type":"function","function":{"name":"ls"}}]}`,
			model: "gpt-6-luna",
		},
		{
			name:  "no tools",
			body:  `{"model":"gpt-6-luna","reasoning_effort":"medium","messages":[{"role":"user","content":"x"}]}`,
			model: "gpt-6-luna",
		},
		{
			name:  "empty tools array",
			body:  `{"model":"gpt-6-luna","reasoning_effort":"medium","messages":[{"role":"user","content":"x"}],"tools":[]}`,
			model: "gpt-6-luna",
		},
		{
			name:  "no effort",
			body:  `{"model":"gpt-6-luna","messages":[{"role":"user","content":"x"}],"tools":[{"type":"function","function":{"name":"ls"}}]}`,
			model: "gpt-6-luna",
		},
		{
			name:  "non reasoning model keeps both",
			body:  `{"model":"gpt-5.2","reasoning_effort":"medium","messages":[{"role":"user","content":"x"}],"tools":[{"type":"function","function":{"name":"ls"}}]}`,
			model: "gpt-5.2",
		},
		{
			name:  "legacy reasoning model without the restriction",
			body:  `{"model":"o3","reasoning_effort":"medium","messages":[{"role":"user","content":"x"}],"tools":[{"type":"function","function":{"name":"ls"}}]}`,
			model: "o3",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, result, err := ResolveToolsReasoningConflict([]byte(tc.body), dto.ChannelOtherSettings{}, tc.model)
			require.NoError(t, err)
			assert.False(t, result.Changed)
			assert.Equal(t, tc.body, string(out))
		})
	}
}

func TestResolveToolsReasoningConflictGpt6Family(t *testing.T) {
	for _, model := range []string{
		"gpt-6-luna", "gpt-6-luna-2026-01-15", "gpt-6-sol", "gpt-6-astra",
		"gpt-6.1-sol", "gpt-6.1-terra", "GPT-6-LUNA",
	} {
		t.Run(model, func(t *testing.T) {
			assert.True(t, IsReasoningModelForToolsConflict(model))
			_, result, err := ResolveToolsReasoningConflict([]byte(chatToolsEffortBody), dto.ChannelOtherSettings{}, model)
			require.NoError(t, err)
			assert.True(t, result.Changed)
		})
	}
	for _, model := range []string{"gpt-5.2", "gpt-4.1", "o3", "deepseek-v4-pro", ""} {
		assert.False(t, IsReasoningModelForToolsConflict(model), model)
	}
}

func TestResolveToolsReasoningConflictKeepsUnknownBytes(t *testing.T) {
	body := `{"model":"gpt-6-luna","reasoning_effort":"high","seed":7,"x_custom":{"a":[1,2]},"messages":[{"role":"user","content":"x"}],"tools":[{"type":"function","function":{"name":"ls"}}],"stream":true}`
	out, result, err := ResolveToolsReasoningConflict([]byte(body), dto.ChannelOtherSettings{}, "gpt-6-luna")
	require.NoError(t, err)
	require.True(t, result.Changed)
	assert.Equal(t, float64(7), ojson.GetBytes(out, "seed").Float())
	assert.Equal(t, `{"a":[1,2]}`, ojson.GetBytes(out, "x_custom").String())
	assert.True(t, ojson.GetBytes(out, "stream").Bool())
}

func TestInvalidToolsReasoningConflictPolicy(t *testing.T) {
	require.NoError(t, (*dto.ChannelOtherSettings)(nil).ValidateToolsReasoningConflictPolicy())
	require.NoError(t, (&dto.ChannelOtherSettings{}).ValidateToolsReasoningConflictPolicy())
	require.NoError(t, (&dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: "PASSTHROUGH"}).ValidateToolsReasoningConflictPolicy())
	err := (&dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: "drop_everything"}).ValidateToolsReasoningConflictPolicy()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "tools_reasoning_conflict_policy")

	// An unknown stored value must not silently disable the fix.
	assert.Equal(t, dto.ToolsReasoningConflictStripEffort,
		(&dto.ChannelOtherSettings{ToolsReasoningConflictPolicy: "bogus"}).ToolsReasoningConflictPolicyOrDefault())
}
