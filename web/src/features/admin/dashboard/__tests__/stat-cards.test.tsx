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
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  useAuthStore,
  type AuthUser,
} from '@/stores/auth-store'

import { AdminDashboardView } from '../admin-dashboard-view'
import { fetchUsageLogStat } from '@/features/usage-logs/api'

vi.mock('@/features/dashboard/api', () => ({
  getTrafficDistribution: vi.fn(() =>
    Promise.resolve({
      start_time: 0,
      end_time: 0,
      bucket_size: 7200,
      total_requests: 0,
      avg_latency: 0,
      total_errors: 0,
      error_rate: 0,
      points: [],
    })
  ),
}))

vi.mock('@/features/admin/channels/api', () => ({
  getChannelStatusCounts: vi.fn(() =>
    Promise.resolve({ data: { enabled: 0, disabled: 0, auto_disabled: 0 } })
  ),
}))

vi.mock('@/features/usage-logs/api', () => ({
  fetchUsageLogs: vi.fn(() =>
    Promise.resolve({ items: [], total: 0, page: 1, page_size: 6 })
  ),
  fetchUsageLogStat: vi.fn(),
}))

const adminUser: AuthUser = { id: 1, username: 'root', role: 100 }
const commonUser: AuthUser = { id: 2, username: 'user', role: 1 }

function seedUser(user: AuthUser | null) {
  useAuthStore.setState((prev) => ({ auth: { ...prev.auth, user } }))
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminDashboardView />
    </QueryClientProvider>
  )
}

afterEach(() => {
  seedUser(null)
  vi.clearAllMocks()
})

describe('AdminDashboardView stat cards', () => {
  test('renders the all-time consumed tokens metric instead of the balance', async () => {
    seedUser(adminUser)
    vi.mocked(fetchUsageLogStat).mockResolvedValue({
      quota: 900,
      rpm: 0,
      tpm: 0,
      tps: 0,
      token: 123456789,
    })

    renderDashboard()

    expect(await screen.findByText('Total Tokens Used')).toBeInTheDocument()
    expect(await screen.findByText('123,456,789')).toBeInTheDocument()
    expect(screen.queryByText('USD')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Balance')).not.toBeInTheDocument()
  })

  test('queries the system-wide stat for admins and the self stat for common users', async () => {
    seedUser(adminUser)
    vi.mocked(fetchUsageLogStat).mockResolvedValue({
      quota: 0,
      rpm: 0,
      tpm: 0,
      tps: 0,
      token: 0,
    })

    renderDashboard()
    await waitFor(() => {
      expect(fetchUsageLogStat).toHaveBeenCalledWith(true, {})
    })
  })

  test('falls back to 0 tokens while the stat has no token field', async () => {
    seedUser(commonUser)
    vi.mocked(fetchUsageLogStat).mockResolvedValue({
      quota: 0,
      rpm: 0,
      tpm: 0,
    })

    renderDashboard()

    expect(await screen.findByText('Total Tokens Used')).toBeInTheDocument()
    const tokenCard = screen.getByText('Total Tokens Used').parentElement
    expect(tokenCard).not.toBeNull()
    expect(within(tokenCard as HTMLElement).getByText('0')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchUsageLogStat).toHaveBeenCalledWith(false, {})
    })
  })
})
