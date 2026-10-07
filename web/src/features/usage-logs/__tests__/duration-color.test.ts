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

import { getResponseTimeColor } from '../lib/format'

describe('getResponseTimeColor', () => {
  test('colors short durations green and long durations red when output tokens are few', () => {
    const cases = [
      { seconds: 0, completionTokens: 0, want: 'success' },
      { seconds: 5, completionTokens: 99, want: 'success' },
      { seconds: 9.9, completionTokens: 50, want: 'success' },
      { seconds: 10, completionTokens: 50, want: 'warning' },
      { seconds: 29.9, completionTokens: 0, want: 'warning' },
      { seconds: 30, completionTokens: 99, want: 'danger' },
    ] as const

    for (const testCase of cases) {
      expect(getResponseTimeColor(testCase.seconds, testCase.completionTokens)).toBe(testCase.want)
    }
  })

  test('judges requests with enough output tokens by generation throughput', () => {
    const cases = [
      // 40 tokens/s
      { seconds: 10, completionTokens: 400, want: 'success' },
      // 20 tokens/s
      { seconds: 10, completionTokens: 200, want: 'warning' },
      // 10 tokens/s
      { seconds: 10, completionTokens: 100, want: 'danger' },
      // 10 tokens/s after a long wait, still throughput-based, not raw time
      { seconds: 100, completionTokens: 1000, want: 'danger' },
    ] as const

    for (const testCase of cases) {
      expect(getResponseTimeColor(testCase.seconds, testCase.completionTokens)).toBe(testCase.want)
    }
  })

  test('falls back to raw latency thresholds when duration is not positive', () => {
    expect(getResponseTimeColor(0, 500)).toBe('success')
    expect(getResponseTimeColor(-1, 500)).toBe('success')
  })
})
