package controller

import (
	"testing"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
)

func TestChannelTestHandler_EnabledWithAutomaticEnableChannel(t *testing.T) {
	origAutoTest := operation_setting.GetMonitorSetting().AutoTestChannelEnabled
	origAutoEnable := common.AutomaticEnableChannelEnabled
	defer func() {
		operation_setting.GetMonitorSetting().AutoTestChannelEnabled = origAutoTest
		common.AutomaticEnableChannelEnabled = origAutoEnable
	}()

	handler := channelTestHandler{}

	// Case 1: Both disabled -> false
	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = false
	common.AutomaticEnableChannelEnabled = false
	assert.False(t, handler.Enabled())

	// Case 2: AutoTestChannelEnabled = true -> true
	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = true
	common.AutomaticEnableChannelEnabled = false
	assert.True(t, handler.Enabled())

	// Case 3: AutomaticEnableChannelEnabled = true -> true (for passive recovery)
	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = false
	common.AutomaticEnableChannelEnabled = true
	assert.True(t, handler.Enabled())
}
