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
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { USAGE_LOGS_SECTIONS } from '../section-registry'
import type { UsageLogsSectionId } from '../types'

type SectionTabsProps = {
  section: UsageLogsSectionId
  /** Base path derived from the current route (`/usage-logs` or `/admin/usage-logs`). */
  basePath: string
}

/**
 * Industrial section switcher for the usage logs page.
 */
export function SectionTabs(props: SectionTabsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const to =
    props.basePath === '/admin/usage-logs'
      ? ('/admin/usage-logs/$section' as const)
      : ('/usage-logs/$section' as const)

  const handleValueChange = (value: string) => {
    if (value === props.section) {
      return
    }
    void navigate({ to, params: { section: value }, search: {} })
  }

  return (
    <div className="flex space-x-6 border-b border-zinc-800 pb-2 text-xs mono uppercase">
      {USAGE_LOGS_SECTIONS.map((section) => {
        const active = section.id === props.section
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => handleValueChange(section.id)}
            className={cn(
              'pb-2 transition-colors cursor-pointer',
              active
                ? 'text-white border-b-2 border-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t(section.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
