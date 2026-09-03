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
import { z } from 'zod'

// ============================================================================
// Core Types
// ============================================================================

export type User = {
  id: number
  username: string
  display_name: string
  quota: number
  used_quota: number
  request_count: number
  group: string
  status: number // 1=enabled, 2=disabled
  role: number
  created_at?: number
  updated_at?: number
  last_login_at?: number
  remark?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface UsersPage {
  items: User[]
  total: number
  page: number
  page_size: number
}

export type GetUsersResponse = ApiResponse<UsersPage>

// ============================================================================
// Manage / Quota Payloads (POST /api/user/manage)
// ============================================================================

export type ManageAction = 'promote' | 'demote' | 'enable' | 'disable' | 'delete'

export type QuotaAdjustMode = 'add' | 'subtract' | 'override'

export interface ManageUserPayload {
  id: number
  action: ManageAction
}

export interface AdjustUserQuotaPayload {
  id: number
  action: 'add_quota'
  mode: QuotaAdjustMode
  value: number
}

export type ManageUserRequest = ManageUserPayload | AdjustUserQuotaPayload

// ============================================================================
// Create / Update Form Types
// ============================================================================

export const userFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  display_name: z.string().min(1, 'Display name is required'),
  password: z.string(),
  group: z.string(),
  quota: z.number(),
  remark: z.string(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

/** Body for POST /api/user/ (create). Password is required. */
export interface UserFormData {
  username: string
  display_name: string
  password: string
  group: string
  quota: number
  remark?: string
}

/** Body for PUT /api/user/ (update). Empty password keeps the current one. */
export interface UpdateUserPayload {
  id: number
  username: string
  display_name: string
  password?: string
  group: string
  quota: number
  remark?: string
}

// ============================================================================
// URL Filter Types
// ============================================================================

export type UserStatusFilterValue = '1' | '2'

export type UserRoleFilterValue = '1' | '10' | '100'

export interface UserFilters {
  page: number
  pageSize: number
  keyword: string
  status: UserStatusFilterValue[]
  role: UserRoleFilterValue[]
  group: string
}

/** Endpoint + query params produced by `buildUserListRequest`. */
export interface UserListRequest {
  url: '/api/user/' | '/api/user/search'
  params: Record<string, string>
}
