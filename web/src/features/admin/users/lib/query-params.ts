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
import type { UserFilters, UserListRequest } from '../types'

const LIST_URL = '/api/user/'
const SEARCH_URL = '/api/user/search'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

/**
 * The backend search endpoint accepts a single `role`/`status` int per
 * request, so a multi-value URL filter collapses to its first entry.
 */
function firstSelected(values: string[]): string | undefined {
  return values.length > 0 ? values[0] : undefined
}

/** Build the list/search endpoint URL and query params from URL filters. */
export function buildUserListRequest(filters: UserFilters): UserListRequest {
  const page = filters.page >= 1 ? filters.page : DEFAULT_PAGE
  const pageSize =
    filters.pageSize >= 1 ? filters.pageSize : DEFAULT_PAGE_SIZE
  const keyword = filters.keyword.trim()
  const group = filters.group.trim()
  const status = firstSelected(filters.status)
  const role = firstSelected(filters.role)

  const hasFilters =
    keyword !== '' || group !== '' || status !== undefined || role !== undefined

  const params: Record<string, string> = {
    p: String(page),
    page_size: String(pageSize),
  }
  if (keyword !== '') params.keyword = keyword
  if (group !== '') params.group = group
  if (status !== undefined) params.status = status
  if (role !== undefined) params.role = role

  return { url: hasFilters ? SEARCH_URL : LIST_URL, params }
}
