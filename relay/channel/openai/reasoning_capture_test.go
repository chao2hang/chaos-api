package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// The gateway must remember the reasoning text it returned so the next turn of
// the same conversation can echo it back to a stateful thinking upstream
// (codex2api and similar). These tests drive both response shapes end to end.

func TestOaiStreamHandlerCapturesReasoningForReplay(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	const model = "deepseek-flash"
	info := &relaycommon.RelayInfo{
		RelayMode:       relayconstant.RelayModeChatCompletions,
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: model,
		TokenId:         9401,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: model,
		},
		Request: &dto.GeneralOpenAIRequest{
			Model:    model,
			Messages: []dto.Message{{Role: "user", Content: "stream conversation"}},
		},
	}

	ssePayload := strings.Join([]string{
		`data: {"id":"chatcmpl-r","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-flash","choices":[{"index":0,"delta":{"reasoning_content":"think-a "},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-r","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-flash","choices":[{"index":0,"delta":{"reasoning_content":"think-b"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-r","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-flash","choices":[{"index":0,"delta":{"content":"answer"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl-r","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-flash","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}`,
		"",
	}, "\n\n")

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"text/event-stream"}},
		Body:       io.NopCloser(strings.NewReader(ssePayload)),
	}

	usage, apiErr := OaiStreamHandler(c, info, resp)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)

	next := &dto.GeneralOpenAIRequest{
		Model: model,
		Messages: []dto.Message{
			{Role: "user", Content: "stream conversation"},
			{Role: "assistant", Content: "answer"},
			{Role: "user", Content: "continue"},
		},
	}
	require.True(t, service.ReplayChatReasoning(9401, model, service.ReasoningReplayModeAll, next))
	require.NotNil(t, next.Messages[1].ReasoningContent)
	require.Equal(t, "think-a think-b", *next.Messages[1].ReasoningContent)
}

func TestOpenaiHandlerCapturesReasoningForReplay(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	const model = "gpt-6-luna"
	info := &relaycommon.RelayInfo{
		RelayMode:       relayconstant.RelayModeChatCompletions,
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: model,
		TokenId:         9402,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: model,
		},
		Request: &dto.GeneralOpenAIRequest{
			Model:    model,
			Messages: []dto.Message{{Role: "user", Content: "non-stream conversation"}},
		},
	}

	body := `{"id":"chatcmpl-n","object":"chat.completion","created":1700000000,"model":"gpt-6-luna","choices":[{"index":0,"message":{"role":"assistant","content":"answer","reasoning_content":"nonstream-thought"},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":3,"total_tokens":8}}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}

	usage, apiErr := OpenaiHandler(c, info, resp)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)

	next := &dto.GeneralOpenAIRequest{
		Model: model,
		Messages: []dto.Message{
			{Role: "user", Content: "non-stream conversation"},
			{Role: "assistant", Content: "answer"},
		},
	}
	require.True(t, service.ReplayChatReasoning(9402, model, service.ReasoningReplayModeAll, next))
	require.NotNil(t, next.Messages[1].ReasoningContent)
	require.Equal(t, "nonstream-thought", *next.Messages[1].ReasoningContent)
}
