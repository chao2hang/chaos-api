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

import { api } from '@/lib/http-client'

import type { ChannelListQuery } from './lib/query'
import type {
  AddChannelRequest,
  ApiResponse,
  Channel,
  ChannelBalanceResponse,
  ChannelListData,
  ChannelOpsInfo,
  ChannelStatusCounts,
  FetchModelsRequest,
  MultiKeyManageRequest,
  MultiKeyStatusResponse,
  SystemTaskResponse,
  TestChannelResponse,
  UpdateChannelRequest,
  UpstreamModelUpdate,
} from './types'

export async function getChannelList(
  query: ChannelListQuery
): Promise<ApiResponse<ChannelListData>> {
  const res = await api.get(query.path, { params: query.params })
  return res.data
}

/** Channel counts per status, aggregated over all channels. */
export async function getChannelStatusCounts(): Promise<
  ApiResponse<ChannelStatusCounts>
> {
  const res = await api.get('/api/channel/status_counts')
  return res.data
}

export async function getChannel(id: number): Promise<ApiResponse<Channel>> {
  const res = await api.get(`/api/channel/${id}`)
  return res.data
}

/**
 * Get channel key (requires security verification proof)
 */
export async function getChannelKey(
  id: number,
  proofToken: string,
  signal?: AbortSignal
): Promise<ApiResponse<{ key: string }>> {
  const res = await api.post(`/api/channel/${id}/key`, undefined, {
    headers: { 'X-Security-Proof': proofToken },
    signal,
  })
  return res.data
}

export async function createChannel(
  request: AddChannelRequest
): Promise<ApiResponse> {
  const res = await api.post('/api/channel', request)
  return res.data
}

export async function updateChannel(
  request: UpdateChannelRequest
): Promise<ApiResponse<Channel>> {
  const res = await api.put('/api/channel/', request)
  return res.data
}

export async function updateChannelStatus(
  id: number,
  status: number
): Promise<ApiResponse<boolean>> {
  const res = await api.post(`/api/channel/${id}/status`, { status })
  return res.data
}

export async function batchUpdateChannelStatus(
  ids: number[],
  status: number
): Promise<ApiResponse<number>> {
  const res = await api.post('/api/channel/status/batch', { ids, status })
  return res.data
}

export async function deleteChannel(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/channel/${id}`)
  return res.data
}

export async function batchDeleteChannels(
  ids: number[]
): Promise<ApiResponse<number>> {
  const res = await api.post('/api/channel/batch', { ids })
  return res.data
}

/** Set one tag on the selected channels (POST /api/channel/batch/tag). */
export async function batchSetChannelTag(
  ids: number[],
  tag: string
): Promise<ApiResponse> {
  const res = await api.post('/api/channel/batch/tag', { ids, tag })
  return res.data
}

/** Enable or disable every channel sharing one tag. */
export async function setTagChannels(
  tag: string,
  status: number
): Promise<ApiResponse> {
  const res = await api.post(
    status === 1 ? '/api/channel/tag/enabled' : '/api/channel/tag/disabled',
    { tag }
  )
  return res.data
}

/** Fix the channel/abilities consistency (POST /api/channel/fix). */
export async function fixChannelAbilities(): Promise<
  ApiResponse<{ success: boolean; fails: number } | undefined>
> {
  const res = await api.post('/api/channel/fix')
  return res.data
}

/** Delete all manually-disabled channels (DELETE /api/channel/disabled). */
export async function deleteDisabledChannels(): Promise<ApiResponse<number>> {
  const res = await api.delete('/api/channel/disabled')
  return res.data
}

/** Retry/automatic-disable policy snapshot (GET /api/channel/ops). */
export async function getChannelOps(): Promise<
  ApiResponse<ChannelOpsInfo | undefined>
> {
  const res = await api.get('/api/channel/ops')
  return res.data
}

/** Enqueue a system task testing all enabled channels. */
export async function testAllChannels(): Promise<SystemTaskResponse> {
  const res = await api.get('/api/channel/test')
  return res.data
}

/** Refresh the balance of every enabled channel (synchronous). */
export async function updateAllChannelsBalance(): Promise<ApiResponse> {
  const res = await api.get('/api/channel/update_balance')
  return res.data
}

/** Run one multi-key management action (GET /api/channel/multi_key/manage). */
export async function manageMultiKeys(
  params: MultiKeyManageRequest
): Promise<ApiResponse<MultiKeyStatusResponse | undefined>> {
  const res = await api.post('/api/channel/multi_key/manage', params)
  return res.data
}

/** Codex account usage snapshot (GET /api/channel/:id/codex/usage). */
export async function getCodexUsage(
  channelId: number
): Promise<ApiResponse<unknown>> {
  const res = await api.get(`/api/channel/${channelId}/codex/usage`)
  return res.data
}

/** Refresh the Codex OAuth credential (POST /api/channel/:id/codex/refresh). */
export async function refreshCodexCredential(
  channelId: number
): Promise<ApiResponse> {
  const res = await api.post(`/api/channel/${channelId}/codex/refresh`, {})
  return res.data
}

/** Reset the Codex usage window (POST /api/channel/:id/codex/usage/reset). */
export async function resetCodexUsage(channelId: number): Promise<ApiResponse> {
  const res = await api.post(`/api/channel/${channelId}/codex/usage/reset`, {})
  return res.data
}

/** Delete a model from an Ollama channel (DELETE /api/channel/ollama/delete). */
export async function deleteOllamaModel(
  channelId: number,
  modelName: string
): Promise<ApiResponse> {
  const res = await api.delete('/api/channel/ollama/delete', {
    data: { channel_id: channelId, model_name: modelName },
  })
  return res.data
}

/** Ollama server version info (GET /api/channel/ollama/version/:id). */
export async function getOllamaVersion(
  channelId: number
): Promise<ApiResponse<unknown>> {
  const res = await api.get(`/api/channel/ollama/version/${channelId}`)
  return res.data
}

/** Detect model drift of one channel against its upstream. */
export async function detectChannelUpstreamUpdates(
  channelId: number
): Promise<ApiResponse<UpstreamModelUpdate | undefined>> {
  const res = await api.post('/api/channel/upstream_updates/detect', {
    id: channelId,
  })
  return res.data
}

/** Apply detected model updates of one channel. */
export async function applyChannelUpstreamUpdates(
  channelId: number,
  addModels: string[],
  removeModels: string[]
): Promise<ApiResponse> {
  const res = await api.post('/api/channel/upstream_updates/apply', {
    id: channelId,
    add_models: addModels,
    remove_models: removeModels,
  })
  return res.data
}

export async function copyChannel(
  id: number
): Promise<ApiResponse<{ id: number }>> {
  const res = await api.post(`/api/channel/copy/${id}`)
  return res.data
}

export async function testChannel(id: number): Promise<TestChannelResponse> {
  const res = await api.get(`/api/channel/test/${id}`)
  return res.data
}

/** Query the upstream balance of one channel. */
export async function updateChannelBalance(
  id: number
): Promise<ChannelBalanceResponse> {
  const res = await api.get(`/api/channel/update_balance/${id}`)
  return res.data
}

export async function fetchUpstreamModels(
  request: FetchModelsRequest
): Promise<ApiResponse<string[]>> {
  const res = await api.post('/api/channel/fetch_models', request)
  return res.data
}

/** Distinct user groups; used for the group filter and channel form. */
export async function getChannelGroups(): Promise<ApiResponse<string[]>> {
  const res = await api.get('/api/group/')
  return res.data
}
