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

import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

const toastError = vi.mocked(toast.error)
const { api } = await import('../http-client')

const CONNECTION_RESET = 'read ECONNRESET'

function resetAdapterError(config: unknown): AxiosError {
  // No `response`: what a reverse proxy surfaces while the backend is down.
  return new AxiosError(CONNECTION_RESET, 'ECONNRESET', config as never)
}

const okAdapter = vi.fn(async (config) => ({
  status: 200,
  statusText: 'OK',
  data: { success: true, data: {} },
  headers: {},
  config,
  request: {},
}))

beforeEach(() => {
  vi.useFakeTimers()
  toastError.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('http-client service-unavailable retry', () => {
  test('retries a flagged request once through a connection reset and succeeds', async () => {
    const failingThenOk = vi
      .fn()
      .mockImplementationOnce(async (config) => {
        throw resetAdapterError(config)
      })
      .mockImplementation(okAdapter)
    api.defaults.adapter = failingThenOk as never

    const promise = api.put('/api/channel/', { id: 1 }, { retryOnServiceUnavailable: true })
    await vi.advanceTimersByTimeAsync(1500)
    const res = await promise

    expect(res.data.success).toBe(true)
    expect(failingThenOk).toHaveBeenCalledTimes(2)
    expect(toastError).not.toHaveBeenCalled()
  })

  test('does not retry when the flag is absent', async () => {
    const alwaysReset = vi.fn(async (config) => {
      throw resetAdapterError(config)
    })
    api.defaults.adapter = alwaysReset as never

    const promise = api.put('/api/channel/', { id: 1 })
    const wait = promise.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1500)
    const thrown = (await wait) as AxiosError

    expect(alwaysReset).toHaveBeenCalledTimes(1)
    expect(thrown.message).toBe(CONNECTION_RESET)
  })

  test('does not retry canceled requests', async () => {
    const canceling = vi.fn(async (config) => {
      throw new AxiosError('canceled', 'ERR_CANCELED', config as never)
    })
    api.defaults.adapter = canceling as never

    const promise = api.put('/api/channel/', { id: 1 }, { retryOnServiceUnavailable: true })
    const wait = promise.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1500)
    await wait

    expect(canceling).toHaveBeenCalledTimes(1)
  })

  test('toasts the restart hint when the retry also fails', async () => {
    const alwaysReset = vi.fn(async (config) => {
      throw resetAdapterError(config)
    })
    api.defaults.adapter = alwaysReset as never

    const promise = api.put('/api/channel/', { id: 1 }, { retryOnServiceUnavailable: true })
    const wait = promise.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1500)
    await wait

    expect(alwaysReset).toHaveBeenCalledTimes(2)
    expect(toastError).toHaveBeenCalledWith(
      'Service is restarting or temporarily unavailable. Please try again later.'
    )
  })
})
