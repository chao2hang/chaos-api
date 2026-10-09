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

import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'
import { ArrowDown, ArrowUp, ChevronsUpDown, Tag } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatCurrencyUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  getChannelTypeLabel,
  type ChannelSortField,
  type ChannelSortOrder,
} from '../constants'
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

function getPageSizeLabel(size: number, t: (key: string) => string): string {
  switch (size) {
    case 10:
      return t('10 / page')
    case 20:
      return t('20 / page')
    case 50:
      return t('50 / page')
    case 100:
      return t('100 / page')
    default:
      return `${size} / page`
  }
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
  /** Active server-side sort column; empty means the backend default order. */
  sortBy?: string
  /** Direction of the active sort ('asc' / 'desc'). */
  sortOrder?: string
  /**
   * Header sort toggle. Clicking cycles desc → asc → backend default.
   * Omitted to render plain, non-interactive headers.
   */
  onSortChange?: (field: ChannelSortField, order: ChannelSortOrder | '') => void
}

/** Next direction in the header click cycle: none → desc → asc → none. */
const NEXT_SORT_ORDER: Record<string, ChannelSortOrder | ''> = {
  '': 'desc',
  desc: 'asc',
  asc: '',
}

/**
 * Table header cell of a server-sortable column: a button cycling through
 * desc/asc/default with a direction indicator, plus `aria-sort` on the th.
 */
function SortableTh(props: {
  label: string
  field: ChannelSortField
  sortBy: string
  sortOrder: string
  onSortChange?: (field: ChannelSortField, order: ChannelSortOrder | '') => void
}) {
  const { t } = useTranslation()
  if (!props.onSortChange) {
    return <th className='px-4 py-3 font-medium'>{t(props.label)}</th>
  }
  const isActive = props.field === props.sortBy
  const order =
    isActive && (props.sortOrder === 'asc' || props.sortOrder === 'desc')
      ? props.sortOrder
      : ''
  let ariaSort: 'ascending' | 'descending' | 'none' = 'none'
  let icon: ReactNode
  if (order === 'asc') {
    ariaSort = 'ascending'
    icon = <ArrowUp className='size-3 text-white' aria-hidden='true' />
  } else if (order === 'desc') {
    ariaSort = 'descending'
    icon = <ArrowDown className='size-3 text-white' aria-hidden='true' />
  } else {
    icon = (
      <ChevronsUpDown className='size-3 text-zinc-600' aria-hidden='true' />
    )
  }
  return (
    <th className='px-4 py-3 font-medium' aria-sort={ariaSort}>
      <button
        type='button'
        onClick={() =>
          props.onSortChange?.(props.field, NEXT_SORT_ORDER[order] ?? 'desc')
        }
        className='inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-zinc-300'
      >
        {t(props.label)}
        {icon}
      </button>
    </th>
  )
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
      <div className='mono w-full border border-zinc-800 bg-[#0a0a0a] py-12 text-center text-xs text-zinc-600'>
        {t('Loading...')}
      </div>
    )
  }
  if (groups.size === 0) {
    return (
      <div className='mono w-full border border-zinc-800 bg-[#0a0a0a] py-12 text-center text-xs text-zinc-600'>
        {t('No channels found')}
      </div>
    )
  }

  return (
    <div className='admin-no-scrollbar w-full overflow-x-auto border border-zinc-800 bg-[#0a0a0a]'>
      <table className='mono w-full text-left text-xs whitespace-nowrap'>
        <thead className='border-b border-zinc-800 bg-zinc-900 text-zinc-500 uppercase'>
          <tr>
            <th className='px-4 py-3 font-medium'>{t('Tag')}</th>
            <th className='px-4 py-3 font-medium'>{t('Channels')}</th>
            <th className='px-4 py-3 font-medium'>{t('Enabled')}</th>
            <th className='px-4 py-3 font-medium'>{t('Disabled')}</th>
            <th className='px-4 py-3 font-medium'>{t('Models')}</th>
            <th className='px-4 py-3 text-right font-medium'>{t('Actions')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-zinc-900 text-zinc-300'>
          {[...groups.entries()].map(([tag, channels]) => {
            const enabledCount = channels.filter(
              (channel) => channel.status === 1
            ).length
            return (
              <tr key={tag} className='transition-colors hover:bg-zinc-900/50'>
                <td className='px-4 py-3 font-medium text-white'>
                  <Tag className='me-1 inline-block size-3 text-zinc-500' />
                  {tag}
                </td>
                <td className='px-4 py-3 tabular-nums'>{channels.length}</td>
                <td className='px-4 py-3 text-emerald-500 tabular-nums'>
                  {enabledCount}
                </td>
                <td className='px-4 py-3 text-zinc-500 tabular-nums'>
                  {channels.length - enabledCount}
                </td>
                <td className='max-w-[280px] truncate px-4 py-3 text-zinc-400'>
                  {summarizeModels(
                    channels.map((channel) => channel.models).join(',')
                  ).display || '-'}
                </td>
                <td className='px-4 py-3 text-right'>
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
      <p className='mono px-4 py-2 text-xs text-zinc-600'>
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
  const { t } = useTranslation()
  const pageSizeOptions = useMemo(
    () =>
      [
        ...new Set(
          [...PAGE_SIZE_OPTIONS, props.pageSize].filter((size) => size > 0)
        ),
      ].sort((a, b) => a - b),
    [props.pageSize]
  )

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

  const sortHeader = (label: string, field: ChannelSortField) => (
    <SortableTh
      label={label}
      field={field}
      sortBy={props.sortBy ?? ''}
      sortOrder={props.sortOrder ?? ''}
      onSortChange={props.onSortChange}
    />
  )

  return (
    <div className='w-full overflow-hidden border border-zinc-800 bg-[#0a0a0a]'>
      <div className='admin-no-scrollbar w-full overflow-x-auto'>
        <table className='mono w-full text-left text-xs whitespace-nowrap'>
          <thead className='border-b border-zinc-800 bg-zinc-900 text-zinc-500 uppercase'>
            <tr>
              <th className='w-10 px-4 py-3'>
                <input
                  type='checkbox'
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label={t('Select all')}
                  className='cursor-pointer rounded-none accent-white'
                />
              </th>
              {sortHeader('ID', 'id')}
              {sortHeader('Name', 'name')}
              <th className='px-4 py-3 font-medium'>{t('Type')}</th>
              <th className='px-4 py-3 font-medium'>{t('Status')}</th>
              {sortHeader('Response Time', 'response_time')}
              {sortHeader('Balance', 'balance')}
              {sortHeader('Priority', 'priority')}
              <th className='px-4 py-3 font-medium'>{t('Weight')}</th>
              <th className='px-4 py-3 font-medium'>{t('Models')}</th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-zinc-900 text-zinc-300'>
            {(() => {
              if (props.loading) {
                return (
                  <tr>
                    <td
                      colSpan={11}
                      className='mono py-12 text-center text-zinc-600'
                    >
                      {t('Loading...')}
                    </td>
                  </tr>
                )
              }
              if (props.data.length === 0) {
                return (
                  <tr>
                    <td
                      colSpan={11}
                      className='mono py-12 text-center text-zinc-600'
                    >
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
                    <td className='px-4 py-3.5'>
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => toggleSelectOne(channel.id)}
                        aria-label={`Select channel ${channel.name}`}
                        className='cursor-pointer rounded-none accent-white'
                      />
                    </td>
                    <td className='px-4 py-3.5 text-zinc-500'>{channel.id}</td>
                    <td className='max-w-[200px] truncate px-4 py-3.5 font-medium text-white'>
                      {channel.name}
                    </td>
                    <td className='px-4 py-3.5 text-zinc-400'>
                      {getChannelTypeLabel(channel.type)}
                    </td>
                    <td className='px-4 py-3.5'>
                      {channel.status_reason ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className='inline-flex cursor-help items-center' />
                            }
                          >
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
                          <TooltipContent
                            side='top'
                            className='max-w-xs text-xs break-words'
                          >
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
                    <td className='px-4 py-3.5 text-zinc-400'>
                      {formatResponseTime(channel.response_time)}
                    </td>
                    <td className='px-4 py-3.5 text-zinc-400'>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type='button'
                              disabled={props.actionPending}
                              aria-label={t('Click to query balance')}
                              className='cursor-pointer text-zinc-400 tabular-nums hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                              onClick={() => props.onQueryBalance(channel)}
                            >
                              {formatCurrencyUSD(channel.balance)}
                            </button>
                          }
                        />
                        <TooltipContent side='top'>
                          {t('Click to query balance')}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className='px-4 py-3.5 text-zinc-400'>
                      {channel.priority}
                    </td>
                    <td className='px-4 py-3.5 text-zinc-400'>
                      {channel.weight}
                    </td>
                    <td className='max-w-[220px] truncate px-4 py-3.5 text-zinc-400'>
                      {modelsSummary.display || '-'}
                      {modelsSummary.extra > 0 && (
                        <span className='text-zinc-600'>
                          {' '}
                          +{modelsSummary.extra}
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3.5 text-right'>
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
      <div className='mono flex flex-col items-center justify-between gap-3 border-t border-zinc-800 bg-[#0c0c0c] px-4 py-3 text-xs text-zinc-500 sm:flex-row'>
        <div className='flex flex-wrap items-center gap-3 sm:gap-4'>
          <div>
            PAGE <span className='text-white'>{props.page}</span> OF{' '}
            <span className='text-white'>{totalPages || 1}</span> ({props.total}{' '}
            TOTAL)
          </div>
          <div className='flex items-center gap-1.5'>
            <span>{t('Rows per page')}:</span>
            <Select
              value={String(props.pageSize)}
              onValueChange={(val) => {
                const nextSize = Number(val)
                if (nextSize > 0 && nextSize !== props.pageSize) {
                  props.onPageChange(1, nextSize)
                }
              }}
              disabled={props.loading}
            >
              <SelectTrigger
                size='sm'
                className='mono h-7 w-28 rounded-none border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-300'
                aria-label={t('Rows per page')}
              >
                <SelectValue>{getPageSizeLabel(props.pageSize, t)}</SelectValue>
              </SelectTrigger>
              <SelectContent className='mono rounded-none border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-300'>
                <SelectGroup>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {getPageSizeLabel(size, t)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <button
            type='button'
            disabled={props.page <= 1 || props.loading}
            onClick={() => props.onPageChange(props.page - 1, props.pageSize)}
            className='btn-industrial-secondary cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-30'
          >
            PREV
          </button>
          <button
            type='button'
            disabled={props.page >= totalPages || props.loading}
            onClick={() => props.onPageChange(props.page + 1, props.pageSize)}
            className='btn-industrial-secondary cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-30'
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  )
}
