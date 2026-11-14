package operation_setting

import (
	"fmt"
	"os"
	"strconv"

	"github.com/QuantumNous/new-api/setting/config"
)

type MonitorSetting struct {
	AutoTestChannelEnabled bool    `json:"auto_test_channel_enabled"`
	AutoTestChannelMinutes float64 `json:"auto_test_channel_minutes"`
	ChannelTestMode        string  `json:"channel_test_mode"`
	ChannelTestConcurrency int     `json:"channel_test_concurrency"`
	// ActiveProbe* control the opt-in, read-only credential probe for supported
	// channel types. The probe can find dead credentials even without relay traffic.
	ActiveProbeEnabled         bool `json:"active_probe_enabled"`
	ActiveProbeIntervalMinutes int  `json:"active_probe_interval_minutes"`
	ActiveProbeConcurrency     int  `json:"active_probe_concurrency"`
}

const (
	ChannelTestModeScheduledAll    = "scheduled_all"
	ChannelTestModeAutoBanOnly     = "auto_ban_only"
	ChannelTestModePassiveRecovery = "passive_recovery"

	ChannelTestConcurrencyOptionKey = "monitor_setting.channel_test_concurrency"
	DefaultChannelTestConcurrency   = 1
	MaxChannelTestConcurrency       = 32

	ActiveProbeIntervalOptionKey      = "monitor_setting.active_probe_interval_minutes"
	ActiveProbeConcurrencyOptionKey   = "monitor_setting.active_probe_concurrency"
	DefaultActiveProbeIntervalMinutes = 360
	MaxActiveProbeIntervalMinutes     = 43200 // 30 days
	DefaultActiveProbeConcurrency     = 5
	MaxActiveProbeConcurrency         = 32
)

// 默认配置
var monitorSetting = MonitorSetting{
	AutoTestChannelEnabled:     false,
	AutoTestChannelMinutes:     10,
	ChannelTestMode:            ChannelTestModeScheduledAll,
	ChannelTestConcurrency:     DefaultChannelTestConcurrency,
	ActiveProbeEnabled:         false,
	ActiveProbeIntervalMinutes: DefaultActiveProbeIntervalMinutes,
	ActiveProbeConcurrency:     DefaultActiveProbeConcurrency,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("monitor_setting", &monitorSetting)
}

func GetMonitorSetting() *MonitorSetting {
	if os.Getenv("CHANNEL_TEST_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_TEST_FREQUENCY"))
		if err == nil && frequency > 0 {
			monitorSetting.AutoTestChannelEnabled = true
			monitorSetting.AutoTestChannelMinutes = float64(frequency)
			monitorSetting.ChannelTestMode = ChannelTestModeScheduledAll
		}
	}
	if enabled, ok := os.LookupEnv("CHANNEL_TEST_ENABLED"); ok {
		parsed, err := strconv.ParseBool(enabled)
		if err == nil {
			monitorSetting.AutoTestChannelEnabled = parsed
		}
	}
	if enabled, ok := os.LookupEnv("CHANNEL_PROBE_ENABLED"); ok {
		parsed, err := strconv.ParseBool(enabled)
		if err == nil {
			monitorSetting.ActiveProbeEnabled = parsed
		}
	}
	if interval, err := strconv.Atoi(os.Getenv("CHANNEL_PROBE_INTERVAL_MINUTES")); err == nil && interval > 0 {
		monitorSetting.ActiveProbeIntervalMinutes = interval
	}
	switch monitorSetting.ChannelTestMode {
	case ChannelTestModeAutoBanOnly, ChannelTestModePassiveRecovery:
	default:
		monitorSetting.ChannelTestMode = ChannelTestModeScheduledAll
	}
	monitorSetting.ChannelTestConcurrency = NormalizeChannelTestConcurrency(monitorSetting.ChannelTestConcurrency)
	monitorSetting.ActiveProbeIntervalMinutes = NormalizeActiveProbeInterval(monitorSetting.ActiveProbeIntervalMinutes)
	monitorSetting.ActiveProbeConcurrency = NormalizeActiveProbeConcurrency(monitorSetting.ActiveProbeConcurrency)
	return &monitorSetting
}

func NormalizeChannelTestConcurrency(concurrency int) int {
	if concurrency < 1 {
		return DefaultChannelTestConcurrency
	}
	if concurrency > MaxChannelTestConcurrency {
		return MaxChannelTestConcurrency
	}
	return concurrency
}

func ValidateChannelTestConcurrency(value string) error {
	concurrency, err := strconv.Atoi(value)
	if err != nil || concurrency < 1 || concurrency > MaxChannelTestConcurrency {
		return fmt.Errorf("channel test concurrency must be between 1 and %d", MaxChannelTestConcurrency)
	}
	return nil
}

func NormalizeActiveProbeInterval(minutes int) int {
	if minutes < 1 {
		return DefaultActiveProbeIntervalMinutes
	}
	if minutes > MaxActiveProbeIntervalMinutes {
		return MaxActiveProbeIntervalMinutes
	}
	return minutes
}

func NormalizeActiveProbeConcurrency(concurrency int) int {
	if concurrency < 1 {
		return DefaultActiveProbeConcurrency
	}
	if concurrency > MaxActiveProbeConcurrency {
		return MaxActiveProbeConcurrency
	}
	return concurrency
}

func ValidateActiveProbeInterval(value string) error {
	minutes, err := strconv.Atoi(value)
	if err != nil || minutes < 1 || minutes > MaxActiveProbeIntervalMinutes {
		return fmt.Errorf("active probe interval must be between 1 and %d minutes", MaxActiveProbeIntervalMinutes)
	}
	return nil
}

func ValidateActiveProbeConcurrency(value string) error {
	concurrency, err := strconv.Atoi(value)
	if err != nil || concurrency < 1 || concurrency > MaxActiveProbeConcurrency {
		return fmt.Errorf("active probe concurrency must be between 1 and %d", MaxActiveProbeConcurrency)
	}
	return nil
}
