package volcengine

import (
	"net/http/httptest"
	"testing"

	"github.com/chaos-api/chaos-api/constant"
	relaycommon "github.com/chaos-api/chaos-api/relay/common"
	relayconstant "github.com/chaos-api/chaos-api/relay/constant"
	"github.com/chaos-api/chaos-api/relaykit/dto"
	"github.com/chaos-api/chaos-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVolcengineGetRequestURL(t *testing.T) {
	t.Parallel()
	adaptor := &Adaptor{}

	testCases := []struct {
		name        string
		baseURL     string
		relayFormat types.RelayFormat
		relayMode   int
		model       string
		expected    string
	}{
		{
			name:        "standard volcengine chat",
			baseURL:     "https://ark.cn-beijing.volces.com",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "doubao-pro-128k",
			expected:    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
		},
		{
			name:        "standard volcengine bot chat",
			baseURL:     "https://ark.cn-beijing.volces.com",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "bot-12345",
			expected:    "https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions",
		},
		{
			name:        "doubao coding plan openai chat",
			baseURL:     "doubao-coding-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "ark-code-latest",
			expected:    "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
		},
		{
			name:        "doubao coding plan claude messages",
			baseURL:     "doubao-coding-plan",
			relayFormat: types.RelayFormatClaude,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "claude",
			expected:    "https://ark.cn-beijing.volces.com/api/coding/v1/messages",
		},
		{
			name:        "doubao coding plan raw url openai chat",
			baseURL:     "https://ark.cn-beijing.volces.com/api/coding/v3",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "ark-code-latest",
			expected:    "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
		},
		{
			name:        "doubao coding plan raw url claude messages",
			baseURL:     "https://ark.cn-beijing.volces.com/api/coding",
			relayFormat: types.RelayFormatClaude,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "claude",
			expected:    "https://ark.cn-beijing.volces.com/api/coding/v1/messages",
		},
		{
			name:        "doubao agent plan openai chat",
			baseURL:     "doubao-agent-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "ark-code-latest",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions",
		},
		{
			name:        "doubao agent plan claude messages",
			baseURL:     "doubao-agent-plan",
			relayFormat: types.RelayFormatClaude,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "claude",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v1/messages",
		},
		{
			name:        "doubao agent plan embeddings",
			baseURL:     "doubao-agent-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeEmbeddings,
			model:       "doubao-embedding",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v3/embeddings",
		},
		{
			name:        "doubao agent plan images generations",
			baseURL:     "doubao-agent-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeImagesGenerations,
			model:       "doubao-seedream-4-0-250828",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v3/images/generations",
		},
		{
			name:        "doubao agent plan responses",
			baseURL:     "doubao-agent-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeResponses,
			model:       "doubao-seed-1-6",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v3/responses",
		},
		{
			name:        "ark-coding-plan alias",
			baseURL:     "ark-coding-plan",
			relayFormat: types.RelayFormatClaude,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "claude",
			expected:    "https://ark.cn-beijing.volces.com/api/coding/v1/messages",
		},
		{
			name:        "ark-agent-plan alias",
			baseURL:     "ark-agent-plan",
			relayFormat: types.RelayFormatOpenAI,
			relayMode:   relayconstant.RelayModeChatCompletions,
			model:       "ark-code-latest",
			expected:    "https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions",
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			info := &relaycommon.RelayInfo{
				RelayFormat: tc.relayFormat,
				RelayMode:   tc.relayMode,
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeVolcEngine,
					ChannelBaseUrl:    tc.baseURL,
					UpstreamModelName: tc.model,
				},
			}
			url, err := adaptor.GetRequestURL(info)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, url)
		})
	}
}

func TestVolcengineConvertClaudeRequest(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	adaptor := &Adaptor{}

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := &dto.ClaudeRequest{
		Model: "claude-3-5-sonnet",
	}

	// For special plan (coding plan or agent plan), it should convert using claude adaptor (direct claude request)
	infoSpecial := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:    constant.ChannelTypeVolcEngine,
			ChannelBaseUrl: "doubao-coding-plan",
		},
	}
	converted, err := adaptor.ConvertClaudeRequest(c, infoSpecial, req)
	require.NoError(t, err)
	claudeReq, ok := converted.(*dto.ClaudeRequest)
	require.True(t, ok)
	assert.Equal(t, "claude-3-5-sonnet", claudeReq.Model)

	// For agent plan
	infoAgent := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:    constant.ChannelTypeVolcEngine,
			ChannelBaseUrl: "doubao-agent-plan",
		},
	}
	convertedAgent, err := adaptor.ConvertClaudeRequest(c, infoAgent, req)
	require.NoError(t, err)
	claudeReqAgent, ok := convertedAgent.(*dto.ClaudeRequest)
	require.True(t, ok)
	assert.Equal(t, "claude-3-5-sonnet", claudeReqAgent.Model)
}
