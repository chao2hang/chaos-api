package channel

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/requestpatch"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTaskAPIRequestInheritsClientCancellation(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	requestContext, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil).WithContext(requestContext)

	upstream, err := newTaskAPIRequest(c, "https://provider.example/tasks", nil)
	require.NoError(t, err)
	cancel()

	require.ErrorIs(t, upstream.Context().Err(), context.Canceled)
}

func TestProcessHeaderOverride_ChannelTestSkipsPassthroughRules(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	ctx.Request.Header.Set("X-Trace-Id", "trace-123")

	info := &relaycommon.RelayInfo{
		IsChannelTest: true,
		ChannelMeta: &relaycommon.ChannelMeta{
			HeadersOverride: map[string]any{
				"*": "",
			},
		},
	}

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	require.Empty(t, headers)
}

func TestProcessHeaderOverride_ChannelTestSkipsClientHeaderPlaceholder(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	ctx.Request.Header.Set("X-Trace-Id", "trace-123")

	info := &relaycommon.RelayInfo{
		IsChannelTest: true,
		ChannelMeta: &relaycommon.ChannelMeta{
			HeadersOverride: map[string]any{
				"X-Upstream-Trace": "{client_header:X-Trace-Id}",
			},
		},
	}

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	_, ok := headers["x-upstream-trace"]
	require.False(t, ok)
}

func TestProcessHeaderOverride_NonTestKeepsClientHeaderPlaceholder(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	ctx.Request.Header.Set("X-Trace-Id", "trace-123")

	info := &relaycommon.RelayInfo{
		IsChannelTest: false,
		ChannelMeta: &relaycommon.ChannelMeta{
			HeadersOverride: map[string]any{
				"X-Upstream-Trace": "{client_header:X-Trace-Id}",
			},
		},
	}

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	require.Equal(t, "trace-123", headers["x-upstream-trace"])
}

func TestProcessHeaderOverride_RuntimeOverrideIsFinalHeaderMap(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	info := &relaycommon.RelayInfo{
		IsChannelTest:             false,
		UseRuntimeHeadersOverride: true,
		RuntimeHeadersOverride: map[string]any{
			"x-static":  "runtime-value",
			"x-runtime": "runtime-only",
		},
		ChannelMeta: &relaycommon.ChannelMeta{
			HeadersOverride: map[string]any{
				"X-Static": "legacy-value",
				"X-Legacy": "legacy-only",
			},
		},
	}

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	require.Equal(t, "runtime-value", headers["x-static"])
	require.Equal(t, "runtime-only", headers["x-runtime"])
	_, exists := headers["x-legacy"]
	require.False(t, exists)
}

func TestProcessHeaderOverride_PassthroughSkipsAcceptEncoding(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	ctx.Request.Header.Set("X-Trace-Id", "trace-123")
	ctx.Request.Header.Set("Accept-Encoding", "gzip")

	info := &relaycommon.RelayInfo{
		IsChannelTest: false,
		ChannelMeta: &relaycommon.ChannelMeta{
			HeadersOverride: map[string]any{
				"*": "",
			},
		},
	}

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	require.Equal(t, "trace-123", headers["x-trace-id"])

	_, hasAcceptEncoding := headers["accept-encoding"]
	require.False(t, hasAcceptEncoding)
}

func TestProcessHeaderOverride_PassHeadersTemplateSetsRuntimeHeaders(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	ctx.Request.Header.Set("Originator", "Codex CLI")
	ctx.Request.Header.Set("Session_id", "sess-123")

	info := &relaycommon.RelayInfo{
		IsChannelTest: false,
		RequestHeaders: map[string]string{
			"Originator": "Codex CLI",
			"Session_id": "sess-123",
		},
		ChannelMeta: &relaycommon.ChannelMeta{
			ParamOverride: map[string]any{
				"operations": []any{
					map[string]any{
						"mode":  "pass_headers",
						"value": []any{"Originator", "Session_id", "X-Codex-Beta-Features"},
					},
				},
			},
			HeadersOverride: map[string]any{
				"X-Static": "legacy-value",
			},
		},
	}

	_, err := relaycommon.ApplyParamOverrideWithRelayInfo([]byte(`{"model":"gpt-4.1"}`), info)
	require.NoError(t, err)
	require.True(t, info.UseRuntimeHeadersOverride)
	require.Equal(t, "Codex CLI", info.RuntimeHeadersOverride["originator"])
	require.Equal(t, "sess-123", info.RuntimeHeadersOverride["session_id"])
	_, exists := info.RuntimeHeadersOverride["x-codex-beta-features"]
	require.False(t, exists)
	require.Equal(t, "legacy-value", info.RuntimeHeadersOverride["x-static"])

	headers, err := processHeaderOverride(info, ctx)
	require.NoError(t, err)
	require.Equal(t, "Codex CLI", headers["originator"])
	require.Equal(t, "sess-123", headers["session_id"])
	_, exists = headers["x-codex-beta-features"]
	require.False(t, exists)

	upstreamReq := httptest.NewRequest(http.MethodPost, "https://example.com/v1/responses", nil)
	applyHeaderOverrideToRequest(upstreamReq, headers)
	require.Equal(t, "Codex CLI", upstreamReq.Header.Get("Originator"))
	require.Equal(t, "sess-123", upstreamReq.Header.Get("Session_id"))
	require.Empty(t, upstreamReq.Header.Get("X-Codex-Beta-Features"))
}

// responsesIdentityAdaptor exercises the real HTTP sender while exposing the
// two provider hooks that can change the final destination and authentication.
type responsesIdentityAdaptor struct {
	Adaptor
	target     string
	signedAuth string
}

func (a *responsesIdentityAdaptor) GetRequestURL(_ *relaycommon.RelayInfo) (string, error) {
	return a.target, nil
}

func (a *responsesIdentityAdaptor) SetupRequestHeader(c *gin.Context, headers *http.Header, info *relaycommon.RelayInfo) error {
	headers.Set("Authorization", "Bearer "+info.ApiKey)
	headers.Set("X-Trace-Id", c.Request.Header.Get("X-Trace-Id"))
	return nil
}

func (a *responsesIdentityAdaptor) SignUpstreamRequest(_ *gin.Context, _ *relaycommon.RelayInfo, _ string, _ *url.URL, headers http.Header) error {
	if a.signedAuth != "" {
		headers.Set("Authorization", a.signedAuth)
	}
	return nil
}

func TestDoApiRequestResponsesOutboundIdentity(t *testing.T) {
	previousRedisEnabled := common.RedisEnabled
	common.RedisEnabled = false
	t.Cleanup(func() { common.RedisEnabled = previousRedisEnabled })

	for i, tc := range []struct {
		name                                                    string
		header, firstValue, nextValue                           string
		signer, changedSigner, runtime, destination, rotateKeys bool
		legacyBinding, chat, plugin, reject                     bool
	}{
		{name: "same override identity", header: "Authorization", firstValue: "Bearer account-A", nextValue: "Bearer account-A"},
		{name: "changed override identity", header: "Authorization", firstValue: "Bearer account-A", nextValue: "Bearer account-B", reject: true},
		{name: "same custom credential override", header: "X-Vendor-Token", firstValue: "account-A", nextValue: "account-A"},
		{name: "changed custom credential override", header: "X-Vendor-Token", firstValue: "account-A", nextValue: "account-B", reject: true},
		{name: "same custom plugin credential", header: "X-Vendor-Token", firstValue: "account-A", nextValue: "account-A", plugin: true},
		{name: "changed custom plugin credential", header: "X-Vendor-Token", firstValue: "account-A", nextValue: "account-B", plugin: true, reject: true},
		{name: "changed runtime plugin identity", header: "Authorization", firstValue: "Bearer account-A", nextValue: "Bearer account-B", runtime: true, reject: true},
		{name: "same final signer identity", header: "Authorization", firstValue: "Bearer account-A", nextValue: "Bearer account-B", signer: true},
		{name: "changed final signer identity", signer: true, changedSigner: true, reject: true},
		{name: "changed api key", header: "api-key", firstValue: "account-A", nextValue: "account-B", reject: true},
		{name: "changed account header", header: "ChatGPT-Account-Id", firstValue: "account-A", nextValue: "account-B", reject: true},
		{name: "changed host", header: "Host", firstValue: "account-a.example", nextValue: "account-b.example", reject: true},
		{name: "changed destination", destination: true, reject: true},
		{name: "multi key order rotates but bound key stays", rotateKeys: true},
		{name: "unknown legacy outbound identity fails closed", legacyBinding: true, reject: true},
		{name: "chat is not affected", header: "Authorization", firstValue: "Bearer account-A", nextValue: "Bearer account-B", chat: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var sent atomic.Int64
			observed := make(chan http.Header, 2)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				sent.Add(1)
				observed <- r.Header.Clone()
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{"id":"resp_http_identity","status":"completed","output":[]}`)
			}))
			defer upstream.Close()
			const configuredKey = "configured-key-fixture"
			const modelName = "responses-http-identity"
			responseID := fmt.Sprintf("resp_http_identity_%d_%s", i, upstream.URL)
			newContext := func(body, headerValue string) *gin.Context {
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
				c.Request.Header.Set("X-Upstream-Authorization", headerValue)
				c.Request.Header.Set("X-Trace-Id", fmt.Sprint(len(body)))
				c.Set("id", 9871)
				c.Set("token_id", 9872+i)
				c.Set("channel_id", 9873+i)
				return c
			}
			first := newContext(`{"model":"responses-http-identity","input":"hello"}`, tc.firstValue)
			info := &relaycommon.RelayInfo{
				RelayMode: relayconstant.RelayModeResponses, RelayFormat: types.RelayFormatOpenAIResponses,
				ChannelMeta: &relaycommon.ChannelMeta{ChannelId: 9873 + i, ApiKey: configuredKey},
			}
			if tc.header != "" {
				info.HeadersOverride = map[string]any{tc.header: "{client_header:X-Upstream-Authorization}"}
			}
			if tc.plugin {
				info.HeadersOverride = nil
				info.RequestPluginHeaders = []requestpatch.Effect{{Set: map[string]string{tc.header: tc.firstValue}}}
			}
			if tc.runtime {
				// Request plugins/parameter overrides publish the effective final
				// header map here; it must take precedence over static config.
				info.UseRuntimeHeadersOverride = true
				info.RuntimeHeadersOverride = info.HeadersOverride
				info.HeadersOverride = map[string]any{"Authorization": "Bearer ignored-static"}
			}
			if tc.chat {
				info.RelayFormat = types.RelayFormatOpenAI
				info.RelayMode = relayconstant.RelayModeChatCompletions
			}
			adaptor := &responsesIdentityAdaptor{target: upstream.URL + "/v1/responses"}
			if tc.signer {
				adaptor.signedAuth = "Bearer signed-account"
			}
			if !tc.legacyBinding {
				resp, err := DoApiRequest(adaptor, first, info, strings.NewReader(`{"input":"hello"}`))
				require.NoError(t, err)
				require.NoError(t, resp.Body.Close())
				<-observed
			}
			// Mirrors successful response handling: the actual HTTP egress
			// fingerprint is read from c, not reconstructed from channel.Key.
			_, err := service.RecordResponsesAffinityIDs(first, modelName, "default", configuredKey, responseID, nil)
			require.NoError(t, err)
			next := newContext(`{"model":"responses-http-identity","input":"follow up"}`, tc.nextValue)
			binding, found, err := service.ResolveResponsesAffinityIDs(next, modelName, "default", responseID, nil)
			require.NoError(t, err)
			require.True(t, found)
			if !tc.legacyBinding && !tc.chat {
				require.Len(t, binding.OutboundIdentityFingerprint, 64)
			}
			encoded, err := common.Marshal(binding)
			require.NoError(t, err)
			assert.NotContains(t, string(encoded), configuredKey)
			assert.NotContains(t, string(encoded), "account-A")
			if tc.rotateKeys {
				channel := &model.Channel{Id: info.ChannelId, Key: "other-key\n" + configuredKey, ChannelInfo: model.ChannelInfo{IsMultiKey: true}}
				unbound, _, keyErr := channel.GetNextEnabledKey()
				require.Nil(t, keyErr)
				assert.Equal(t, "other-key", unbound, "unbound selection has rotated")
				pinned, index, available := channel.GetEnabledKeyByFingerprint(binding.CredentialFingerprint)
				require.True(t, available)
				require.Equal(t, 1, index)
				require.Equal(t, configuredKey, pinned)
				info.ApiKey = pinned
			}
			if tc.destination {
				adaptor.target = upstream.URL + "/other-tenant/responses"
			}
			if tc.changedSigner {
				adaptor.signedAuth = "Bearer changed-signed-account"
			}
			if tc.plugin {
				info.RequestPluginHeaders[0].Set[tc.header] = tc.nextValue
			}
			before := sent.Load()
			resp, err := DoApiRequest(adaptor, next, info, strings.NewReader(`{"input":"follow up"}`))
			if tc.reject {
				require.Error(t, err)
				require.Nil(t, resp)
				var apiErr *types.NewAPIError
				require.ErrorAs(t, err, &apiErr)
				assert.Equal(t, http.StatusConflict, apiErr.StatusCode)
				assert.True(t, types.IsSkipRetryError(apiErr))
				assert.Equal(t, before, sent.Load(), "rejected continuation must not reach upstream")
				return
			}
			require.NoError(t, err)
			require.NoError(t, resp.Body.Close())
			assert.Equal(t, before+1, sent.Load())
			actualHeaders := <-observed
			if tc.rotateKeys {
				assert.Equal(t, "Bearer "+configuredKey, actualHeaders.Get("Authorization"))
			}
			if tc.signer {
				assert.Equal(t, "Bearer signed-account", actualHeaders.Get("Authorization"))
			}
		})
	}
}

func TestToWebSocketURL(t *testing.T) {
	for input, want := range map[string]string{
		"https://api.openai.com/v1/responses":             "wss://api.openai.com/v1/responses",
		"http://127.0.0.1:3000/v1/responses":              "ws://127.0.0.1:3000/v1/responses",
		"wss://chatgpt.com/backend-api/codex/responses":   "wss://chatgpt.com/backend-api/codex/responses",
		"ws://127.0.0.1:3000/backend-api/codex/responses": "ws://127.0.0.1:3000/backend-api/codex/responses",
	} {
		assert.Equal(t, want, toWebSocketURL(input), input)
	}
}
