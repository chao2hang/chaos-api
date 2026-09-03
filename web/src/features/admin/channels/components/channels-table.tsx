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

import { useTranslation } from 'react-i18next'

import { formatCurrencyUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getChannelTypeLabel } from '../constants'
import { formatResponseTime, summarizeModels } from '../lib/format'
import type { Channel } from '../types'
import { ChannelRowActions } from './channel-row-actions'

export interface ChannelsTableProps {
  data: Channel[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  actionPending: boolean
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (channel: Channel) => void
  onToggleStatus: (channel: Channel) => void
  onTest: (channel: Channel) => void
  onCopy: (channel: Channel) => void
  onDelete: (channel: Channel) => void
}

/**
 * Hardcore industrial channels table conforming to the prototype:
 * sharp border (#262626 / border-zinc-800), monospace typography,
 * uppercase headers, .status-tag badges, and minimalist pagination.
 */
export function ChannelsTable(props: ChannelsTableProps) {
  const { t } = useTranslation()

  const allSelected =
    props.data.length > 0 &&
    props.data.every((item) => props.selectedIds.includes(item.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      props.onSelectionChange([])
    } else {
      props.onSelectionChange(props.data.map((item) => item.id))
    }
  }

  const toggleSelectOne = (id: number) => {
    if (props.selectedIds.includes(id)) {
      props.onSelectionChange(props.selectedIds.filter((item) => item !== id))
    } else {
      props.onSelectionChange([...props.selectedIds, id])
    }
  }

  const totalPages = Math.ceil(props.total / props.pageSize)

  return (
    <div className="w-full border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <div className="w-full overflow-x-auto admin-no-scrollbar">
        <table className="w-full text-left text-xs mono whitespace-nowrap">
          <thead className="bg-zinc-900 text-zinc-500 uppercase border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label={t('Select all')}
                  className="rounded-none accent-white cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 font-medium">{t('ID')}</th>
              <th className="py-3 px-4 font-medium">{t('Name')}</th>
              <th className="py-3 px-4 font-medium">{t('Type')}</th>
              <th className="py-3 px-4 font-medium">{t('Status')}</th>
              <th className="py-3 px-4 font-medium">{t('Response Time')}</th>
              <th className="py-3 px-4 font-medium">{t('Balance')}</th>
              <th className="py-3 px-4 font-medium">{t('Priority')}</th>
              <th className="py-3 px-4 font-medium">{t('Weight')}</th>
              <th className="py-3 px-4 font-medium">{t('Models')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {props.loading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-zinc-600 mono">
                  {t('Loading...')}
                </td>
              </tr>
            ) : props.data.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-zinc-600 mono">
                  {t('No channels found')}
                </td>
              </tr>
            ) : (
              props.data.map((channel) => {
                const isSelected = props.selectedIds.includes(channel.id)
                const isEnabled = channel.status === 1
                const isAutoDisabled = channel.status === 3
                const modelsSummary = summarizeModels(channel.models)

                return (
                  <tr
                    key={channel.id}
                    className={cn(
                      'hover:bg-zinc-900/50 transition-colors',
                      isSelected && 'bg-zinc-900/30'
                    )}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(channel.id)}
                        aria-label={`Select channel ${channel.name}`}
                        className="rounded-none accent-white cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">{channel.id}</td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-[200px] truncate">
                      {channel.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {getChannelTypeLabel(channel.type)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'status-tag',
                          isEnabled && 'text-emerald-500',
                          isAutoDisabled && 'text-red-500',
                          !isEnabled && !isAutoDisabled && 'text-zinc-500'
                        )}
                      >
                        {isEnabled ? 'Active' : isAutoDisabled ? 'Down' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {formatResponseTime(channel.response_time)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {formatCurrencyUSD(channel.balance)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">{channel.priority}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{channel.weight}</td>
                    <td className="py-3.5 px-4 text-zinc-400 max-w-[220px] truncate">
                      {modelsSummary.display || '-'}
                      {modelsSummary.extra > 0 && (
                        <span className="text-zinc-600"> +{modelsSummary.extra}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ChannelRowActions
                        channel={channel}
                        disabled={props.actionPending}
                        onEdit={props.onEdit}
                        onToggleStatus={props.onToggleStatus}
                        onTest={props.onTest}
                        onCopy={props.onCopy}
                        onDelete={props.onDelete}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 极简工业风底部分页 */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-zinc-800 bg-[#0c0c0c] text-xs mono text-zinc-500 gap-3">
        <div>
          PAGE <span className="text-white">{props.page}</span> OF{' '}
          <span className="text-white">{totalPages || 1}</span> ({props.total} TOTAL)
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={props.page <= 1 || props.loading}
            onClick={() => props.onPageChange(props.page - 1, props.pageSize)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            PREV
          </button>
          <button
            type="button"
            disabled={props.page >= totalPages || props.loading}
            onClick={() => props.onPageChange(props.page + 1, props.pageSize)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  )
}
