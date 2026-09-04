package controller

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/model"
	"github.com/chaos-api/chaos-api/setting/billing_setting"
	"github.com/chaos-api/chaos-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

// upstreamPricingEntry 是上游模型中可用于定价同步的字段子集。
// 上游约定：ratio_model=1 对应 $2/1M 输入 token（QuotaPerUnit=500000）。
type upstreamPricingEntry struct {
	ModelName           string   `json:"model_name"`
	VendorName          string   `json:"vendor_name,omitempty"`
	Tags                string   `json:"tags,omitempty"`
	RatioModel          *float64 `json:"ratio_model,omitempty"`
	RatioCompletion     *float64 `json:"ratio_completion,omitempty"`
	RatioCache          *float64 `json:"ratio_cache,omitempty"`
	CreateCacheRatio    *float64 `json:"create_cache_ratio,omitempty"`
	PricePerMInput      *float64 `json:"price_per_m_input,omitempty"`
	PricePerMOutput     *float64 `json:"price_per_m_output,omitempty"`
	PricePerMCacheRead  *float64 `json:"price_per_m_cache_read,omitempty"`
	PricePerMCacheWrite *float64 `json:"price_per_m_cache_write,omitempty"`
	Score               float64  `json:"score,omitempty"`
}

// PricingUpstreamMatch 为本地未定价模型模糊匹配上游定价。
// 未定价判定与前端保持一致：ModelPrice / ModelRatio 均未配置，
// 且 billing_mode 不是 tiered_expr。
func PricingUpstreamMatch(c *gin.Context) {
	timeoutSec := common.GetEnvOrDefault("SYNC_HTTP_TIMEOUT_SECONDS", 15)
	ctx, cancel := context.WithTimeout(c.Request.Context(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	modelsURL, _ := getUpstreamURLs(c.Query("locale"))
	var modelsEnv upstreamEnvelope[upstreamModel]
	if err := fetchJSON(ctx, modelsURL, &modelsEnv); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取上游模型失败: " + err.Error(), "source_urls": gin.H{"models_url": modelsURL}})
		return
	}

	upstream := collectUpstreamPricing(modelsEnv.Data)
	if len(upstream) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "上游未返回可用的定价数据", "source_urls": gin.H{"models_url": modelsURL}})
		return
	}

	unset := getUnsetPricedModels(model.GetEnabledModels())
	items := make([]gin.H, 0, len(unset))
	matched := 0
	for _, name := range unset {
		candidates := matchUpstreamPricing(name, upstream, 5, 0.6)
		item := gin.H{
			"model":      name,
			"exact":      len(candidates) > 0 && candidates[0].Score >= 0.999,
			"score":      0.0,
			"candidates": candidates,
		}
		if len(candidates) > 0 {
			item["score"] = candidates[0].Score
			matched++
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":          items,
			"unset_count":    len(unset),
			"matched_count":  matched,
			"upstream_count": len(upstream),
			"models_url":     modelsURL,
		},
	})
}

// PricingUpstreamCatalog 返回上游全部含定价的模型目录，用于人工手动挑选定价。
func PricingUpstreamCatalog(c *gin.Context) {
	timeoutSec := common.GetEnvOrDefault("SYNC_HTTP_TIMEOUT_SECONDS", 15)
	ctx, cancel := context.WithTimeout(c.Request.Context(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	modelsURL, _ := getUpstreamURLs(c.Query("locale"))
	var modelsEnv upstreamEnvelope[upstreamModel]
	if err := fetchJSON(ctx, modelsURL, &modelsEnv); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取上游模型失败: " + err.Error(), "source_urls": gin.H{"models_url": modelsURL}})
		return
	}

	upstream := collectUpstreamPricing(modelsEnv.Data)
	sort.Slice(upstream, func(i, j int) bool {
		return upstream[i].ModelName < upstream[j].ModelName
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"models":        upstream,
			"upstream_count": len(upstream),
			"models_url":    modelsURL,
		},
	})
}

type pricingUpstreamApplyItem struct {
	Model         string   `json:"model"`
	UpstreamModel string   `json:"upstream_model"`
	Fields        []string `json:"fields,omitempty"`
}

// PricingUpstreamApply 将人工确认后的上游定价写入本地倍率配置（一次性事务保存）。
func PricingUpstreamApply(c *gin.Context) {
	var req struct {
		Items []pricingUpstreamApplyItem `json:"items"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求格式错误"})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请先选择要同步的模型"})
		return
	}

	timeoutSec := common.GetEnvOrDefault("SYNC_HTTP_TIMEOUT_SECONDS", 15)
	ctx, cancel := context.WithTimeout(c.Request.Context(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	modelsURL, _ := getUpstreamURLs("")
	var modelsEnv upstreamEnvelope[upstreamModel]
	if err := fetchJSON(ctx, modelsURL, &modelsEnv); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取上游模型失败: " + err.Error(), "source_urls": gin.H{"models_url": modelsURL}})
		return
	}

	upByName := make(map[string]upstreamPricingEntry)
	for _, entry := range collectUpstreamPricing(modelsEnv.Data) {
		upByName[entry.ModelName] = entry
	}

	ratioMap := ratio_setting.GetModelRatioCopy()
	completionMap := ratio_setting.GetCompletionRatioCopy()
	cacheMap := ratio_setting.GetCacheRatioCopy()
	createCacheMap := ratio_setting.GetCreateCacheRatioCopy()
	dirty := map[string]bool{}

	applied := make([]string, 0, len(req.Items))
	type skippedItem struct {
		Model   string `json:"model"`
		Reason  string `json:"reason"`
	}
	skipped := make([]skippedItem, 0)
	for _, item := range req.Items {
		name := strings.TrimSpace(item.Model)
		upstreamName := strings.TrimSpace(item.UpstreamModel)
		if name == "" || upstreamName == "" {
			continue
		}
		entry, ok := upByName[upstreamName]
		if !ok {
			skipped = append(skipped, skippedItem{Model: name, Reason: "上游模型不存在: " + upstreamName})
			continue
		}
		fields := item.Fields
		if len(fields) == 0 {
			fields = []string{"ratio", "completion", "cache", "cache_creation"}
		}
		updated := false
		if containsField(fields, "ratio") {
			if r := upstreamInputRatio(entry); r != nil {
				ratioMap[name] = *r
				dirty["ModelRatio"] = true
				updated = true
			}
		}
		if containsField(fields, "completion") && entry.RatioCompletion != nil {
			completionMap[name] = *entry.RatioCompletion
			dirty["CompletionRatio"] = true
			updated = true
		}
		if containsField(fields, "cache") && entry.RatioCache != nil {
			cacheMap[name] = *entry.RatioCache
			dirty["CacheRatio"] = true
			updated = true
		}
		if containsField(fields, "cache_creation") && entry.CreateCacheRatio != nil {
			createCacheMap[name] = *entry.CreateCacheRatio
			dirty["CreateCacheRatio"] = true
			updated = true
		}
		if updated {
			applied = append(applied, name)
		} else {
			skipped = append(skipped, skippedItem{Model: name, Reason: "上游未提供所选定价字段"})
		}
	}

	if len(applied) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"applied": applied, "applied_count": 0, "skipped": skipped}})
		return
	}

	values := make(map[string]string, len(dirty))
	for key := range dirty {
		var (
			raw []byte
			err error
		)
		switch key {
		case "ModelRatio":
			raw, err = common.Marshal(ratioMap)
		case "CompletionRatio":
			raw, err = common.Marshal(completionMap)
		case "CacheRatio":
			raw, err = common.Marshal(cacheMap)
		case "CreateCacheRatio":
			raw, err = common.Marshal(createCacheMap)
		}
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "序列化定价配置失败: " + err.Error()})
			return
		}
		values[key] = string(raw)
	}
	if err := model.UpdateOptionsBulk(values); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "保存定价配置失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"applied":        applied,
			"applied_count":  len(applied),
			"skipped":        skipped,
			"updated_fields": dirty,
		},
	})
}

// ---------------------------------------------------------------------------
// 匹配辅助
// ---------------------------------------------------------------------------

func collectUpstreamPricing(models []upstreamModel) []upstreamPricingEntry {
	entries := make([]upstreamPricingEntry, 0, len(models))
	for _, m := range models {
		if m.ModelName == "" || (m.RatioModel == nil && m.PricePerMInput == nil) {
			continue
		}
		entry := upstreamPricingEntry{
			ModelName:           m.ModelName,
			VendorName:          m.VendorName,
			Tags:                m.Tags,
			RatioModel:          m.RatioModel,
			RatioCompletion:     m.RatioCompletion,
			RatioCache:          m.RatioCache,
			PricePerMInput:      m.PricePerMInput,
			PricePerMOutput:     m.PricePerMOutput,
			PricePerMCacheRead:  m.PricePerMCacheRead,
			PricePerMCacheWrite: m.PricePerMCacheWrite,
		}
		if m.RatioCache != nil && m.PricePerMCacheWrite != nil &&
			m.PricePerMInput != nil && *m.PricePerMInput > 0 {
			v := *m.PricePerMCacheWrite / *m.PricePerMInput
			entry.CreateCacheRatio = &v
		}
		entries = append(entries, entry)
	}
	return entries
}

func upstreamInputRatio(entry upstreamPricingEntry) *float64 {
	if entry.RatioModel != nil {
		return entry.RatioModel
	}
	if entry.PricePerMInput != nil {
		v := *entry.PricePerMInput / 2
		return &v
	}
	return nil
}

func getUnsetPricedModels(enabled []string) []string {
	priceMap := ratio_setting.GetModelPriceCopy()
	ratioMap := ratio_setting.GetModelRatioCopy()
	modeMap := billing_setting.GetBillingModeCopy()
	var unset []string
	for _, name := range enabled {
		if _, ok := priceMap[name]; ok {
			continue
		}
		if _, ok := ratioMap[name]; ok {
			continue
		}
		if modeMap[name] == billing_setting.BillingModeTieredExpr {
			continue
		}
		unset = append(unset, name)
	}
	sort.Strings(unset)
	return unset
}

func matchUpstreamPricing(local string, upstream []upstreamPricingEntry, topK int, minScore float64) []upstreamPricingEntry {
	type scoredEntry struct {
		entry upstreamPricingEntry
		score float64
	}
	matched := make([]scoredEntry, 0, 8)
	for _, entry := range upstream {
		score := modelNameSimilarity(local, entry.ModelName)
		if score >= minScore {
			matched = append(matched, scoredEntry{entry: entry, score: score})
		}
	}
	sort.Slice(matched, func(i, j int) bool {
		if matched[i].score != matched[j].score {
			return matched[i].score > matched[j].score
		}
		return matched[i].entry.ModelName < matched[j].entry.ModelName
	})
	if len(matched) > topK {
		matched = matched[:topK]
	}
	result := make([]upstreamPricingEntry, 0, len(matched))
	for _, m := range matched {
		entry := m.entry
		entry.Score = math.Round(m.score*1000) / 1000
		result = append(result, entry)
	}
	return result
}

// 模型名归一化：小写、去掉供应商前缀与冒号后缀、统一分隔符。
func normalizeModelName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	if i := strings.Index(s, ":"); i >= 0 {
		s = s[:i]
	}
	if i := strings.LastIndex(s, "/"); i >= 0 {
		s = s[i+1:]
	}
	var b strings.Builder
	prevDash := true // 避免首字符是 '-'
	for _, r := range s {
		isAlnum := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if isAlnum {
			b.WriteRune(r)
			prevDash = false
		} else if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

// 去掉日期后缀与推理强度等噪音后缀，得到用于模糊匹配的一组别名。
func modelNameVariants(name string) []string {
	base := normalizeModelName(name)
	if base == "" {
		return nil
	}
	variants := []string{base}
	current := base
	for {
		i := strings.LastIndex(current, "-")
		if i <= 0 {
			break
		}
		last := current[i+1:]
		if !(len(last) == 8 && isNumericString(last)) && !isModelNoiseSuffix(last) {
			break
		}
		current = current[:i]
		variants = append(variants, current)
	}
	return variants
}

func isModelNoiseSuffix(token string) bool {
	switch token {
	case "thinking", "high", "medium", "low", "xhigh", "max", "latest":
		return true
	}
	return false
}

func isNumericString(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return len(s) > 0
}

// modelNameSimilarity 返回 0~1 的相似度得分，>=0.999 视为完全一致。
func modelNameSimilarity(a, b string) float64 {
	best := 0.0
	for _, av := range modelNameVariants(a) {
		for _, bv := range modelNameVariants(b) {
			score := modelNameVariantSimilarity(av, bv)
			if score > best {
				best = score
			}
			if best >= 1 {
				return 1
			}
		}
	}
	return math.Round(best*1000) / 1000
}

func modelNameVariantSimilarity(a, b string) float64 {
	if a == b {
		return 1
	}
	if a == "" || b == "" {
		return 0
	}
	if strings.HasPrefix(b, a+"-") || strings.HasPrefix(a, b+"-") {
		return 0.92
	}
	shorter, longer := a, b
	if len(shorter) > len(longer) {
		shorter, longer = longer, shorter
	}
	if len(shorter) >= 6 && strings.Contains(longer, shorter) {
		return 0.78
	}
	return math.Max(tokenJaccard(a, b)*0.75, levenshteinRatio(a, b)*0.8)
}

func tokenJaccard(a, b string) float64 {
	at := strings.Split(a, "-")
	bt := strings.Split(b, "-")
	setB := make(map[string]struct{}, len(bt))
	for _, t := range bt {
		setB[t] = struct{}{}
	}
	intersection := 0
	setA := make(map[string]struct{}, len(at))
	for _, t := range at {
		setA[t] = struct{}{}
		if _, ok := setB[t]; ok {
			intersection++
		}
	}
	union := len(setA) + len(setB) - intersection
	if union == 0 {
		return 0
	}
	return float64(intersection) / float64(union)
}

func levenshteinRatio(a, b string) float64 {
	ra, rb := []rune(a), []rune(b)
	if len(ra) == 0 && len(rb) == 0 {
		return 1
	}
	prev := make([]int, len(rb)+1)
	curr := make([]int, len(rb)+1)
	for j := 0; j <= len(rb); j++ {
		prev[j] = j
	}
	for i := 1; i <= len(ra); i++ {
		curr[0] = i
		for j := 1; j <= len(rb); j++ {
			cost := 1
			if ra[i-1] == rb[j-1] {
				cost = 0
			}
			curr[j] = min(prev[j]+1, min(curr[j-1]+1, prev[j-1]+cost))
		}
		prev, curr = curr, prev
	}
	distance := prev[len(rb)]
	maxLen := max(len(ra), len(rb))
	if maxLen == 0 {
		return 1
	}
	return 1 - float64(distance)/float64(maxLen)
}
