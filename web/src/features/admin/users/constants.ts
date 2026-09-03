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
import { ROLE } from '@/lib/roles'

import type {
  QuotaAdjustMode,
  UserStatusFilterValue,
  UserRoleFilterValue,
} from './types'

// ============================================================================
// User Status
// ============================================================================

export const USER_STATUS = {
  ENABLED: 1,
  DISABLED: 2,
} as const

/** Filter select options; `label` is an i18n key rendered via t(). */
export const USER_STATUS_OPTIONS: Array<{
  label: string
  value: UserStatusFilterValue
}> = [
  { label: 'Enabled', value: '1' },
  { label: 'Disabled', value: '2' },
]

/** Role filter select options; `label` is an i18n key rendered via t(). */
export const USER_ROLE_OPTIONS: Array<{
  label: string
  value: UserRoleFilterValue
}> = [
  { label: 'User', value: String(ROLE.USER) as UserRoleFilterValue },
  { label: 'Admin', value: String(ROLE.ADMIN) as UserRoleFilterValue },
  {
    label: 'Super Admin',
    value: String(ROLE.SUPER_ADMIN) as UserRoleFilterValue,
  },
]

// ============================================================================
// Quota Adjust Modes
// ============================================================================

export const QUOTA_ADJUST_MODES: QuotaAdjustMode[] = [
  'add',
  'subtract',
  'override',
]

// ============================================================================
// React Query Keys
// ============================================================================

export const USERS_QUERY_KEY = ['admin', 'users'] as const

// ============================================================================
// Success Messages (values are i18n keys — render with t())
// ============================================================================

export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created',
  USER_UPDATED: 'User updated',
  QUOTA_ADJUSTED: 'Quota adjusted',
  PASSKEY_RESET: 'Passkey reset',
  TWO_FACTOR_RESET: 'Two-factor authentication reset',
} as const
