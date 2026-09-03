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
import { api } from '@/lib/api'

import type {
  ApiEnvelope,
  MidjourneyLog,
  PaginatedData,
  TaskLog,
  UsageLog,
  UsageLogStat,
} from './types'
import type { UsageLogQueryParams } from './lib/query-params'

const EMPTY_PAGE: PaginatedData<never> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
}

function toPaginated<T>(
  data: PaginatedData<T> | undefined
): PaginatedData<T> {
  if (data == null) {
    return EMPTY_PAGE as PaginatedData<T>
  }
  return data
}

/** Fetch common usage logs. Admin sees all logs, otherwise the self view. */
export async function fetchUsageLogs(
  admin: boolean,
  params: UsageLogQueryParams
): Promise<PaginatedData<UsageLog>> {
  const res = await api.get<ApiEnvelope<PaginatedData<UsageLog>>>(
    admin ? '/api/log' : '/api/log/self',
    { params }
  )
  return toPaginated(res.data.data)
}

/** Fetch quota / RPM / TPM stat summary for the current log filters. */
export async function fetchUsageLogStat(
  admin: boolean,
  params: UsageLogQueryParams
): Promise<UsageLogStat> {
  const res = await api.get<ApiEnvelope<UsageLogStat>>(
    admin ? '/api/log/stat' : '/api/log/self/stat',
    { params }
  )
  return res.data.data ?? { quota: 0, rpm: 0, tpm: 0 }
}

/** Fetch drawing (Midjourney) logs. Admin sees all, otherwise the self view. */
export async function fetchMjLogs(
  admin: boolean,
  params: UsageLogQueryParams
): Promise<PaginatedData<MidjourneyLog>> {
  const res = await api.get<ApiEnvelope<PaginatedData<MidjourneyLog>>>(
    admin ? '/api/mj' : '/api/mj/self',
    { params }
  )
  return toPaginated(res.data.data)
}

/** Fetch async task logs. Admin sees all, otherwise the self view. */
export async function fetchTaskLogs(
  admin: boolean,
  params: UsageLogQueryParams
): Promise<PaginatedData<TaskLog>> {
  const res = await api.get<ApiEnvelope<PaginatedData<TaskLog>>>(
    admin ? '/api/task' : '/api/task/self',
    { params }
  )
  return toPaginated(res.data.data)
}
