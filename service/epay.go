package service

import (
	"github.com/chaos-api/chaos-api/setting/operation_setting"
	"github.com/chaos-api/chaos-api/setting/system_setting"
)

func GetCallbackAddress() string {
	if operation_setting.CustomCallbackAddress == "" {
		return system_setting.ServerAddress
	}
	return operation_setting.CustomCallbackAddress
}
