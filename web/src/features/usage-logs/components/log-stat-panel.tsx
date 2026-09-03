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
import { KPICard } from '@chaos_team/chaos-ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { fetchUsageLogStat } from '../api'
import { buildUsageLogStatQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import { formatRateStat } from '../lib/stat-format'
import { formatLogQuota } from '@/lib/format'

type LogStatPanelProps = {
  search: UsageLogsSearch
  admin: boolean
}

/** Quota / RPM / TPM summary cards for the current common-log filters. */
export function LogStatPanel(props: LogStatPanelProps) {
  const { t } = useTranslation()
  const params = buildUsageLogStatQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'stat', props.admin, params],
    queryFn: () => fetchUsageLogStat(props.admin, params),
    placeholderData: (previous) => previous,
  })

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
      <KPICard
        size='sm'
        item={{ label: t('Total Quota'), value: isPending ? '…' : formatLogQuota(data?.quota ?? 0) }}
      />
      <KPICard
        size='sm'
        item={{ label: t('RPM'), value: isPending ? '…' : formatRateStat(data?.rpm) }}
      />
      <KPICard
        size='sm'
        item={{ label: t('TPM'), value: isPending ? '…' : formatRateStat(data?.tpm) }}
      />
    </div>
  )
}
