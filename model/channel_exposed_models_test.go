package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetExposedModels(t *testing.T) {
	tests := []struct {
		name    string
		models  string
		mapping string
		want    []string
	}{
		{
			name:   "no mapping keeps configured model order",
			models: "gpt-4o,claude-3",
			want:   []string{"gpt-4o", "claude-3"},
		},
		{
			name:    "aliases replace mapped models and sort deterministically",
			models:  "gpt-4o,claude-3",
			mapping: `{"z-gpt":"gpt-4o","a-gpt":"gpt-4o","unused":"not-configured"}`,
			want:    []string{"a-gpt", "z-gpt", "claude-3"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			channel := &Channel{Models: test.models}
			if test.mapping != "" {
				channel.ModelMapping = &test.mapping
			}
			assert.Equal(t, test.want, channel.GetExposedModels())
		})
	}
}
