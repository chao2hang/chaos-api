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

/** Standard API response envelope. */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

/** Multi-key channel metadata embedded in a Channel record. */
export interface ChannelInfo {
  is_multi_key: boolean
  multi_key_size: number
  multi_key_mode: 'random' | 'polling'
  multi_key_status_list: Record<string, number>
}

/**
 * Channel record as returned by GET /api/channel and GET /api/channel/search.
 * status: 1 = enabled, 2 = manually disabled, 3 = auto disabled.
 */
export type Channel = {
  id: number
  type: number
  key: string
  status: number
  name: string
  created_time: number
  test_time: number
  response_time: number
  base_url: string
  other: string
  balance: number
  balance_updated_time: number
  models: string
  group: string
  used_quota: number
  model_mapping: string
  status_code_mapping: string
  priority: number
  weight: number
  auto_ban: number
  tag: string
  remark: string
  max_input_tokens: number
  openai_organization: string
  test_model: string
  header_override: string
  param_override: string
  setting: string
  settings: string
  status_reason?: string
  channel_info: ChannelInfo | null
}

/** Partial channel fields accepted by create/update endpoints. */
export type ChannelPayload = Partial<Omit<Channel, 'id' | 'channel_info'>>

/** Body for PUT /api/channel/ — note the trailing slash; id travels in the body. */
export type UpdateChannelRequest = ChannelPayload & { id: number }

/** Body for POST /api/channel/fetch_models. */
export interface FetchModelsRequest {
  base_url: string
  type: number
  key?: string
  channel_id?: number
}

/**
 * Creation mode of POST /api/channel: single channel, one channel per key
 * line (batch), or one multi-key channel holding every key.
 */
export type ChannelCreateMode = 'single' | 'batch' | 'multi_to_single'

/** Body for POST /api/channel (all creation modes). */
export interface AddChannelRequest {
  mode: ChannelCreateMode
  channel: ChannelPayload
  multi_key_mode?: 'random' | 'polling'
  batch_add_set_key_prefix_2_name?: boolean
}

/** Envelope of the async system tasks (channel test all, balance refresh...). */
export interface SystemTaskResponse {
  success: boolean
  message?: string
  data?: { task_id: string; status: string }
}

/** Policy snapshot of GET /api/channel/ops. */
export interface ChannelOpsInfo {
  retry_times: number
  request_policy: { automatic_disable: boolean; source: string }
}

/** One key of a multi-key channel, from action=get_key_status. */
export interface MultiKeyStatus {
  index: number
  status: number
  disabled_time?: number
  reason?: string
  key_preview: string
}

/** Response of the multi-key manage endpoint (action=get_key_status). */
export interface MultiKeyStatusResponse {
  keys: MultiKeyStatus[]
  total: number
  page: number
  page_size: number
  total_pages: number
  enabled_count: number
  manual_disabled_count: number
  auto_disabled_count: number
}

/** Request of POST /api/channel/multi_key/manage. */
export interface MultiKeyManageRequest {
  channel_id: number
  action:
    | 'disable_key'
    | 'enable_key'
    | 'delete_key'
    | 'delete_disabled_keys'
    | 'get_key_status'
  key_index?: number
  page?: number
  page_size?: number
  status?: number
}

/** Detection result of the upstream model updates for one channel. */
export interface UpstreamModelUpdate {
  channel_id: number
  channel_name: string
  add_models: string[]
  remove_models: string[]
  last_check_time: number
  auto_added_models: number
}

/** Paginated channel list payload. */
export interface ChannelListData {
  items: Channel[]
  total: number
  page: number
  page_size: number
}

/**
 * Aggregated channel status counts of GET /api/channel/status_counts,
 * computed server-side over ALL channels regardless of pagination.
 */
export interface ChannelStatusCounts {
  enabled: number
  disabled: number
  auto_disabled: number
}

/** Result payload of GET /api/channel/test/:id. */
export interface TestChannelResult {
  response_time?: number
  error?: string
}

/** Envelope returned by GET /api/channel/test/:id. */
export interface TestChannelResponse extends ApiResponse<TestChannelResult> {
  time?: number
}

/**
 * Envelope returned by GET /api/channel/update_balance/:id. Channels whose
 * balance API answers with a non-numeric body come back as raw_response
 * instead of a parsed balance number.
 */
export interface ChannelBalanceResponse {
  success: boolean
  message?: string
  balance?: number
  raw_response?: string
}

/** URL search params of the admin channels page. */
export interface ChannelsSearch {
  page: number
  pageSize: number
  filter: string
  status: string[]
  type: string[]
  group: string
  tag_mode: boolean
}
