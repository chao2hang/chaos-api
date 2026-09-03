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

import { formatTimestampToDate } from '@/lib/format'

import { fetchMjLogs } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { buildDrawingLogQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import type { MidjourneyLog, UsageLogsSearchPatcher } from '../types'
import { LogStatusTag } from './log-status-tag'

type DrawingLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

/** Server-paginated industrial table for drawing (Midjourney) logs (`/api/mj[/self]`). */
export function DrawingLogsTable(props: DrawingLogsTableProps) {
  const { t } = useTranslation()

  const params = buildDrawingLogQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'mj', props.admin, params],
    queryFn: () => fetchMjLogs(props.admin, params),
    placeholderData: (previous) => previous,
  })

  const items: MidjourneyLog[] = data?.items ?? []
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
              <th className="py-3 px-4 font-medium">{t('MJ ID')}</th>
              {props.admin && (
                <>
                  <th className="py-3 px-4 font-medium">{t('Channel')}</th>
                  <th className="py-3 px-4 font-medium">{t('Username')}</th>
                </>
              )}
              <th className="py-3 px-4 font-medium">{t('Action')}</th>
              <th className="py-3 px-4 font-medium">{t('Status')}</th>
              <th className="py-3 px-4 font-medium">{t('Progress')}</th>
              <th className="py-3 px-4 font-medium">{t('Prompt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {isPending ? (
              <tr>
                <td
                  colSpan={props.admin ? 8 : 6}
                  className="py-12 text-center text-zinc-600 mono"
                >
                  {t('Loading...')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={props.admin ? 8 : 6}
                  className="py-12 text-center text-zinc-600 mono"
                >
                  {t('No drawing logs found')}
                </td>
              </tr>
            ) : (
              items.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-3.5 px-4 text-zinc-500">
                    {formatTimestampToDate(record.submit_time)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">{record.mj_id || '-'}</td>
                  {props.admin && (
                    <>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {record.channel_id > 0 ? `#${record.channel_id}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {record.user_id ? `#${record.user_id}` : '-'}
                      </td>
                    </>
                  )}
                  <td className="py-3.5 px-4 font-medium text-white">
                    {record.action || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <LogStatusTag status={record.status} />
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {record.progress || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 max-w-[240px] truncate">
                    {record.prompt || record.prompt_en || '-'}
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
