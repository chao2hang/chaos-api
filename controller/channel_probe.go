package controller

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

const (
	channelProbeTimeout        = 20 * time.Second
	channelProbeBodyLimit      = 8 << 10
	channelProbeResultBodySize = 512
)

// channelProbeOutcome classifies the result of one read-only upstream probe.
type channelProbeOutcome int

const (
	// channelProbeHealthy means the upstream accepted the channel credentials.
	channelProbeHealthy channelProbeOutcome = iota
	// channelProbeCredentialFailed means the upstream rejected the channel
	// credentials, so the channel can no longer serve traffic.
	channelProbeCredentialFailed
	// channelProbeInconclusive means the probe could not prove that the
	// credentials are dead, e.g. the upstream has no model list endpoint or
	// the request failed before the credentials were checked.
	channelProbeInconclusive
)

// channelProbeResult carries the classification of one probe together with the
// upstream status code, a short excerpt of the upstream response and the key
// that was probed.
type channelProbeResult struct {
	channel                     *model.Channel
	key                         string
	outcome                     channelProbeOutcome
	statusCode                  int
	credentialMessage           bool
	recoverableAuthInterruption bool
	detail                      string
}

// channelProbeSummary records the outcome of one probe cycle.
type channelProbeSummary struct {
	Probed       int `json:"probed"`
	Healthy      int `json:"healthy"`
	Failed       int `json:"failed"`
	Disabled     int `json:"disabled"`
	Inconclusive int `json:"inconclusive"`
}

// channelProbeSupportedChannelTypes is an allowlist: only channel types with
// a known read-only model-list endpoint are probed. Other provider-specific
// endpoints may differ or treat GET /models unexpectedly.
var channelProbeSupportedChannelTypes = []int{
	constant.ChannelTypeOpenAI,
	constant.ChannelTypeOpenAIMax,
	constant.ChannelTypeOhMyGPT,
	constant.ChannelTypeCustom,
	constant.ChannelTypeAILS,
	constant.ChannelTypeAIProxy,
	constant.ChannelTypeAPI2GPT,
	constant.ChannelTypeAli,
	constant.ChannelTypeAIProxyLibrary,
	constant.ChannelTypeFastGPT,
	constant.ChannelTypeGemini,
	constant.ChannelTypeMoonshot,
	constant.ChannelTypeMiniMax,
	constant.ChannelTypeSiliconFlow,
	constant.ChannelTypeVolcEngine,
	constant.ChannelTypeDeepSeek,
	constant.ChannelTypeMistral,
	constant.ChannelTypeXai,
	constant.ChannelTypeMokaAI,
	constant.ChannelTypeXinference,
	constant.ChannelTypeOllama,
	constant.ChannelTypeAdvancedCustom,
	constant.ChannelTypeVLLM,
	constant.ChannelTypeSGLang,
	constant.ChannelTypeZhipu_v4,
}

// channelProbeKey selects an enabled key without advancing the channel's
// multi-key polling cursor. The probe must not alter production routing state.
func channelProbeKey(channel *model.Channel) (string, error) {
	if !channel.ChannelInfo.IsMultiKey {
		return strings.TrimSpace(channel.Key), nil
	}

	keys := channel.GetKeys()
	for index, key := range keys {
		if status, ok := channel.ChannelInfo.MultiKeyStatusList[index]; ok && status != common.ChannelStatusEnabled {
			continue
		}
		if key = strings.TrimSpace(key); key != "" {
			return key, nil
		}
	}
	return "", errors.New("channel has no enabled keys to probe")
}

// buildChannelProbeRequest builds a read-only request that only validates the
// channel credentials. It never generates content, so probing a channel does
// not consume quota and does not depend on the channel model list.
func buildChannelProbeRequest(ctx context.Context, channel *model.Channel, key string) (*http.Request, error) {
	if !slices.Contains(channelProbeSupportedChannelTypes, channel.Type) {
		return nil, fmt.Errorf("channel type %d does not have a supported model-list probe", channel.Type)
	}
	baseURL := constant.GetChannelBaseURL(channel.Type)
	if channel.GetBaseURL() != "" {
		baseURL = channel.GetBaseURL()
	}

	var requestURL string
	headers := http.Header{}

	switch {
	case channel.Type == constant.ChannelTypeOllama:
		requestURL = fmt.Sprintf("%s/api/tags", baseURL)
		if key != "" {
			headers.Set("Authorization", "Bearer "+key)
		}
	case channel.Type == constant.ChannelTypeGemini:
		requestURL = fmt.Sprintf("%s/v1beta/models", baseURL)
		headers.Set("x-goog-api-key", key)
	case constant.IsAdvancedCustomChannel(channel.Type):
		advancedURL, advancedHeaders, err := buildAdvancedCustomModelListRequest(channel, baseURL, key)
		if err != nil {
			return nil, err
		}
		requestURL = advancedURL
		headers = advancedHeaders
	default:
		requestURL = buildOpenAICompatibleModelListURL(channel.Type, baseURL)
		builtHeaders, err := buildFetchModelsHeaders(channel, key)
		if err != nil {
			return nil, err
		}
		headers = builtHeaders
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header = headers
	return request, nil
}

// classifyChannelProbeResponse turns an upstream response into a probe
// outcome. Only a rejected credential is treated as a failure: every other
// status code stays inconclusive so that a missing model list endpoint or a
// transient upstream error never disables a working channel.
func classifyChannelProbeResponse(statusCode int, body string) channelProbeOutcome {
	switch {
	case statusCode >= 200 && statusCode < 300:
		return channelProbeHealthy
	case statusCode == http.StatusUnauthorized:
		return channelProbeCredentialFailed
	case statusCode == http.StatusForbidden:
		if service.IsRecoverableAuthInterruptionMessage(body) {
			return channelProbeInconclusive
		}
		if service.IsCredentialFailureMessage(body) {
			return channelProbeCredentialFailed
		}
		return channelProbeInconclusive
	default:
		return channelProbeInconclusive
	}
}

// shouldDisableProbedChannel decides whether a probe result justifies
// disabling the channel. A 401 is only acted on when the operator enabled it
// through the auto-disable status codes or when the upstream states that the
// credentials are invalid. A 403 is only acted on when the upstream states
// that the credentials or the subscription are no longer usable, which keeps
// WAF or identity verification rejections recoverable.
func shouldDisableProbedChannel(result channelProbeResult) bool {
	if !common.AutomaticDisableChannelEnabled {
		return false
	}
	if result.recoverableAuthInterruption {
		return false
	}
	return operation_setting.ShouldDisableByStatusCode(result.statusCode) || result.credentialMessage
}

// probeChannelCredentials sends one read-only request to the upstream and
// classifies the response. It never changes the channel state.
func probeChannelCredentials(ctx context.Context, channel *model.Channel) channelProbeResult {
	result := channelProbeResult{channel: channel, outcome: channelProbeInconclusive}
	if channel == nil {
		return result
	}
	if !slices.Contains(channelProbeSupportedChannelTypes, channel.Type) {
		result.detail = "channel type does not have a supported model-list probe"
		return result
	}

	key, err := channelProbeKey(channel)
	if err != nil {
		result.detail = err.Error()
		return result
	}
	result.key = key

	probeCtx, cancel := context.WithTimeout(ctx, channelProbeTimeout)
	defer cancel()

	request, err := buildChannelProbeRequest(probeCtx, channel, key)
	if err != nil {
		result.detail = sanitizeFetchModelsError(err, key).Error()
		return result
	}

	client, err := service.NewProxyHttpClient(channel.GetSetting().Proxy)
	if err != nil {
		result.detail = sanitizeFetchModelsError(err, key).Error()
		return result
	}

	response, err := client.Do(request)
	if err != nil {
		result.detail = sanitizeAdvancedCustomRequestError(err, key, request.URL.String()).Error()
		return result
	}
	defer response.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(response.Body, channelProbeBodyLimit))
	if err != nil {
		result.detail = sanitizeFetchModelsError(err, key).Error()
		return result
	}
	body := string(bodyBytes)

	result.statusCode = response.StatusCode
	result.credentialMessage = service.IsCredentialFailureMessage(body)
	result.recoverableAuthInterruption = service.IsRecoverableAuthInterruptionMessage(body)
	result.outcome = classifyChannelProbeResponse(response.StatusCode, body)
	if result.outcome == channelProbeHealthy {
		return result
	}
	result.detail = channelProbeDetail(response.StatusCode, body, key)
	return result
}

// channelProbeDetail renders a short, redacted excerpt of the upstream
// response for logs and channel disable reasons.
func channelProbeDetail(statusCode int, body, key string) string {
	trimmed := strings.TrimSpace(body)
	if len(trimmed) > channelProbeResultBodySize {
		trimmed = trimmed[:channelProbeResultBodySize]
	}
	if trimmed == "" {
		return fmt.Sprintf("upstream status code %d", statusCode)
	}
	detail := fmt.Sprintf("upstream status code %d: %s", statusCode, trimmed)
	return common.MaskSensitiveInfo(sanitizeFetchModelsError(errors.New(detail), key).Error())
}

// runChannelCredentialProbe probes the enabled channels with a read-only
// request and disables the channels whose credentials the upstream rejects.
// Enabled channels that never receive traffic would otherwise stay alive
// forever, because the relay error path only sees the channels that are
// actually selected for a request.
func runChannelCredentialProbe(ctx context.Context, report func(processed, total int)) (channelProbeSummary, error) {
	summary := channelProbeSummary{}
	if ctx == nil {
		ctx = context.Background()
	}

	channels, err := model.GetAllChannels(0, 0, true, false)
	if err != nil {
		return summary, err
	}

	selected := make([]*model.Channel, 0, len(channels))
	for _, channel := range channels {
		if channel.Status != common.ChannelStatusEnabled ||
			!slices.Contains(channelProbeSupportedChannelTypes, channel.Type) {
			continue
		}
		if !channel.GetAutoBan() {
			continue
		}
		selected = append(selected, channel)
	}

	total := len(selected)
	if report != nil {
		report(0, total)
	}
	if total == 0 {
		return summary, nil
	}

	workerCount := min(operation_setting.GetMonitorSetting().ActiveProbeConcurrency, total)
	jobs := make(chan *model.Channel)
	results := make(chan channelProbeResult)

	var workers sync.WaitGroup
	for range workerCount {
		workers.Go(func() {
			for {
				select {
				case <-ctx.Done():
					return
				case channel, ok := <-jobs:
					if !ok {
						return
					}
					if ctx.Err() != nil {
						return
					}
					result := probeChannelCredentials(ctx, channel)
					select {
					case results <- result:
					case <-ctx.Done():
						return
					}
				}
			}
		})
	}

	go func() {
		defer close(jobs)
		for _, channel := range selected {
			select {
			case <-ctx.Done():
				return
			case jobs <- channel:
			}
		}
	}()

	go func() {
		workers.Wait()
		close(results)
	}()

	processed := 0
	for result := range results {
		summary.Probed++
		switch result.outcome {
		case channelProbeHealthy:
			summary.Healthy++
		case channelProbeCredentialFailed:
			summary.Failed++
			if shouldDisableProbedChannel(result) {
				disableProbedChannel(result)
				summary.Disabled++
			}
		default:
			summary.Inconclusive++
		}

		processed++
		if report != nil {
			report(processed, total)
		}
	}
	if err := ctx.Err(); err != nil {
		return summary, err
	}

	return summary, nil
}

// disableProbedChannel disables a channel whose credentials the upstream
// rejected and notifies the root user about it.
func disableProbedChannel(result channelProbeResult) {
	channel := result.channel
	channelError := types.NewChannelError(
		channel.Id,
		channel.Type,
		channel.Name,
		channel.ChannelInfo.IsMultiKey,
		result.key,
		channel.GetAutoBan(),
	)
	service.DisableChannel(*channelError, result.detail)
}
