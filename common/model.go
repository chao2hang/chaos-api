package common

import (
	"slices"
	"strings"
)

var (
	// OpenAIResponseOnlyModels is a list of models that are only available for OpenAI responses.
	OpenAIResponseOnlyModels = []string{
		"o3-pro",
		"o3-deep-research",
		"o4-mini-deep-research",
	}
	ImageGenerationModels = []string{
		"dall-e-3",
		"dall-e-2",
		"prefix:dall-e", // Deprecated upstream models; retained for compatible routes.
		"gpt-image-",
		"qwen-image",
		"z-image",
		"wan2.7-image-pro",
		"wan2.7-image",
		"wan2.6-image",
		"wan2.6-t2i",
		"wan2.5-t2i-preview",
		"wan2.2-t2i-flash",
		"wan2.2-t2i-plus",
		"wanx2.1-t2i-turbo",
		"wanx2.1-t2i-plus",
		"wanx2.0-t2i-turbo",
		"prefix:imagen-",
		"flux-",
		"flux.1-",
	}
)

func IsOpenAIResponseOnlyModel(modelName string) bool {
	for _, m := range OpenAIResponseOnlyModels {
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}

// openAIResponsesOnlyModelBases lists official OpenAI model families whose only
// supported endpoint is /v1/responses. Snapshot names (<base>-YYYY-MM-DD)
// match their base; gpt-6 additionally matches its dotted sub-versions.
var openAIResponsesOnlyModelBases = []string{
	"o3",
	"o3-pro",
	"o3-deep-research",
	"o4-mini-deep-research",
	"gpt-5-nano",
	"gpt-5.4-nano",
	"gpt-6",
}

// IsOpenAIResponsesOnlyModel reports whether an official OpenAI model is served
// only by /v1/responses. Snapshot names (o3-2025-04-16) match their family base.
func IsOpenAIResponsesOnlyModel(modelName string) bool {
	name := strings.ToLower(strings.TrimSpace(modelName))
	if name == "" {
		return false
	}
	if slices.Contains(openAIResponsesOnlyModelBases, name) {
		return true
	}
	if strings.HasPrefix(name, "gpt-6") {
		return true
	}
	// Snapshot suffixes are exactly "-YYYY-MM-DD"; a short name cannot be one.
	if len(name) <= len("-2006-01-02") {
		return false
	}
	cutoff := len(name) - len("-2006-01-02")
	base, snapshot := name[:cutoff], name[cutoff+1:]
	if !isDateSnapshot(snapshot) {
		return false
	}
	return slices.ContainsFunc(openAIResponsesOnlyModelBases, func(candidate string) bool {
		return base == candidate || strings.HasPrefix(candidate, base+"-")
	})
}

func isDateSnapshot(value string) bool {
	if len(value) != len("2006-01-02") || value[4] != '-' || value[7] != '-' {
		return false
	}
	for i, r := range value {
		if i == 4 || i == 7 {
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func IsImageGenerationModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, m := range ImageGenerationModels {
		if prefix, ok := strings.CutPrefix(m, "prefix:"); ok {
			if strings.HasPrefix(modelName, prefix) {
				return true
			}
			continue
		}
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}
