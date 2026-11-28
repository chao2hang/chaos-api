package common

import (
	"strings"

	"github.com/MoeForge/moego/ojson"
	"github.com/QuantumNous/new-api/relaykit/dto"
)

// IsReasoningModelForToolsConflict reports whether a model rejects function
// tools combined with a non-none reasoning effort on /v1/chat/completions.
// OpenAI enforces that rule on the gpt-6 family (gpt-6, gpt-6-sol, gpt-6-luna,
// gpt-6-astra, gpt-6.1-sol, gpt-6.1-terra and date snapshots of each): a
// reasoning turn does not emit tool_calls, so the two are mutually exclusive on
// the chat surface. The o-series still accepts tools with an effort, so it is
// deliberately not included; a channel that sees the same rejection for another
// family sets tools_reasoning_conflict_policy explicitly.
func IsReasoningModelForToolsConflict(modelName string) bool {
	name := strings.ToLower(strings.TrimSpace(modelName))
	if name == "" {
		return false
	}
	return strings.HasPrefix(name, "gpt-6")
}

// toolsReasoningConflictResult describes what a resolution pass changed.
type ToolsReasoningConflictResult struct {
	// Changed reports whether the outbound body differs from the input.
	Changed bool
	// Policy is the effective policy that was applied.
	Policy string
}

// ResolveToolsReasoningConflict rewrites a chat/completions body that carries
// both function tools and a non-none reasoning_effort for a reasoning model.
// The upstream rejects that combination with a 400 on the chat surface; the
// gateway either drops the effort (tools win, because the client asked for a
// function call this turn) or drops the tools, per channel policy.
//
// Only the members that change are touched, so the client's key order and all
// other bytes survive. A body without the conflict is returned unchanged and
// Changed is false, which keeps the call site cheap for the common case.
func ResolveToolsReasoningConflict(jsonData []byte, settings dto.ChannelOtherSettings, modelNames ...string) ([]byte, ToolsReasoningConflictResult, error) {
	policy := settings.ToolsReasoningConflictPolicyOrDefault()
	if policy == dto.ToolsReasoningConflictPassthrough {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}
	if !ojson.ValidBytes(jsonData) {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}

	effort := ojson.GetBytes(jsonData, "reasoning_effort")
	if !effort.Exists() {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}
	// "none" is an explicit opt-out of reasoning, so the combination is legal.
	if raw := strings.ToLower(strings.TrimSpace(effort.String())); raw == "" || raw == "none" {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}

	tools := ojson.GetBytes(jsonData, "tools")
	if !tools.Exists() || !tools.IsArray() || len(tools.Array()) == 0 {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}

	matched := false
	for _, modelName := range modelNames {
		if IsReasoningModelForToolsConflict(modelName) {
			matched = true
			break
		}
	}
	if !matched {
		return jsonData, ToolsReasoningConflictResult{Policy: policy}, nil
	}

	doc := ojson.NewDoc(jsonData)
	if policy == dto.ToolsReasoningConflictStripTools {
		if err := DeleteJSONMember(doc, "tools"); err != nil {
			return nil, ToolsReasoningConflictResult{}, err
		}
		// tool_choice without tools is rejected by every OpenAI-compatible
		// upstream, so it goes with them.
		if err := DeleteJSONMember(doc, "tool_choice"); err != nil {
			return nil, ToolsReasoningConflictResult{}, err
		}
		if err := DeleteJSONMember(doc, "parallel_tool_calls"); err != nil {
			return nil, ToolsReasoningConflictResult{}, err
		}
	} else {
		if err := DeleteJSONMember(doc, "reasoning_effort"); err != nil {
			return nil, ToolsReasoningConflictResult{}, err
		}
	}
	return doc.Bytes(), ToolsReasoningConflictResult{Changed: true, Policy: policy}, nil
}
