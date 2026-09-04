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
  SystemInstanceDeleteResponse,
  SystemInstanceListResponse,
} from './types'

/** List cluster instances with heartbeat and resource usage. */
export async function listSystemInstances(): Promise<SystemInstanceListResponse> {
  const res = await api.get('/api/system-info/instances')
  return res.data
}

/** Purge all stale instance heartbeat records. */
export async function deleteStaleSystemInstances(): Promise<SystemInstanceDeleteResponse> {
  const res = await api.delete('/api/system-info/stale-instances')
  return res.data
}

/** Delete a single stale instance record by node name. */
export async function deleteStaleSystemInstance(
  nodeName: string
): Promise<SystemInstanceDeleteResponse> {
  const res = await api.delete(
    `/api/system-info/instances/${encodeURIComponent(nodeName)}`
  )
  return res.data
}
