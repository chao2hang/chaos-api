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

import {
  buildDrawingLogQueryParams,
  buildTaskLogQueryParams,
  buildUsageLogQueryParams,
  buildUsageLogStatQueryParams,
} from '../lib/query-params'
import { usageLogsSearchSchema } from '../lib/search-schema'

function parseSearch(raw: Record<string, unknown>) {
  return usageLogsSearchSchema.parse(raw)
}

describe('buildUsageLogQueryParams', () => {
  test('defaults to page 1 with the default page size', () => {
    const params = buildUsageLogQueryParams(parseSearch({}), false)
    expect(params).toEqual({ p: 1, page_size: 20 })
  })

  test('passes a single selected log type as a number', () => {
    const search = parseSearch({ type: '5', page: 3, pageSize: 50 })
    const params = buildUsageLogQueryParams(search, false)
    expect(params).toEqual({ p: 3, page_size: 50, type: 5 })
  })

  test('omits type when several log types are selected', () => {
    const search = parseSearch({ type: ['2', '5'] })
    const params = buildUsageLogQueryParams(search, true)
    expect(params['type']).toBeUndefined()
  })

  test('maps filter fields to backend param names', () => {
    const search = parseSearch({
      model: 'gpt-4o',
      token: 'my-token',
      group: 'vip',
      requestId: 'req-1',
      upstreamRequestId: 'up-1',
    })
    const params = buildUsageLogQueryParams(search, true)
    expect(params['model_name']).toBe('gpt-4o')
    expect(params['token_name']).toBe('my-token')
    expect(params['group']).toBe('vip')
    expect(params['request_id']).toBe('req-1')
    expect(params['upstream_request_id']).toBe('up-1')
  })

  test('sends username and channel only for the admin view', () => {
    const search = parseSearch({ username: 'alice', channel: '7' })
    const adminParams = buildUsageLogQueryParams(search, true)
    expect(adminParams['username']).toBe('alice')
    expect(adminParams['channel']).toBe(7)

    const selfParams = buildUsageLogQueryParams(search, false)
    expect(selfParams['username']).toBeUndefined()
    expect(selfParams['channel']).toBeUndefined()
  })

  test('drops invalid channel values instead of sending a zero filter', () => {
    const search = parseSearch({ channel: 'abc' })
    const params = buildUsageLogQueryParams(search, true)
    expect(params['channel']).toBeUndefined()
  })

  test('converts unix-ms search timestamps to unix-second API timestamps', () => {
    const search = parseSearch({ startTime: 1700000050500, endTime: 1700009999000 })
    const params = buildUsageLogQueryParams(search, false)
    expect(params['start_timestamp']).toBe(1700000050)
    expect(params['end_timestamp']).toBe(1700009999)
  })
})

describe('buildUsageLogStatQueryParams', () => {
  test('reuses filters without pagination params', () => {
    const search = parseSearch({ type: '2', model: 'claude', page: 9 })
    const params = buildUsageLogStatQueryParams(search, false)
    expect(params).toEqual({ type: 2, model_name: 'claude' })
  })
})

describe('buildDrawingLogQueryParams', () => {
  test('maps the filter keyword to mj_id', () => {
    const search = parseSearch({ filter: 'job-123' })
    expect(buildDrawingLogQueryParams(search, false)).toMatchObject({
      mj_id: 'job-123',
    })
  })

  test('sends channel_id only for the admin view', () => {
    const search = parseSearch({ channel: '3' })
    expect(buildDrawingLogQueryParams(search, true)['channel_id']).toBe(3)
    expect(buildDrawingLogQueryParams(search, false)['channel_id']).toBeUndefined()
  })

  test('keeps pagination and time range', () => {
    const search = parseSearch({ page: 2, pageSize: 10, endTime: 1700009999000 })
    const params = buildDrawingLogQueryParams(search, false)
    expect(params['p']).toBe(2)
    expect(params['page_size']).toBe(10)
    expect(params['end_timestamp']).toBe(1700009999)
  })
})

describe('buildTaskLogQueryParams', () => {
  test('maps the filter keyword to task_id', () => {
    const search = parseSearch({ filter: 'task-42' })
    expect(buildTaskLogQueryParams(search, false)).toMatchObject({
      task_id: 'task-42',
    })
  })

  test('sends channel_id only for the admin view', () => {
    const search = parseSearch({ channel: '3' })
    expect(buildTaskLogQueryParams(search, true)['channel_id']).toBe(3)
    expect(buildTaskLogQueryParams(search, false)['channel_id']).toBeUndefined()
  })
})
