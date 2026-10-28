/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/
import { describe, expect, test } from 'vitest'

import { createRoutingReliabilitySchema } from '../routing-reliability-schema'

const schema = createRoutingReliabilitySchema((key) => key)

const validSettings = {
  RetryTimes: 0,
  ChannelDisableThreshold: '',
  AutomaticDisableChannelEnabled: true,
  AutomaticEnableChannelEnabled: false,
  AutomaticDisableKeywords: '',
  AutomaticDisableStatusCodes: '401',
  AutomaticRetryStatusCodes: '500-599',
  monitor_setting: {
    auto_test_channel_enabled: false,
    auto_test_channel_minutes: 60,
    channel_test_concurrency: 1,
    channel_test_mode: 'passive_recovery',
    active_probe_enabled: false,
    active_probe_interval_minutes: 360,
    active_probe_concurrency: 5,
  },
}

describe('active channel probe settings validation', () => {
  test('accepts the disabled default and configured interval/concurrency', () => {
    expect(schema.safeParse(validSettings).success).toBe(true)
  })

  test('rejects active probe intervals outside 1 to 43200 minutes', () => {
    for (const interval of [0, 43201]) {
      const result = schema.safeParse({
        ...validSettings,
        monitor_setting: {
          ...validSettings.monitor_setting,
          active_probe_interval_minutes: interval,
        },
      })
      expect(result.success).toBe(false)
    }
  })

  test('rejects active probe concurrency outside 1 to 32', () => {
    for (const concurrency of [0, 33]) {
      const result = schema.safeParse({
        ...validSettings,
        monitor_setting: {
          ...validSettings.monitor_setting,
          active_probe_concurrency: concurrency,
        },
      })
      expect(result.success).toBe(false)
    }
  })
})
