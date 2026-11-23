package relay

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"

	"github.com/MoeForge/moego/ojson"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	relaychannel "github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relay/requestplugin"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/gin-gonic/gin"
)

// PrepareResponsesRequest applies the same model, conversion and channel rules
// for HTTP and WebSocket requests. The caller closes closer after the attempt;
// passthrough bodies remain owned by the incoming request's BodyStorage.
// The returned adaptor retains route/conversion state for DoRequest/DoResponse.
func PrepareResponsesRequest(c *gin.Context, info *relaycommon.RelayInfo, req *dto.OpenAIResponsesRequest) (relaychannel.Adaptor, common.ReplayableBody, io.Closer, *types.NewAPIError) {
	info.InitChannelMeta(c)
	if info.RelayMode == relayconstant.RelayModeResponsesCompact &&
		!common.SupportsResponsesCompact(info.ChannelType, info.ApiType) {
		return nil, nil, nil, types.NewErrorWithStatusCode(
			fmt.Errorf("unsupported endpoint %q for api type %d", "/v1/responses/compact", info.ApiType),
			types.ErrorCodeInvalidRequest,
			http.StatusBadRequest,
			types.ErrOptionWithSkipRetry(),
		)
	}

	request, err := common.DeepCopy(req)
	if err != nil {
		return nil, nil, nil, types.NewError(fmt.Errorf("failed to copy responses request: %w", err), types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}
	if err := helper.ModelMappedHelper(c, info, request); err != nil {
		return nil, nil, nil, types.NewError(err, types.ErrorCodeChannelModelMappedError, types.ErrOptionWithSkipRetry())
	}
	if err := helper.ApplyReasoningModelSuffix(c, info, request); err != nil {
		return nil, nil, nil, newConvertRequestFailedError(c, info, err)
	}

	adaptor := GetAdaptor(info.ApiType)
	if adaptor == nil {
		return nil, nil, nil, types.NewError(fmt.Errorf("invalid api type: %d", info.ApiType), types.ErrorCodeInvalidApiType, types.ErrOptionWithSkipRetry())
	}
	adaptor.Init(info)
	_, replayReasoning := service.ReasoningReplayPolicyForChannel(info, service.ReasoningReplayModeResponses)
	scope := service.ReasoningReplayScopeForChannel(info)
	scope.RequestedGroup = common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
	if channelID, credential, sessionID, ok := service.CurrentResponsesAffinityScope(c); ok {
		digest := sha256.Sum256([]byte(info.ApiKey))
		if channelID != info.ChannelId || credential != hex.EncodeToString(digest[:]) {
			return nil, nil, nil, types.NewErrorWithStatusCode(fmt.Errorf("reasoning continuation belongs to another upstream"), types.ErrorCodeInvalidRequest, http.StatusConflict, types.ErrOptionWithSkipRetry())
		}
		scope.SessionID = sessionID
	}
	if model_setting.GetGlobalSettings().PassThroughRequestEnabled || info.ChannelSetting.PassThroughBodyEnabled {
		storage, err := common.GetBodyStorage(c)
		if err != nil {
			return nil, nil, nil, types.NewError(err, types.ErrorCodeReadRequestBodyFailed, types.ErrOptionWithSkipRetry())
		}
		outboundStorage := storage
		var ownedStorage common.BodyStorage
		if replayReasoning {
			raw, readErr := outboundStorage.Bytes()
			if readErr != nil {
				return nil, nil, nil, types.NewError(readErr, types.ErrorCodeReadRequestBodyFailed, types.ErrOptionWithSkipRetry())
			}
			if replayed, changed := service.ReplayResponsesReasoningWithPolicy(info.TokenId, info.OriginModelName, info.ChannelOtherSettings.ReasoningReplay, raw, service.IsCodexClient(service.ClientUserAgent(info.RequestHeaders)), scope); changed {
				ownedStorage, err = common.CreateBodyStorage(replayed)
				if err != nil {
					return nil, nil, nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
				}
				outboundStorage = ownedStorage
			}
		}
		if info.RelayMode == relayconstant.RelayModeResponses && info.ChannelOtherSettings.StripPromptCacheOptions {
			values, fieldErr := common.ReadBodyJSONFields(outboundStorage, "prompt_cache_options")
			if fieldErr != nil {
				if ownedStorage != nil {
					_ = ownedStorage.Close()
				}
				return nil, nil, nil, types.NewErrorWithStatusCode(fieldErr, types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
			}
			if len(values) > 0 && values[0].Exists() {
				raw, readErr := outboundStorage.Bytes()
				if readErr != nil {
					if ownedStorage != nil {
						_ = ownedStorage.Close()
					}
					return nil, nil, nil, types.NewError(readErr, types.ErrorCodeReadRequestBodyFailed, types.ErrOptionWithSkipRetry())
				}
				filtered, stripErr := stripResponsesPromptCacheOptions(raw)
				if stripErr != nil {
					if ownedStorage != nil {
						_ = ownedStorage.Close()
					}
					return nil, nil, nil, types.NewErrorWithStatusCode(stripErr, types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
				}
				if !bytes.Equal(filtered, raw) {
					updated, createErr := common.CreateBodyStorage(filtered)
					if createErr != nil {
						if ownedStorage != nil {
							_ = ownedStorage.Close()
						}
						return nil, nil, nil, types.NewError(createErr, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
					}
					if ownedStorage != nil {
						_ = ownedStorage.Close()
					}
					ownedStorage, outboundStorage = updated, updated
				}
			}
		}
		if apiErr := requestplugin.PassThrough(c, info, outboundStorage); apiErr != nil {
			if ownedStorage != nil {
				_ = ownedStorage.Close()
			}
			return nil, nil, nil, apiErr
		}
		if ownedStorage != nil {
			return adaptor, common.NewReplayableBodyReader(ownedStorage), ownedStorage, nil
		}
		body := common.NewReplayableBodyReader(storage)
		return adaptor, body, io.NopCloser(body), nil
	}

	convertedRequest, err := adaptor.ConvertOpenAIResponsesRequest(c, info, *request)
	if err != nil {
		return nil, nil, nil, newConvertRequestFailedError(c, info, err)
	}
	relaycommon.AppendRequestConversionFromRequest(info, convertedRequest)
	jsonData, err := common.Marshal(convertedRequest)
	if err != nil {
		return nil, nil, nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}
	jsonData, err = relaycommon.RemoveDisabledFields(jsonData, info.ChannelOtherSettings, info.ChannelSetting.PassThroughBodyEnabled)
	if err != nil {
		return nil, nil, nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}
	jsonData, apiErr := requestplugin.Outbound(c, info, jsonData)
	if apiErr != nil {
		return nil, nil, nil, apiErr
	}
	if len(info.ParamOverride) > 0 {
		jsonData, err = relaycommon.ApplyParamOverrideWithRelayInfo(jsonData, info)
		if err != nil {
			return nil, nil, nil, newAPIErrorFromParamOverride(err)
		}
	}
	if replayReasoning {
		if replayed, changed := service.ReplayResponsesReasoningWithPolicy(info.TokenId, info.OriginModelName, info.ChannelOtherSettings.ReasoningReplay, jsonData, service.IsCodexClient(service.ClientUserAgent(info.RequestHeaders)), scope); changed {
			jsonData = replayed
		}
	}
	if finalizer, ok := adaptor.(relaychannel.ResponsesRequestFinalizer); ok {
		jsonData, err = finalizer.FinalizeResponsesRequest(info, jsonData)
		if err != nil {
			return nil, nil, nil, newConvertRequestFailedError(c, info, err)
		}
	}
	if info.RelayMode == relayconstant.RelayModeResponses && info.ChannelOtherSettings.StripPromptCacheOptions {
		jsonData, err = stripResponsesPromptCacheOptions(jsonData)
		if err != nil {
			return nil, nil, nil, types.NewErrorWithStatusCode(err, types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
		}
	}
	// egress reads the body as it is sent, after the channel finalized it.
	if apiErr = requestplugin.Egress(c, info, jsonData); apiErr != nil {
		return nil, nil, nil, apiErr
	}

	logger.LogDebug(c, "requestBody: %s", jsonData)
	body, closer, err := relaycommon.NewOutboundJSONBody(jsonData)
	if err != nil {
		return nil, nil, nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}
	return adaptor, body, closer, nil
}

// stripResponsesPromptCacheOptions removes only the top-level compatibility
// parameter. Removing every occurrence prevents duplicate JSON keys bypassing
// the channel setting while preserving unrelated request bytes and precision.
func stripResponsesPromptCacheOptions(body []byte) ([]byte, error) {
	if !ojson.ValidBytes(body) {
		return nil, fmt.Errorf("invalid Responses request JSON")
	}
	doc := ojson.NewDoc(body)
	if err := relaycommon.DeleteJSONMember(doc, "prompt_cache_options"); err != nil {
		return nil, err
	}
	return doc.Bytes(), nil
}
