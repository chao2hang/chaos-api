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
import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AdminPage } from '@/components/admin/admin-page'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { CommonLogsFilterBar } from './components/common-logs-filter-bar'
import { CommonLogsTable } from './components/common-logs-table'
import { DrawingLogsTable } from './components/drawing-logs-table'
import { LogStatPanel } from './components/log-stat-panel'
import { SectionTabs } from './components/section-tabs'
import { SimpleLogsFilterBar } from './components/simple-logs-filter-bar'
import { TaskLogsTable } from './components/task-logs-table'
import { getUsageLogsBasePath, getUsageLogsSection } from './section-registry'
import type { UsageLogsSectionId, UsageLogsSearchPatcher } from './types'
import type { UsageLogsSearch } from './lib/search-schema'

type UsageLogsProps = {
  section: UsageLogsSectionId
  search: UsageLogsSearch
  /** Route-bound URL search patcher provided by the active route file. */
  patchSearch: UsageLogsSearchPatcher
}

type SectionProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

/**
 * Usage logs page, shared by `/usage-logs` and `/admin/usage-logs`. Admins
 * (role >= ROLE.ADMIN) query the admin endpoints, regular users get the
 * self variants of the same endpoints automatically.
 */
export function UsageLogs(props: UsageLogsProps) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const basePath = getUsageLogsBasePath(pathname)
  const user = useAuthStore((state) => state.auth.user)
  const admin = (user?.role ?? 0) >= ROLE.ADMIN
  const sectionMeta = getUsageLogsSection(props.section)
  const sectionProps: SectionProps = {
    search: props.search,
    admin,
    patchSearch: props.patchSearch,
  }

  return (
    <AdminPage title={t('Usage Logs')} description={t(sectionMeta.labelKey)}>
      <SectionTabs section={props.section} basePath={basePath} />
      {props.section === 'common' ? <CommonLogsSection {...sectionProps} /> : null}
      {props.section === 'drawing' ? <DrawingLogsSection {...sectionProps} /> : null}
      {props.section === 'task' ? <TaskLogsSection {...sectionProps} /> : null}
    </AdminPage>
  )
}

function CommonLogsSection(props: SectionProps) {
  return (
    <>
      <LogStatPanel search={props.search} admin={props.admin} />
      <CommonLogsFilterBar
        search={props.search}
        admin={props.admin}
        patchSearch={props.patchSearch}
      />
      <CommonLogsTable
        search={props.search}
        admin={props.admin}
        patchSearch={props.patchSearch}
      />
    </>
  )
}

function DrawingLogsSection(props: SectionProps) {
  const { t } = useTranslation()
  return (
    <>
      <SimpleLogsFilterBar
        search={props.search}
        admin={props.admin}
        filterLabel={t('MJ ID')}
        patchSearch={props.patchSearch}
      />
      <DrawingLogsTable
        search={props.search}
        admin={props.admin}
        patchSearch={props.patchSearch}
      />
    </>
  )
}

function TaskLogsSection(props: SectionProps) {
  const { t } = useTranslation()
  return (
    <>
      <SimpleLogsFilterBar
        search={props.search}
        admin={props.admin}
        filterLabel={t('Task ID')}
        patchSearch={props.patchSearch}
      />
      <TaskLogsTable
        search={props.search}
        admin={props.admin}
        patchSearch={props.patchSearch}
      />
    </>
  )
}
