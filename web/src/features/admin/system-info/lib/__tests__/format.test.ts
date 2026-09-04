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
import { describe, expect, it } from 'vitest'

import { formatBytes } from '../format'

describe('formatBytes', () => {
  it('renders zero as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('renders bytes below 1 KB without a fraction', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('scales values up to the matching unit', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB')
  })

  it('keeps one fraction digit at most', () => {
    expect(formatBytes(60.577 * 1024 ** 3)).toBe('60.6 GB')
  })

  it('caps the unit at PB for very large values', () => {
    expect(formatBytes(1024 ** 5)).toBe('1 PB')
    expect(formatBytes(2 ** 70)).toContain('PB')
  })

  it('renders "-" for missing or invalid input', () => {
    expect(formatBytes(undefined)).toBe('-')
    expect(formatBytes(Number.NaN)).toBe('-')
    expect(formatBytes(-1)).toBe('-')
  })
})
