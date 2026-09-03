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

import type { UsageLogsSearch } from './lib/search-schema'

/** Section tabs of the usage logs page. */
export type UsageLogsSectionId = 'common' | 'drawing' | 'task'

/**
 * Route-bound search patcher: merges a partial search patch into the current
 * URL search params of the active usage-logs route. Implemented by the route
 * files (which own the typed navigation context) and consumed by the page.
 */
export type UsageLogsSearchPatcher = (
  build: (prev: UsageLogsSearch) => UsageLogsSearch
) => void

/** Common relay/usage log (`GET /api/log` and `/api/log/self`). */
export type UsageLog = {
  id: number
  user_id: number
  created_at: number
  type: number
  content: string
  username: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  channel: number
  channel_name: string
  token_id: number
  group: string
  ip: string
  /** JSON encoded extra info; breakdown view is out of scope. */
  other: string
  request_id: string
  upstream_request_id: string
}

/** Stat summary (`GET /api/log/stat` and `/api/log/self/stat`). */
export type UsageLogStat = {
  quota: number
  rpm: number
  tpm: number
}

/** Midjourney drawing log (`GET /api/mj` and `/api/mj/self`). */
export type MidjourneyLog = {
  id: number
  code: number
  user_id: number
  action: string
  mj_id: string
  prompt: string
  prompt_en: string
  description: string
  state: string
  submit_time: number
  start_time: number
  finish_time: number
  image_url: string
  video_url: string
  video_urls: string
  status: string
  progress: string
  fail_reason: string
  channel_id: number
  quota: number
}

/** Async task log (`GET /api/task` and `/api/task/self`, dto.TaskDto). */
export type TaskLog = {
  id: number
  created_at: number
  updated_at: number
  task_id: string
  platform: string
  user_id: number
  group: string
  channel_id: number
  quota: number
  action: string
  status: string
  fail_reason: string
  result_url?: string
  submit_time: number
  start_time: number
  finish_time: number
  progress: string
  username?: string
}

/** Standard paginated list payload returned by all log endpoints. */
export type PaginatedData<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
}

/** Standard API response envelope. */
export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}
