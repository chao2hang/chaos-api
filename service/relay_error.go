package service

import (
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

// DecideRelayRetry is the single retry decision for relay attempts. The reason
// is recorded in the request policy decision events of the log details.
func DecideRelayRetry(c *gin.Context, err *types.NewAPIError, retryTimes int) PolicyDecision {
	if err == nil {
		return PolicyDecision{Action: "stop", Reason: "request_completed", Source: "system"}
	}
	if ShouldSkipRetryAfterChannelAffinityFailure(c) {
		source := RequestPolicy(c).SessionModeSource
		if source == "" {
			source = "session_rule"
		}
		return PolicyDecision{Action: "stop", Reason: "strict_session", Source: source}
	}
	if GetChannelConstraints(c).SuppressesRetry() {
		return PolicyDecision{Action: "stop", Reason: "pinned_channel", Source: "channel_constraint"}
	}
	if types.IsChannelError(err) {
		return PolicyDecision{Action: "retry", Reason: "channel_error", Source: "system"}
	}
	if types.IsSkipRetryError(err) {
		return PolicyDecision{Action: "stop", Reason: "non_retryable_error", Source: "system"}
	}
	// The replay cache is shared by the whole official DeepSeek pool, so a
	// missing thinking state is a property of the request body, not of the
	// channel that happened to answer. Retrying another channel reproduces the
	// identical 400 and turns one failure into one per channel in the pool.
	if IsReasoningReplayProtocolError(err) {
		return PolicyDecision{Action: "stop", Reason: "reasoning_replay_miss", Source: "system"}
	}
	if retryTimes <= 0 {
		return PolicyDecision{Action: "stop", Reason: "attempt_budget_exhausted", Source: "global"}
	}
	code := err.StatusCode
	if code >= 200 && code < 300 {
		return PolicyDecision{Action: "stop", Reason: "system_retry_exclusion", Source: "system"}
	}
	if code < 100 || code > 599 {
		return PolicyDecision{Action: "retry", Reason: "unrecognized_status", Source: "system"}
	}
	if operation_setting.IsAlwaysSkipRetryCode(err.GetErrorCode()) || operation_setting.IsAlwaysSkipRetryStatusCode(code) {
		return PolicyDecision{Action: "stop", Reason: "system_retry_exclusion", Source: "system"}
	}
	if operation_setting.ShouldRetryByStatusCode(code) {
		return PolicyDecision{Action: "retry", Reason: "retry_status_matched", Source: "global"}
	}
	return PolicyDecision{Action: "stop", Reason: "status_not_retryable", Source: "global"}
}

func ShouldRetryRelayError(c *gin.Context, openaiErr *types.NewAPIError, retryTimes int) bool {
	return DecideRelayRetry(c, openaiErr, retryTimes).Action == "retry"
}

// reasoningReplayProtocolMarkers identify the upstream rejection that means the
// thinking state was not passed back. It is a per-conversation cache miss, not a
// channel fault: every channel in the pool shares the same replay cache, so
// retrying elsewhere reproduces the identical 400 and multiplies the error rate
// without ever succeeding.
var reasoningReplayProtocolMarkers = []string{
	"reasoning_content` in the thinking mode must be passed back",
	"reasoning_content in the thinking mode must be passed back",
	"reasoning_text` in the thinking mode must be passed back",
	"reasoning_text in the thinking mode must be passed back",
}

// IsReasoningReplayProtocolError reports whether an upstream error is the
// "thinking state must be passed back" rejection.
func IsReasoningReplayProtocolError(err *types.NewAPIError) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	for _, marker := range reasoningReplayProtocolMarkers {
		if strings.Contains(text, strings.ToLower(marker)) {
			return true
		}
	}
	return false
}

// reasoningReplayMisses counts replay-miss 400s per channel so operators can see
// the residue before deciding anything drastic. These errors are never a reason
// to disable a channel: the key works and every channel in the official pool
// shares one cache, so a miss says nothing about the channel that served it.
var reasoningReplayMisses sync.Map // map[int]*int64

// RecordReasoningReplayMiss bumps the per-channel replay-miss counter.
func RecordReasoningReplayMiss(channelID int) {
	if channelID <= 0 {
		return
	}
	value, _ := reasoningReplayMisses.LoadOrStore(channelID, new(int64))
	atomic.AddInt64(value.(*int64), 1)
}

// ReasoningReplayMissCount returns how many replay misses a channel produced.
func ReasoningReplayMissCount(channelID int) int64 {
	if value, ok := reasoningReplayMisses.Load(channelID); ok {
		return atomic.LoadInt64(value.(*int64))
	}
	return 0
}

// ResetReasoningReplayMissCount clears one channel's counter (tests and ops).
func ResetReasoningReplayMissCount(channelID int) {
	reasoningReplayMisses.Delete(channelID)
}

func ProcessChannelError(c *gin.Context, channelError types.ChannelError, err *types.NewAPIError, relayInfo *relaycommon.RelayInfo) {
	if err == nil {
		return
	}
	upstreamURLs := common.UpstreamAddresses(c)
	logger.LogError(c, common.LogText("channel error (channel #%d, status code: %d): %s", channelError.ChannelId, err.StatusCode, common.LocalLogPreview(err.MaskSensitiveErrorWithStatusCode(upstreamURLs...))))
	if IsReasoningReplayProtocolError(err) {
		// Not a channel fault: the client's history carried a thinking turn whose
		// state is not in the shared replay cache. Count it for visibility and
		// leave auto_ban alone — disabling one of the 16 pool channels only moves
		// the same miss to the next one.
		RecordReasoningReplayMiss(channelError.ChannelId)
	}
	if ShouldDisableChannel(err) && channelError.AutoBan {
		reason := err.MaskSensitiveErrorWithStatusCode(upstreamURLs...)
		gopool.Go(func() {
			DisableChannel(channelError, reason)
		})
	}

	RecordRelayErrorLog(c, channelError.ChannelId, err, relayInfo)
}

// RecordRelayErrorLog writes the error log of a failed relay request when
// error logs are on. channelId is 0 for a request that reached no channel.
func RecordRelayErrorLog(c *gin.Context, channelId int, err *types.NewAPIError, relayInfo *relaycommon.RelayInfo) {
	if !constant.ErrorLogEnabled || !types.IsRecordErrorLog(err) {
		return
	}
	userId := c.GetInt("id")
	tokenName := c.GetString("token_name")
	modelName := c.GetString("original_model")
	tokenId := c.GetInt("token_id")
	userGroup := c.GetString("group")
	other := model.NewLogOther()
	if c.Request != nil && c.Request.URL != nil {
		other.SetPublic("request_path", c.Request.URL.Path)
	}
	other.SetPublic("error_type", err.GetErrorType())
	other.SetPublic("error_code", err.GetErrorCode())
	other.SetPublic("status_code", err.StatusCode)
	AppendRelayLogAdminInfo(c, relayInfo, other)
	appendRequestPluginRecord(relayInfo, other)
	AppendResponseModelLogInfo(relayInfo, other)
	AppendTaskPluginContextAuditInfo(c, other)
	startTime := common.GetContextKeyTime(c, constant.ContextKeyRequestStartTime)
	if startTime.IsZero() {
		startTime = time.Now()
	}
	useTimeSeconds := int(time.Since(startTime).Seconds())
	model.RecordErrorLog(c, userId, channelId, modelName, tokenName, err.MaskSensitiveErrorWithStatusCode(common.UpstreamAddresses(c)...), tokenId, useTimeSeconds, common.GetContextKeyBool(c, constant.ContextKeyIsStream), userGroup, other)
}
