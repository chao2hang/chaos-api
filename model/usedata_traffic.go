package model

import (
	"fmt"
	"math"
	"time"

	"github.com/chaos-api/chaos-api/common"
)

type TrafficDistributionBucket struct {
	Bucket       int64   `gorm:"column:bucket"`
	RequestCount int64   `gorm:"column:request_count"`
	ErrorCount   int64   `gorm:"column:error_count"`
	AvgLatency   float64 `gorm:"column:avg_latency"`
	TotalQuota   int64   `gorm:"column:total_quota"`
}

type TrafficDistributionPoint struct {
	Timestamp  int64   `json:"timestamp"`
	TimeLabel  string  `json:"time_label"`
	Volume     int64   `json:"volume"`
	Latency    int64   `json:"latency"`
	ErrorCount int64   `json:"error_count"`
	ErrorRate  float64 `json:"error_rate"`
	Quota      int64   `json:"quota"`
}

type TrafficDistributionResult struct {
	StartTime     int64                      `json:"start_time"`
	EndTime       int64                      `json:"end_time"`
	BucketSize    int64                      `json:"bucket_size"`
	TotalRequests int64                      `json:"total_requests"`
	AvgLatency    int64                      `json:"avg_latency"`
	TotalErrors   int64                      `json:"total_errors"`
	ErrorRate     float64                    `json:"error_rate"`
	Points        []TrafficDistributionPoint `json:"points"`
}

func logTrafficBucketExpr(bucketSize int64) string {
	if common.UsingLogDatabase(common.DatabaseTypeMySQL) {
		return fmt.Sprintf("FLOOR(created_at / %d) * %d", bucketSize, bucketSize)
	}
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		return fmt.Sprintf("intDiv(created_at, %d) * %d", bucketSize, bucketSize)
	}
	return fmt.Sprintf("(created_at / %d) * %d", bucketSize, bucketSize)
}

func GetTrafficDistribution(startTime int64, endTime int64, bucketsCount int, userID int, username string) (*TrafficDistributionResult, error) {
	if endTime <= 0 {
		endTime = time.Now().Unix()
	}
	if startTime <= 0 || endTime <= startTime {
		startTime = endTime - 24*3600
	}
	if bucketsCount <= 0 || bucketsCount > 48 {
		bucketsCount = 12
	}
	bucketSize := (endTime - startTime) / int64(bucketsCount)
	if bucketSize <= 0 {
		bucketSize = 7200
	}
	alignedEnd := ((endTime + bucketSize - 1) / bucketSize) * bucketSize
	alignedStart := alignedEnd - int64(bucketsCount)*bucketSize

	db := LOG_DB
	if db == nil {
		db = DB
	}

	bucketExpr := logTrafficBucketExpr(bucketSize)
	selectClause := fmt.Sprintf(
		"%s AS bucket, COUNT(*) AS request_count, COALESCE(SUM(CASE WHEN type = %d THEN 1 ELSE 0 END), 0) AS error_count, COALESCE(AVG(CASE WHEN type = %d THEN use_time ELSE NULL END), 0) AS avg_latency, COALESCE(SUM(quota), 0) AS total_quota",
		bucketExpr, LogTypeError, LogTypeConsume,
	)

	query := db.Table("logs").
		Select(selectClause).
		Where("created_at >= ? AND created_at < ?", alignedStart, alignedEnd).
		Where("type IN (?, ?)", LogTypeConsume, LogTypeError)

	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	} else if username != "" {
		query = query.Where("username = ?", username)
	}

	var rows []TrafficDistributionBucket
	err := query.Group(bucketExpr).Order("bucket ASC").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	bucketMap := make(map[int64]TrafficDistributionBucket, len(rows))
	for _, r := range rows {
		bucketMap[r.Bucket] = r
	}

	points := make([]TrafficDistributionPoint, bucketsCount)
	var totalRequests int64
	var totalErrors int64
	var totalQuota int64
	var latencyWeightedSum int64

	for i := 0; i < bucketsCount; i++ {
		slotStart := alignedStart + int64(i)*bucketSize
		timeLabel := time.Unix(slotStart, 0).Format("15:04")
		point := TrafficDistributionPoint{
			Timestamp: slotStart,
			TimeLabel: timeLabel,
		}
		if row, ok := bucketMap[slotStart]; ok {
			point.Volume = row.RequestCount
			point.Latency = int64(math.Round(row.AvgLatency))
			point.ErrorCount = row.ErrorCount
			if row.RequestCount > 0 {
				point.ErrorRate = float64(row.ErrorCount) / float64(row.RequestCount)
			}
			point.Quota = row.TotalQuota
		}
		points[i] = point
		totalRequests += point.Volume
		totalErrors += point.ErrorCount
		totalQuota += point.Quota
		latencyWeightedSum += point.Latency * point.Volume
	}

	var avgLatency int64
	var errorRate float64
	if totalRequests > 0 {
		avgLatency = latencyWeightedSum / totalRequests
		errorRate = float64(totalErrors) / float64(totalRequests)
	}

	return &TrafficDistributionResult{
		StartTime:     alignedStart,
		EndTime:       alignedEnd,
		BucketSize:    bucketSize,
		TotalRequests: totalRequests,
		AvgLatency:    avgLatency,
		TotalErrors:   totalErrors,
		ErrorRate:     errorRate,
		Points:        points,
	}, nil
}
