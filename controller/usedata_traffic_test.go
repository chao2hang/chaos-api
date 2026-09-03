package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type trafficResponse struct {
	Success bool                            `json:"success"`
	Message string                          `json:"message"`
	Data    *model.TrafficDistributionResult `json:"data"`
}

func TestGetTrafficDistributionController(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupModelListControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Log{}))

	now := time.Now().Unix()
	bucketSize := int64(7200)
	baseTime := (now / bucketSize) * bucketSize

	require.NoError(t, model.DB.Create(&model.Log{
		UserId:    1,
		Username:  "alice",
		Type:      model.LogTypeConsume,
		CreatedAt: baseTime + 100,
		UseTime:   120,
		Quota:     500,
	}).Error)

	require.NoError(t, model.DB.Create(&model.Log{
		UserId:    1,
		Username:  "alice",
		Type:      model.LogTypeError,
		CreatedAt: baseTime + 200,
		UseTime:   0,
		Quota:     0,
	}).Error)

	require.NoError(t, model.DB.Create(&model.Log{
		UserId:    2,
		Username:  "bob",
		Type:      model.LogTypeConsume,
		CreatedAt: baseTime + 300,
		UseTime:   80,
		Quota:     300,
	}).Error)

	// 1. Admin querying all users
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/api/data/traffic?start_timestamp=%d&end_timestamp=%d&buckets=4", baseTime, baseTime+4*bucketSize),
		nil,
	)
	ctx.Set("id", 1)
	ctx.Set("role", common.RoleAdminUser)

	GetTrafficDistribution(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	var resp trafficResponse
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.NotNil(t, resp.Data)
	assert.Equal(t, int64(3), resp.Data.TotalRequests)
	assert.Equal(t, int64(1), resp.Data.TotalErrors)
	assert.Equal(t, 4, len(resp.Data.Points))

	// 2. Regular user querying (only their own logs)
	recorder2 := httptest.NewRecorder()
	ctx2, _ := gin.CreateTestContext(recorder2)
	ctx2.Request = httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/api/data/traffic?start_timestamp=%d&end_timestamp=%d&buckets=4", baseTime, baseTime+4*bucketSize),
		nil,
	)
	ctx2.Set("id", 2)
	ctx2.Set("role", common.RoleCommonUser)

	GetTrafficDistribution(ctx2)

	require.Equal(t, http.StatusOK, recorder2.Code)
	var resp2 trafficResponse
	require.NoError(t, common.Unmarshal(recorder2.Body.Bytes(), &resp2))
	require.True(t, resp2.Success)
	require.NotNil(t, resp2.Data)
	assert.Equal(t, int64(1), resp2.Data.TotalRequests)
	assert.Equal(t, int64(0), resp2.Data.TotalErrors)
	assert.Equal(t, int64(80), resp2.Data.AvgLatency)
}
