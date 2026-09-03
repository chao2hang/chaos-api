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

/** Log type enum values used by `/api/log` (`type` column). */
export const LOG_TYPE = {
  UNKNOWN: 0,
  TOPUP: 1,
  CONSUME: 2,
  MANAGE: 3,
  SYSTEM: 4,
  ERROR: 5,
  REFUND: 6,
  LOGIN: 7,
} as const

export type LogTypeValue = (typeof LOG_TYPE)[keyof typeof LOG_TYPE]

export type LogTypeOption = {
  /** String form used in URL search params and API params. */
  value: string
  labelKey: string
}

/** All log types as multi-select options (label keys rendered via `t()`). */
export const LOG_TYPE_OPTIONS: readonly LogTypeOption[] = [
  { value: '0', labelKey: 'Unknown' },
  { value: '1', labelKey: 'Top Up' },
  { value: '2', labelKey: 'Consume' },
  { value: '3', labelKey: 'Manage' },
  { value: '4', labelKey: 'System' },
  { value: '5', labelKey: 'Error' },
  { value: '6', labelKey: 'Refund' },
  { value: '7', labelKey: 'Login' },
]

export type LogTypeBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'

/** Badge variant per log type for the type column. */
export const LOG_TYPE_BADGE_VARIANTS: Record<number, LogTypeBadgeVariant> = {
    [LOG_TYPE.UNKNOWN]: 'outline',
    [LOG_TYPE.TOPUP]: 'secondary',
    [LOG_TYPE.CONSUME]: 'default',
    [LOG_TYPE.MANAGE]: 'secondary',
    [LOG_TYPE.SYSTEM]: 'outline',
    [LOG_TYPE.ERROR]: 'destructive',
    [LOG_TYPE.REFUND]: 'secondary',
    [LOG_TYPE.LOGIN]: 'outline',
  }
export function getLogTypeOption(type: number): LogTypeOption | undefined {
  return LOG_TYPE_OPTIONS.find((option) => option.value === String(type))
}

export const DEFAULT_PAGE_SIZE = 20

/** Task/MJ statuses rendered with the matching Tag color. */
export const LOG_STATUS_TAG_COLORS: Record<string, string> = {
  SUCCESS: 'success',
  FAILURE: 'error',
  FAILED: 'error',
  IN_PROGRESS: 'primary',
  NOT_START: 'default',
  UNKNOWN: 'default',
}
