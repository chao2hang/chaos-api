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
import { Tag } from 'lucide-react'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@chaos_team/chaos-ui'

import { formatCurrencyUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getChannelTypeLabel } from '../constants'
import { formatResponseTime, summarizeModels } from '../lib/format'
import type { Channel } from '../types'
import { ChannelRowActions } from './channel-row-actions'

function getStatusLabel(status: number): string {
  if (status === 1) {
    return 'Active'
  }
  if (status === 3) {
    return 'Down'
  }
  return 'Disabled'
}

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
  onQueryBalance: (channel: Channel) => void
  onManageKeys?: (channel: Channel) => void
  onOllamaModels?: (channel: Channel) => void
  onCodexUsage?: (channel: Channel) => void
  onUpstreamUpdates?: (channel: Channel) => void
  /** Tag-mode rendering: one aggregated row per tag. */
  tagMode?: boolean
  onTagStatus?: (tag: string, status: number) => void
}

/**
 * Tag-mode table: one aggregated row per tag with group enable/disable
 * actions. The tag-mode endpoint returns the channels of the page's tags
 * flattened, so rows are grouped client-side by tag.
 */
function TagModeTable(props: {
  data: Channel[]
  total: number
  loading: boolean
  onTagStatus: (tag: string, status: number) => void
}) {
  const { t } = useTranslation()
  const groups = new Map<string, Channel[]>()
  for (const channel of props.data) {
    const tag = channel.tag !== '' ? channel.tag : t('Untagged')
    const bucket = groups.get(tag)
    if (bucket) {
      bucket.push(channel)
    } else {
      groups.set(tag, [channel])
    }
  }

  if (props.loading) {
    return (
      <div className='w-full border border-zinc-800 bg-[#0a0a0a] py-12 text-center text-zinc-600 mono text-xs'>
        {t('Loading...')}
      </div>
    )
  }
  if (groups.size === 0) {
    return (
      <div className='w-full border border-zinc-800 bg-[#0a0a0a] py-12 text-center text-zinc-600 mono text-xs'>
        {t('No channels found')}
      </div>
    )
  }

  return (
    <div className='w-full border border-zinc-800 bg-[#0a0a0a] overflow-x-auto admin-no-scrollbar'>
      <table className='w-full text-left text-xs mono whitespace-nowrap'>
        <thead className='bg-zinc-900 text-zinc-500 uppercase border-b border-zinc-800'>
          <tr>
            <th className='py-3 px-4 font-medium'>{t('Tag')}</th>
            <th className='py-3 px-4 font-medium'>{t('Channels')}</th>
            <th className='py-3 px-4 font-medium'>{t('Enabled')}</th>
            <th className='py-3 px-4 font-medium'>{t('Disabled')}</th>
            <th className='py-3 px-4 font-medium'>{t('Models')}</th>
            <th className='py-3 px-4 font-medium text-right'>{t('Actions')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-zinc-900 text-zinc-300'>
          {[...groups.entries()].map(([tag, channels]) => {
            const enabledCount = channels.filter(
              (channel) => channel.status === 1
            ).length
            return (
              <tr key={tag} className='hover:bg-zinc-900/50 transition-colors'>
                <td className='py-3 px-4 font-medium text-white'>
                  <Tag className='size-3 inline-block me-1 text-zinc-500' />
                  {tag}
                </td>
                <td className='py-3 px-4 tabular-nums'>{channels.length}</td>
                <td className='py-3 px-4 tabular-nums text-emerald-500'>
                  {enabledCount}
                </td>
                <td className='py-3 px-4 tabular-nums text-zinc-500'>
                  {channels.length - enabledCount}
                </td>
                <td className='py-3 px-4 max-w-[280px] truncate text-zinc-400'>
                  {summarizeModels(
                    channels.map((channel) => channel.models).join(',')
                  ).display || '-'}
                </td>
                <td className='py-3 px-4 text-right'>
                  <span className='inline-flex items-center gap-1'>
                    <Button
                      variant='ghost'
                      size='xs'
                      disabled={enabledCount === channels.length}
                      onClick={() => props.onTagStatus(tag, 1)}
                      className='mono text-xs'
                    >
                      {t('Enable')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='xs'
                      disabled={enabledCount === 0}
                      onClick={() => props.onTagStatus(tag, 2)}
                      className='mono text-xs'
                    >
                      {t('Disable')}
                    </Button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className='mono text-xs text-zinc-600 px-4 py-2'>
        {t('{{count}} tags', { count: props.total })}
      </p>
    </div>
  )
}

/**
 * Hardcore industrial channels table conforming to the prototype:
 * sharp border (#262626 / border-zinc-800), monospace typography,
 * uppercase headers, .status-tag badges, and minimalist pagination.
 */
export function ChannelsTable(props: ChannelsTableProps) {
  if (props.tagMode) {
    return (
      <TagModeTable
        data={props.data}
        total={props.total}
        loading={props.loading}
        onTagStatus={(tag, status) => props.onTagStatus?.(tag, status)}
      />
    )
  }
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
            {(() => {
              if (props.loading) {
                return (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-600 mono">
                      {t('Loading...')}
                    </td>
                  </tr>
                )
              }
              if (props.data.length === 0) {
                return (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-600 mono">
                      {t('No channels found')}
                    </td>
                  </tr>
                )
              }
              return props.data.map((channel) => {
                const isSelected = props.selectedIds.includes(channel.id)
                const isEnabled = channel.status === 1
                const isAutoDisabled = channel.status === 3
                const modelsSummary = summarizeModels(channel.models)
                const statusText = getStatusLabel(channel.status)

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
                      {channel.status_reason ? (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex cursor-help items-center" />}>
                            <span
                              className={cn(
                                'status-tag',
                                isEnabled && 'text-emerald-500',
                                isAutoDisabled && 'text-red-500',
                                !isEnabled && !isAutoDisabled && 'text-zinc-500'
                              )}
                            >
                              {statusText}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs break-words text-xs">
                            {channel.status_reason}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span
                          className={cn(
                            'status-tag',
                            isEnabled && 'text-emerald-500',
                            isAutoDisabled && 'text-red-500',
                            !isEnabled && !isAutoDisabled && 'text-zinc-500'
                          )}
                        >
                          {statusText}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {formatResponseTime(channel.response_time)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              disabled={props.actionPending}
                              aria-label={t('Click to query balance')}
                              className="cursor-pointer tabular-nums text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => props.onQueryBalance(channel)}
                            >
                              {formatCurrencyUSD(channel.balance)}
                            </button>
                          }
                        />
                        <TooltipContent side="top">
                          {t('Click to query balance')}
                        </TooltipContent>
                      </Tooltip>
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
                        onManageKeys={props.onManageKeys}
                        onOllamaModels={props.onOllamaModels}
                        onCodexUsage={props.onCodexUsage}
                        onUpstreamUpdates={props.onUpstreamUpdates}
                      />
                    </td>
                  </tr>
                )
              })
            })()}
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
