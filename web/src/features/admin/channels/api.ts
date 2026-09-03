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

import type {
  AddChannelRequest,
  ApiResponse,
  Channel,
  ChannelListData,
  FetchModelsRequest,
  TestChannelResponse,
  UpdateChannelRequest,
} from './types'
import type { ChannelListQuery } from './lib/query'

export async function getChannelList(
  query: ChannelListQuery
): Promise<ApiResponse<ChannelListData>> {
  const res = await api.get(query.path, { params: query.params })
  return res.data
}

export async function getChannel(id: number): Promise<ApiResponse<Channel>> {
  const res = await api.get(`/api/channel/${id}`)
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
