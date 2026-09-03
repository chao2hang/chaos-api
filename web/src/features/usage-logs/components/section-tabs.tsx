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
import { Tabs, TabsList, TabsTrigger } from '@chaos_team/chaos-ui'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { USAGE_LOGS_SECTIONS } from '../section-registry'
import type { UsageLogsSectionId } from '../types'

type SectionTabsProps = {
  section: UsageLogsSectionId
  /** Base path derived from the current route (`/usage-logs` or `/admin/usage-logs`). */
  basePath: string
}

/**
 * Section switcher for the usage logs page. Switching sections resets the
 * search params so each section starts from its default filter state.
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
    <Tabs value={props.section} onValueChange={handleValueChange}>
      <TabsList variant='default'>
        {USAGE_LOGS_SECTIONS.map((section) => (
          <TabsTrigger key={section.id} value={section.id}>
            {t(section.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
