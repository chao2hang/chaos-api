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

/**
 * Coercion helpers for chaos-ui `FilterBar` values (`Record<string, unknown>`)
 * into typed URL search params. Shared by the usage-logs filter bars.
 */

import { LOG_TYPE_OPTIONS } from '../constants'

export type LogTypeSearchValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'

/** Trimmed string value, or undefined when empty/absent. */
export function filterTextValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Array of string values, or undefined when empty/absent. */
export function filterStringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const values = value.filter((item): item is string => typeof item === 'string')
  return values.length > 0 ? values : undefined
}

/** Unix-ms timestamp from a picked Date, or undefined when cleared. */
export function filterDateMsValue(value: unknown): number | undefined {
  if (!(value instanceof Date)) {
    return undefined
  }
  const ms = value.getTime()
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}

/** Validated log-type search values, or undefined when empty/absent. */
export function filterLogTypeValue(
  value: unknown
): LogTypeSearchValue[] | undefined {
  const values = filterStringArrayValue(value)
  if (!values) {
    return undefined
  }
  const valid = values.filter((item): item is LogTypeSearchValue =>
    LOG_TYPE_OPTIONS.some((option) => option.value === item)
  )
  return valid.length > 0 ? valid : undefined
}
