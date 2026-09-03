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
import { describe, expect, test } from 'vitest'

import type { UserFilters } from '../../types'
import { buildUserListRequest } from '../query-params'

function makeFilters(overrides: Partial<UserFilters> = {}): UserFilters {
  return {
    page: 2,
    pageSize: 50,
    keyword: '',
    status: [],
    role: [],
    group: '',
    ...overrides,
  }
}

describe('buildUserListRequest', () => {
  test('uses the plain list endpoint with only pagination when no filter is set', () => {
    const request = buildUserListRequest(makeFilters())
    expect(request).toEqual({
      url: '/api/user/',
      params: { p: '2', page_size: '50' },
    })
  })

  test('falls back to page 1 and page size 20 for invalid pagination', () => {
    const request = buildUserListRequest(makeFilters({ page: 0, pageSize: -5 }))
    expect(request.params).toEqual({ p: '1', page_size: '20' })
  })

  test('switches to the search endpoint when a keyword is set', () => {
    const request = buildUserListRequest(makeFilters({ keyword: ' alice ' }))
    expect(request.url).toBe('/api/user/search')
    expect(request.params.keyword).toBe('alice')
  })

  test('passes an exact group filter to the search endpoint', () => {
    const request = buildUserListRequest(makeFilters({ group: 'vip' }))
    expect(request.url).toBe('/api/user/search')
    expect(request.params.group).toBe('vip')
  })

  test('collapses a multi-value status filter to its first entry', () => {
    const request = buildUserListRequest(makeFilters({ status: ['2', '1'] }))
    expect(request.url).toBe('/api/user/search')
    expect(request.params.status).toBe('2')
  })

  test('collapses a multi-value role filter to its first entry', () => {
    const request = buildUserListRequest(makeFilters({ role: ['10', '100'] }))
    expect(request.url).toBe('/api/user/search')
    expect(request.params.role).toBe('10')
  })

  test('combines keyword, group, role and status on the search endpoint', () => {
    const request = buildUserListRequest(
      makeFilters({ keyword: 'bob', group: 'default', role: ['1'], status: ['1'] })
    )
    expect(request.url).toBe('/api/user/search')
    expect(request.params).toEqual({
      p: '2',
      page_size: '50',
      keyword: 'bob',
      group: 'default',
      role: '1',
      status: '1',
    })
  })

  test('keeps the plain list endpoint when filters hold only empty values', () => {
    const request = buildUserListRequest(
      makeFilters({ keyword: '   ', group: '', status: [], role: [] })
    )
    expect(request.url).toBe('/api/user/')
    expect(request.params).toEqual({ p: '2', page_size: '50' })
  })
})
