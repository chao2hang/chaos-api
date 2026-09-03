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

import {
  formatLogQuota,
  formatNumber,
  formatTimestampToDate,
  formatUseTime,
} from '@/lib/format'

import { fetchUsageLogs } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { buildUsageLogQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import type { UsageLog, UsageLogsSearchPatcher } from '../types'
import { CopyableText } from './copyable-text'
import { LogTypeBadge } from './log-type-badge'

type CommonLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

/** Server-paginated industrial table for common usage logs (`/api/log[/self]`). */
export function CommonLogsTable(props: CommonLogsTableProps) {
  const { t } = useTranslation()

  const params = buildUsageLogQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'list', props.admin, params],
    queryFn: () => fetchUsageLogs(props.admin, params),
    placeholderData: (previous) => previous,
  })

  const items: UsageLog[] = data?.items ?? []
  const total = data?.total ?? 0
  const currentPage = props.search.page ?? 1
  const pageSize = props.search.pageSize ?? DEFAULT_PAGE_SIZE
  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (nextPage: number) => {
    props.patchSearch((prev) => ({
      ...prev,
      page: nextPage <= 1 ? undefined : nextPage,
    }))
  }

  return (
    <div className="w-full border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <div className="w-full overflow-x-auto admin-no-scrollbar">
        <table className="w-full text-left text-xs mono whitespace-nowrap">
          <thead className="bg-zinc-900 text-zinc-500 uppercase border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-medium">{t('Time')}</th>
              {props.admin && (
                <>
                  <th className="py-3 px-4 font-medium">{t('Channel')}</th>
                  <th className="py-3 px-4 font-medium">{t('Username')}</th>
                </>
              )}
              <th className="py-3 px-4 font-medium">{t('Token Name')}</th>
              <th className="py-3 px-4 font-medium">{t('Type')}</th>
              <th className="py-3 px-4 font-medium">{t('Model')}</th>
              <th className="py-3 px-4 font-medium">{t('Use Time')}</th>
              <th className="py-3 px-4 font-medium">{t('Prompt Tokens')}</th>
              <th className="py-3 px-4 font-medium">{t('Completion Tokens')}</th>
              <th className="py-3 px-4 font-medium">{t('Quota')}</th>
              <th className="py-3 px-4 font-medium">{t('Request ID')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {isPending ? (
              <tr>
                <td
                  colSpan={props.admin ? 11 : 9}
                  className="py-12 text-center text-zinc-600 mono"
                >
                  {t('Loading...')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={props.admin ? 11 : 9}
                  className="py-12 text-center text-zinc-600 mono"
                >
                  {t('No logs found')}
                </td>
              </tr>
            ) : (
              items.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-3.5 px-4 text-zinc-500">
                    {formatTimestampToDate(record.created_at)}
                  </td>
                  {props.admin && (
                    <>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {record.channel_name
                          ? `#${record.channel} ${record.channel_name}`
                          : record.channel > 0
                            ? `#${record.channel}`
                            : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {record.username || '-'}
                      </td>
                    </>
                  )}
                  <td className="py-3.5 px-4 text-zinc-400">
                    {record.token_name || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <LogTypeBadge log={record} />
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white max-w-[180px] truncate">
                    {record.model_name || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {formatUseTime(record.use_time)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {formatNumber(record.prompt_tokens)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {formatNumber(record.completion_tokens)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 font-medium">
                    {formatLogQuota(record.quota)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500">
                    <CopyableText text={record.request_id} displayLength={10} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 极简工业风底部分页 */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-zinc-800 bg-[#0c0c0c] text-xs mono text-zinc-500 gap-3">
        <div>
          PAGE <span className="text-white">{currentPage}</span> OF{' '}
          <span className="text-white">{totalPages || 1}</span> ({total} TOTAL)
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={currentPage <= 1 || isPending}
            onClick={() => handlePageChange(currentPage - 1)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            PREV
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || isPending}
            onClick={() => handlePageChange(currentPage + 1)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  )
}
