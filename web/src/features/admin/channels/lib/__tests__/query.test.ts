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

import { describe, expect, it } from 'vitest'

import {
  buildChannelListQuery,
  normalizeStatusFilter,
} from '../query'
import {
  formatResponseTime,
  parseModelsInput,
  summarizeModels,
} from '../format'

const emptyFilters = {
  page: 1,
  pageSize: 10,
  keyword: '',
  status: [] as string[],
  type: [] as string[],
  group: '',
}

describe('normalizeStatusFilter', () => {
  it('keeps valid values and drops unknown ones', () => {
    expect(normalizeStatusFilter(['enabled', 'bogus'])).toEqual(['enabled'])
    expect(normalizeStatusFilter(['disabled', 'enabled'])).toEqual([
      'disabled',
      'enabled',
    ])
  })

  it('de-duplicates repeated values', () => {
    expect(normalizeStatusFilter(['enabled', 'enabled'])).toEqual(['enabled'])
  })
})

describe('buildChannelListQuery', () => {
  it('builds the plain list endpoint with pagination only', () => {
    expect(buildChannelListQuery(emptyFilters)).toEqual({
      path: '/api/channel',
      params: { p: 1, page_size: 10 },
    })
  })

  it('switches to the search endpoint when a keyword is present', () => {
    const query = buildChannelListQuery({ ...emptyFilters, keyword: ' gpt ' })
    expect(query.path).toBe('/api/channel/search')
    expect(query.params.keyword).toBe('gpt')
    expect(query.params.p).toBe(1)
  })

  it('sends a single status filter value', () => {
    const query = buildChannelListQuery({
      ...emptyFilters,
      status: ['disabled', 'bogus'],
    })
    expect(query.params.status).toBe('disabled')
  })

  it('omits the status param when no single status is selected', () => {
    const both = buildChannelListQuery({
      ...emptyFilters,
      status: ['enabled', 'disabled'],
    })
    const none = buildChannelListQuery(emptyFilters)
    expect('status' in both.params).toBe(false)
    expect('status' in none.params).toBe(false)
  })

  it('joins selected type ids into a comma list', () => {
    const query = buildChannelListQuery({
      ...emptyFilters,
      type: ['1', '43', 'oops'],
    })
    expect(query.params.type).toBe('1,43')
  })

  it('passes a non-empty group filter', () => {
    const query = buildChannelListQuery({ ...emptyFilters, group: 'vip' })
    expect(query.params.group).toBe('vip')
  })

  it('falls back to defaults for invalid pagination values', () => {
    const query = buildChannelListQuery({ ...emptyFilters, page: -3, pageSize: 0 })
    expect(query.params.p).toBe(1)
    expect(query.params.page_size).toBe(10)
  })
})

describe('formatResponseTime', () => {
  it('renders non-positive times as a dash', () => {
    expect(formatResponseTime(0)).toBe('-')
    expect(formatResponseTime(-5)).toBe('-')
    expect(formatResponseTime(Number.NaN)).toBe('-')
  })

  it('keeps sub-second times in milliseconds', () => {
    expect(formatResponseTime(842.4)).toBe('842 ms')
  })

  it('renders one second and above as seconds', () => {
    expect(formatResponseTime(1234)).toBe('1.23 s')
    expect(formatResponseTime(20000)).toBe('20.00 s')
  })
})

describe('summarizeModels', () => {
  it('returns no extras when the list fits', () => {
    expect(summarizeModels('gpt-4o, gpt-4o-mini', 3)).toEqual({
      display: 'gpt-4o, gpt-4o-mini',
      extra: 0,
    })
  })

  it('counts entries beyond the limit', () => {
    expect(summarizeModels('a,b,c,d,e', 3)).toEqual({
      display: 'a, b, c',
      extra: 2,
    })
  })

  it('ignores empty entries and blank input', () => {
    expect(summarizeModels(' , a,,b ', 3)).toEqual({
      display: 'a, b',
      extra: 0,
    })
    expect(summarizeModels('', 3)).toEqual({ display: '', extra: 0 })
  })
})

describe('parseModelsInput', () => {
  it('normalizes mixed separators into a comma list', () => {
    expect(parseModelsInput(' a, b\nc；d，e;f\ng')).toBe('a,b,c,d,e,f,g')
  })

  it('drops empty segments', () => {
    expect(parseModelsInput(' , ,a ,, ')).toBe('a')
    expect(parseModelsInput('   ')).toBe('')
  })
})
