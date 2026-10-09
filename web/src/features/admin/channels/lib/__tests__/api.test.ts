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

import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/http-client'

import { testChannel } from '../../api'

vi.mock('@/lib/http-client', () => ({
  api: {
    get: vi.fn(),
  },
}))

const mockedApiGet = vi.mocked(api.get)

describe('testChannel', () => {
  test('passes skipBusinessError, skipErrorHandler and disableDuplicate to api.get', async () => {
    mockedApiGet.mockResolvedValue({
      data: { success: true, message: '', time: 0.5 },
    })

    const signal = new AbortController().signal
    await testChannel(42, {
      model: 'gpt-4o',
      stream: true,
      signal,
    })

    expect(mockedApiGet).toHaveBeenCalledWith('/api/channel/test/42', {
      params: { model: 'gpt-4o', stream: 'true' },
      signal,
      skipBusinessError: true,
      skipErrorHandler: true,
      disableDuplicate: true,
    })
  })
})
