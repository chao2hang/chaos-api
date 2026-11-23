package relay

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relay/requestplugin"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/samber/lo"

	"github.com/gin-gonic/gin"
)

func TextHelper(c *gin.Context, info *relaycommon.RelayInfo) (newAPIError *types.NewAPIError) {
	info.InitChannelMeta(c)
	service.ResetChatReasoningReplay(c)

	textReq, ok := info.Request.(*dto.GeneralOpenAIRequest)
	if !ok {
		return types.NewErrorWithStatusCode(fmt.Errorf("invalid request type, expected dto.GeneralOpenAIRequest, got %T", info.Request), types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}

	request, err := common.DeepCopy(textReq)
	if err != nil {
		return types.NewError(fmt.Errorf("failed to copy request to GeneralOpenAIRequest: %w", err), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}

	if request.WebSearchOptions != nil {
		c.Set("chat_completion_web_search_context_size", request.WebSearchOptions.SearchContextSize)
	}

	err = helper.ModelMappedHelper(c, info, request)
	if err != nil {
		return types.NewError(err, types.ErrorCodeChannelModelMappedError, types.ErrOptionWithSkipRetry())
	}
	if err := helper.ApplyReasoningModelSuffix(c, info, request); err != nil {
		return newConvertRequestFailedError(c, info, err)
	}

	// Policy belongs to the selected channel instance and outbound surface.
	stripReasoning, replayReasoning := service.ReasoningReplayPolicyForChannel(info, service.ReasoningReplayModeChat)
	scope := service.ReasoningReplayScopeForChannel(info)
	scope.RequestedGroup = common.GetContextKeyString(c, constant.ContextKeyUsingGroup)

	includeUsage := true
	// 判断用户是否需要返回使用情况
	if request.StreamOptions != nil {
		includeUsage = request.StreamOptions.IncludeUsage
	}

	// 如果不支持StreamOptions，将StreamOptions设置为nil
	if !info.SupportStreamOptions || !lo.FromPtrOr(request.Stream, false) {
		request.StreamOptions = nil
	} else {
		// 如果支持StreamOptions，且请求中没有设置StreamOptions，根据配置文件设置StreamOptions
		if constant.ForceStreamOption {
			request.StreamOptions = &dto.StreamOptions{
				IncludeUsage: true,
			}
		}
	}

	info.ShouldIncludeUsage = includeUsage

	adaptor := GetAdaptor(info.ApiType)
	if adaptor == nil {
		return types.NewError(fmt.Errorf("invalid api type: %d", info.ApiType), types.ErrorCodeInvalidApiType, types.ErrOptionWithSkipRetry())
	}
	adaptor.Init(info)

	passThroughGlobal := model_setting.GetGlobalSettings().PassThroughRequestEnabled
	if info.RelayMode == relayconstant.RelayModeChatCompletions &&
		!passThroughGlobal &&
		!info.ChannelSetting.PassThroughBodyEnabled &&
		service.ShouldChatCompletionsUseResponsesGlobal(info.ChannelId, info.ChannelType, info.OriginModelName) {
		if replayReasoning {
			return types.NewErrorWithStatusCode(fmt.Errorf("reasoning replay requires a native chat upstream; disable chat-to-responses conversion for this channel"), types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
		}
		applySystemPromptIfNeeded(c, info, request)
		usage, newApiErr := textRequestViaResponses(c, info, adaptor, request)
		if newApiErr != nil {
			return newApiErr
		}

		var containAudioTokens = usage.CompletionTokenDetails.AudioTokens > 0 || usage.PromptTokensDetails.AudioTokens > 0
		var containsAudioRatios = ratio_setting.ContainsAudioRatio(info.OriginModelName) || ratio_setting.ContainsAudioCompletionRatio(info.OriginModelName)

		if containAudioTokens && containsAudioRatios {
			service.PostAudioConsumeQuota(c, info, usage, nil)
		} else {
			service.PostTextConsumeQuota(c, info, usage, nil)
		}
		return nil
	}

	var requestBody io.Reader

	if passThroughGlobal || info.ChannelSetting.PassThroughBodyEnabled {
		storage, err := common.GetBodyStorage(c)
		if err != nil {
			return types.NewErrorWithStatusCode(err, types.ErrorCodeReadRequestBodyFailed, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
		}
		outboundStorage := storage
		if stripReasoning || replayReasoning {
			bodyBytes, bodyErr := storage.Bytes()
			if bodyErr != nil {
				return types.NewError(bodyErr, types.ErrorCodeReadRequestBodyFailed, types.ErrOptionWithSkipRetry())
			}
			outbound := bodyBytes
			if stripReasoning {
				outbound, err = relaycommon.StripReasoningContentFromAssistantMessages(outbound)
				if err != nil {
					return types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
				}
			} else if replayReasoning {
				var changed bool
				outbound, changed = service.ReplayChatReasoningBody(info.TokenId, info.OriginModelName, info.ChannelOtherSettings.ReasoningReplay, outbound, scope)
				if changed {
					service.MarkChatReasoningReplay(c, info)
				}
			}
			if !bytes.Equal(outbound, bodyBytes) {
				outboundStorage, err = common.CreateBodyStorage(outbound)
				if err != nil {
					return types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
				}
				defer outboundStorage.Close()
			}
		}
		if newAPIError = requestplugin.PassThrough(c, info, outboundStorage); newAPIError != nil {
			return newAPIError
		}
		if common.DebugEnabled {
			if debugBytes, bErr := outboundStorage.Bytes(); bErr == nil {
				logger.LogDebug(c, "requestBody: %s", debugBytes)
			}
		}
		requestBody = common.NewReplayableBodyReader(outboundStorage)
	} else {
		convertedRequest, err := adaptor.ConvertOpenAIRequest(c, info, request)
		if err != nil {
			return newConvertRequestFailedError(c, info, err)
		}
		relaycommon.AppendRequestConversionFromRequest(info, convertedRequest)

		if req, ok := convertedRequest.(*dto.GeneralOpenAIRequest); ok {
			applySystemPromptIfNeeded(c, info, req)
		}

		jsonData, err := common.Marshal(convertedRequest)
		if err != nil {
			return types.NewError(err, types.ErrorCodeJsonMarshalFailed, types.ErrOptionWithSkipRetry())
		}

		// remove disabled fields for OpenAI API
		jsonData, err = relaycommon.RemoveDisabledFields(jsonData, info.ChannelOtherSettings, info.ChannelSetting.PassThroughBodyEnabled)
		if err != nil {
			return types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
		}

		if jsonData, newAPIError = requestplugin.Outbound(c, info, jsonData); newAPIError != nil {
			return newAPIError
		}
		// apply param override
		if len(info.ParamOverride) > 0 {
			jsonData, err = relaycommon.ApplyParamOverrideWithRelayInfo(jsonData, info)
			if err != nil {
				return newAPIErrorFromParamOverride(err)
			}
		}
		_, replayReasoning = service.ReasoningReplayPolicyForChannel(info, service.ReasoningReplayModeChat)
		if !stripReasoning && replayReasoning {
			scope = service.ReasoningReplayScopeForChannel(info)
			scope.RequestedGroup = common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
			var changed bool
			jsonData, changed = service.ReplayChatReasoningBody(info.TokenId, info.OriginModelName, info.ChannelOtherSettings.ReasoningReplay, jsonData, scope)
			if changed {
				service.MarkChatReasoningReplay(c, info)
			}
		}
		if stripReasoning {
			jsonData, err = relaycommon.StripReasoningContentFromAssistantMessages(jsonData)
			if err != nil {
				return types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
			}
		}
		if newAPIError = requestplugin.Egress(c, info, jsonData); newAPIError != nil {
			return newAPIError
		}

		logger.LogDebug(c, "text request body: %s", jsonData)

		body, closer, err := relaycommon.NewOutboundJSONBody(jsonData)
		if err != nil {
			return types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
		}
		defer closer.Close()
		jsonData = nil
		requestBody = body
	}

	var httpResp *http.Response
	resp, err := adaptor.DoRequest(c, info, requestBody)
	if err != nil {
		return types.NewOpenAIError(err, types.ErrorCodeDoRequestFailed, http.StatusInternalServerError)
	}

	statusCodeMappingStr := c.GetString("status_code_mapping")

	if resp != nil {
		httpResp = resp.(*http.Response)
		info.IsStream = info.IsStream || strings.HasPrefix(httpResp.Header.Get("Content-Type"), "text/event-stream")
		if httpResp.StatusCode != http.StatusOK {
			newApiErr := service.RelayErrorHandler(c.Request.Context(), httpResp, false)
			// reset status code 重置状态码
			service.ResetStatusCode(newApiErr, statusCodeMappingStr)
			return newApiErr
		}
	}

	usage, newApiErr := adaptor.DoResponse(c, httpResp, info)
	if newApiErr != nil {
		// reset status code 重置状态码
		service.ResetStatusCode(newApiErr, statusCodeMappingStr)
		return newApiErr
	}

	var containAudioTokens = usage.(*dto.Usage).CompletionTokenDetails.AudioTokens > 0 || usage.(*dto.Usage).PromptTokensDetails.AudioTokens > 0
	var containsAudioRatios = ratio_setting.ContainsAudioRatio(info.OriginModelName) || ratio_setting.ContainsAudioCompletionRatio(info.OriginModelName)

	if containAudioTokens && containsAudioRatios {
		service.PostAudioConsumeQuota(c, info, usage.(*dto.Usage), nil)
	} else {
		service.PostTextConsumeQuota(c, info, usage.(*dto.Usage), nil)
	}
	return nil
}
