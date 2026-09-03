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
  AdjustUserQuotaPayload,
  ApiResponse,
  GetUsersResponse,
  ManageUserPayload,
  UpdateUserPayload,
  User,
  UserFormData,
  UserListRequest,
} from './types'

/** Fetch users via the plain list or the search endpoint, per `request`. */
export async function fetchUsers(
  request: UserListRequest
): Promise<GetUsersResponse> {
  const res = await api.get(request.url, { params: request.params })
  return res.data
}

/** Create a new user. */
export async function createUser(
  data: UserFormData
): Promise<ApiResponse<User>> {
  const res = await api.post('/api/user/', data)
  return res.data
}

/** Update an existing user. */
export async function updateUser(
  data: UpdateUserPayload
): Promise<ApiResponse<Partial<User>>> {
  const res = await api.put('/api/user/', data)
  return res.data
}

/** Promote/demote/enable/disable/delete a user. */
export async function manageUser(
  payload: ManageUserPayload
): Promise<ApiResponse<Partial<User>>> {
  const res = await api.post('/api/user/manage', payload)
  return res.data
}

/** Add/subtract/override a user's quota. */
export async function adjustUserQuota(
  payload: AdjustUserQuotaPayload
): Promise<ApiResponse<Partial<User>>> {
  const res = await api.post('/api/user/manage', payload)
  return res.data
}

/** Reset a user's passkey registration. */
export async function resetUserPasskey(id: number): Promise<ApiResponse<null>> {
  const res = await api.delete(`/api/user/${id}/reset_passkey`)
  return res.data
}

/** Reset a user's two-factor authentication setup. */
export async function resetUserTwoFactor(
  id: number
): Promise<ApiResponse<null>> {
  const res = await api.delete(`/api/user/${id}/2fa`)
  return res.data
}

/** List distinct user groups for filter and form selects. */
export async function getUserGroups(): Promise<ApiResponse<string[]>> {
  const res = await api.get('/api/group/')
  return res.data
}
