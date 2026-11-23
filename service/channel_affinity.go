package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"hash/fnv"
	"maps"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/MoeForge/moego/ojson"
	"github.com/MoeForge/moego/regexp"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/cachex"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/samber/hot"
)

const (
	ginKeyChannelAffinityCacheKey            = "channel_affinity_cache_key"
	ginKeyChannelAffinityTTLSeconds          = "channel_affinity_ttl_seconds"
	ginKeyChannelAffinityMeta                = "channel_affinity_meta"
	ginKeyChannelAffinityLogInfo             = "channel_affinity_log_info"
	ginKeyChannelAffinitySkipRetry           = "channel_affinity_skip_retry_on_failure"
	ginKeyChannelAffinityRetryOffset         = "channel_affinity_retry_offset"
	ginKeyEncryptedResponsesAffinityRequired = "encrypted_responses_affinity_required"
	ginKeyResponsesAffinityBinding           = "responses_affinity_binding"
	ginKeyResponsesOutboundIdentity          = "responses_outbound_identity"

	channelAffinityCacheNamespace           = "new-api:channel_affinity:v2"
	responsesAffinityCacheNamespace         = "new-api:responses_affinity:v1"
	channelAffinityUsageCacheStatsNamespace = "new-api:channel_affinity_usage_cache_stats:v1"

	channelAffinityFallbackTTLSeconds       = 3600
	encryptedResponsesAffinityMinTTLSeconds = 90 * 24 * 60 * 60
)

var (
	ErrResponsesAffinityConflict = errors.New("conflicting Responses session bindings")
	ErrResponsesAffinityInvalid  = errors.New("invalid Responses session identifier")

	channelAffinityCacheOnce sync.Once
	channelAffinityCache     *cachex.HybridCache[int]

	responsesAffinityCacheOnce sync.Once
	responsesAffinityCache     *cachex.HybridCache[ResponsesAffinityBinding]
	responsesAffinityWriteLock sync.Mutex

	channelAffinityUsageCacheStatsOnce  sync.Once
	channelAffinityUsageCacheStatsCache *cachex.HybridCache[ChannelAffinityUsageCacheCounters]

	channelAffinityRegexCache sync.Map // map[string]*regexp.Regexp
)

// ResponsesAffinityBinding is scoped to a verified API token and one Responses
// conversation identifier. Configuration credentials pin multi-key selection;
// the separate outbound identity binds the final HTTP destination and auth after
// overrides/signing. Only hashes are cached, never usable credentials.
type ResponsesAffinityBinding struct {
	ChannelID                   int    `json:"channel_id"`
	CredentialFingerprint       string `json:"credential_fp"`
	OutboundIdentityFingerprint string `json:"outbound_identity_fp,omitempty"`
	SessionID                   string `json:"session_id"`
	ResolvedGroup               string `json:"resolved_group"`
}

type channelAffinityMeta struct {
	CacheKey       string
	TTLSeconds     int
	RuleName       string
	SkipRetry      bool
	ParamTemplate  map[string]any
	KeySourceType  string
	KeySourceKey   string
	KeySourcePath  string
	KeyHint        string
	KeyFingerprint string
	UsingGroup     string
	ModelName      string
	RequestPath    string
}

type ChannelAffinityStatsContext struct {
	RuleName       string
	UsingGroup     string
	KeyFingerprint string
	TTLSeconds     int64
}

const (
	cacheTokenRateModeCachedOverPrompt           = "cached_over_prompt"
	cacheTokenRateModeCachedOverPromptPlusCached = "cached_over_prompt_plus_cached"
	cacheTokenRateModeMixed                      = "mixed"
)

type ChannelAffinityCacheStats struct {
	Enabled       bool           `json:"enabled"`
	Total         int            `json:"total"`
	Unknown       int            `json:"unknown"`
	ByRuleName    map[string]int `json:"by_rule_name"`
	CacheCapacity int            `json:"cache_capacity"`
	CacheAlgo     string         `json:"cache_algo"`
}

func newChannelAffinityCache() *cachex.HybridCache[int] {
	setting := operation_setting.GetChannelAffinitySetting()
	capacity := setting.MaxEntries
	if capacity <= 0 {
		capacity = 100_000
	}
	defaultTTLSeconds := setting.DefaultTTLSeconds
	if defaultTTLSeconds <= 0 {
		defaultTTLSeconds = channelAffinityFallbackTTLSeconds
	}

	return cachex.NewHybridCache[int](cachex.HybridCacheConfig[int]{
		Namespace:     cachex.Namespace(channelAffinityCacheNamespace),
		RedisProvider: func() *redis.Client { return common.RDB },
		RedisEnabled: func() bool {
			return common.RedisEnabled && common.RDB != nil
		},
		RedisCodec: cachex.IntCodec{},
		Memory: func() *hot.HotCache[string, int] {
			return hot.NewHotCache[string, int](hot.LRU, capacity).
				WithTTL(time.Duration(defaultTTLSeconds) * time.Second).
				WithJanitor().
				Build()
		},
	})
}

func getChannelAffinityCache() *cachex.HybridCache[int] {
	channelAffinityCacheOnce.Do(func() {
		channelAffinityCache = newChannelAffinityCache()
	})
	return channelAffinityCache
}

func getResponsesAffinityCache() *cachex.HybridCache[ResponsesAffinityBinding] {
	responsesAffinityCacheOnce.Do(func() {
		capacity := operation_setting.GetChannelAffinitySetting().MaxEntries
		if capacity <= 0 {
			capacity = 100_000
		}
		responsesAffinityCache = cachex.NewHybridCache[ResponsesAffinityBinding](cachex.HybridCacheConfig[ResponsesAffinityBinding]{
			Namespace:     cachex.Namespace(responsesAffinityCacheNamespace),
			RedisProvider: func() *redis.Client { return common.RDB },
			RedisEnabled:  func() bool { return common.RedisEnabled && common.RDB != nil },
			RedisCodec:    cachex.JSONCodec[ResponsesAffinityBinding]{},
			Memory: func() *hot.HotCache[string, ResponsesAffinityBinding] {
				return hot.NewHotCache[string, ResponsesAffinityBinding](hot.LRU, capacity).
					WithTTL(time.Duration(encryptedResponsesAffinityMinTTLSeconds) * time.Second).
					WithJanitor().Build()
			},
		})
	})
	return responsesAffinityCache
}

func responsesAffinityCacheKey(userID, tokenID int, modelName, usingGroup, kind, id string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d\x00%d\x00%s\x00%s\x00%s\x00%s", userID, tokenID, modelName, usingGroup, kind, id)))
	return hex.EncodeToString(sum[:])
}

func responsesPromptCacheKey(c *gin.Context) (string, error) {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return "", err
	}
	values, err := common.ReadBodyJSONFields(storage, "prompt_cache_key")
	if err != nil {
		return "", err
	}
	if len(values) == 0 || values[0].Type != ojson.String {
		return "", nil
	}
	return strings.TrimSpace(values[0].Str), nil
}

// ResolveResponsesAffinityIDs looks up upstream-issued response/reasoning IDs
// within the authenticated user+token+model+group. A prompt_cache_key is a
// token-scoped selector only if the request provides no upstream ID. Partial matches
// and conflicting IDs fail closed rather than selecting a random channel.
func ResolveResponsesAffinityIDs(c *gin.Context, modelName, usingGroup, previousResponseID string, reasoningIDs []string) (ResponsesAffinityBinding, bool, error) {
	if c == nil || c.GetInt("id") <= 0 || c.GetInt("token_id") <= 0 {
		return ResponsesAffinityBinding{}, false, errors.New("verified API token is required for Responses affinity")
	}
	userID, tokenID := c.GetInt("id"), c.GetInt("token_id")
	ids := make([]struct{ kind, value string }, 0, len(reasoningIDs)+1)
	if previousResponseID = strings.TrimSpace(previousResponseID); previousResponseID != "" {
		ids = append(ids, struct{ kind, value string }{"response", previousResponseID})
	}
	for _, id := range reasoningIDs {
		if id = strings.TrimSpace(id); id != "" {
			ids = append(ids, struct{ kind, value string }{"reasoning", id})
		}
	}
	if len(ids) == 0 {
		promptKey, err := responsesPromptCacheKey(c)
		if err != nil {
			return ResponsesAffinityBinding{}, false, err
		}
		if promptKey == "" {
			return ResponsesAffinityBinding{}, false, nil
		}
		ids = append(ids, struct{ kind, value string }{"prompt", promptKey})
	}
	if len(ids) > 128 {
		return ResponsesAffinityBinding{}, false, fmt.Errorf("%w: too many identifiers", ErrResponsesAffinityInvalid)
	}
	var binding ResponsesAffinityBinding
	missing := false
	for _, id := range ids {
		if len(id.value) > 1024 {
			return ResponsesAffinityBinding{}, false, fmt.Errorf("%w: identifier too long", ErrResponsesAffinityInvalid)
		}
		key := responsesAffinityCacheKey(userID, tokenID, modelName, usingGroup, id.kind, id.value)
		foundBinding, found, err := getResponsesAffinityCache().Get(key)
		if err != nil {
			return ResponsesAffinityBinding{}, false, err
		}
		if !found || foundBinding.ChannelID <= 0 || foundBinding.CredentialFingerprint == "" || foundBinding.SessionID == "" {
			missing = true
			continue
		}
		if binding.SessionID != "" && binding != foundBinding {
			return ResponsesAffinityBinding{}, false, fmt.Errorf("%w: multiple IDs name different sessions", ErrResponsesAffinityConflict)
		}
		binding = foundBinding
	}
	if binding.SessionID != "" && missing {
		return ResponsesAffinityBinding{}, false, fmt.Errorf("%w: one or more IDs have no binding", ErrResponsesAffinityConflict)
	}
	if missing {
		// An unknown encrypted item must never fall back to a broad prompt
		// cache hint: it could belong to another upstream account.
		return ResponsesAffinityBinding{}, false, nil
	}
	c.Set(ginKeyResponsesAffinityBinding, binding)
	return binding, true, nil
}

// ValidateResponsesOutboundIdentity runs after all HTTP request mutations and
// before sending any Responses body upstream. A configured key is not proof of
// the actual account: Authorization overrides can select a different credential.
// Only the digest enters the request context or the conversation cache.
func ValidateResponsesOutboundIdentity(c *gin.Context, req *http.Request, additionalHeaders ...string) error {
	if c == nil || req == nil || req.URL == nil {
		return types.NewErrorWithStatusCode(errors.New("Responses outbound identity unavailable"), types.ErrorCodeInvalidRequest, http.StatusConflict, types.ErrOptionWithSkipRetry())
	}
	identity := [][]string{{req.URL.String(), req.Host}}
	headerNames := make([]string, 0, len(req.Header))
	for name := range req.Header {
		headerNames = append(headerNames, name)
	}
	slices.Sort(headerNames)
	trackedHeaders := []string{
		"authorization", "api-key", "x-api-key", "x-goog-api-key", "x-auth-token",
		"cookie", "openai-organization", "openai-project", "chatgpt-account-id",
		"ocp-apim-subscription-key",
	}
	for _, name := range additionalHeaders {
		if name = strings.ToLower(strings.TrimSpace(name)); name != "" {
			trackedHeaders = append(trackedHeaders, name)
		}
	}
	slices.Sort(trackedHeaders)
	for _, name := range slices.Compact(trackedHeaders) {
		// Preserve value boundaries and duplicates instead of concatenating
		// headers, which can make different credential sets hash identically.
		values := []string{name}
		for _, actualName := range headerNames {
			if strings.EqualFold(actualName, name) {
				values = append(values, req.Header[actualName]...)
			}
		}
		identity = append(identity, values)
	}
	encoded, err := common.Marshal(identity)
	if err != nil {
		return types.NewErrorWithStatusCode(errors.New("Responses outbound identity unavailable"), types.ErrorCodeInvalidRequest, http.StatusConflict, types.ErrOptionWithSkipRetry())
	}
	digest := sha256.Sum256(encoded)
	fingerprint := hex.EncodeToString(digest[:])
	if value, exists := c.Get(ginKeyResponsesAffinityBinding); exists {
		binding, valid := value.(ResponsesAffinityBinding)
		if !valid || binding.OutboundIdentityFingerprint == "" || binding.OutboundIdentityFingerprint != fingerprint {
			return types.NewErrorWithStatusCode(errors.New("Responses session outbound identity changed"), types.ErrorCodeInvalidRequest, http.StatusConflict, types.ErrOptionWithSkipRetry())
		}
	}
	c.Set(ginKeyResponsesOutboundIdentity, fingerprint)
	return nil
}

// AuthorizeResponsesAffinityBinding rechecks current entitlements before a
// cached conversation can become a channel pin. A pin must not revive removed
// model abilities or groups, nor price an auto request under the literal "auto".
func AuthorizeResponsesAffinityBinding(c *gin.Context, modelName, usingGroup string, binding ResponsesAffinityBinding) error {
	if c == nil || binding.ChannelID <= 0 || binding.ResolvedGroup == "" || binding.ResolvedGroup == "auto" {
		return errors.New("Responses session group is unavailable")
	}
	userGroup := common.GetContextKeyString(c, constant.ContextKeyUserGroup)
	if usingGroup == "auto" {
		if !slices.Contains(GetRequestAutoGroups(c, userGroup), binding.ResolvedGroup) {
			return errors.New("Responses session group is no longer authorized")
		}
	} else if binding.ResolvedGroup != usingGroup || !IsUserSelectableGroup(userGroup, usingGroup) {
		return errors.New("Responses session group is no longer authorized")
	}
	if !model.IsChannelEnabledForGroupModel(binding.ResolvedGroup, modelName, binding.ChannelID) {
		return errors.New("Responses session channel no longer serves this group and model")
	}
	if usingGroup == "auto" {
		common.SetContextKey(c, constant.ContextKeyAutoGroup, binding.ResolvedGroup)
	}
	return nil
}

// RecordResponsesAffinityIDs must run after the upstream selected its actual
// channel credential and emitted a successful response. Its caller extracts
// response.id and output[].reasoning.id from complete HTTP/SSE responses.
// IDs are selectors scoped by the verified API token, never authenticators.
func RecordResponsesAffinityIDs(c *gin.Context, modelName, usingGroup, upstreamCredential, responseID string, reasoningIDs []string) (string, error) {
	if c == nil || c.GetInt("id") <= 0 || c.GetInt("token_id") <= 0 {
		return "", errors.New("verified API token is required for Responses affinity")
	}
	userID, tokenID := c.GetInt("id"), c.GetInt("token_id")
	channelID := c.GetInt("channel_id")
	if channelID <= 0 || upstreamCredential == "" {
		return "", errors.New("selected upstream credential is required for Responses affinity")
	}
	// Keep the requested group in the owner key, but retain the exact resolved
	// group for auto-group reauthorization and pricing on later pinned turns.
	resolvedGroup := usingGroup
	if usingGroup == "auto" {
		resolvedGroup = common.GetContextKeyString(c, constant.ContextKeyAutoGroup)
	}
	if resolvedGroup == "" || resolvedGroup == "auto" {
		return "", errors.New("resolved Responses channel group is required")
	}
	fingerprint := sha256.Sum256([]byte(upstreamCredential))
	binding := ResponsesAffinityBinding{
		ChannelID: channelID, CredentialFingerprint: hex.EncodeToString(fingerprint[:]), ResolvedGroup: resolvedGroup,
		OutboundIdentityFingerprint: c.GetString(ginKeyResponsesOutboundIdentity),
	}
	ids := make([]struct{ kind, value string }, 0, len(reasoningIDs)+2)
	if responseID = strings.TrimSpace(responseID); responseID != "" {
		ids = append(ids, struct{ kind, value string }{"response", responseID})
	}
	for _, id := range reasoningIDs {
		if id = strings.TrimSpace(id); id != "" {
			ids = append(ids, struct{ kind, value string }{"reasoning", id})
		}
	}
	promptKey, err := responsesPromptCacheKey(c)
	if err != nil {
		return "", err
	}
	if promptKey != "" {
		ids = append(ids, struct{ kind, value string }{"prompt", promptKey})
	}
	if len(ids) == 0 {
		return "", nil
	}
	if len(ids) > 128 {
		return "", errors.New("too many Responses session identifiers")
	}
	requiredCount := len(ids)
	if promptKey != "" && requiredCount > 1 {
		requiredCount-- // A prompt hint is optional when a provider supplied IDs.
	}
	for _, id := range ids {
		if len(id.value) > 1024 {
			return "", errors.New("Responses session identifier is too long")
		}
	}
	if current, ok := c.Get(ginKeyResponsesAffinityBinding); ok {
		if previous, valid := current.(ResponsesAffinityBinding); valid && previous.SessionID != "" {
			if previous.ChannelID != channelID || previous.CredentialFingerprint != binding.CredentialFingerprint || previous.ResolvedGroup != resolvedGroup {
				return "", errors.New("Responses session changed upstream credential or group")
			}
			if binding.OutboundIdentityFingerprint == "" {
				// Direct response-handler callers (including fixtures) have no
				// HTTP egress hook. Preserve, never erase, an existing identity.
				binding.OutboundIdentityFingerprint = previous.OutboundIdentityFingerprint
			} else if previous.OutboundIdentityFingerprint != binding.OutboundIdentityFingerprint {
				return "", errors.New("Responses session changed outbound identity")
			}
			binding.SessionID = previous.SessionID
		}
	}
	if binding.SessionID == "" {
		first := ids[0]
		binding.SessionID = responsesAffinityCacheKey(userID, tokenID, modelName, usingGroup, first.kind, first.value)
	}
	keys := make([]string, 0, len(ids))
	for _, id := range ids {
		keys = append(keys, responsesAffinityCacheKey(userID, tokenID, modelName, usingGroup, id.kind, id.value))
	}
	if err := storeResponsesAffinityBindings(keys, binding, requiredCount); err != nil {
		return "", err
	}
	c.Set(ginKeyResponsesAffinityBinding, binding)
	return binding.SessionID, nil
}

// storeResponsesAffinityBindings checks and writes every required ID in one
// operation. Redis uses one Lua script across instances; memory locks the
// entire preflight+write. An optional prompt alias is never allowed to replace
// an existing session, while a required upstream ID conflict rejects all IDs.
func storeResponsesAffinityBindings(keys []string, binding ResponsesAffinityBinding, requiredCount int) error {
	const ttl = time.Duration(encryptedResponsesAffinityMinTTLSeconds) * time.Second
	cache := getResponsesAffinityCache()
	if common.RedisEnabled && common.RDB != nil {
		encoded, err := common.Marshal(binding)
		if err != nil {
			return err
		}
		fullKeys := make([]string, len(keys))
		for i, key := range keys {
			fullKeys[i] = cache.FullKey(key)
		}
		const atomicSet = `
for i = 1, tonumber(ARGV[3]) do
  local old = redis.call('GET', KEYS[i])
  if old and old ~= ARGV[1] then return 0 end
end
for i = 1, tonumber(ARGV[3]) do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', ARGV[2])
end
for i = tonumber(ARGV[3]) + 1, #KEYS do
  local old = redis.call('GET', KEYS[i])
  if not old or old == ARGV[1] then
    redis.call('SET', KEYS[i], ARGV[1], 'EX', ARGV[2])
  end
end
return 1`
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		written, err := common.RDB.Eval(ctx, atomicSet, fullKeys, string(encoded), encryptedResponsesAffinityMinTTLSeconds, requiredCount).Int64()
		if err != nil {
			return err
		}
		if written != 1 {
			return ErrResponsesAffinityConflict
		}
		return nil
	}
	responsesAffinityWriteLock.Lock()
	defer responsesAffinityWriteLock.Unlock()
	writeKeys := make([]string, 0, len(keys))
	for i, key := range keys {
		previous, found, err := cache.Get(key)
		if err != nil {
			return err
		}
		if found && previous != binding {
			if i < requiredCount {
				return ErrResponsesAffinityConflict
			}
			continue
		}
		writeKeys = append(writeKeys, key)
	}
	for _, key := range writeKeys {
		if err := cache.SetWithTTL(key, binding, ttl); err != nil {
			return err
		}
	}
	return nil
}

// CurrentResponsesAffinityScope is the validated conversation/credential scope
// for replay capture. The fingerprint is safe to cache but is never a key.
func CurrentResponsesAffinityScope(c *gin.Context) (channelID int, credentialFingerprint, sessionID string, ok bool) {
	if c == nil {
		return 0, "", "", false
	}
	value, exists := c.Get(ginKeyResponsesAffinityBinding)
	if !exists {
		return 0, "", "", false
	}
	binding, valid := value.(ResponsesAffinityBinding)
	if !valid || binding.ChannelID <= 0 || binding.CredentialFingerprint == "" || binding.SessionID == "" {
		return 0, "", "", false
	}
	return binding.ChannelID, binding.CredentialFingerprint, binding.SessionID, true
}

func GetChannelAffinityCacheStats() ChannelAffinityCacheStats {
	setting := operation_setting.GetChannelAffinitySetting()
	if setting == nil {
		return ChannelAffinityCacheStats{
			Enabled:    false,
			Total:      0,
			Unknown:    0,
			ByRuleName: map[string]int{},
		}
	}

	cache := getChannelAffinityCache()
	mainCap, _ := cache.Capacity()
	mainAlgo, _ := cache.Algorithm()

	rules := setting.Rules
	ruleByName := make(map[string]operation_setting.ChannelAffinityRule, len(rules))
	for _, r := range rules {
		name := strings.TrimSpace(r.Name)
		if name == "" {
			continue
		}
		if !r.IncludeRuleName {
			continue
		}
		ruleByName[name] = r
	}

	byRuleName := make(map[string]int, len(ruleByName))
	for name := range ruleByName {
		byRuleName[name] = 0
	}

	keys, err := cache.Keys()
	if err != nil {
		common.SysError(common.LogText("channel affinity cache list keys failed: err=%v", err))
		keys = nil
	}
	total := len(keys)
	unknown := 0
	for _, k := range keys {
		prefix := channelAffinityCacheNamespace + ":"
		if !strings.HasPrefix(k, prefix) {
			unknown++
			continue
		}
		rest := strings.TrimPrefix(k, prefix)
		parts := strings.Split(rest, ":")
		if len(parts) < 2 {
			unknown++
			continue
		}
		ruleName := parts[0]
		rule, ok := ruleByName[ruleName]
		if !ok {
			unknown++
			continue
		}
		if rule.IncludeModelName {
			if len(parts) < 3 {
				unknown++
				continue
			}
		}
		if rule.IncludeUsingGroup {
			minParts := 3
			if rule.IncludeModelName {
				minParts = 4
			}
			if len(parts) < minParts {
				unknown++
				continue
			}
		}
		byRuleName[ruleName]++
	}

	return ChannelAffinityCacheStats{
		Enabled:       setting.Enabled,
		Total:         total,
		Unknown:       unknown,
		ByRuleName:    byRuleName,
		CacheCapacity: mainCap,
		CacheAlgo:     mainAlgo,
	}
}

func ClearChannelAffinityCacheAll() int {
	cache := getChannelAffinityCache()
	keys, err := cache.Keys()
	if err != nil {
		common.SysError(common.LogText("channel affinity cache list keys failed: err=%v", err))
		keys = nil
	}
	if len(keys) > 0 {
		if _, err := cache.DeleteMany(keys); err != nil {
			common.SysError(common.LogText("channel affinity cache delete many failed: err=%v", err))
		}
	}
	return len(keys)
}

func ClearChannelAffinityCacheByRuleName(ruleName string) (int, error) {
	ruleName = strings.TrimSpace(ruleName)
	if ruleName == "" {
		return 0, common.NewMessage("rule_name cannot be empty")
	}

	setting := operation_setting.GetChannelAffinitySetting()
	if setting == nil {
		return 0, common.NewMessage("Channel affinity settings are not initialized")
	}

	var matchedRule *operation_setting.ChannelAffinityRule
	for i := range setting.Rules {
		r := &setting.Rules[i]
		if strings.TrimSpace(r.Name) != ruleName {
			continue
		}
		matchedRule = r
		break
	}
	if matchedRule == nil {
		return 0, common.NewMessage("Unknown rule name")
	}
	if !matchedRule.IncludeRuleName {
		return 0, common.NewMessage("This rule does not have include_rule_name enabled, so its cache cannot be cleared by rule")
	}

	cache := getChannelAffinityCache()
	deleted, err := cache.DeleteByPrefix(ruleName)
	if err != nil {
		return 0, err
	}
	return deleted, nil
}

func matchAnyRegexCached(patterns []string, s string) bool {
	if len(patterns) == 0 || s == "" {
		return false
	}
	for _, pattern := range patterns {
		if pattern == "" {
			continue
		}
		re, ok := channelAffinityRegexCache.Load(pattern)
		if !ok {
			compiled, err := regexp.Compile(pattern)
			if err != nil {
				continue
			}
			re = compiled
			channelAffinityRegexCache.Store(pattern, re)
		}
		if re.(*regexp.Regexp).MatchString(s) {
			return true
		}
	}
	return false
}

func matchAnyIncludeFold(patterns []string, s string) bool {
	if len(patterns) == 0 || s == "" {
		return false
	}
	sLower := strings.ToLower(s)
	for _, p := range patterns {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if strings.Contains(sLower, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func extractChannelAffinityValue(c *gin.Context, src operation_setting.ChannelAffinityKeySource) string {
	switch src.Type {
	case "context_int":
		if src.Key == "" {
			return ""
		}
		v := c.GetInt(src.Key)
		if v <= 0 {
			return ""
		}
		return strconv.Itoa(v)
	case "context_string":
		if src.Key == "" {
			return ""
		}
		return strings.TrimSpace(c.GetString(src.Key))
	case "request_header":
		if c == nil || c.Request == nil || src.Key == "" {
			return ""
		}
		return strings.TrimSpace(c.Request.Header.Get(src.Key))
	case "gjson":
		if src.Path == "" {
			return ""
		}
		storage, err := common.GetBodyStorage(c)
		if err != nil {
			return ""
		}
		values, err := common.ReadBodyJSONFields(storage, src.Path)
		if err != nil {
			return ""
		}
		res := values[0]
		if !res.Exists() || res.Type == ojson.Null {
			return ""
		}
		switch res.Type {
		case ojson.String, ojson.Number, ojson.True, ojson.False:
			return strings.TrimSpace(res.String())
		default:
			return strings.TrimSpace(res.Raw)
		}
	default:
		return ""
	}
}

// isStableResponsesAffinitySource reports whether a matched key source names a
// client identity that outlives one request, so an encrypted Responses
// continuation can still find its originating channel after a long idle period.
// A one-off request id or a custom header is not stable enough for that promise.
func isStableResponsesAffinitySource(src operation_setting.ChannelAffinityKeySource) bool {
	switch src.Type {
	case "gjson":
		return src.Path == "prompt_cache_key"
	case "context_int":
		return src.Key == "token_id"
	default:
		return false
	}
}

func buildChannelAffinityCacheKeySuffix(rule operation_setting.ChannelAffinityRule, modelName string, usingGroup string, affinityValue string, userID int) string {
	parts := make([]string, 0, 5)
	if rule.IncludeRuleName && rule.Name != "" {
		parts = append(parts, rule.Name)
	}
	if rule.IncludeModelName && modelName != "" {
		parts = append(parts, modelName)
	}
	if rule.IncludeUsingGroup && usingGroup != "" {
		parts = append(parts, usingGroup)
	}
	if userID > 0 {
		parts = append(parts, "user", strconv.Itoa(userID))
	}
	parts = append(parts, affinityValue)
	return strings.Join(parts, ":")
}

func setChannelAffinityContext(c *gin.Context, meta channelAffinityMeta) {
	c.Set(ginKeyChannelAffinityCacheKey, meta.CacheKey)
	c.Set(ginKeyChannelAffinityTTLSeconds, meta.TTLSeconds)
	c.Set(ginKeyChannelAffinityMeta, meta)
}

func getChannelAffinityContext(c *gin.Context) (string, int, bool) {
	keyAny, ok := c.Get(ginKeyChannelAffinityCacheKey)
	if !ok {
		return "", 0, false
	}
	key, ok := keyAny.(string)
	if !ok || key == "" {
		return "", 0, false
	}
	ttlAny, ok := c.Get(ginKeyChannelAffinityTTLSeconds)
	if !ok {
		return key, 0, true
	}
	ttlSeconds, _ := ttlAny.(int)
	return key, ttlSeconds, true
}

func getChannelAffinityMeta(c *gin.Context) (channelAffinityMeta, bool) {
	anyMeta, ok := c.Get(ginKeyChannelAffinityMeta)
	if !ok {
		return channelAffinityMeta{}, false
	}
	meta, ok := anyMeta.(channelAffinityMeta)
	if !ok {
		return channelAffinityMeta{}, false
	}
	return meta, true
}

func GetChannelAffinityStatsContext(c *gin.Context) (ChannelAffinityStatsContext, bool) {
	if c == nil {
		return ChannelAffinityStatsContext{}, false
	}
	meta, ok := getChannelAffinityMeta(c)
	if !ok {
		return ChannelAffinityStatsContext{}, false
	}
	ruleName := strings.TrimSpace(meta.RuleName)
	keyFp := strings.TrimSpace(meta.KeyFingerprint)
	usingGroup := strings.TrimSpace(meta.UsingGroup)
	if ruleName == "" || keyFp == "" {
		return ChannelAffinityStatsContext{}, false
	}
	ttlSeconds := int64(meta.TTLSeconds)
	if ttlSeconds <= 0 {
		return ChannelAffinityStatsContext{}, false
	}
	return ChannelAffinityStatsContext{
		RuleName:       ruleName,
		UsingGroup:     usingGroup,
		KeyFingerprint: keyFp,
		TTLSeconds:     ttlSeconds,
	}, true
}

func affinityFingerprint(s string) string {
	if s == "" {
		return ""
	}
	hex := common.Sha1([]byte(s))
	if len(hex) >= 8 {
		return hex[:8]
	}
	return hex
}

func buildChannelAffinityKeyHint(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	if len(s) <= 12 {
		return s
	}
	return s[:4] + "..." + s[len(s)-4:]
}

func cloneStringAnyMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return map[string]any{}
	}
	dst := make(map[string]any, len(src))
	maps.Copy(dst, src)
	return dst
}

func mergeChannelOverride(base map[string]any, tpl map[string]any) map[string]any {
	if len(base) == 0 && len(tpl) == 0 {
		return map[string]any{}
	}
	if len(tpl) == 0 {
		return base
	}
	out := cloneStringAnyMap(base)
	for k, v := range tpl {
		if strings.EqualFold(strings.TrimSpace(k), "operations") {
			baseOps, hasBaseOps := extractParamOperations(out[k])
			tplOps, hasTplOps := extractParamOperations(v)
			if hasTplOps {
				if hasBaseOps {
					out[k] = append(tplOps, baseOps...)
				} else {
					out[k] = tplOps
				}
				continue
			}
		}
		if _, exists := out[k]; exists {
			continue
		}
		out[k] = v
	}
	return out
}

func extractParamOperations(value any) ([]any, bool) {
	switch ops := value.(type) {
	case []any:
		if len(ops) == 0 {
			return []any{}, true
		}
		cloned := make([]any, 0, len(ops))
		cloned = append(cloned, ops...)
		return cloned, true
	case []map[string]any:
		cloned := make([]any, 0, len(ops))
		for _, op := range ops {
			cloned = append(cloned, op)
		}
		return cloned, true
	default:
		return nil, false
	}
}

func appendChannelAffinityTemplateAdminInfo(c *gin.Context, meta channelAffinityMeta) {
	if c == nil {
		return
	}
	if len(meta.ParamTemplate) == 0 {
		return
	}

	templateInfo := map[string]any{
		"applied":             true,
		"rule_name":           meta.RuleName,
		"param_override_keys": len(meta.ParamTemplate),
	}
	if anyInfo, ok := c.Get(ginKeyChannelAffinityLogInfo); ok {
		if info, ok := anyInfo.(map[string]any); ok {
			info["override_template"] = templateInfo
			c.Set(ginKeyChannelAffinityLogInfo, info)
			return
		}
	}
	c.Set(ginKeyChannelAffinityLogInfo, map[string]any{
		"reason":            meta.RuleName,
		"rule_name":         meta.RuleName,
		"using_group":       meta.UsingGroup,
		"model":             meta.ModelName,
		"request_path":      meta.RequestPath,
		"key_source":        meta.KeySourceType,
		"key_key":           meta.KeySourceKey,
		"key_path":          meta.KeySourcePath,
		"key_hint":          meta.KeyHint,
		"key_fp":            meta.KeyFingerprint,
		"override_template": templateInfo,
	})
}

// ApplyChannelAffinityOverrideTemplate merges per-rule channel override templates onto the selected channel override config.
func ApplyChannelAffinityOverrideTemplate(c *gin.Context, paramOverride map[string]any) (map[string]any, bool) {
	if c == nil {
		return paramOverride, false
	}
	meta, ok := getChannelAffinityMeta(c)
	if !ok {
		return paramOverride, false
	}
	if len(meta.ParamTemplate) == 0 {
		return paramOverride, false
	}

	mergedParam := mergeChannelOverride(paramOverride, meta.ParamTemplate)
	appendChannelAffinityTemplateAdminInfo(c, meta)
	return mergedParam, true
}

func GetPreferredChannelByAffinity(c *gin.Context, modelName string, usingGroup string) (int, bool) {
	channelID, matched, err := ResolvePreferredChannelByAffinity(c, modelName, usingGroup)
	return channelID, matched && err == nil && channelID > 0
}

// ResolvePreferredChannelByAffinity reports whether a configured key source
// matched independently from whether its channel binding exists. Encrypted
// Responses continuations must fail closed on a missing or unavailable binding.
func ResolvePreferredChannelByAffinity(c *gin.Context, modelName string, usingGroup string) (int, bool, error) {
	return resolveChannelAffinityRule(c, modelName, usingGroup, false)
}

// MatchResponsesAffinityRule preserves rule templates on a strictly bound
// continuation without consulting its optional channel hint cache.
func MatchResponsesAffinityRule(c *gin.Context, modelName, usingGroup string) {
	_, _, _ = resolveChannelAffinityRule(c, modelName, usingGroup, true)
}

func resolveChannelAffinityRule(c *gin.Context, modelName, usingGroup string, metadataOnly bool) (int, bool, error) {
	setting := operation_setting.GetChannelAffinitySetting()
	state := RequestPolicy(c)
	if setting == nil || !setting.Enabled {
		return 0, false, nil
	}
	path := ""
	if c != nil && c.Request != nil && c.Request.URL != nil {
		path = c.Request.URL.Path
	}
	userAgent := ""
	if c != nil && c.Request != nil {
		userAgent = c.Request.UserAgent()
	}

	for _, rule := range setting.Rules {
		if !matchAnyRegexCached(rule.ModelRegex, modelName) {
			continue
		}
		if len(rule.PathRegex) > 0 && !matchAnyRegexCached(rule.PathRegex, path) {
			continue
		}
		if len(rule.UserAgentInclude) > 0 && !matchAnyIncludeFold(rule.UserAgentInclude, userAgent) {
			continue
		}
		var affinityValue string
		var usedSource operation_setting.ChannelAffinityKeySource
		for _, src := range rule.KeySources {
			affinityValue = extractChannelAffinityValue(c, src)
			if affinityValue != "" {
				usedSource = src
				break
			}
		}
		if affinityValue == "" {
			continue
		}
		// Persisted copies of the old built-in rule still contain token_id.
		// It is not a conversation identity; allow distinct first turns on
		// the same token and model to choose their own eligible channel.
		if path == "/v1/responses" && rule.Name == "responses session trace" &&
			len(rule.KeySources) == 2 && rule.KeySources[0].Type == "gjson" &&
			rule.KeySources[0].Path == "prompt_cache_key" &&
			usedSource.Type == "context_int" && usedSource.Key == "token_id" {
			continue
		}
		if rule.ValueRegex != "" && !matchAnyRegexCached([]string{rule.ValueRegex}, affinityValue) {
			continue
		}

		ttlSeconds := rule.TTLSeconds
		if ttlSeconds <= 0 {
			ttlSeconds = setting.DefaultTTLSeconds
		}
		if ttlSeconds <= 0 {
			ttlSeconds = channelAffinityFallbackTTLSeconds
		}
		userID := 0
		if c != nil {
			userID = c.GetInt("id")
		}
		cacheKeySuffix := buildChannelAffinityCacheKeySuffix(rule, modelName, usingGroup, affinityValue, userID)
		cacheKeyFull := channelAffinityCacheNamespace + ":" + cacheKeySuffix
		if !metadataOnly {
			state.SessionMode, state.SessionModeSource = EffectiveSessionMode(setting, rule)
			if c != nil && c.GetBool(ginKeyEncryptedResponsesAffinityRequired) {
				state.SessionMode, state.SessionModeSource = "strict", "encrypted_reasoning"
			}
		}
		// Encrypted Responses reasoning can be resumed after long idle periods.
		// Keep bindings derived from a stable client identity long enough to
		// survive the ordinary affinity TTL, while still refreshing the binding
		// on later successful turns.
		if path == "/v1/responses" && isStableResponsesAffinitySource(usedSource) {
			ttlSeconds = max(ttlSeconds, encryptedResponsesAffinityMinTTLSeconds)
		}
		state.RuleName = rule.Name
		setChannelAffinityContext(c, channelAffinityMeta{
			CacheKey:       cacheKeyFull,
			TTLSeconds:     ttlSeconds,
			RuleName:       rule.Name,
			SkipRetry:      state.SessionMode == "strict",
			ParamTemplate:  cloneStringAnyMap(rule.ParamOverrideTemplate),
			KeySourceType:  strings.TrimSpace(usedSource.Type),
			KeySourceKey:   strings.TrimSpace(usedSource.Key),
			KeySourcePath:  strings.TrimSpace(usedSource.Path),
			KeyHint:        buildChannelAffinityKeyHint(affinityValue),
			KeyFingerprint: affinityFingerprint(affinityValue),
			UsingGroup:     usingGroup,
			ModelName:      modelName,
			RequestPath:    path,
		})

		state.AddEvent(PolicyEvent{Decision: PolicyDecision{Action: "match", Reason: "session_rule_matched", Source: "session_rule"}})
		if metadataOnly || state.SessionMode == "off" {
			return 0, true, nil
		}
		channelID, found, err := getChannelAffinityCache().Get(cacheKeySuffix)
		if err != nil {
			common.SysError(common.LogText("channel affinity cache get failed: rule=%s key_fp=%s, err=%v", rule.Name, affinityFingerprint(affinityValue), err))
			return 0, true, err
		}
		if !found {
			return 0, true, nil
		}
		return channelID, true, nil
	}
	return 0, false, nil
}

// RequireEncryptedResponsesAffinity marks this request as an encrypted
// reasoning continuation so a matched affinity rule is always strict.
func RequireEncryptedResponsesAffinity(c *gin.Context) {
	if c == nil {
		return
	}
	c.Set(ginKeyEncryptedResponsesAffinityRequired, true)
	c.Set(ginKeyChannelAffinitySkipRetry, true)
	state := RequestPolicy(c)
	state.SessionMode, state.SessionModeSource = "strict", "encrypted_reasoning"
}

func RequireResponsesPreviousResponseAffinity(c *gin.Context) {
	if c == nil {
		return
	}
	c.Set(ginKeyEncryptedResponsesAffinityRequired, true)
	c.Set(ginKeyChannelAffinitySkipRetry, true)
	state := RequestPolicy(c)
	state.SessionMode, state.SessionModeSource = "strict", "previous_response_id"
}

func ShouldSkipRetryAfterChannelAffinityFailure(c *gin.Context) bool {
	if c == nil {
		return false
	}
	v, ok := c.Get(ginKeyChannelAffinitySkipRetry)
	if ok {
		b, ok := v.(bool)
		if ok {
			return b
		}
	}
	meta, ok := getChannelAffinityMeta(c)
	if !ok {
		return false
	}
	return meta.SkipRetry
}

func ClearCurrentChannelAffinityCache(c *gin.Context) bool {
	if c == nil {
		return false
	}
	cacheKey, _, ok := getChannelAffinityContext(c)
	if !ok || cacheKey == "" {
		return false
	}

	cache := getChannelAffinityCache()
	deleted, err := cache.DeleteMany([]string{cacheKey})
	if err != nil {
		common.SysError(common.LogText("channel affinity cache delete current failed: err=%v", err))
		return false
	}
	c.Set(ginKeyChannelAffinitySkipRetry, false)
	for _, ok := range deleted {
		if ok {
			return true
		}
	}
	return false
}

func ShouldKeepChannelAffinityOnChannelDisabled() bool {
	setting := operation_setting.GetChannelAffinitySetting()
	if setting == nil {
		return false
	}
	return setting.KeepOnChannelDisabled
}

func MarkChannelAffinityUsed(c *gin.Context, selectedGroup string, channelID int) {
	if c == nil || channelID <= 0 {
		return
	}
	meta, ok := getChannelAffinityMeta(c)
	if !ok {
		return
	}
	c.Set(ginKeyChannelAffinitySkipRetry, meta.SkipRetry)
	// Affinity consumes an attempt, but does not visit a normal priority tier.
	c.Set(ginKeyChannelAffinityRetryOffset, 1)
	info := map[string]any{
		"reason":         meta.RuleName,
		"rule_name":      meta.RuleName,
		"using_group":    meta.UsingGroup,
		"selected_group": selectedGroup,
		"model":          meta.ModelName,
		"request_path":   meta.RequestPath,
		"channel_id":     channelID,
		"key_source":     meta.KeySourceType,
		"key_key":        meta.KeySourceKey,
		"key_path":       meta.KeySourcePath,
		"key_hint":       meta.KeyHint,
		"key_fp":         meta.KeyFingerprint,
	}
	c.Set(ginKeyChannelAffinityLogInfo, info)
}

func AppendChannelAffinityAdminInfo(c *gin.Context, other *model.LogOther) {
	if c == nil || other == nil {
		return
	}
	anyInfo, ok := c.Get(ginKeyChannelAffinityLogInfo)
	if !ok || anyInfo == nil {
		return
	}
	// The hint can be the whole session value for short keys; logs keep only
	// the fingerprint.
	if info, ok := anyInfo.(map[string]any); ok {
		sanitized := cloneStringAnyMap(info)
		delete(sanitized, "key_hint")
		anyInfo = sanitized
	}
	other.SetAdmin("channel_affinity", anyInfo)
}

func RecordChannelAffinity(c *gin.Context, channelID int) {
	if channelID <= 0 {
		return
	}
	setting := operation_setting.GetChannelAffinitySetting()
	if RequestPolicy(c).SessionMode == "off" {
		return
	}
	if setting == nil || !setting.Enabled {
		return
	}
	if setting.SwitchOnSuccess && c != nil {
		if successChannelID := c.GetInt("channel_id"); successChannelID > 0 {
			channelID = successChannelID
		}
	}
	cacheKey, ttlSeconds, ok := getChannelAffinityContext(c)
	if !ok {
		return
	}
	if ttlSeconds <= 0 {
		ttlSeconds = setting.DefaultTTLSeconds
	}
	if ttlSeconds <= 0 {
		ttlSeconds = 3600
	}
	cache := getChannelAffinityCache()
	if err := cache.SetWithTTL(cacheKey, channelID, time.Duration(ttlSeconds)*time.Second); err != nil {
		common.SysError(common.LogText("channel affinity cache set failed: key=%s, err=%v", cacheKey, err))
	}
}

type ChannelAffinityUsageCacheStats struct {
	RuleName            string `json:"rule_name"`
	UsingGroup          string `json:"using_group"`
	KeyFingerprint      string `json:"key_fp"`
	CachedTokenRateMode string `json:"cached_token_rate_mode"`

	Hit           int64 `json:"hit"`
	Total         int64 `json:"total"`
	WindowSeconds int64 `json:"window_seconds"`

	PromptTokens         int64 `json:"prompt_tokens"`
	CompletionTokens     int64 `json:"completion_tokens"`
	TotalTokens          int64 `json:"total_tokens"`
	CachedTokens         int64 `json:"cached_tokens"`
	PromptCacheHitTokens int64 `json:"prompt_cache_hit_tokens"`
	LastSeenAt           int64 `json:"last_seen_at"`
}

type ChannelAffinityUsageCacheCounters struct {
	CachedTokenRateMode string `json:"cached_token_rate_mode"`

	Hit           int64 `json:"hit"`
	Total         int64 `json:"total"`
	WindowSeconds int64 `json:"window_seconds"`

	PromptTokens         int64 `json:"prompt_tokens"`
	CompletionTokens     int64 `json:"completion_tokens"`
	TotalTokens          int64 `json:"total_tokens"`
	CachedTokens         int64 `json:"cached_tokens"`
	PromptCacheHitTokens int64 `json:"prompt_cache_hit_tokens"`
	LastSeenAt           int64 `json:"last_seen_at"`
}

var channelAffinityUsageCacheStatsLocks [64]sync.Mutex

// ObserveChannelAffinityUsageCacheByRelayFormat records usage cache stats with a stable rate mode derived from relay format.
func ObserveChannelAffinityUsageCacheByRelayFormat(c *gin.Context, usage *dto.Usage, relayFormat types.RelayFormat) {
	ObserveChannelAffinityUsageCacheFromContext(c, usage, cachedTokenRateModeByRelayFormat(relayFormat))
}

func ObserveChannelAffinityUsageCacheFromContext(c *gin.Context, usage *dto.Usage, cachedTokenRateMode string) {
	statsCtx, ok := GetChannelAffinityStatsContext(c)
	if !ok {
		return
	}
	observeChannelAffinityUsageCache(statsCtx, usage, cachedTokenRateMode)
}

func GetChannelAffinityUsageCacheStats(ruleName, usingGroup, keyFp string) ChannelAffinityUsageCacheStats {
	ruleName = strings.TrimSpace(ruleName)
	usingGroup = strings.TrimSpace(usingGroup)
	keyFp = strings.TrimSpace(keyFp)

	entryKey := channelAffinityUsageCacheEntryKey(ruleName, usingGroup, keyFp)
	if entryKey == "" {
		return ChannelAffinityUsageCacheStats{
			RuleName:       ruleName,
			UsingGroup:     usingGroup,
			KeyFingerprint: keyFp,
		}
	}

	cache := getChannelAffinityUsageCacheStatsCache()
	v, found, err := cache.Get(entryKey)
	if err != nil || !found {
		return ChannelAffinityUsageCacheStats{
			RuleName:       ruleName,
			UsingGroup:     usingGroup,
			KeyFingerprint: keyFp,
		}
	}
	return ChannelAffinityUsageCacheStats{
		CachedTokenRateMode:  v.CachedTokenRateMode,
		RuleName:             ruleName,
		UsingGroup:           usingGroup,
		KeyFingerprint:       keyFp,
		Hit:                  v.Hit,
		Total:                v.Total,
		WindowSeconds:        v.WindowSeconds,
		PromptTokens:         v.PromptTokens,
		CompletionTokens:     v.CompletionTokens,
		TotalTokens:          v.TotalTokens,
		CachedTokens:         v.CachedTokens,
		PromptCacheHitTokens: v.PromptCacheHitTokens,
		LastSeenAt:           v.LastSeenAt,
	}
}

func observeChannelAffinityUsageCache(statsCtx ChannelAffinityStatsContext, usage *dto.Usage, cachedTokenRateMode string) {
	entryKey := channelAffinityUsageCacheEntryKey(statsCtx.RuleName, statsCtx.UsingGroup, statsCtx.KeyFingerprint)
	if entryKey == "" {
		return
	}

	windowSeconds := statsCtx.TTLSeconds
	if windowSeconds <= 0 {
		return
	}

	cache := getChannelAffinityUsageCacheStatsCache()
	ttl := time.Duration(windowSeconds) * time.Second

	lock := channelAffinityUsageCacheStatsLock(entryKey)
	lock.Lock()
	defer lock.Unlock()

	prev, found, err := cache.Get(entryKey)
	if err != nil {
		return
	}
	next := prev
	if !found {
		next = ChannelAffinityUsageCacheCounters{}
	}
	currentMode := normalizeCachedTokenRateMode(cachedTokenRateMode)
	if currentMode != "" {
		if next.CachedTokenRateMode == "" {
			next.CachedTokenRateMode = currentMode
		} else if next.CachedTokenRateMode != currentMode && next.CachedTokenRateMode != cacheTokenRateModeMixed {
			next.CachedTokenRateMode = cacheTokenRateModeMixed
		}
	}
	next.Total++
	hit, cachedTokens, promptCacheHitTokens := usageCacheSignals(usage)
	if hit {
		next.Hit++
	}
	next.WindowSeconds = windowSeconds
	next.LastSeenAt = time.Now().Unix()
	next.CachedTokens += cachedTokens
	next.PromptCacheHitTokens += promptCacheHitTokens
	next.PromptTokens += int64(usagePromptTokens(usage))
	next.CompletionTokens += int64(usageCompletionTokens(usage))
	next.TotalTokens += int64(usageTotalTokens(usage))
	_ = cache.SetWithTTL(entryKey, next, ttl)
}

func normalizeCachedTokenRateMode(mode string) string {
	switch mode {
	case cacheTokenRateModeCachedOverPrompt:
		return cacheTokenRateModeCachedOverPrompt
	case cacheTokenRateModeCachedOverPromptPlusCached:
		return cacheTokenRateModeCachedOverPromptPlusCached
	case cacheTokenRateModeMixed:
		return cacheTokenRateModeMixed
	default:
		return ""
	}
}

func cachedTokenRateModeByRelayFormat(relayFormat types.RelayFormat) string {
	switch relayFormat {
	case types.RelayFormatOpenAI, types.RelayFormatOpenAIResponses, types.RelayFormatOpenAIResponsesCompaction:
		return cacheTokenRateModeCachedOverPrompt
	case types.RelayFormatClaude:
		return cacheTokenRateModeCachedOverPromptPlusCached
	default:
		return ""
	}
}

func channelAffinityUsageCacheEntryKey(ruleName, usingGroup, keyFp string) string {
	ruleName = strings.TrimSpace(ruleName)
	usingGroup = strings.TrimSpace(usingGroup)
	keyFp = strings.TrimSpace(keyFp)
	if ruleName == "" || keyFp == "" {
		return ""
	}
	return ruleName + "\n" + usingGroup + "\n" + keyFp
}

func usageCacheSignals(usage *dto.Usage) (hit bool, cachedTokens int64, promptCacheHitTokens int64) {
	if usage == nil {
		return false, 0, 0
	}

	cached := int64(0)
	if usage.PromptTokensDetails.CachedTokens > 0 {
		cached = int64(usage.PromptTokensDetails.CachedTokens)
	} else if usage.InputTokensDetails != nil && usage.InputTokensDetails.CachedTokens > 0 {
		cached = int64(usage.InputTokensDetails.CachedTokens)
	}
	pcht := int64(0)
	if usage.PromptCacheHitTokens > 0 {
		pcht = int64(usage.PromptCacheHitTokens)
	}
	return cached > 0 || pcht > 0, cached, pcht
}

func usagePromptTokens(usage *dto.Usage) int {
	if usage == nil {
		return 0
	}
	if usage.PromptTokens > 0 {
		return usage.PromptTokens
	}
	return usage.InputTokens
}

func usageCompletionTokens(usage *dto.Usage) int {
	if usage == nil {
		return 0
	}
	if usage.CompletionTokens > 0 {
		return usage.CompletionTokens
	}
	return usage.OutputTokens
}

func usageTotalTokens(usage *dto.Usage) int {
	if usage == nil {
		return 0
	}
	if usage.TotalTokens > 0 {
		return usage.TotalTokens
	}
	pt := usagePromptTokens(usage)
	ct := usageCompletionTokens(usage)
	if pt > 0 || ct > 0 {
		return pt + ct
	}
	return 0
}

func getChannelAffinityUsageCacheStatsCache() *cachex.HybridCache[ChannelAffinityUsageCacheCounters] {
	channelAffinityUsageCacheStatsOnce.Do(func() {
		setting := operation_setting.GetChannelAffinitySetting()
		capacity := 100_000
		defaultTTLSeconds := 3600
		if setting != nil {
			if setting.MaxEntries > 0 {
				capacity = setting.MaxEntries
			}
			if setting.DefaultTTLSeconds > 0 {
				defaultTTLSeconds = setting.DefaultTTLSeconds
			}
		}

		channelAffinityUsageCacheStatsCache = cachex.NewHybridCache[ChannelAffinityUsageCacheCounters](cachex.HybridCacheConfig[ChannelAffinityUsageCacheCounters]{
			Namespace:     cachex.Namespace(channelAffinityUsageCacheStatsNamespace),
			RedisProvider: func() *redis.Client { return common.RDB },
			RedisEnabled: func() bool {
				return common.RedisEnabled && common.RDB != nil
			},
			RedisCodec: cachex.JSONCodec[ChannelAffinityUsageCacheCounters]{},
			Memory: func() *hot.HotCache[string, ChannelAffinityUsageCacheCounters] {
				return hot.NewHotCache[string, ChannelAffinityUsageCacheCounters](hot.LRU, capacity).
					WithTTL(time.Duration(defaultTTLSeconds) * time.Second).
					WithJanitor().
					Build()
			},
		})
	})
	return channelAffinityUsageCacheStatsCache
}

func channelAffinityUsageCacheStatsLock(key string) *sync.Mutex {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	idx := h.Sum32() % uint32(len(channelAffinityUsageCacheStatsLocks))
	return &channelAffinityUsageCacheStatsLocks[idx]
}
