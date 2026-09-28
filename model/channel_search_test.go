package model

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/chaos-api/chaos-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// setupChannelSearchDB swaps the global DB with an isolated per-dialect
// database using a dedicated table prefix, mirroring the pattern in
// request_policy_test.go. mysql/postgres dialects are skipped when their DSN
// env is not configured.
func setupChannelSearchDB(t *testing.T, dialect string) *gorm.DB {
	t.Helper()

	var driver gorm.Dialector
	switch dialect {
	case "sqlite":
		driver = sqlite.Open(filepath.Join(t.TempDir(), "channel_search.db"))
	case "mysql":
		dsn := os.Getenv("TEST_MYSQL_DSN")
		if dsn == "" {
			t.Skip("TEST_MYSQL_DSN is not configured")
		}
		driver = mysql.Open(dsn)
	case "postgres":
		dsn := os.Getenv("TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("TEST_POSTGRES_DSN is not configured")
		}
		driver = postgres.Open(dsn)
	default:
		t.Fatalf("unsupported dialect %q", dialect)
	}

	db, err := gorm.Open(driver, &gorm.Config{
		NamingStrategy: schema.NamingStrategy{TablePrefix: "channel_search_test_"},
	})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&Channel{}))

	previousDB, previousType := DB, common.MainDatabaseType()
	DB = db
	common.SetMainDatabaseType(common.DatabaseType(dialect))
	initCol()
	t.Cleanup(func() {
		require.NoError(t, db.Migrator().DropTable(&Channel{}))
		DB = previousDB
		common.SetMainDatabaseType(previousType)
		initCol()
		require.NoError(t, sqlDB.Close())
	})

	var version string
	if dialect == "sqlite" {
		require.NoError(t, db.Raw("select sqlite_version()").Scan(&version).Error)
	} else {
		require.NoError(t, db.Raw("select version()").Scan(&version).Error)
	}
	t.Logf("%s version: %s", dialect, version)
	return db
}

func TestSearchChannelsMatchesModelNameKeyword(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			db := setupChannelSearchDB(t, dialect)

			channels := []*Channel{
				{Name: "alpha-openai", Type: 1, Key: "sk-1", Models: "gpt-4o,gpt-4o-mini", Group: "default"},
				{Name: "beta-gemini", Type: 1, Key: "sk-2", Models: "gemini-3.8-flash-high,gemini-3.8-flash", Group: "default"},
			}
			for _, channel := range channels {
				require.NoError(t, db.Create(channel).Error)
			}

			tests := []struct {
				name        string
				keyword     string
				modelFilter string
				wantIDs     []int
			}{
				{
					name:    "keyword matching a suffixed model id finds the channel",
					keyword: "gemini-3.8-flash-high",
					wantIDs: []int{channels[1].Id},
				},
				{
					name:    "keyword matching any model in the list finds the channel",
					keyword: "gpt-4o-mini",
					wantIDs: []int{channels[0].Id},
				},
				{
					name:    "channel name search keeps working",
					keyword: "alpha-openai",
					wantIDs: []int{channels[0].Id},
				},
				{
					name:        "dedicated model filter still works without keyword",
					modelFilter: "gemini",
					wantIDs:     []int{channels[1].Id},
				},
				{
					name:    "unrelated keyword matches nothing",
					keyword: "no-such-model",
					wantIDs: []int{},
				},
			}

			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					found, err := SearchChannels(tc.keyword, "", tc.modelFilter, false)
					require.NoError(t, err)
					gotIDs := make([]int, 0, len(found))
					for _, channel := range found {
						gotIDs = append(gotIDs, channel.Id)
					}
					assert.Equal(t, tc.wantIDs, gotIDs, fmt.Sprintf("keyword=%q model=%q", tc.keyword, tc.modelFilter))
				})
			}
		})
	}
}
