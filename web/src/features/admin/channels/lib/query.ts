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

import { STATUS_FILTER_VALUES } from '../constants'

export interface ChannelListFilters {
  page: number
  pageSize: number
  keyword: string
  status: string[]
  type: string[]
  group: string
}

export interface ChannelListQuery {
  path: '/api/channel' | '/api/channel/search'
  params: Record<string, string | number>
}

/**
 * Keep only valid status filter values ('enabled' / 'disabled'), de-duplicated
 * in a stable order. The list endpoint takes a single status param, so the
 * caller can only send one value when exactly one is selected.
 */
export function normalizeStatusFilter(values: string[]): string[] {
  const seen: string[] = []
  for (const value of values) {
    if (
      (STATUS_FILTER_VALUES as readonly string[]).includes(value) &&
      !seen.includes(value)
    ) {
      seen.push(value)
    }
  }
  return seen
}

/**
 * Map the page's URL state to the list endpoint request: keyword search uses
 * GET /api/channel/search, everything else GET /api/channel with pagination
 * params `p` (1-indexed) / `page_size` plus status/type/group filters.
 */
export function buildChannelListQuery(
  filters: ChannelListFilters
): ChannelListQuery {
  const page = Number.isFinite(filters.page) && filters.page > 0 ? Math.floor(filters.page) : 1
  const pageSize =
    Number.isFinite(filters.pageSize) && filters.pageSize > 0
      ? Math.floor(filters.pageSize)
      : 10

  const params: Record<string, string | number> = {
    p: page,
    page_size: pageSize,
  }

  const keyword = filters.keyword.trim()
  const useSearch = keyword !== ''
  if (useSearch) {
    params.keyword = keyword
  }

  const statuses = normalizeStatusFilter(filters.status)
  if (statuses.length === 1) {
    params.status = statuses[0]
  }

  const types = filters.type.filter((value) => /^\d+$/.test(value))
  if (types.length > 0) {
    params.type = types.join(',')
  }

  const group = filters.group.trim()
  if (group !== '') {
    params.group = group
  }

  return {
    path: useSearch ? '/api/channel/search' : '/api/channel',
    params,
  }
}
