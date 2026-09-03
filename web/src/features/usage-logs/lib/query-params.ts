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

import { DEFAULT_PAGE_SIZE } from '../constants'
import type { UsageLogsSearch } from './search-schema'
import { unixMsToApiSeconds } from './time-range'

/** Query params accepted by the log list/stat endpoints. */
export type UsageLogQueryParams = Record<string, string | number>

function addTextParam(
  params: UsageLogQueryParams,
  key: string,
  value: string | undefined
): void {
  if (value != null && value.trim() !== '') {
    params[key] = value.trim()
  }
}

/** Backend treats 0 / non-numeric channel as "no filter". */
function parseChannelId(value: string | undefined): number | undefined {
  if (value == null || value.trim() === '') {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }
  return parsed
}

function addTimeRangeParams(
  params: UsageLogQueryParams,
  search: UsageLogsSearch
): void {
  const startSeconds = unixMsToApiSeconds(search.startTime)
  if (startSeconds !== undefined) {
    params.start_timestamp = startSeconds
  }
  const endSeconds = unixMsToApiSeconds(search.endTime)
  if (endSeconds !== undefined) {
    params.end_timestamp = endSeconds
  }
}

function addCommonLogFilterParams(
  params: UsageLogQueryParams,
  search: UsageLogsSearch,
  admin: boolean
): void {
  addTextParam(params, 'model_name', search.model)
  addTextParam(params, 'token_name', search.token)
  addTextParam(params, 'group', search.group)
  addTextParam(params, 'request_id', search.requestId)
  addTextParam(params, 'upstream_request_id', search.upstreamRequestId)
  if (admin) {
    addTextParam(params, 'username', search.username)
    const channel = parseChannelId(search.channel)
    if (channel !== undefined) {
      params.channel = channel
    }
  }
  addTimeRangeParams(params, search)
}

/**
 * Build `/api/log` query params from URL search state. The backend `type`
 * param only accepts a single log type, so `type` is sent only when exactly
 * one value is selected; otherwise all types are returned.
 */
export function buildUsageLogQueryParams(
  search: UsageLogsSearch,
  admin: boolean
): UsageLogQueryParams {
  const params: UsageLogQueryParams = {
    p: search.page ?? 1,
    page_size: search.pageSize ?? DEFAULT_PAGE_SIZE,
  }
  const types = search.type ?? []
  if (types.length === 1) {
    params.type = Number(types[0])
  }
  addCommonLogFilterParams(params, search, admin)
  return params
}

/** Build `/api/log/stat` params (same filters, no pagination). */
export function buildUsageLogStatQueryParams(
  search: UsageLogsSearch,
  admin: boolean
): UsageLogQueryParams {
  const params: UsageLogQueryParams = {}
  const types = search.type ?? []
  if (types.length === 1) {
    params.type = Number(types[0])
  }
  addCommonLogFilterParams(params, search, admin)
  return params
}

/**
 * Build `/api/mj` (drawing logs) query params. The `filter` URL param holds
 * the mj id keyword; `channel` only applies to the admin view.
 */
export function buildDrawingLogQueryParams(
  search: UsageLogsSearch,
  admin: boolean
): UsageLogQueryParams {
  const params: UsageLogQueryParams = {
    p: search.page ?? 1,
    page_size: search.pageSize ?? DEFAULT_PAGE_SIZE,
  }
  addTextParam(params, 'mj_id', search.filter)
  if (admin) {
    const channel = parseChannelId(search.channel)
    if (channel !== undefined) {
      params.channel_id = channel
    }
  }
  addTimeRangeParams(params, search)
  return params
}

/**
 * Build `/api/task` (task logs) query params. The `filter` URL param holds
 * the task id keyword; `channel` only applies to the admin view.
 */
export function buildTaskLogQueryParams(
  search: UsageLogsSearch,
  admin: boolean
): UsageLogQueryParams {
  const params: UsageLogQueryParams = {
    p: search.page ?? 1,
    page_size: search.pageSize ?? DEFAULT_PAGE_SIZE,
  }
  addTextParam(params, 'task_id', search.filter)
  if (admin) {
    const channel = parseChannelId(search.channel)
    if (channel !== undefined) {
      params.channel_id = channel
    }
  }
  addTimeRangeParams(params, search)
  return params
}
