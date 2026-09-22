package service

import (
	"errors"
	"net/http"
	"testing"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/relaykit/types"
	"github.com/chaos-api/chaos-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIsQuotaExhaustedError(t *testing.T) {
	tests := []struct {
		name     string
		err      *types.NewAPIError
		expected bool
	}{
		{
			name:     "nil error",
			err:      nil,
			expected: false,
		},
		{
			name: "HTTP 402 Payment Required",
			err: types.NewOpenAIError(
				errors.New("payment required"),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusPaymentRequired,
			),
			expected: true,
		},
		{
			name: "OpenAI insufficient_quota code",
			err: types.WithOpenAIError(types.OpenAIError{
				Message: "You exceeded your current quota, please check your plan and billing details.",
				Type:    "insufficient_quota",
				Code:    "insufficient_quota",
			}, http.StatusTooManyRequests),
			expected: true,
		},
		{
			name: "MiniMax 2056 token plan limit message",
			err: types.WithOpenAIError(types.OpenAIError{
				Message: "已达到 Token Plan 用量上限：请升级 Token Plan 套餐或购买积分补充用量。",
				Type:    "minimax_error",
				Code:    "2056",
			}, http.StatusTooManyRequests),
			expected: true,
		},
		{
			name: "Chinese balance insufficient message",
			err: types.NewOpenAIError(
				errors.New("账户余额不足，请充值后重试"),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: true,
		},
		{
			name: "Weekly/Monthly usage limit reached",
			err: types.NewOpenAIError(
				errors.New("Weekly usage limit reached for this API key"),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: true,
		},
		{
			name: "Transient rate limit: LiteLLM cooling down",
			err: types.NewOpenAIError(
				errors.New("No deployments available for selected model, Try again in 5 seconds. Passed model=GLM-5.3-Flash."),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: false,
		},
		{
			name: "Transient rate limit: OpenRouter temporarily rate-limited",
			err: types.NewOpenAIError(
				errors.New("Provider returned error ({\"raw\":\"qwen/qwen3.8-27b:free is temporarily rate-limited upstream\",\"limit_source\":\"upstream_provider_shared_pool\"})"),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: false,
		},
		{
			name: "Transient rate limit: Free shared capacity busy",
			err: types.NewOpenAIError(
				errors.New("Free shared capacity is busy, please try again in a few moments"),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: false,
		},
		{
			name: "Transient rate limit: TPM/RPM limit",
			err: types.NewOpenAIError(
				errors.New("Rate limit reached for requests per minute (RPM). Please wait."),
				types.ErrorCodeBadResponseStatusCode,
				http.StatusTooManyRequests,
			),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsQuotaExhaustedError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestShouldDisableChannel_429Semantics(t *testing.T) {
	// Enable automatic channel disabling
	origAutoDisable := common.AutomaticDisableChannelEnabled
	common.AutomaticDisableChannelEnabled = true
	defer func() { common.AutomaticDisableChannelEnabled = origAutoDisable }()

	// Ensure 401 and 429 are in AutomaticDisableStatusCodeRanges
	origRanges := operation_setting.AutomaticDisableStatusCodeRanges
	require.NoError(t, operation_setting.AutomaticDisableStatusCodesFromString("401,429"))
	defer func() { operation_setting.AutomaticDisableStatusCodeRanges = origRanges }()

	channelID := 9999
	ResetChannelRateLimitCounter(channelID)
	defer ResetChannelRateLimitCounter(channelID)

	// 1. Quota 429 error should disable immediately
	quotaErr := types.WithOpenAIError(types.OpenAIError{
		Message: "已达到 Token Plan 用量上限",
		Type:    "minimax_error",
		Code:    "2056",
	}, http.StatusTooManyRequests)
	assert.True(t, ShouldDisableChannel(quotaErr, channelID), "quota 429 should disable channel immediately")

	// 2. Transient 429 should NOT disable on single hit
	transientErr := types.NewOpenAIError(
		errors.New("No deployments available for selected model, Try again in 5 seconds."),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusTooManyRequests,
	)
	assert.False(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should NOT disable channel on 1st error")
	assert.False(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should NOT disable channel on 2nd error")
	assert.False(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should NOT disable channel on 3rd error")
	assert.False(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should NOT disable channel on 4th error")

	// 5th consecutive transient 429 reaches threshold -> should disable
	assert.True(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should disable channel after reaching consecutive threshold")

	// Reset counter and verify it doesn't disable again on next single hit
	ResetChannelRateLimitCounter(channelID)
	assert.False(t, ShouldDisableChannel(transientErr, channelID), "transient 429 should NOT disable after counter reset")

	// 3. 401 error should disable immediately
	authErr := types.WithOpenAIError(types.OpenAIError{
		Message: "Invalid API key.",
		Type:    "invalid_request_error",
		Code:    "invalid_api_key",
	}, http.StatusUnauthorized)
	assert.True(t, ShouldDisableChannel(authErr, channelID), "401 auth error should disable channel immediately")
}
