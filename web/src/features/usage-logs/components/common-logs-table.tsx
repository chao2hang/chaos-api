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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'

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

function parseCachedTokens(otherStr?: string): number {
  if (!otherStr) return 0
  try {
    const parsed = JSON.parse(otherStr)
    const val = parsed.cache_tokens ?? parsed.cached_tokens ?? parsed.cache_hit_tokens ?? 0
    return typeof val === 'number' && !Number.isNaN(val) ? val : 0
  } catch {
    return 0
  }
}

function calculateTokensPerSecond(record: UsageLog): string | null {
  // 1. Generation speed (Completion TPS): completion_tokens / output_duration
  // If streaming and first-response-time (frt) exists: output_duration = use_time - frt
  if (record.completion_tokens > 0) {
    let durationSec = record.use_time > 0 ? record.use_time : 0
    if (record.other) {
      try {
        const parsed = JSON.parse(record.other)
        if (typeof parsed.use_time_ms === 'number' && parsed.use_time_ms > 0) {
          const totalMs = parsed.use_time_ms
          const frtMs = typeof parsed.frt === 'number' && parsed.frt > 0 && parsed.frt < totalMs ? parsed.frt : 0
          const genMs = totalMs - frtMs
          if (genMs > 100) {
            durationSec = genMs / 1000
          }
        }
      } catch {
        // ignore
      }
    }
    const safeDuration = durationSec > 0.1 ? durationSec : 1
    const tps = record.completion_tokens / safeDuration
    return tps >= 100 ? Math.round(tps).toString() : tps.toFixed(1)
  }

  // 2. Fallback to total tokens / total duration
  const totalTokens = (record.prompt_tokens || 0) + (record.completion_tokens || 0)
  if (totalTokens <= 0) return null
  const durationSec = record.use_time > 0 ? record.use_time : 1
  const tps = totalTokens / durationSec
  return tps >= 100 ? Math.round(tps).toString() : tps.toFixed(1)
}

type CommonLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

function getChannelDisplay(channelName: string, channelId: number): string {
  if (channelName) {
    return `#${channelId} ${channelName}`
  }
  if (channelId > 0) {
    return `#${channelId}`
  }
  return '-'
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

  const renderTableRows = () => {
    if (isPending) {
      return (
        <tr>
          <td
            colSpan={props.admin ? 12 : 10}
            className="py-12 text-center text-zinc-600 mono"
          >
            {t('Loading...')}
          </td>
        </tr>
      )
    }
    if (items.length === 0) {
      return (
        <tr>
          <td
            colSpan={props.admin ? 12 : 10}
            className="py-12 text-center text-zinc-600 mono"
          >
            {t('No logs found')}
          </td>
        </tr>
      )
    }
    return items.map((record) => (
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
              {getChannelDisplay(record.channel_name, record.channel)}
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
        <td className="py-3.5 px-4 text-zinc-300">
          {(() => {
            const tps = calculateTokensPerSecond(record)
            if (tps == null) {
              return <span className="text-zinc-500">-</span>
            }
            const cachedTokens = parseCachedTokens(record.other)
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-help font-medium underline decoration-zinc-700 underline-offset-4 decoration-dotted" />}>
                    {tps}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="space-y-1 text-xs mono">
                    <div>
                      <span className="text-zinc-400">{t('Prompt Tokens:')} </span>
                      <span className="text-white font-medium">{formatNumber(record.prompt_tokens)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">{t('Completion Tokens:')} </span>
                      <span className="text-white font-medium">{formatNumber(record.completion_tokens)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">{t('Cached Tokens:')} </span>
                      <span className="text-white font-medium">{formatNumber(cachedTokens)}</span>
                    </div>
                    <div className="pt-1 border-t border-zinc-800 text-[11px] text-zinc-400">
                      <span>{t('Total Tokens:')} </span>
                      <span className="text-white font-medium">{formatNumber((record.prompt_tokens || 0) + (record.completion_tokens || 0))}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })()}
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
              <th className="py-3 px-4 font-medium">Token/s</th>
              <th className="py-3 px-4 font-medium">{t('Prompt Tokens')}</th>
              <th className="py-3 px-4 font-medium">{t('Completion Tokens')}</th>
              <th className="py-3 px-4 font-medium">{t('Quota')}</th>
              <th className="py-3 px-4 font-medium">{t('Request ID')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {renderTableRows()}
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
