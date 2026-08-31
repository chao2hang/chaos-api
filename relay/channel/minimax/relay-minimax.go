package minimax

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	channelconstant "github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetRequestURL(info *relaycommon.RelayInfo) (string, error) {
	baseUrl := info.ChannelBaseUrl
	if baseUrl == "" {
		baseUrl = channelconstant.GetChannelBaseURL(channelconstant.ChannelTypeMiniMax)
	}
	switch info.RelayFormat {
	case types.RelayFormatClaude:
		return fmt.Sprintf("%s/anthropic/v1/messages", info.ChannelBaseUrl), nil
	default:
		switch info.RelayMode {
		case constant.RelayModeChatCompletions:
			return fmt.Sprintf("%s/v1/text/chatcompletion_v2", baseUrl), nil
		case constant.RelayModeImagesGenerations:
			return fmt.Sprintf("%s/v1/image_generation", baseUrl), nil
		case constant.RelayModeAudioSpeech:
			return fmt.Sprintf("%s/v1/t2a_v2", baseUrl), nil
		default:
			return "", fmt.Errorf("unsupported relay mode: %d", info.RelayMode)
		}
	}
}

func miniMaxHandler(c *gin.Context, info *relaycommon.RelayInfo, resp *http.Response) (*dto.Usage, *types.NewAPIError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, types.NewOpenAIError(err, types.ErrorCodeReadResponseBodyFailed, http.StatusInternalServerError)
	}
	service.CloseResponseBodyGracefully(resp)

	var minimaxResp MiniMaxChatResponse
	if err := common.Unmarshal(responseBody, &minimaxResp); err != nil {
		return nil, types.NewOpenAIError(err, types.ErrorCodeBadResponseBody, http.StatusInternalServerError)
	}

	if minimaxResp.BaseResp != nil && minimaxResp.BaseResp.StatusCode != 0 {
		statusCode := http.StatusBadRequest
		if minimaxResp.BaseResp.StatusCode == 2056 {
			statusCode = http.StatusTooManyRequests
		} else if resp.StatusCode != http.StatusOK {
			statusCode = resp.StatusCode
		}
		return nil, types.WithOpenAIError(types.OpenAIError{
			Message: minimaxResp.BaseResp.StatusMsg,
			Type:    "minimax_error",
			Code:    fmt.Sprintf("%d", minimaxResp.BaseResp.StatusCode),
		}, statusCode)
	}

	resp.Body = io.NopCloser(bytes.NewReader(responseBody))
	return openai.OpenaiHandler(c, info, resp)
}

func miniMaxStreamHandler(c *gin.Context, info *relaycommon.RelayInfo, resp *http.Response) (*dto.Usage, *types.NewAPIError) {
	if !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		responseBody, err := io.ReadAll(resp.Body)
		service.CloseResponseBodyGracefully(resp)
		if err != nil {
			return nil, types.NewOpenAIError(err, types.ErrorCodeReadResponseBodyFailed, http.StatusInternalServerError)
		}
		var minimaxResp MiniMaxChatResponse
		if err := common.Unmarshal(responseBody, &minimaxResp); err == nil && minimaxResp.BaseResp != nil && minimaxResp.BaseResp.StatusCode != 0 {
			statusCode := http.StatusBadRequest
			if minimaxResp.BaseResp.StatusCode == 2056 {
				statusCode = http.StatusTooManyRequests
			} else if resp.StatusCode != http.StatusOK {
				statusCode = resp.StatusCode
			}
			return nil, types.WithOpenAIError(types.OpenAIError{
				Message: minimaxResp.BaseResp.StatusMsg,
				Type:    "minimax_error",
				Code:    fmt.Sprintf("%d", minimaxResp.BaseResp.StatusCode),
			}, statusCode)
		}
		resp.Body = io.NopCloser(bytes.NewReader(responseBody))
		return openai.OpenaiHandler(c, info, resp)
	}

	return openai.OaiStreamHandler(c, info, resp)
}
