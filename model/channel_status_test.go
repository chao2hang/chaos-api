package model

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/chaos-api/chaos-api/common"
	"github.com/chaos-api/chaos-api/constant"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupChannelStatusTest(t *testing.T) {
	t.Helper()
	truncateTables(t)
	require.NoError(t, DB.Exec("DELETE FROM abilities").Error)
	require.NoError(t, DB.Exec("DELETE FROM channels").Error)

	memoryCacheEnabled := common.MemoryCacheEnabled
	common.MemoryCacheEnabled = false
	t.Cleanup(func() {
		common.MemoryCacheEnabled = memoryCacheEnabled
	})
}

func TestUpdateChannelStatusPersistsMultiKeyState(t *testing.T) {
	setupChannelStatusTest(t)

	channel := Channel{
		Name:   "multi-key-status",
		Key:    "key-a\nkey-b",
		Status: common.ChannelStatusEnabled,
		ChannelInfo: ChannelInfo{
			IsMultiKey:           true,
			MultiKeySize:         2,
			MultiKeyMode:         constant.MultiKeyModePolling,
			MultiKeyPollingIndex: 1,
		},
	}
	require.NoError(t, DB.Create(&channel).Error)

	changed := UpdateChannelStatus(channel.Id, "key-a", common.ChannelStatusAutoDisabled, "provider rejected key")
	require.True(t, changed)

	var stored Channel
	require.NoError(t, DB.First(&stored, channel.Id).Error)
	assert.Equal(t, common.ChannelStatusEnabled, stored.Status)
	assert.Equal(t, common.ChannelStatusAutoDisabled, stored.ChannelInfo.MultiKeyStatusList[0])
	assert.Equal(t, "provider rejected key", stored.ChannelInfo.MultiKeyDisabledReason[0])
	assert.NotZero(t, stored.ChannelInfo.MultiKeyDisabledTime[0])
	assert.Equal(t, 1, stored.ChannelInfo.MultiKeyPollingIndex)
}

func TestSaveStatusStateFromSingleKeySnapshotPreservesUnownedColumns(t *testing.T) {
	setupChannelStatusTest(t)

	channel := Channel{
		Name:        "single-key-status",
		Key:         "original-key",
		Status:      common.ChannelStatusEnabled,
		Models:      "original-model",
		Group:       "default",
		UsedQuota:   100,
		ChannelInfo: ChannelInfo{},
	}
	require.NoError(t, DB.Create(&channel).Error)

	stale, err := GetChannelById(channel.Id, true)
	require.NoError(t, err)

	concurrentChannelInfo := ChannelInfo{
		IsMultiKey:           true,
		MultiKeySize:         2,
		MultiKeyMode:         constant.MultiKeyModePolling,
		MultiKeyPollingIndex: 1,
	}
	require.NoError(t, DB.Model(&Channel{}).Where("id = ?", channel.Id).Updates(map[string]any{
		"key":          "rotated-key",
		"used_quota":   gorm.Expr("used_quota + ?", 250),
		"models":       "concurrent-model",
		"channel_info": concurrentChannelInfo,
	}).Error)

	stale.Status = common.ChannelStatusManuallyDisabled
	stale.SetOtherInfo(map[string]any{
		"status_reason": "manual operation",
		"status_time":   int64(1234),
	})
	require.NoError(t, stale.saveStatusState())

	var stored Channel
	require.NoError(t, DB.First(&stored, channel.Id).Error)
	assert.Equal(t, common.ChannelStatusManuallyDisabled, stored.Status)
	assert.Equal(t, "rotated-key", stored.Key)
	assert.Equal(t, int64(350), stored.UsedQuota)
	assert.Equal(t, "concurrent-model", stored.Models)
	assert.Equal(t, concurrentChannelInfo, stored.ChannelInfo)

	otherInfo := stored.GetOtherInfo()
	assert.Equal(t, "manual operation", otherInfo["status_reason"])
	assert.Equal(t, float64(1234), otherInfo["status_time"])
}

func TestCountChannelsGroupByStatusCoversAllChannels(t *testing.T) {
	setupChannelStatusTest(t)

	channels := []Channel{
		{Name: "enabled-1", Key: "key-1", Status: common.ChannelStatusEnabled, Models: "gpt-4", Group: "default"},
		{Name: "enabled-2", Key: "key-2", Status: common.ChannelStatusEnabled, Models: "gpt-4", Group: "default"},
		{Name: "manual-disabled", Key: "key-3", Status: common.ChannelStatusManuallyDisabled, Models: "gpt-4", Group: "default"},
		{Name: "auto-disabled", Key: "key-4", Status: common.ChannelStatusAutoDisabled, Models: "gpt-4", Group: "default"},
	}
	for i := range channels {
		require.NoError(t, DB.Create(&channels[i]).Error)
	}

	counts, err := CountChannelsGroupByStatus()
	require.NoError(t, err)
	assert.Equal(t, int64(2), counts[common.ChannelStatusEnabled])
	assert.Equal(t, int64(1), counts[common.ChannelStatusManuallyDisabled])
	assert.Equal(t, int64(1), counts[common.ChannelStatusAutoDisabled])
}

var abilityDialectDSNs = map[string]string{
	"mysql":    "TEST_MYSQL_DSN",
	"postgres": "TEST_POSTGRES_DSN",
}

// setupAbilityDialectDB swaps the global DB with an isolated per-dialect
// database mirroring the pattern in channel_search_test.go. No table prefix is
// used so raw-table queries such as GetEnabledModels hit the same names as in
// production; tables are dropped before and after to stay isolated. mysql and
// postgres dialects are skipped when their DSN env is not configured.
func setupAbilityDialectDB(t *testing.T, dialect string) *gorm.DB {
	t.Helper()

	var driver gorm.Dialector
	switch dialect {
	case "sqlite":
		driver = sqlite.Open(filepath.Join(t.TempDir(), "ability_heal.db"))
	default:
		dsn := os.Getenv(abilityDialectDSNs[dialect])
		if dsn == "" {
			t.Skipf("%s is not configured", abilityDialectDSNs[dialect])
		}
		if dialect == "mysql" {
			driver = mysql.Open(dsn)
		} else {
			driver = postgres.Open(dsn)
		}
	}

	db, err := gorm.Open(driver, &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.Migrator().DropTable(&Ability{}, &Channel{}))
	require.NoError(t, db.AutoMigrate(&Channel{}, &Ability{}))

	previousDB, previousType := DB, common.MainDatabaseType()
	DB = db
	common.SetMainDatabaseType(common.DatabaseType(dialect))
	initCol()
	memoryCacheEnabled := common.MemoryCacheEnabled
	common.MemoryCacheEnabled = false
	t.Cleanup(func() {
		common.MemoryCacheEnabled = memoryCacheEnabled
		require.NoError(t, db.Migrator().DropTable(&Ability{}))
		require.NoError(t, db.Migrator().DropTable(&Channel{}))
		DB = previousDB
		common.SetMainDatabaseType(previousType)
		initCol()
		require.NoError(t, sqlDB.Close())
	})
	return db
}

// TestChannelEnableRebuildsAbilitiesAcrossDialects protects the enable-time
// ability heal and the AddAbilities upsert on real database dialects, where
// the ON CONFLICT / ON DUPLICATE KEY rendering differs.
func TestChannelEnableRebuildsAbilitiesAcrossDialects(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			setupAbilityDialectDB(t, dialect)

			channel := Channel{
				Name:     "heal-dialect",
				Type:     1,
				Key:      "sk-heal",
				Status:   common.ChannelStatusManuallyDisabled,
				Models:   "healed-model",
				Group:    "default,vip",
				Priority: common.GetPointer[int64](3),
				Weight:   common.GetPointer[uint](5),
				Tag:      common.GetPointer("heal-tag"),
			}
			require.NoError(t, DB.Create(&channel).Error)

			// Enabling a zero-abilities channel rebuilds its rows.
			require.True(t, UpdateChannelStatus(channel.Id, "", common.ChannelStatusEnabled, ""))
			abilities := []Ability{}
			require.NoError(t, DB.Where("channel_id = ?", channel.Id).Find(&abilities).Error)
			require.Len(t, abilities, 2)
			for _, ability := range abilities {
				assert.True(t, ability.Enabled)
				assert.Equal(t, int64(3), *ability.Priority)
				assert.Equal(t, uint(5), ability.Weight)
				assert.Equal(t, "heal-tag", *ability.Tag)
			}
			assert.Contains(t, GetEnabledModels(), "healed-model")

			// Re-adding abilities refreshes stale rows instead of skipping them.
			require.NoError(t, DB.Model(&Channel{}).Where("id = ?", channel.Id).Update("priority", 6).Error)
			stored, err := GetChannelById(channel.Id, true)
			require.NoError(t, err)
			require.NoError(t, stored.AddAbilities(nil))
			refreshed := []Ability{}
			require.NoError(t, DB.Where("channel_id = ?", channel.Id).Find(&refreshed).Error)
			require.Len(t, refreshed, 2)
			for _, ability := range refreshed {
				assert.Equal(t, int64(6), *ability.Priority)
			}
		})
	}
}

func TestUpdateChannelStatus_StatusReasonPopulation(t *testing.T) {
	setupChannelStatusTest(t)

	channel := Channel{
		Name:        "reason-test-channel",
		Key:         "sk-test-key",
		Status:      common.ChannelStatusEnabled,
		Models:      "gpt-4",
		Group:       "default",
		ChannelInfo: ChannelInfo{},
	}
	require.NoError(t, DB.Create(&channel).Error)

	// 1. Disable with reason
	changed := UpdateChannelStatus(channel.Id, "", common.ChannelStatusAutoDisabled, "status_code=429, Quota exceeded")
	require.True(t, changed)

	var stored Channel
	require.NoError(t, DB.First(&stored, channel.Id).Error)
	assert.Equal(t, common.ChannelStatusAutoDisabled, stored.Status)
	assert.Equal(t, "status_code=429, Quota exceeded", stored.StatusReason)

	// 2. Re-enable clears reason
	changed = UpdateChannelStatus(channel.Id, "", common.ChannelStatusEnabled, "")
	require.True(t, changed)

	require.NoError(t, DB.First(&stored, channel.Id).Error)
	assert.Equal(t, common.ChannelStatusEnabled, stored.Status)
	assert.Empty(t, stored.StatusReason)
}

func TestUpdateChannelStatusRebuildsMissingAbilitiesOnEnable(t *testing.T) {
	setupChannelStatusTest(t)

	// Simulate a legacy channel whose ability rows were lost: enabled with
	// non-empty models but zero abilities, so its models are invisible to
	// the ability-based model listing.
	channel := Channel{
		Name:        "zero-abilities",
		Key:         "sk-heal",
		Status:      common.ChannelStatusEnabled,
		Models:      "codestral,gpt-4o",
		Group:       "default",
		ChannelInfo: ChannelInfo{},
	}
	require.NoError(t, DB.Create(&channel).Error)

	var before int64
	require.NoError(t, DB.Model(&Ability{}).Where("channel_id = ?", channel.Id).Count(&before).Error)
	require.Zero(t, before)
	assert.NotContains(t, GetEnabledModels(), "codestral")

	// Disabling a zero-abilities channel must not invent rows.
	require.True(t, UpdateChannelStatus(channel.Id, "", common.ChannelStatusManuallyDisabled, "manual operation"))
	var disabledCount int64
	require.NoError(t, DB.Model(&Ability{}).Where("channel_id = ?", channel.Id).Count(&disabledCount).Error)
	assert.Zero(t, disabledCount)

	// Re-enabling rebuilds the rows and makes the models visible again.
	require.True(t, UpdateChannelStatus(channel.Id, "", common.ChannelStatusEnabled, ""))
	abilities := []Ability{}
	require.NoError(t, DB.Where("channel_id = ?", channel.Id).Order("model").Find(&abilities).Error)
	require.Len(t, abilities, 2)
	for _, ability := range abilities {
		assert.True(t, ability.Enabled)
		assert.Equal(t, "default", ability.Group)
	}
	assert.Contains(t, GetEnabledModels(), "codestral")
	assert.Contains(t, GetEnabledModels(), "gpt-4o")

	// A repeated enable (no status change) keeps the rows stable.
	require.False(t, UpdateChannelStatus(channel.Id, "", common.ChannelStatusEnabled, ""))
	var afterCount int64
	require.NoError(t, DB.Model(&Ability{}).Where("channel_id = ?", channel.Id).Count(&afterCount).Error)
	assert.Equal(t, int64(2), afterCount)
}

func TestEnableChannelByTagRebuildsMissingAbilities(t *testing.T) {
	setupChannelStatusTest(t)

	broken := Channel{
		Name:   "tag-broken",
		Key:    "k1",
		Status: common.ChannelStatusManuallyDisabled,
		Models: "m-broken",
		Group:  "default",
		Tag:    common.GetPointer("grp"),
	}
	intact := Channel{
		Name:   "tag-intact",
		Key:    "k2",
		Status: common.ChannelStatusManuallyDisabled,
		Models: "m-intact",
		Group:  "default",
		Tag:    common.GetPointer("grp"),
	}
	require.NoError(t, DB.Create(&broken).Error)
	require.NoError(t, DB.Create(&intact).Error)
	require.NoError(t, intact.AddAbilities(nil))
	require.NoError(t, DB.Model(&Ability{}).Where("channel_id = ?", intact.Id).Update("enabled", false).Error)

	require.NoError(t, EnableChannelByTag("grp"))

	// The intact channel keeps one row per (group, model), now enabled.
	var intactAbilities []Ability
	require.NoError(t, DB.Where("channel_id = ?", intact.Id).Find(&intactAbilities).Error)
	require.Len(t, intactAbilities, 1)
	assert.True(t, intactAbilities[0].Enabled)

	// The broken channel gets its missing rows back.
	var brokenAbilities []Ability
	require.NoError(t, DB.Where("channel_id = ?", broken.Id).Find(&brokenAbilities).Error)
	require.Len(t, brokenAbilities, 1)
	assert.True(t, brokenAbilities[0].Enabled)
	assert.Contains(t, GetEnabledModels(), "m-broken")
}

func TestAddAbilitiesUpsertsStaleRows(t *testing.T) {
	setupChannelStatusTest(t)

	channel := Channel{
		Name:     "upsert-refresh",
		Key:      "k3",
		Status:   common.ChannelStatusEnabled,
		Models:   "m1,m2",
		Group:    "default,vip",
		Priority: common.GetPointer[int64](7),
		Weight:   common.GetPointer[uint](10),
		Tag:      common.GetPointer("old-tag"),
	}
	require.NoError(t, DB.Create(&channel).Error)
	require.NoError(t, channel.AddAbilities(nil))

	// The channel changes later; re-adding its abilities must refresh the
	// stale rows instead of silently keeping the old values.
	require.NoError(t, DB.Model(&Channel{}).Where("id = ?", channel.Id).Updates(map[string]any{
		"priority": 9,
		"weight":   20,
		"tag":      "new-tag",
		"status":   common.ChannelStatusManuallyDisabled,
	}).Error)

	updated, err := GetChannelById(channel.Id, true)
	require.NoError(t, err)
	require.NoError(t, updated.AddAbilities(nil))

	var abilities []Ability
	require.NoError(t, DB.Where("channel_id = ?", channel.Id).Find(&abilities).Error)
	require.Len(t, abilities, 4)
	for _, ability := range abilities {
		assert.False(t, ability.Enabled)
		assert.Equal(t, int64(9), *ability.Priority)
		assert.Equal(t, uint(20), ability.Weight)
		assert.Equal(t, "new-tag", *ability.Tag)
	}
}
