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

import type { UsageLogsSectionId } from './types'

export type UsageLogsSection = {
  id: UsageLogsSectionId
  labelKey: string
}

/** Section tabs in display order; `common` is the default section. */
export const USAGE_LOGS_SECTIONS: readonly UsageLogsSection[] = [
  { id: 'common', labelKey: 'Common Logs' },
  { id: 'drawing', labelKey: 'Drawing Logs' },
  { id: 'task', labelKey: 'Task Logs' },
]

export const USAGE_LOGS_DEFAULT_SECTION: UsageLogsSectionId = 'common'

export function isUsageLogsSectionId(
  value: string
): value is UsageLogsSectionId {
  return USAGE_LOGS_SECTIONS.some((section) => section.id === value)
}

export function getUsageLogsSection(
  sectionId: UsageLogsSectionId
): UsageLogsSection {
  return (
    USAGE_LOGS_SECTIONS.find((section) => section.id === sectionId) ??
    USAGE_LOGS_SECTIONS[0]
  )
}

/**
 * Resolve the section route base path from the current location pathname so
 * the same page works under both `/usage-logs` and `/admin/usage-logs`.
 */
export function getUsageLogsBasePath(pathname: string): string {
  if (
    pathname === '/admin/usage-logs' ||
    pathname.startsWith('/admin/usage-logs/')
  ) {
    return '/admin/usage-logs'
  }
  return '/usage-logs'
}
