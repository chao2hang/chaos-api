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
import { createFileRoute, redirect } from '@tanstack/react-router'

import { UsageLogs } from '@/features/usage-logs'
import {
  usageLogsSearchSchema,
  type UsageLogsSearch,
} from '@/features/usage-logs/lib/search-schema'
import {
  isUsageLogsSectionId,
  USAGE_LOGS_DEFAULT_SECTION,
} from '@/features/usage-logs/section-registry'

function AdminUsageLogsSectionPage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const patchSearch = (build: (prev: UsageLogsSearch) => UsageLogsSearch) => {
    void navigate({ search: (prev) => ({ ...prev, ...build(prev) }) })
  }
  const section = isUsageLogsSectionId(params.section)
    ? params.section
    : USAGE_LOGS_DEFAULT_SECTION
  return <UsageLogs section={section} search={search} patchSearch={patchSearch} />
}

export const Route = createFileRoute(
  '/_authenticated/admin/usage-logs/$section'
)({
  beforeLoad: ({ params }) => {
    if (!isUsageLogsSectionId(params.section)) {
      throw redirect({
        to: '/admin/usage-logs/$section',
        params: { section: USAGE_LOGS_DEFAULT_SECTION },
      })
    }
  },
  validateSearch: usageLogsSearchSchema,
  component: AdminUsageLogsSectionPage,
})
