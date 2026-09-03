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
import type {
  AdjustUserQuotaPayload,
  ManageAction,
  ManageUserPayload,
  QuotaAdjustMode,
} from '../types'

/** Build the action-variant body for POST /api/user/manage. */
export function buildManageActionPayload(
  id: number,
  action: ManageAction
): ManageUserPayload {
  return { id, action }
}

/**
 * Build the add_quota-variant body for POST /api/user/manage.
 * Throws on non-finite values and on negative override targets.
 */
export function buildQuotaAdjustPayload(
  id: number,
  mode: QuotaAdjustMode,
  value: number
): AdjustUserQuotaPayload {
  if (!Number.isFinite(value)) {
    throw new Error('Quota value must be a finite number')
  }
  if (mode === 'override' && value < 0) {
    throw new Error('Override quota must not be negative')
  }
  return { id, action: 'add_quota', mode, value }
}
