package service

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/pkg/cachex"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/go-redis/redis/v8"
	"github.com/samber/hot"
)

// Reasoning replay exists for upstreams that run thinking mode as a stateful
// protocol: the assistant reasoning text produced on turn N must be echoed back
// on turn N+1, or the request fails with
// "The `reasoning_text` in the thinking mode must be passed back to the API."
// Codex CLI does this itself; generic OpenAI clients (VS Code custom endpoint,
// BYOK) drop the reasoning component and break on the second turn.
//
// The gateway therefore keeps the last reasoning text per conversation and
// re-attaches it to the assistant message that the client replays without one.
// Conversations are identified by the API token, the model and a hash of the
// first user message, so parallel chats on the same token never cross-talk.

const (
	reasoningReplayCacheNamespace = "new-api:reasoning_replay:v1"
	reasoningReplayTTLSeconds     = 6 * 60 * 60
	reasoningReplayCacheCapacity  = 50_000

	// Channel setting values (channel_other_settings.reasoning_replay).
	ReasoningReplayModeOff       = "off"
	ReasoningReplayModeChat      = "chat"
	ReasoningReplayModeResponses = "responses"
	ReasoningReplayModeAll       = "all"
)

type reasoningReplayEntry struct {
	Reasoning string `json:"reasoning"`
	Model     string `json:"model"`
	UpdatedAt int64  `json:"updated_at"`
}

var (
	reasoningReplayCacheOnce sync.Once
	reasoningReplayCache     *cachex.HybridCache[reasoningReplayEntry]
)

func newReasoningReplayCache() *cachex.HybridCache[reasoningReplayEntry] {
	return cachex.NewHybridCache[reasoningReplayEntry](cachex.HybridCacheConfig[reasoningReplayEntry]{
		Namespace:     cachex.Namespace(reasoningReplayCacheNamespace),
		RedisProvider: func() *redis.Client { return common.RDB },
		RedisEnabled: func() bool {
			return common.RedisEnabled && common.RDB != nil
		},
		RedisCodec: cachex.JSONCodec[reasoningReplayEntry]{},
		Memory: func() *hot.HotCache[string, reasoningReplayEntry] {
			return hot.NewHotCache[string, reasoningReplayEntry](hot.LRU, reasoningReplayCacheCapacity).
				WithTTL(reasoningReplayTTLSeconds * time.Second).
				WithJanitor().
				Build()
		},
	})
}

func getReasoningReplayCache() *cachex.HybridCache[reasoningReplayEntry] {
	reasoningReplayCacheOnce.Do(func() {
		reasoningReplayCache = newReasoningReplayCache()
	})
	return reasoningReplayCache
}

// NormalizeReasoningReplayMode maps an operator-supplied channel setting to one
// of the four known modes. Empty and unknown values fall back to "all": the
// echo is harmless for upstreams that ignore reasoning, and defaulting to it
// keeps generic clients working without per-channel configuration.
func NormalizeReasoningReplayMode(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case ReasoningReplayModeOff:
		return ReasoningReplayModeOff
	case ReasoningReplayModeChat:
		return ReasoningReplayModeChat
	case ReasoningReplayModeResponses:
		return ReasoningReplayModeResponses
	case ReasoningReplayModeAll, "", "auto", "on", "true":
		return ReasoningReplayModeAll
	default:
		return ReasoningReplayModeAll
	}
}

// ReasoningReplayAllows reports whether the mode covers the given surface.
func ReasoningReplayAllows(mode, surface string) bool {
	mode = NormalizeReasoningReplayMode(mode)
	switch surface {
	case ReasoningReplayModeChat:
		return mode == ReasoningReplayModeChat || mode == ReasoningReplayModeAll
	case ReasoningReplayModeResponses:
		return mode == ReasoningReplayModeResponses || mode == ReasoningReplayModeAll
	default:
		return mode != ReasoningReplayModeOff
	}
}

func reasoningReplayKey(tokenID int, model, anchor string) string {
	sum := sha256.Sum256([]byte(anchor))
	return strings.Join([]string{
		"tok", itoa(tokenID), "model", model, "anchor", hex.EncodeToString(sum[:12]),
	}, "|")
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

// messageFingerprint hashes the textual part of a chat message so the same
// conversation maps to the same cache entry across turns and instances.
func messageFingerprint(msg dto.Message) string {
	var b strings.Builder
	b.WriteString(msg.Role)
	b.WriteByte('\x00')
	switch content := msg.Content.(type) {
	case string:
		b.WriteString(content)
	case nil:
	default:
		if raw, err := common.Marshal(content); err == nil {
			b.Write(raw)
		}
	}
	return b.String()
}

// ChatReasoningAnchor returns the conversation anchor for a chat-completions
// request: the first user message, falling back to the first message of any
// role. Requests without messages produce an empty anchor and never touch the
// cache.
func ChatReasoningAnchor(req *dto.GeneralOpenAIRequest) string {
	if req == nil || len(req.Messages) == 0 {
		return ""
	}
	for _, msg := range req.Messages {
		if msg.Role == "user" {
			return messageFingerprint(msg)
		}
	}
	return messageFingerprint(req.Messages[0])
}

// CaptureChatReasoning stores the reasoning text produced for the newest
// assistant turn so the next request in the same conversation can echo it back.
func CaptureChatReasoning(tokenID int, model string, req *dto.GeneralOpenAIRequest, reasoning string) bool {
	reasoning = strings.TrimSpace(reasoning)
	if reasoning == "" {
		return false
	}
	anchor := ChatReasoningAnchor(req)
	if anchor == "" {
		return false
	}
	entry := reasoningReplayEntry{
		Reasoning: reasoning,
		Model:     model,
		UpdatedAt: time.Now().Unix(),
	}
	if err := getReasoningReplayCache().SetWithTTL(
		reasoningReplayKey(tokenID, model, anchor), entry, reasoningReplayTTLSeconds*time.Second,
	); err != nil {
		common.SysError(common.LogText("reasoning replay cache set failed: err=%v", err))
		return false
	}
	return true
}

// ReplayChatReasoning attaches the cached reasoning text to the last assistant
// message when the client replayed that message without any reasoning content.
// Client-supplied reasoning always wins; the function reports whether it
// modified the request.
func ReplayChatReasoning(tokenID int, model, mode string, req *dto.GeneralOpenAIRequest) bool {
	if req == nil || !ReasoningReplayAllows(mode, ReasoningReplayModeChat) {
		return false
	}
	target := -1
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role != "assistant" {
			continue
		}
		if strings.TrimSpace(req.Messages[i].GetReasoningContent()) == "" {
			target = i
		}
		break
	}
	if target < 0 {
		return false
	}
	anchor := ChatReasoningAnchor(req)
	if anchor == "" {
		return false
	}
	entry, found, err := getReasoningReplayCache().Get(reasoningReplayKey(tokenID, model, anchor))
	if err != nil || !found || strings.TrimSpace(entry.Reasoning) == "" {
		return false
	}
	reasoning := entry.Reasoning
	req.Messages[target].ReasoningContent = &reasoning
	req.Messages[target].Reasoning = nil
	return true
}

// ReplayResponsesReasoning injects a reasoning item ahead of the last assistant
// message of a Responses API `input` array. Clients that replay a plain
// assistant message (no `reasoning` item) get the cached text re-attached in the
// shape the Responses API defines: {"type":"reasoning","summary":[...]}.
func ReplayResponsesReasoning(tokenID int, model, mode string, body []byte) ([]byte, bool) {
	if len(body) == 0 || !ReasoningReplayAllows(mode, ReasoningReplayModeResponses) {
		return body, false
	}
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		return body, false
	}
	rawInput, ok := payload["input"]
	if !ok {
		return body, false
	}
	var items []json.RawMessage
	if err := json.Unmarshal(rawInput, &items); err != nil || len(items) == 0 {
		return body, false
	}
	anchor := responsesReasoningAnchor(items)
	if anchor == "" {
		return body, false
	}
	entry, found, err := getReasoningReplayCache().Get(reasoningReplayKey(tokenID, model, anchor))
	if err != nil || !found || strings.TrimSpace(entry.Reasoning) == "" {
		return body, false
	}
	target := -1
	for i := len(items) - 1; i >= 0; i-- {
		var item struct {
			Type string `json:"type"`
			Role string `json:"role"`
		}
		if json.Unmarshal(items[i], &item) != nil {
			continue
		}
		if item.Role != "assistant" {
			continue
		}
		if item.Type != "" && item.Type != "message" {
			continue
		}
		target = i
		break
	}
	if target < 0 {
		return body, false
	}
	reasoningItem, err := json.Marshal(map[string]any{
		"type": "reasoning",
		"summary": []map[string]string{
			{"type": "summary_text", "text": entry.Reasoning},
		},
	})
	if err != nil {
		return body, false
	}
	merged := make([]json.RawMessage, 0, len(items)+1)
	merged = append(merged, items[:target]...)
	merged = append(merged, reasoningItem)
	merged = append(merged, items[target:]...)
	encoded, err := json.Marshal(merged)
	if err != nil {
		return body, false
	}
	payload["input"] = encoded
	out, err := json.Marshal(payload)
	if err != nil {
		return body, false
	}
	return out, true
}

// CaptureResponsesReasoning stores plaintext reasoning seen in a Responses API
// output array ({"type":"reasoning","summary":[{"text":...}]}) for later replay.
func CaptureResponsesReasoning(tokenID int, model string, input json.RawMessage, output json.RawMessage) bool {
	if len(input) == 0 || len(output) == 0 {
		return false
	}
	var items []json.RawMessage
	if err := json.Unmarshal(output, &items); err != nil {
		return false
	}
	text := responsesReasoningText(items)
	if text == "" {
		return false
	}
	var inputItems []json.RawMessage
	if err := json.Unmarshal(input, &inputItems); err != nil {
		return false
	}
	anchor := responsesReasoningAnchor(inputItems)
	if anchor == "" {
		return false
	}
	entry := reasoningReplayEntry{Reasoning: text, Model: model, UpdatedAt: time.Now().Unix()}
	if err := getReasoningReplayCache().SetWithTTL(
		reasoningReplayKey(tokenID, model, anchor), entry, reasoningReplayTTLSeconds*time.Second,
	); err != nil {
		common.SysError(common.LogText("reasoning replay cache set failed: err=%v", err))
		return false
	}
	return true
}

func responsesReasoningAnchor(items []json.RawMessage) string {
	for _, raw := range items {
		var item struct {
			Type    string          `json:"type"`
			Role    string          `json:"role"`
			Content json.RawMessage `json:"content"`
		}
		if json.Unmarshal(raw, &item) != nil {
			continue
		}
		if item.Role == "user" {
			return "responses|" + strings.TrimSpace(string(item.Content))
		}
	}
	if len(items) > 0 {
		return "responses|" + strings.TrimSpace(string(items[0]))
	}
	return ""
}

func responsesReasoningText(items []json.RawMessage) string {
	var b strings.Builder
	for _, raw := range items {
		var item struct {
			Type    string `json:"type"`
			Summary []struct {
				Text string `json:"text"`
			} `json:"summary"`
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
		}
		if json.Unmarshal(raw, &item) != nil || item.Type != "reasoning" {
			continue
		}
		for _, s := range item.Summary {
			b.WriteString(s.Text)
		}
		for _, c := range item.Content {
			b.WriteString(c.Text)
		}
	}
	return b.String()
}
