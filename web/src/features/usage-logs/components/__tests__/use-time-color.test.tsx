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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { UsageLog } from '../../types'

vi.mock('../../api', () => ({
  fetchUsageLogs: vi.fn(),
}))

const { fetchUsageLogs } = await import('../../api')
const mockedFetchUsageLogs = vi.mocked(fetchUsageLogs)
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { CommonLogsTable } = await import('../common-logs-table')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

function makeLog(overrides: Partial<UsageLog>): UsageLog {
  return {
    id: 1,
    user_id: 1,
    created_at: 1700000000,
    type: 2,
    content: '',
    username: 'alice',
    token_name: 'sk-test',
    model_name: 'gpt-4o',
    quota: 100,
    prompt_tokens: 10,
    completion_tokens: 20,
    use_time: 1,
    is_stream: false,
    channel: 7,
    channel_name: 'openai-main',
    token_id: 3,
    group: 'default',
    ip: '',
    other: '',
    request_id: 'req-1',
    upstream_request_id: '',
    ...overrides,
  }
}

function renderTable(items: UsageLog[]) {
  mockedFetchUsageLogs.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    page_size: 10,
  })
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <CommonLogsTable
          search={{}}
          admin={false}
          patchSearch={() => {}}
        />
      </I18nextProvider>
    </QueryClientProvider>
  )
}

describe('CommonLogsTable use-time color', () => {
  test('renders a fast short log green and a slow low-throughput log red', async () => {
    renderTable([
      makeLog({ id: 1, model_name: 'fast-model', use_time: 2, completion_tokens: 10 }),
      makeLog({ id: 2, model_name: 'slow-model', use_time: 60, completion_tokens: 10 }),
    ])

    const fastCell = await screen.findByText('2.0s')
    expect(fastCell.className).toContain('text-emerald-500')
    const slowCell = await screen.findByText('1m 0s')
    expect(slowCell.className).toContain('text-red-500')
  })

  test('renders a slow but high-throughput log green', async () => {
    renderTable([
      makeLog({
        id: 3,
        model_name: 'stream-model',
        use_time: 100,
        completion_tokens: 5000,
        is_stream: true,
      }),
    ])

    const cell = await screen.findByText('1m 40s')
    expect(cell.className).toContain('text-emerald-500')
    expect(cell.className).not.toContain('text-red-500')
  })
})
