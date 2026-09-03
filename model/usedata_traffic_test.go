package model

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestGetTrafficDistribution(t *testing.T) {
	origDB, origLogDB := DB, LOG_DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&Log{}))

	DB = db
	LOG_DB = db
	t.Cleanup(func() {
		DB = origDB
		LOG_DB = origLogDB
	})

	now := time.Now().Unix()
	bucketSize := int64(7200)
	baseTime := (now / bucketSize) * bucketSize

	// Insert test logs:
	// Bucket 0: 2 consume logs (latency 100, 200 => avg 150), 1 error log (latency 50)
	// Bucket 1: 1 consume log (latency 80), 0 errors
	// Bucket 2: 1 login log (type 7 => should be ignored)
	testLogs := []Log{
		{
			UserId:    1,
			Username:  "admin",
			Type:      LogTypeConsume,
			CreatedAt: baseTime + 100,
			UseTime:   100,
			Quota:     1000,
		},
		{
			UserId:    1,
			Username:  "admin",
			Type:      LogTypeConsume,
			CreatedAt: baseTime + 200,
			UseTime:   200,
			Quota:     2000,
		},
		{
			UserId:    1,
			Username:  "admin",
			Type:      LogTypeError,
			CreatedAt: baseTime + 300,
			UseTime:   50,
			Quota:     0,
		},
		{
			UserId:    2,
			Username:  "user2",
			Type:      LogTypeConsume,
			CreatedAt: baseTime + bucketSize + 100,
			UseTime:   80,
			Quota:     500,
		},
		{
			UserId:    1,
			Username:  "admin",
			Type:      LogTypeLogin, // ignored
			CreatedAt: baseTime + 2*bucketSize + 100,
			UseTime:   0,
			Quota:     0,
		},
	}

	for _, l := range testLogs {
		logCopy := l
		require.NoError(t, db.Create(&logCopy).Error)
	}

	// 1. Query all users over 4 buckets
	startTime := baseTime
	endTime := baseTime + 4*bucketSize
	result, err := GetTrafficDistribution(startTime, endTime, 4, 0, "")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, int64(4), int64(len(result.Points)))
	// Total requests across bucket 0 and bucket 1: 3 + 1 = 4 (login log ignored)
	assert.Equal(t, int64(4), result.TotalRequests)
	assert.Equal(t, int64(1), result.TotalErrors)
	assert.Equal(t, int64(3500), result.Points[0].Quota+result.Points[1].Quota)

	// Check bucket 0
	b0 := result.Points[0]
	assert.Equal(t, int64(3), b0.Volume)
	assert.Equal(t, int64(150), b0.Latency) // (100 + 200) / 2 = 150
	assert.Equal(t, int64(1), b0.ErrorCount)
	assert.InDelta(t, 1.0/3.0, b0.ErrorRate, 0.001)

	// Check bucket 1
	b1 := result.Points[1]
	assert.Equal(t, int64(1), b1.Volume)
	assert.Equal(t, int64(80), b1.Latency)
	assert.Equal(t, int64(0), b1.ErrorCount)
	assert.Equal(t, 0.0, b1.ErrorRate)

	// Check bucket 2 (login log was ignored)
	b2 := result.Points[2]
	assert.Equal(t, int64(0), b2.Volume)
	assert.Equal(t, int64(0), b2.Latency)

	// 2. Query scoped to user 1 only
	user1Result, err := GetTrafficDistribution(startTime, endTime, 4, 1, "")
	require.NoError(t, err)
	assert.Equal(t, int64(3), user1Result.TotalRequests)
	assert.Equal(t, int64(1), user1Result.TotalErrors)

	// 3. Query scoped to user 2 only
	user2Result, err := GetTrafficDistribution(startTime, endTime, 4, 2, "")
	require.NoError(t, err)
	assert.Equal(t, int64(1), user2Result.TotalRequests)
	assert.Equal(t, int64(0), user2Result.TotalErrors)
	assert.Equal(t, int64(80), user2Result.AvgLatency)
}
