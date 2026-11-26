package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/MoeForge/moego/ojson"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/pkg/cachex"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/samber/hot"
)

const (
	reasoningReplayCacheNamespace = "new-api:reasoning_replay:v2"
	reasoningReplayTTLSeconds     = 6 * 60 * 60
	reasoningReplayCacheCapacity  = 50_000
	ReasoningReplayModeOff        = "off"
	ReasoningReplayModeChat       = "chat"
	ReasoningReplayModeResponses  = "responses"
	ReasoningReplayModeAll        = "all"
	ReasoningReplayModeAuto       = "auto"
	ReasoningReplayModeForce      = "force"
)

// ReasoningReplayScope is derived from the selected channel, never the model's
// other candidate channels. Credential is hashed and never stored or logged.
// Without an explicit session, an exact history prefix is required and any
// conflicting capture permanently disables that prefix until its TTL expires.
type ReasoningReplayScope struct {
	ChannelID         int
	Credential        string
	SessionID         string
	UpstreamModel     string
	Endpoint          string
	RequestedGroup    string
	HeaderFingerprint string
	SharedChannel     bool // 官方 DeepSeek 多渠道池：key 不绑定 ChannelID/Credential
}

type reasoningReplayEntry struct {
	Reasoning string            `json:"reasoning,omitempty"`
	Items     []json.RawMessage `json:"items,omitempty"`
	Ambiguous bool              `json:"ambiguous,omitempty"`
}

var (
	reasoningReplayCacheOnce sync.Once
	reasoningReplayCache     *cachex.HybridCache[reasoningReplayEntry]
	reasoningReplayMu        sync.Mutex
)

func newReasoningReplayCache() *cachex.HybridCache[reasoningReplayEntry] {
	return cachex.NewHybridCache[reasoningReplayEntry](cachex.HybridCacheConfig[reasoningReplayEntry]{
		Namespace:     cachex.Namespace(reasoningReplayCacheNamespace),
		RedisProvider: func() *redis.Client { return common.RDB },
		RedisEnabled:  func() bool { return common.RedisEnabled && common.RDB != nil },
		RedisCodec:    cachex.JSONCodec[reasoningReplayEntry]{},
		Memory: func() *hot.HotCache[string, reasoningReplayEntry] {
			return hot.NewHotCache[string, reasoningReplayEntry](hot.LRU, reasoningReplayCacheCapacity).WithTTL(reasoningReplayTTLSeconds * time.Second).WithJanitor().Build()
		},
	})
}
func getReasoningReplayCache() *cachex.HybridCache[reasoningReplayEntry] {
	reasoningReplayCacheOnce.Do(func() { reasoningReplayCache = newReasoningReplayCache() })
	return reasoningReplayCache
}
func NormalizeReasoningReplayMode(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case ReasoningReplayModeOff:
		return ReasoningReplayModeOff
	case ReasoningReplayModeChat:
		return ReasoningReplayModeChat
	case ReasoningReplayModeResponses:
		return ReasoningReplayModeResponses
	case ReasoningReplayModeAll:
		return ReasoningReplayModeAll
	case ReasoningReplayModeForce:
		return ReasoningReplayModeForce
	default:
		return ReasoningReplayModeAuto
	}
}
func ReasoningReplayAllows(mode, surface string) bool {
	switch NormalizeReasoningReplayMode(mode) {
	case ReasoningReplayModeOff:
		return false
	case ReasoningReplayModeChat:
		return surface == ReasoningReplayModeChat
	case ReasoningReplayModeResponses:
		return surface == ReasoningReplayModeResponses
	default:
		return true
	}
}

// IsOfficialDeepSeekChannel reports whether the selected channel targets
// api.deepseek.com over HTTPS on the default port.
func IsOfficialDeepSeekChannel(info *relaycommon.RelayInfo) bool {
	if info == nil || info.ChannelMeta == nil {
		return false
	}
	baseURL := info.ChannelBaseUrl
	if baseURL == "" {
		baseURL = constant.GetChannelBaseURL(info.ChannelType)
	}
	endpoint, err := url.Parse(baseURL)
	return info.ChannelType == constant.ChannelTypeDeepSeek && err == nil && endpoint.Scheme == "https" && strings.EqualFold(endpoint.Hostname(), "api.deepseek.com") && (endpoint.Port() == "" || endpoint.Port() == "443")
}

// ReasoningReplayPolicyForChannel resolves the final channel instance and actual
// outbound protocol. An opt-in for Responses never enables Chat replay or vice
// versa. Turning replay off does not discard valid DeepSeek client history.
func ReasoningReplayPolicyForChannel(info *relaycommon.RelayInfo, surface string) (strip, replay bool) {
	if info == nil || info.ChannelMeta == nil {
		return surface == ReasoningReplayModeChat, false
	}
	settings := info.ChannelOtherSettings
	officialDeepSeek := IsOfficialDeepSeekChannel(info)
	mode := NormalizeReasoningReplayMode(settings.ReasoningReplay)
	replay = ReasoningReplayAllows(mode, surface)
	if mode == ReasoningReplayModeAuto {
		replay = replay && (officialDeepSeek || (info.ChannelType == constant.ChannelTypeCodex && surface == ReasoningReplayModeResponses))
	}
	strip = surface == ReasoningReplayModeChat && (settings.StripReasoningContent || (!officialDeepSeek && !replay))
	if settings.StripReasoningContent || IsCodexClient(ClientUserAgent(info.RequestHeaders)) {
		replay = false
	}
	if surface == ReasoningReplayModeChat {
		if _, stable := chatReasoningHeaderFingerprint(info); !stable {
			replay = false
		}
	}
	return
}

// Header overrides may select an upstream account through any vendor-specific
// field. Do not infer identity from a client-controlled placeholder or a rule
// matching arbitrary header names; static overrides and plugin effects are
// included verbatim in the hash, never persisted or logged as plaintext.
func chatReasoningHeaderFingerprint(info *relaycommon.RelayInfo) (string, bool) {
	if info == nil {
		return "", false
	}
	overrides := relaycommon.GetEffectiveHeaderOverride(info)
	for name, value := range overrides {
		key := strings.ToLower(strings.TrimSpace(name))
		text, ok := value.(string)
		if !ok || key == "*" || strings.HasPrefix(key, "re:") || strings.HasPrefix(key, "regex:") || strings.Contains(text, "{client_header:") {
			return "", false
		}
	}
	raw, err := common.Marshal([]any{overrides, info.RequestPluginHeaders})
	if err != nil {
		return "", false
	}
	digest := sha256.Sum256(raw)
	return hex.EncodeToString(digest[:]), true
}

const chatReasoningReplayHeadersKey = "chat_reasoning_replay_headers"

// MarkChatReasoningReplay snapshots the identity-affecting header configuration
// before later plugin stages. The sender must check it immediately before I/O.
func MarkChatReasoningReplay(c *gin.Context, info *relaycommon.RelayInfo) {
	fingerprint, stable := chatReasoningHeaderFingerprint(info)
	if !stable {
		fingerprint = "unstable"
	}
	c.Set(chatReasoningReplayHeadersKey, fingerprint)
}

// ChatReasoningReplayHeadersMatch rejects a replayed body if a later plugin or
// parameter override changed its upstream identity after cache lookup.
func ChatReasoningReplayHeadersMatch(c *gin.Context, info *relaycommon.RelayInfo) bool {
	if c == nil {
		return true
	}
	expected := c.GetString(chatReasoningReplayHeadersKey)
	if expected == "" {
		return true
	}
	actual, stable := chatReasoningHeaderFingerprint(info)
	return stable && expected == actual
}

// ChatReasoningReplayMarked reports whether this attempt inserted cached thinking.
func ChatReasoningReplayMarked(c *gin.Context) bool {
	return c != nil && c.GetString(chatReasoningReplayHeadersKey) != ""
}

// ResetChatReasoningReplay clears a previous attempt's snapshot before retry.
func ResetChatReasoningReplay(c *gin.Context) { c.Set(chatReasoningReplayHeadersKey, "") }
func ReasoningReplayScopeForChannel(info *relaycommon.RelayInfo) ReasoningReplayScope {
	if info == nil || info.ChannelMeta == nil {
		return ReasoningReplayScope{}
	}
	baseURL := info.ChannelBaseUrl
	if baseURL == "" {
		baseURL = constant.GetChannelBaseURL(info.ChannelType)
	}
	settings := info.ChannelOtherSettings
	scope := ReasoningReplayScope{ChannelID: info.ChannelId, Credential: info.ApiKey, UpstreamModel: info.GetUpstreamModelName(), Endpoint: strings.TrimRight(baseURL, "/"), RequestedGroup: info.TokenGroup}
	// Only the official api.deepseek.com pool may share state across channels.
	crossChannel := settings.ReasoningReplayCrossChannel
	if IsOfficialDeepSeekChannel(info) && (crossChannel == nil || *crossChannel) {
		scope.SharedChannel = true
	}
	if _, chat := info.Request.(*dto.GeneralOpenAIRequest); chat {
		fingerprint, stable := chatReasoningHeaderFingerprint(info)
		if !stable {
			return ReasoningReplayScope{}
		}
		scope.HeaderFingerprint = fingerprint
	}
	if req, ok := info.Request.(*dto.GeneralOpenAIRequest); ok && req != nil && strings.TrimSpace(req.PromptCacheKey) != "" {
		scope.SessionID = "prompt_cache_key:" + req.PromptCacheKey
		return scope
	}
	for _, name := range []string{"session_id", "x-session-id"} {
		for k, v := range info.RequestHeaders {
			if strings.EqualFold(k, name) && strings.TrimSpace(v) != "" {
				scope.SessionID = name + ":" + v
				return scope
			}
		}
	}
	if req, ok := info.Request.(*dto.OpenAIResponsesRequest); ok && req != nil {
		var key string
		if common.Unmarshal(req.PromptCacheKey, &key) == nil && strings.TrimSpace(key) != "" {
			scope.SessionID = "prompt_cache_key:" + key
		}
	}
	return scope
}
func reasoningReplayKey(tokenID int, model, history string, scopes ...ReasoningReplayScope) string {
	if tokenID <= 0 || len(scopes) != 1 || scopes[0].ChannelID <= 0 || scopes[0].Credential == "" || history == "" {
		return ""
	}
	scope := scopes[0]
	channel, credential := strconv.Itoa(scope.ChannelID), scope.Credential
	// reasoning_content 是上游返回的明文状态，api.deepseek.com 不把状态绑定到某个
	// API Key；tokenID + Endpoint + UpstreamModel 已足以隔离租户与会话，因此同 token
	// 跨渠道复用是安全的。
	if scope.SharedChannel {
		channel, credential = "shared", "shared"
	}
	raw, _ := common.Marshal([]string{strconv.Itoa(tokenID), model, channel, credential, scope.SessionID, scope.UpstreamModel, scope.Endpoint, scope.RequestedGroup, scope.HeaderFingerprint, history})
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

// A compare-and-set is essential for opaque provider state: two concurrent
// completions for the same visible history must not silently overwrite each
// other's encrypted blob. A text-only chat entry cannot be forged or replayed
// against a signed upstream state, so the newest one wins instead of poisoning
// the slot as ambiguous — a stale-but-plausible reasoning text still satisfies
// the upstream "must be passed back" check.
func storeReasoningReplay(key string, entry reasoningReplayEntry) bool {
	if key == "" {
		return false
	}
	raw, err := common.Marshal(entry)
	if err != nil {
		return false
	}
	cache := getReasoningReplayCache()
	if len(entry.Items) == 0 {
		if err := cache.SetWithTTL(key, entry, reasoningReplayTTLSeconds*time.Second); err != nil {
			return false
		}
		return true
	}
	if common.RedisEnabled && common.RDB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		const script = `local old=redis.call('GET',KEYS[1]); if not old or old==ARGV[1] then redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return 1 end; redis.call('SET',KEYS[1],'{"ambiguous":true}','EX',ARGV[2]); return 0`
		result, err := common.RDB.Eval(ctx, script, []string{cache.FullKey(key)}, string(raw), reasoningReplayTTLSeconds).Int()
		return err == nil && result == 1
	}
	reasoningReplayMu.Lock()
	defer reasoningReplayMu.Unlock()
	previous, found, err := cache.Get(key)
	if err != nil {
		return false
	}
	if found {
		old, _ := common.Marshal(previous)
		if string(old) != string(raw) {
			entry = reasoningReplayEntry{Ambiguous: true}
		}
	}
	if cache.SetWithTTL(key, entry, reasoningReplayTTLSeconds*time.Second) != nil {
		return false
	}
	return !entry.Ambiguous
}

// ChatReasoningAnchor describes the complete visible prefix, including tool IDs
// and results. It deliberately excludes only assistant reasoning fields.
func ChatReasoningAnchor(req *dto.GeneralOpenAIRequest) string {
	if req == nil || len(req.Messages) == 0 {
		return ""
	}
	messages := make([]dto.Message, len(req.Messages))
	copy(messages, req.Messages)
	for i := range messages {
		messages[i].ReasoningContent = nil
		messages[i].Reasoning = nil
		if messages[i].Content == nil {
			messages[i].Content = ""
		}
	}
	raw, err := common.Marshal(messages)
	if err != nil {
		return ""
	}
	return "chat|" + string(raw)
}

// chatReasoningNormalizeText collapses whitespace so a client that trims,
// reflows or re-indents echoed text still produces the same signature.
func chatReasoningNormalizeText(text string) string {
	return strings.Join(strings.Fields(text), " ")
}

// chatReasoningLoosePart is one message reduced to what survives a client
// round-trip: role, normalized text and tool identity. Wire-level fields such
// as content shape (string vs parts array), annotations or refusal are dropped
// because clients routinely rewrite them.
type chatReasoningLoosePart struct {
	Role       string   `json:"role"`
	Text       string   `json:"text,omitempty"`
	ToolCallID string   `json:"tool_call_id,omitempty"`
	ToolCalls  []string `json:"tool_calls,omitempty"`
}

func chatReasoningLooseParts(messages []dto.Message) []chatReasoningLoosePart {
	parts := make([]chatReasoningLoosePart, 0, len(messages))
	for i := range messages {
		message := &messages[i]
		part := chatReasoningLoosePart{
			Role:       message.Role,
			Text:       chatReasoningNormalizeText(message.StringContent()),
			ToolCallID: strings.TrimSpace(message.ToolCallId),
		}
		if len(message.ToolCalls) > 0 {
			var calls []struct {
				ID       string `json:"id"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			}
			if common.Unmarshal(message.ToolCalls, &calls) == nil {
				for _, call := range calls {
					part.ToolCalls = append(part.ToolCalls, strings.TrimSpace(call.ID)+"|"+strings.TrimSpace(call.Function.Name)+"|"+chatReasoningNormalizeText(call.Function.Arguments))
				}
			}
		}
		parts = append(parts, part)
	}
	return parts
}

// ChatReasoningAnchorLoose is the second tier: the same visible prefix after
// whitespace and content-shape normalization. It rescues turns where the client
// re-serialized assistant text without changing what was actually said.
func ChatReasoningAnchorLoose(req *dto.GeneralOpenAIRequest) string {
	if req == nil || len(req.Messages) == 0 {
		return ""
	}
	raw, err := common.Marshal(chatReasoningLooseParts(req.Messages))
	if err != nil {
		return ""
	}
	return "chatloose|" + string(raw)
}

// ChatReasoningTurnAnchor is the third tier: the last user message, the ordinal
// of the assistant turn, and a short prefix of the assistant text. It survives
// clients that re-serialize or truncate the tail of what they echo back, which
// is the common residual miss. The prefix (plus ordinal) keeps unrelated turns
// apart, and token + model + scope still isolate conversations.
const chatReasoningTurnPrefixRunes = 16

func ChatReasoningTurnAnchor(req *dto.GeneralOpenAIRequest) string {
	if req == nil || len(req.Messages) == 0 {
		return ""
	}
	parts := chatReasoningLooseParts(req.Messages)
	index := len(parts) - 1
	if parts[index].Role != "assistant" {
		return ""
	}
	prompt := ""
	for i := index - 1; i >= 0; i-- {
		if parts[i].Role == "user" {
			prompt = parts[i].Text
			break
		}
	}
	if prompt == "" {
		return ""
	}
	ordinal := 0
	for i := 0; i < index; i++ {
		if parts[i].Role == "assistant" {
			ordinal++
		}
	}
	answer := []rune(parts[index].Text)
	if len(answer) > chatReasoningTurnPrefixRunes {
		answer = answer[:chatReasoningTurnPrefixRunes]
	}
	return "chatturn|" + strconv.Itoa(ordinal) + "|" + prompt + "|" + string(answer)
}

// chatReasoningAnchors lists the lookup tiers in decreasing strictness. The
// caller tries them in order and stops at the first hit.
func chatReasoningAnchors(req *dto.GeneralOpenAIRequest) []string {
	return []string{ChatReasoningAnchor(req), ChatReasoningAnchorLoose(req), ChatReasoningTurnAnchor(req)}
}

// CaptureChatReasoning cannot safely associate a text-only capture with the
// assistant actually returned. Call CaptureChatReasoningTurn with that message.
func CaptureChatReasoning(tokenID int, model string, req *dto.GeneralOpenAIRequest, reasoning string) bool {
	return false
}
func CaptureChatReasoningTurn(tokenID int, model string, scope ReasoningReplayScope, req *dto.GeneralOpenAIRequest, assistant dto.Message) bool {
	if req == nil || strings.TrimSpace(assistant.GetReasoningContent()) == "" {
		return false
	}
	history := &dto.GeneralOpenAIRequest{Messages: append(append([]dto.Message{}, req.Messages...), assistant)}
	entry := reasoningReplayEntry{Reasoning: assistant.GetReasoningContent()}
	// Store every tier. The exact anchor keeps today's precise behaviour; the
	// looser tiers are the safety net for clients that rewrite what they echo
	// back on the next turn.
	stored := false
	for _, anchor := range chatReasoningAnchors(history) {
		if key := reasoningReplayKey(tokenID, model, anchor, scope); key != "" && storeReasoningReplay(key, entry) {
			stored = true
		}
	}
	return stored
}
func ReplayChatReasoning(tokenID int, model, mode string, req *dto.GeneralOpenAIRequest, scopes ...ReasoningReplayScope) bool {
	if req == nil || !ReasoningReplayAllows(mode, ReasoningReplayModeChat) {
		return false
	}
	changed := false
	for i := range req.Messages {
		message := &req.Messages[i]
		// An empty string or blank value is as unusable upstream as a missing
		// field; clients that "clear" reasoning this way must still be patched.
		if message.Role != "assistant" || strings.TrimSpace(message.GetReasoningContent()) != "" {
			continue
		}
		for _, anchor := range chatReasoningAnchors(&dto.GeneralOpenAIRequest{Messages: req.Messages[:i+1]}) {
			key := reasoningReplayKey(tokenID, model, anchor, scopes...)
			if key == "" {
				continue
			}
			entry, found, err := getReasoningReplayCache().Get(key)
			if err != nil || !found || entry.Ambiguous || entry.Reasoning == "" {
				continue
			}
			reasoning := entry.Reasoning
			message.ReasoningContent = &reasoning
			message.Reasoning = nil
			changed = true
			break
		}
	}
	return changed
}

// ReplayChatReasoningBody patches only absent assistant reasoning fields in the
// final wire JSON. Provider extensions and numeric values remain untouched.
func ReplayChatReasoningBody(tokenID int, model, mode string, body []byte, scope ReasoningReplayScope) ([]byte, bool) {
	var request dto.GeneralOpenAIRequest
	if common.Unmarshal(body, &request) != nil || !ReplayChatReasoning(tokenID, model, mode, &request, scope) {
		return body, false
	}
	doc := ojson.NewDoc(body)
	changed := false
	for i, message := range request.Messages {
		if message.Role != "assistant" || message.ReasoningContent == nil {
			continue
		}
		original := ojson.GetBytes(body, "messages."+strconv.Itoa(i)+".reasoning_content")
		legacy := ojson.GetBytes(body, "messages."+strconv.Itoa(i)+".reasoning")
		// An existing but blank field is the same upstream failure as a missing
		// one, so only a non-blank value blocks the patch.
		if strings.TrimSpace(original.String()) != "" || strings.TrimSpace(legacy.String()) != "" {
			continue
		}
		if doc.Set("messages."+strconv.Itoa(i)+".reasoning_content", *message.ReasoningContent) != nil {
			return body, false
		}
		changed = true
	}
	return doc.Bytes(), changed
}
func IsCodexClient(userAgent string) bool {
	ua := strings.ToLower(strings.TrimSpace(userAgent))
	for _, marker := range []string{"codex_cli_rs", "codex-cli", "codex/", "openai-codex", "codex_rs"} {
		if strings.Contains(ua, marker) {
			return true
		}
	}
	return false
}
func ClientUserAgent(headers map[string]string) string {
	for k, v := range headers {
		if strings.EqualFold(k, "User-Agent") {
			return v
		}
	}
	return ""
}

// responsesVisibleItem canonicalizes only the fields clients routinely omit
// when echoing output as input. Unknown provider fields remain part of identity.
func responsesVisibleItem(raw json.RawMessage) (json.RawMessage, string) {
	var item map[string]json.RawMessage
	if common.Unmarshal(raw, &item) != nil {
		return nil, ""
	}
	var kind, role string
	_ = common.Unmarshal(item["type"], &kind)
	_ = common.Unmarshal(item["role"], &role)
	if kind == "reasoning" {
		return nil, kind
	}
	if kind == "" && role != "" {
		kind = "message"
		item["type"] = json.RawMessage(`"message"`)
	}
	delete(item, "id")
	delete(item, "status")
	if kind == "message" {
		var parts []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}
		if common.Unmarshal(item["content"], &parts) == nil && len(parts) > 0 {
			text := ""
			allText := true
			for _, part := range parts {
				if part.Type != "output_text" && part.Type != "input_text" && part.Type != "text" {
					allText = false
					break
				}
				text += part.Text
			}
			if allText {
				item["content"], _ = common.Marshal(text)
			}
		}
	}
	normalized, err := common.Marshal(item)
	if err != nil {
		return nil, ""
	}
	return normalized, kind
}
func responsesReasoningAnchor(items []json.RawMessage) string {
	visible := make([]json.RawMessage, 0, len(items))
	for _, raw := range items {
		item, kind := responsesVisibleItem(raw)
		if kind == "reasoning" {
			continue
		}
		if item == nil {
			return ""
		}
		visible = append(visible, item)
	}
	if len(visible) == 0 {
		return ""
	}
	raw, err := common.Marshal(visible)
	if err != nil {
		return ""
	}
	return "responses|" + string(raw)
}
func ReplayResponsesReasoning(tokenID int, model, mode string, body []byte, scopes ...ReasoningReplayScope) ([]byte, bool) {
	return ReplayResponsesReasoningWithPolicy(tokenID, model, mode, body, false, scopes...)
}
func ReplayResponsesReasoningWithPolicy(tokenID int, model, mode string, body []byte, clientIsCodex bool, scopes ...ReasoningReplayScope) ([]byte, bool) {
	if clientIsCodex || !ReasoningReplayAllows(mode, ReasoningReplayModeResponses) {
		return body, false
	}
	var payload map[string]json.RawMessage
	if common.Unmarshal(body, &payload) != nil {
		return body, false
	}
	var items []json.RawMessage
	if common.Unmarshal(payload["input"], &items) != nil {
		return body, false
	}
	history := make([]json.RawMessage, 0, len(items))
	out := make([]json.RawMessage, 0, len(items))
	changed, hasReasoning := false, false
	for _, raw := range items {
		_, kind := responsesVisibleItem(raw)
		if kind == "reasoning" {
			hasReasoning = true
			out = append(out, raw)
			continue
		}
		history = append(history, raw)
		var item struct {
			Role string `json:"role"`
		}
		_ = common.Unmarshal(raw, &item)
		assistant := item.Role == "assistant" || kind == "function_call" || kind == "custom_tool_call"
		if assistant && !hasReasoning {
			key := reasoningReplayKey(tokenID, model, responsesReasoningAnchor(history), scopes...)
			if key != "" {
				entry, found, err := getReasoningReplayCache().Get(key)
				if err == nil && found && !entry.Ambiguous && len(entry.Items) > 0 {
					out = append(out, entry.Items...)
					changed = true
					hasReasoning = true
				}
			}
		}
		out = append(out, raw)
		if !assistant {
			hasReasoning = false
		}
	}
	if !changed {
		return body, false
	}
	payload["input"], _ = common.Marshal(out)
	encoded, err := common.Marshal(payload)
	if err != nil {
		return body, false
	}
	return encoded, true
}
func CaptureResponsesReasoningRaw(tokenID int, model string, input json.RawMessage, payload []byte, scopes ...ReasoningReplayScope) bool {
	var response struct {
		Output   []json.RawMessage `json:"output"`
		Response *struct {
			Output []json.RawMessage `json:"output"`
		} `json:"response"`
	}
	if common.Unmarshal(payload, &response) != nil {
		return false
	}
	output := response.Output
	if len(output) == 0 && response.Response != nil {
		output = response.Response.Output
	}
	encodedOutput, err := common.Marshal(output)
	if err != nil {
		return false
	}
	return CaptureResponsesReasoning(tokenID, model, input, encodedOutput, scopes...)
}
func CaptureResponsesReasoning(tokenID int, model string, input, output json.RawMessage, scopes ...ReasoningReplayScope) bool {
	var history, items []json.RawMessage
	if common.Unmarshal(input, &history) != nil {
		var text string
		if common.Unmarshal(input, &text) != nil || text == "" {
			return false
		}
		user, err := common.Marshal(map[string]any{"role": "user", "content": text})
		if err != nil {
			return false
		}
		history = []json.RawMessage{user}
	}
	if common.Unmarshal(output, &items) != nil {
		return false
	}
	pending := []json.RawMessage{}
	stored := false
	for _, raw := range items {
		_, kind := responsesVisibleItem(raw)
		if kind == "reasoning" {
			pending = append(pending, raw)
			continue
		}
		history = append(history, raw)
		if len(pending) == 0 {
			continue
		}
		// Opaque upstream state needs an explicit session/owner binding. A visible
		// history match alone cannot prove ownership of a provider-issued blob.
		opaque := false
		for _, reasoning := range pending {
			var item struct {
				Encrypted string `json:"encrypted_content"`
			}
			if common.Unmarshal(reasoning, &item) != nil || item.Encrypted != "" {
				opaque = true
			}
		}
		if !opaque || (len(scopes) == 1 && scopes[0].SessionID != "") {
			stored = storeReasoningReplay(reasoningReplayKey(tokenID, model, responsesReasoningAnchor(history), scopes...), reasoningReplayEntry{Items: pending}) || stored
		}
		pending = nil
	}
	return stored
}
