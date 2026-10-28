package service

import (
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"sync"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/model"
	"github.com/chaos-api/chaos-api/relaykit/dto"
	"github.com/chaos-api/chaos-api/relaykit/types"
	"github.com/chaos-api/chaos-api/setting/operation_setting"
)

func formatNotifyType(channelId int, status int) string {
	return fmt.Sprintf("%s_%d_%d", dto.NotifyTypeChannelUpdate, channelId, status)
}

func shouldCloseActiveWebSocketsAfterDisable(channelId int) bool {
	channel, err := model.GetChannelById(channelId, true)
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to check channel status before closing active websockets: channel_id=%d, error=%v", channelId, err))
		return true
	}
	return channel.Status != common.ChannelStatusEnabled
}

// disable & notify
func DisableChannel(channelError types.ChannelError, reason string) {
	common.SysLog(fmt.Sprintf("通道「%s」（#%d）发生错误，准备禁用，原因：%s", channelError.ChannelName, channelError.ChannelId, common.LocalLogPreview(reason)))

	// 检查是否启用自动禁用功能
	if !channelError.AutoBan {
		common.SysLog(fmt.Sprintf("通道「%s」（#%d）未启用自动禁用功能，跳过禁用操作", channelError.ChannelName, channelError.ChannelId))
		return
	}

	success := model.UpdateChannelStatus(channelError.ChannelId, channelError.UsingKey, common.ChannelStatusAutoDisabled, reason)
	if success {
		if shouldCloseActiveWebSocketsAfterDisable(channelError.ChannelId) {
			CloseActiveWebSocketsForChannel(channelError.ChannelId, ChannelDisabledCloseReason)
		}
		subject := fmt.Sprintf("通道「%s」（#%d）已被禁用", channelError.ChannelName, channelError.ChannelId)
		content := fmt.Sprintf("通道「%s」（#%d）已被禁用，原因：%s", channelError.ChannelName, channelError.ChannelId, reason)
		NotifyRootUser(formatNotifyType(channelError.ChannelId, common.ChannelStatusAutoDisabled), subject, content)
	}
}

func EnableChannel(channelId int, usingKey string, channelName string) {
	success := model.UpdateChannelStatus(channelId, usingKey, common.ChannelStatusEnabled, "")
	if success {
		subject := fmt.Sprintf("通道「%s」（#%d）已被启用", channelName, channelId)
		content := fmt.Sprintf("通道「%s」（#%d）已被启用", channelName, channelId)
		NotifyRootUser(formatNotifyType(channelId, common.ChannelStatusEnabled), subject, content)
	}
}

var quotaExhaustedKeywords = []string{
	"quota",
	"balance",
	"credit",
	"insufficient",
	"token plan",
	"用量上限",
	"用量超限",
	"余额不足",
	"账户余额不足",
	"额度不足",
	"usage limit",
	"exceeded your current quota",
}

// IsQuotaExhaustedError checks whether an error represents quota, credit, or balance exhaustion.
func IsQuotaExhaustedError(err *types.NewAPIError) bool {
	if err == nil {
		return false
	}
	if err.StatusCode == http.StatusPaymentRequired {
		return true
	}
	code := strings.ToLower(fmt.Sprintf("%v", err.GetErrorCode()))
	errType := strings.ToLower(string(err.GetErrorType()))
	if strings.Contains(code, "quota") || strings.Contains(code, "balance") || strings.Contains(code, "credit") ||
		strings.Contains(errType, "quota") || strings.Contains(errType, "balance") || strings.Contains(errType, "credit") ||
		code == "1008" || code == "2056" {
		return true
	}
	lowerMessage := strings.ToLower(err.Error())
	for _, kw := range quotaExhaustedKeywords {
		if strings.Contains(lowerMessage, kw) {
			return true
		}
	}
	return false
}

// credentialFailureMarkers are upstream error fragments that prove the
// channel credentials can no longer be used. They are matched
// case-insensitively so that a status code alone does not have to be
// conclusive, e.g. HTTP 403 with "SUBSCRIPTION_NOT_FOUND".
var credentialFailureMarkers = []string{
	"invalid api key",
	"invalid_api_key",
	"incorrect api key",
	"api key not found",
	"invalid authentication credentials",
	"authentication failed",
	"authentication error",
	"authentication_error",
	"authentication fails",
	"missing or not active",
	"subscription_not_found",
	"subscription not found",
	"no subscription",
	"subscription expired",
	"invalid_token",
	"invalid credential",
	"invalid credentials",
}

// credentialFailurePatterns cover the wordings where the credential and its
// state are not adjacent literals, e.g. "Your api key (sk-xxx) is invalid".
// The credential must precede the state so that unrelated failures such as
// "model X is invalid for this api key" are not treated as credential
// failures, and a token is only matched with a qualifier so that request
// level messages such as "prompt token is invalid" stay unaffected.
var credentialFailurePatterns = []*regexp.Regexp{
	regexp.MustCompile(`api[ _-]?key[\s_]*(\([^)]*\))?[\s_]*(is\s+|has\s+|was\s+|been\s+)?(invalid|expired|revoked|disabled|not\s+valid|not\s+found)`),
	regexp.MustCompile(`(?:access|auth|authentication|api|bearer|refresh|id|session|security|private|user)\s+token[\s_]*(\([^)]*\))?[\s_]*(is\s+|has\s+|was\s+|been\s+)?(invalid|expired|revoked|not\s+valid|not\s+found)`),
}

var recoverableAuthInterruptionMarkers = []string{
	"waf",
	"identity verification",
	"real-name",
	"real name",
	"captcha",
	"verification required",
	"risk control",
	"risk-control",
	"bot protection",
	"security challenge",
}

// IsRecoverableAuthInterruptionMessage identifies upstream security checks that
// can reject a request without proving that the channel credential is invalid.
func IsRecoverableAuthInterruptionMessage(message string) bool {
	lowerMessage := strings.ToLower(strings.TrimSpace(message))
	return slices.ContainsFunc(recoverableAuthInterruptionMarkers, func(marker string) bool {
		return strings.Contains(lowerMessage, marker)
	})
}

// IsCredentialFailureMessage reports whether an upstream error message proves
// that the channel credentials or subscription are no longer usable.
func IsCredentialFailureMessage(message string) bool {
	lowerMessage := strings.ToLower(strings.TrimSpace(message))
	if lowerMessage == "" || IsRecoverableAuthInterruptionMessage(lowerMessage) {
		return false
	}
	for _, marker := range credentialFailureMarkers {
		if strings.Contains(lowerMessage, marker) {
			return true
		}
	}
	for _, pattern := range credentialFailurePatterns {
		if pattern.MatchString(lowerMessage) {
			return true
		}
	}
	return false
}

type channelRateLimitRecord struct {
	consecutiveCount int
	lastTimestamp    int64
}

var (
	channelRateLimitMu      sync.Mutex
	channelRateLimitRecords = make(map[int]*channelRateLimitRecord)
)

const (
	DefaultRateLimitThreshold = 5
	DefaultRateLimitWindow    = 5 * 60 // 5 minutes in seconds
)

func recordAndCheckConsecutiveRateLimits(channelId int) bool {
	channelRateLimitMu.Lock()
	defer channelRateLimitMu.Unlock()

	now := common.GetTimestamp()
	rec, exists := channelRateLimitRecords[channelId]
	if !exists || now-rec.lastTimestamp > DefaultRateLimitWindow {
		channelRateLimitRecords[channelId] = &channelRateLimitRecord{
			consecutiveCount: 1,
			lastTimestamp:    now,
		}
		return false
	}

	rec.consecutiveCount++
	rec.lastTimestamp = now
	if rec.consecutiveCount >= DefaultRateLimitThreshold {
		delete(channelRateLimitRecords, channelId)
		return true
	}
	return false
}

func ResetChannelRateLimitCounter(channelId int) {
	if channelId <= 0 {
		return
	}
	channelRateLimitMu.Lock()
	defer channelRateLimitMu.Unlock()
	delete(channelRateLimitRecords, channelId)
}

func ShouldDisableChannel(err *types.NewAPIError, channelId ...int) bool {
	if !common.AutomaticDisableChannelEnabled {
		return false
	}
	if err == nil {
		return false
	}
	if types.IsChannelError(err) {
		return true
	}
	if types.IsSkipRetryError(err) {
		return false
	}

	// 429 Status code handling:
	// HTTP 429 (Too Many Requests) represents rate limiting / concurrency / cooling down by RFC 6585.
	// We MUST differentiate between:
	// 1. Quota/balance exhaustion returning 429 (e.g. OpenAI insufficient_quota, MiniMax 2056 token plan limit):
	//    These are permanent or billing-related exhaustion, so disable immediately.
	// 2. Transient rate limits (TPM/RPM/concurrency/upstream cooling down/server busy):
	//    These MUST NOT disable the channel on a single failure. They should failover/retry.
	//    Only if 429 is in AutomaticDisableStatusCodes AND consecutive rate-limit errors exceed the threshold,
	//    do we disable the channel.
	if err.StatusCode == http.StatusTooManyRequests {
		if IsQuotaExhaustedError(err) {
			return true
		}
		lowerMessage := strings.ToLower(err.Error())
		search, _ := AcSearch(lowerMessage, operation_setting.AutomaticDisableKeywords, true)
		if search {
			return true
		}
		if len(channelId) > 0 && channelId[0] > 0 && operation_setting.ShouldDisableByStatusCode(err.StatusCode) {
			return recordAndCheckConsecutiveRateLimits(channelId[0])
		}
		return false
	}

	if IsRecoverableAuthInterruptionMessage(err.Error()) &&
		(err.StatusCode == http.StatusUnauthorized || err.StatusCode == http.StatusForbidden) {
		return false
	}

	if operation_setting.ShouldDisableByStatusCode(err.StatusCode) {
		return true
	}

	if IsQuotaExhaustedError(err) {
		return true
	}

	// The status code alone is not always conclusive: upstreams report dead
	// credentials with 403 (e.g. SUBSCRIPTION_NOT_FOUND) or with 400, so the
	// error message has the final say when it states that the credentials are
	// no longer usable.
	if IsCredentialFailureMessage(err.Error()) {
		return true
	}

	lowerMessage := strings.ToLower(err.Error())
	search, _ := AcSearch(lowerMessage, operation_setting.AutomaticDisableKeywords, true)
	return search
}

func ShouldEnableChannel(newAPIError *types.NewAPIError, status int) bool {
	if !common.AutomaticEnableChannelEnabled {
		return false
	}
	if newAPIError != nil {
		return false
	}
	if status != common.ChannelStatusAutoDisabled {
		return false
	}
	return true
}
