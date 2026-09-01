package minimax

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/chaos-api/chaos-api/common"
	relaycommon "github.com/chaos-api/chaos-api/relay/common"
	relayconstant "github.com/chaos-api/chaos-api/relay/constant"
	"github.com/chaos-api/chaos-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetRequestURLForImageGeneration(t *testing.T) {
	t.Parallel()

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesGenerations,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl: "https://api.minimax.chat",
		},
	}

	got, err := GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.minimax.chat/v1/image_generation", got)
}

func TestConvertImageRequest(t *testing.T) {
	t.Parallel()

	adaptor := &Adaptor{}
	info := &relaycommon.RelayInfo{
		RelayMode:       relayconstant.RelayModeImagesGenerations,
		OriginModelName: "image-01",
	}
	request := dto.ImageRequest{
		Model:          "image-01",
		Prompt:         "a red fox in snowfall",
		Size:           "1536x1024",
		ResponseFormat: "url",
		N:              uintPtr(2),
	}

	got, err := adaptor.ConvertImageRequest(gin.CreateTestContextOnly(httptest.NewRecorder(), gin.New()), info, request)
	require.NoError(t, err)

	body, err := common.Marshal(got)
	require.NoError(t, err)

	var payload map[string]any
	err = common.Unmarshal(body, &payload)
	require.NoError(t, err)

	assert.Equal(t, "image-01", payload["model"])
	assert.Equal(t, request.Prompt, payload["prompt"])
	assert.Equal(t, float64(2), payload["n"])
	assert.Equal(t, "3:2", payload["aspect_ratio"])
	assert.Equal(t, "url", payload["response_format"])
}

func TestDoResponseForImageGeneration(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesGenerations,
		StartTime: time.Unix(1700000000, 0),
	}
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       ioNopCloser(`{"data":{"image_urls":["https://example.com/minimax.png"]}}`),
	}

	adaptor := &Adaptor{}
	usage, err := adaptor.DoResponse(c, resp, info)
	require.Nil(t, err)
	require.NotNil(t, usage)

	body := recorder.Body.String()
	assert.Contains(t, body, `"url":"https://example.com/minimax.png"`)
	assert.NotContains(t, body, `"image_urls"`)
}

func TestMiniMaxChatDoResponse_2056TokenPlanLimit(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeChatCompletions,
		IsStream:  false,
	}

	rawJSON := `{"base_resp":{"status_code":2056,"status_msg":"已达到 Token Plan 用量上限：请升级 Token Plan 套餐或购买积分补充用量。"},"choices":null}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       ioNopCloser(rawJSON),
	}

	adaptor := &Adaptor{}
	usage, apiErr := adaptor.DoResponse(c, resp, info)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
	assert.Contains(t, apiErr.Error(), "已达到 Token Plan 用量上限")
	assert.False(t, c.Writer.Written())
}

func TestMiniMaxChatDoResponse_StreamJSON_2056(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeChatCompletions,
		IsStream:  true,
	}

	rawJSON := `{"base_resp":{"status_code":2056,"status_msg":"已达到 Token Plan 用量上限"},"choices":null}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       ioNopCloser(rawJSON),
	}

	adaptor := &Adaptor{}
	usage, apiErr := adaptor.DoResponse(c, resp, info)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
	assert.Contains(t, apiErr.Error(), "已达到 Token Plan 用量上限")
	assert.False(t, c.Writer.Written())
}

func TestMiniMaxChatDoResponse_StreamSSE_2056(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeChatCompletions,
		IsStream:  true,
	}

	rawSSE := "data: {\"base_resp\":{\"status_code\":2056,\"status_msg\":\"已达到 Token Plan 用量上限\"}}\n\n"
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"text/event-stream"}},
		Body:       ioNopCloser(rawSSE),
	}

	adaptor := &Adaptor{}
	usage, apiErr := adaptor.DoResponse(c, resp, info)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
	assert.False(t, c.Writer.Written())
}

type nopReadCloser struct {
	*strings.Reader
}

func (n nopReadCloser) Close() error {
	return nil
}

func ioNopCloser(body string) nopReadCloser {
	return nopReadCloser{Reader: strings.NewReader(body)}
}

func uintPtr(v uint) *uint {
	return &v
}
