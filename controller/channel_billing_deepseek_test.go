package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseDeepSeekBalance(t *testing.T) {
	tests := []struct {
		name        string
		response    DeepSeekUsageResponse
		wantBalance float64
		wantErr     bool
		errContains string
	}{
		{
			name:        "empty balance infos",
			response:    DeepSeekUsageResponse{BalanceInfos: nil},
			wantErr:     true,
			errContains: "no balance info found",
		},
		{
			name: "only CNY balance",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "CNY",
						TotalBalance: "25.50",
					},
				},
			},
			wantBalance: 25.50,
			wantErr:     false,
		},
		{
			name: "only USD balance",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "USD",
						TotalBalance: "10.00",
					},
				},
			},
			wantBalance: 10.00,
			wantErr:     false,
		},
		{
			name: "both CNY and USD, USD is positive and CNY is zero",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "CNY",
						TotalBalance: "0.00",
					},
					{
						Currency:     "USD",
						TotalBalance: "12.34",
					},
				},
			},
			wantBalance: 12.34,
			wantErr:     false,
		},
		{
			name: "both CNY and USD, CNY is positive and USD is zero",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "CNY",
						TotalBalance: "88.88",
					},
					{
						Currency:     "USD",
						TotalBalance: "0.00",
					},
				},
			},
			wantBalance: 88.88,
			wantErr:     false,
		},
		{
			name: "both CNY and USD positive, prefer USD",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "CNY",
						TotalBalance: "50.00",
					},
					{
						Currency:     "USD",
						TotalBalance: "15.00",
					},
				},
			},
			wantBalance: 15.00,
			wantErr:     false,
		},
		{
			name: "both zero balance, fallback to USD",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "CNY",
						TotalBalance: "0.00",
					},
					{
						Currency:     "USD",
						TotalBalance: "0.00",
					},
				},
			},
			wantBalance: 0.00,
			wantErr:     false,
		},
		{
			name: "other currency supported",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "EUR",
						TotalBalance: "30.00",
					},
				},
			},
			wantBalance: 30.00,
			wantErr:     false,
		},
		{
			name: "invalid number in total_balance",
			response: DeepSeekUsageResponse{
				BalanceInfos: []struct {
					Currency        string `json:"currency"`
					TotalBalance    string `json:"total_balance"`
					GrantedBalance  string `json:"granted_balance"`
					ToppedUpBalance string `json:"topped_up_balance"`
				}{
					{
						Currency:     "USD",
						TotalBalance: "invalid",
					},
				},
			},
			wantErr:     true,
			errContains: "failed to parse balance",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance, err := parseDeepSeekBalance(tt.response)
			if tt.wantErr {
				require.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantBalance, balance)
		})
	}
}
