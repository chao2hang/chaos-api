package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
)

func TestChannelTestHandlerEnabledOnlyForScheduledMonitor(t *testing.T) {
	originalAutoTest := operation_setting.GetMonitorSetting().AutoTestChannelEnabled
	originalAutoEnable := common.AutomaticEnableChannelEnabled
	t.Cleanup(func() {
		operation_setting.GetMonitorSetting().AutoTestChannelEnabled = originalAutoTest
		common.AutomaticEnableChannelEnabled = originalAutoEnable
	})

	handler := channelTestHandler{}
	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = false
	common.AutomaticEnableChannelEnabled = false
	assert.False(t, handler.Enabled())

	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = true
	common.AutomaticEnableChannelEnabled = false
	assert.True(t, handler.Enabled())

	operation_setting.GetMonitorSetting().AutoTestChannelEnabled = false
	common.AutomaticEnableChannelEnabled = true
	assert.False(t, handler.Enabled(), "passive re-enable does not schedule channel testing")
}
