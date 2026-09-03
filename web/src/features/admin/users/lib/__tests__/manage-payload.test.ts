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
  buildManageActionPayload,
  buildQuotaAdjustPayload,
} from '../manage-payload'

describe('buildManageActionPayload', () => {
  test('builds each action-variant body without extra fields', () => {
    expect(buildManageActionPayload(7, 'enable')).toEqual({
      id: 7,
      action: 'enable',
    })
    expect(buildManageActionPayload(7, 'disable')).toEqual({
      id: 7,
      action: 'disable',
    })
    expect(buildManageActionPayload(7, 'promote')).toEqual({
      id: 7,
      action: 'promote',
    })
    expect(buildManageActionPayload(7, 'demote')).toEqual({
      id: 7,
      action: 'demote',
    })
    expect(buildManageActionPayload(7, 'delete')).toEqual({
      id: 7,
      action: 'delete',
    })
  })
})

describe('buildQuotaAdjustPayload', () => {
  test('builds an add-mode add_quota body', () => {
    expect(buildQuotaAdjustPayload(3, 'add', 500000)).toEqual({
      id: 3,
      action: 'add_quota',
      mode: 'add',
      value: 500000,
    })
  })

  test('builds a subtract-mode body with a positive amount', () => {
    expect(buildQuotaAdjustPayload(3, 'subtract', 100)).toEqual({
      id: 3,
      action: 'add_quota',
      mode: 'subtract',
      value: 100,
    })
  })

  test('allows overriding to zero', () => {
    expect(buildQuotaAdjustPayload(3, 'override', 0)).toEqual({
      id: 3,
      action: 'add_quota',
      mode: 'override',
      value: 0,
    })
  })

  test('throws on a non-finite value', () => {
    expect(() => buildQuotaAdjustPayload(3, 'add', Number.NaN)).toThrow(
      'Quota value must be a finite number'
    )
    expect(() => buildQuotaAdjustPayload(3, 'add', Infinity)).toThrow(
      'Quota value must be a finite number'
    )
  })

  test('throws on a negative override target', () => {
    expect(() => buildQuotaAdjustPayload(3, 'override', -1)).toThrow(
      'Override quota must not be negative'
    )
  })
})
