package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPopulateTokensUsedTokens(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.Exec("DELETE FROM tokens").Error)
	require.NoError(t, DB.Exec("DELETE FROM quota_data").Error)
	require.NoError(t, LOG_DB.Exec("DELETE FROM logs").Error)

	token1 := Token{
		UserId: 1,
		Key:    "test-key-1",
		Name:   "Key 1",
		Status: 1,
	}
	token2 := Token{
		UserId: 1,
		Key:    "test-key-2",
		Name:   "Key 2",
		Status: 1,
	}
	require.NoError(t, DB.Create(&token1).Error)
	require.NoError(t, DB.Create(&token2).Error)

	// Add log entry for token 1
	log1 := Log{
		UserId:           1,
		TokenId:          token1.Id,
		TokenName:        token1.Name,
		ModelName:        "gpt-4",
		Type:             LogTypeConsume,
		PromptTokens:     100,
		CompletionTokens: 50,
		Quota:            300,
	}
	log2 := Log{
		UserId:           1,
		TokenId:          token1.Id,
		TokenName:        token1.Name,
		ModelName:        "gpt-4",
		Type:             LogTypeConsume,
		PromptTokens:     200,
		CompletionTokens: 100,
		Quota:            600,
	}
	require.NoError(t, LOG_DB.Create(&log1).Error)
	require.NoError(t, LOG_DB.Create(&log2).Error)

	tokens, err := GetAllUserTokens(1, 0, 10)
	require.NoError(t, err)
	require.Len(t, tokens, 2)

	var foundToken1 *Token
	var foundToken2 *Token
	for _, tok := range tokens {
		if tok.Id == token1.Id {
			foundToken1 = tok
		} else if tok.Id == token2.Id {
			foundToken2 = tok
		}
	}

	require.NotNil(t, foundToken1)
	require.NotNil(t, foundToken2)
	assert.Equal(t, 450, foundToken1.UsedTokens) // 100+50 + 200+100 = 450
	assert.Equal(t, 0, foundToken2.UsedTokens)
}
