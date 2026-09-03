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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { formatLogQuota } from '@/lib/format'

import { fetchUsageLogStat } from '../api'
import { buildUsageLogStatQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import { formatRateStat } from '../lib/stat-format'

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 sharp-card border-zinc-800">
      <div>
        <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
          {t('Total Quota')}
        </p>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-light text-white mono">
            {isPending ? '…' : formatLogQuota(data?.quota ?? 0)}
          </span>
        </div>
      </div>
      <div>
        <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
          {t('RPM')}
        </p>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-light text-white mono">
            {isPending ? '…' : formatRateStat(data?.rpm)}
          </span>
        </div>
      </div>
      <div>
        <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
          {t('TPM')}
        </p>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-light text-white mono">
            {isPending ? '…' : formatRateStat(data?.tpm)}
          </span>
        </div>
      </div>
    </div>
  )
}
