package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/constant"
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
			ChannelType:          constant.ChannelTypeOpenAI,
			ChannelId:            9401,
			ChannelBaseUrl:       "https://codex2api.example/v1",
			ApiKey:               "sk-stream-fixture",
			ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplay: service.ReasoningReplayModeAll},
			UpstreamModelName:    model,
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
	require.True(t, service.ReplayChatReasoning(9401, model, service.ReasoningReplayModeAll, next, service.ReasoningReplayScopeForChannel(info)))
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
			ChannelType:          constant.ChannelTypeOpenAI,
			ChannelId:            9402,
			ChannelBaseUrl:       "https://codex2api.example/v1",
			ApiKey:               "sk-nonstream-fixture",
			ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplay: service.ReasoningReplayModeAll},
			UpstreamModelName:    model,
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
	require.True(t, service.ReplayChatReasoning(9402, model, service.ReasoningReplayModeAll, next, service.ReasoningReplayScopeForChannel(info)))
	require.NotNil(t, next.Messages[1].ReasoningContent)
	require.Equal(t, "nonstream-thought", *next.Messages[1].ReasoningContent)
}

func TestOaiResponsesHandlerBindsIssuedReasoningIDToCredential(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const model = "gpt-affinity-capture-test"
	const tokenID = 9413
	const channelID = 9414
	const upstreamKey = "sk-affinity-capture-test"
	input := []byte(`[{"role":"user","content":"unique affinity test"}]`)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-affinity-capture-test","input":[{"role":"user","content":"unique affinity test"}]}`))
	c.Set("id", 9412)
	c.Set("token_id", tokenID)
	c.Set("channel_id", channelID)
	info := &relaycommon.RelayInfo{
		TokenId: tokenID, OriginModelName: model, UsingGroup: "default",
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType: constant.ChannelTypeOpenAI, ChannelId: channelID,
			ChannelBaseUrl: "https://upstream.example/v1", ApiKey: upstreamKey,
			ChannelOtherSettings: dto.ChannelOtherSettings{ReasoningReplay: service.ReasoningReplayModeAll},
			UpstreamModelName:    model,
		},
		Request: &dto.OpenAIResponsesRequest{Model: model, Input: input},
	}
	body := `{"id":"resp_affinity_capture","object":"response","model":"gpt-affinity-capture-test","output":[` +
		`{"type":"reasoning","id":"rs_affinity_capture","summary":[],"encrypted_content":"opaque-fixture"},` +
		`{"type":"message","id":"msg_affinity_capture","role":"assistant","content":[{"type":"output_text","text":"answer"}]}]}`
	response := &http.Response{StatusCode: http.StatusOK, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body))}
	usage, apiErr := OaiResponsesHandler(c, info, response)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)
	boundChannel, fingerprint, sessionID, found := service.CurrentResponsesAffinityScope(c)
	require.True(t, found)
	require.Equal(t, channelID, boundChannel)
	require.NotEmpty(t, fingerprint)
	require.NotEmpty(t, sessionID)

	continuation, _ := gin.CreateTestContext(httptest.NewRecorder())
	continuation.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-affinity-capture-test","input":[{"type":"reasoning","id":"rs_affinity_capture","encrypted_content":"opaque-fixture"}]}`))
	continuation.Set("id", 9412)
	continuation.Set("token_id", tokenID)
	binding, matched, err := service.ResolveResponsesAffinityIDs(continuation, model, "default", "", []string{"rs_affinity_capture"})
	require.NoError(t, err)
	require.True(t, matched)
	require.Equal(t, channelID, binding.ChannelID)
	require.Equal(t, fingerprint, binding.CredentialFingerprint)
	require.Equal(t, sessionID, binding.SessionID)
}

func TestOaiResponsesStreamHandlerBindsCompletedReasoningID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const model = "gpt-stream-affinity-test"
	input := []byte(`[{"role":"user","content":"stream affinity"}]`)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-stream-affinity-test","input":[{"role":"user","content":"stream affinity"}]}`))
	c.Set("id", 9421)
	c.Set("token_id", 9422)
	c.Set("channel_id", 9423)
	info := &relaycommon.RelayInfo{
		TokenId: 9422, OriginModelName: model, UsingGroup: "default",
		IsStream: true, DisablePing: true, StartTime: time.Now(),
		RelayFormat: types.RelayFormatOpenAIResponses,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType: constant.ChannelTypeOpenAI, ChannelId: 9423,
			ChannelBaseUrl: "https://stream-upstream.example/v1", ApiKey: "sk-stream-affinity-fixture",
			UpstreamModelName: model,
		},
		Request: &dto.OpenAIResponsesRequest{Model: model, Input: input},
	}
	event := `data: {"type":"response.completed","response":{"id":"resp_stream_affinity","status":"completed","model":"gpt-stream-affinity-test","output":[` +
		`{"type":"reasoning","id":"rs_stream_affinity","summary":[],"encrypted_content":"opaque-stream"},` +
		`{"type":"message","role":"assistant","content":[{"type":"output_text","text":"answer"}]}],` +
		`"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}` + "\n\ndata: [DONE]\n\n"
	response := &http.Response{StatusCode: http.StatusOK, Header: http.Header{"Content-Type": {"text/event-stream"}}, Body: io.NopCloser(strings.NewReader(event))}
	usage, apiErr := OaiResponsesStreamHandler(c, info, response)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)
	_, _, sessionID, found := service.CurrentResponsesAffinityScope(c)
	require.True(t, found)
	require.NotEmpty(t, sessionID)

	continuation, _ := gin.CreateTestContext(httptest.NewRecorder())
	continuation.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-stream-affinity-test","input":[{"type":"reasoning","id":"rs_stream_affinity","encrypted_content":"opaque-stream"}]}`))
	continuation.Set("id", 9421)
	continuation.Set("token_id", 9422)
	binding, matched, err := service.ResolveResponsesAffinityIDs(continuation, model, "default", "", []string{"rs_stream_affinity"})
	require.NoError(t, err)
	require.True(t, matched)
	require.Equal(t, 9423, binding.ChannelID)
	require.Equal(t, sessionID, binding.SessionID)
}

func TestOaiResponsesHandlerBindsPlainResponseIDForContinuation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const model = "gpt-plain-previous-test"
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-plain-previous-test","input":"hello"}`))
	c.Set("id", 9431)
	c.Set("token_id", 9432)
	c.Set("channel_id", 9433)
	info := &relaycommon.RelayInfo{
		TokenId: 9432, OriginModelName: model, UsingGroup: "default",
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType: constant.ChannelTypeOpenAI, ChannelId: 9433,
			ChannelBaseUrl: "https://plain-upstream.example/v1", ApiKey: "sk-plain-previous",
			UpstreamModelName: model,
		},
		Request: &dto.OpenAIResponsesRequest{Model: model, Input: []byte(`"hello"`)},
	}
	response := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"id":"resp_plain_previous","model":"gpt-plain-previous-test","status":"completed","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"hello"}]}]}`))}
	_, apiErr := OaiResponsesHandler(c, info, response)
	require.Nil(t, apiErr)

	next, _ := gin.CreateTestContext(httptest.NewRecorder())
	next.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-plain-previous-test","previous_response_id":"resp_plain_previous","input":"follow up"}`))
	next.Set("id", 9431)
	next.Set("token_id", 9432)
	binding, found, err := service.ResolveResponsesAffinityIDs(next, model, "default", "resp_plain_previous", nil)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, 9433, binding.ChannelID)
}
