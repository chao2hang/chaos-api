package minimax

import (
	"github.com/chaos-api/chaos-api/relaykit/dto"
)

type MiniMaxBaseResp struct {
	StatusCode int64  `json:"status_code"`
	StatusMsg  string `json:"status_msg"`
}

type MiniMaxChatResponse struct {
	dto.OpenAITextResponse
	BaseResp *MiniMaxBaseResp `json:"base_resp,omitempty"`
}

type MiniMaxChatStreamResponse struct {
	dto.ChatCompletionsStreamResponse
	BaseResp *MiniMaxBaseResp `json:"base_resp,omitempty"`
}
