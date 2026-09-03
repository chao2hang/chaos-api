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

import { formatRateStat } from '../lib/stat-format'
import {
  dateToUnixMs,
  unixMsToDate,
  unixMsToApiSeconds,
} from '../lib/time-range'

describe('formatRateStat', () => {
  test('formats small rates as plain integers', () => {
    expect(formatRateStat(12)).toBe('12')
    expect(formatRateStat(9999)).toBe('9,999')
  })

  test('switches to compact notation from 10,000 upwards', () => {
    expect(formatRateStat(12345)).toBe('12.3K')
    expect(formatRateStat(2500000)).toBe('2.5M')
  })

  test('returns a dash for invalid values', () => {
    expect(formatRateStat(undefined)).toBe('-')
    expect(formatRateStat(null)).toBe('-')
    expect(formatRateStat(Number.NaN)).toBe('-')
  })
})

describe('unixMsToApiSeconds', () => {
  test('floors unix milliseconds to unix seconds', () => {
    expect(unixMsToApiSeconds(1700000050500)).toBe(1700000050)
  })

  test('returns undefined for absent or non-positive timestamps', () => {
    expect(unixMsToApiSeconds(undefined)).toBeUndefined()
    expect(unixMsToApiSeconds(0)).toBeUndefined()
    expect(unixMsToApiSeconds(-5)).toBeUndefined()
  })
})

describe('unixMsToDate / dateToUnixMs round trip', () => {
  test('converts unix ms to a Date and back', () => {
    const date = unixMsToDate(1700000050500)
    expect(date).not.toBeNull()
    expect(dateToUnixMs(date)).toBe(1700000050500)
  })

  test('empty input maps to null and cleared dates map to undefined', () => {
    expect(unixMsToDate(undefined)).toBeNull()
    expect(unixMsToDate(0)).toBeNull()
    expect(dateToUnixMs(null)).toBeUndefined()
  })
})
