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
  channel_info: ChannelInfo | null
}

/** Body for POST /api/channel (mode: 'single'). */
export interface AddChannelRequest {
  mode: 'single'
  channel: ChannelPayload
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

/** Paginated channel list payload. */
export interface ChannelListData {
  items: Channel[]
  total: number
  page: number
  page_size: number
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

/** URL search params of the admin channels page. */
export interface ChannelsSearch {
  page: number
  pageSize: number
  filter: string
  status: string[]
  type: string[]
  group: string
}
