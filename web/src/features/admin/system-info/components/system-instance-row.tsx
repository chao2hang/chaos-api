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
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Popconfirm,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampToDate, formatTimestampRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

import { formatBytes } from '../lib/format'
import type { SystemInstance } from '../types'
import { InstanceUsageCell } from './instance-usage-cell'

type SystemInstanceRowProps = {
  instance: SystemInstance
  deleting: boolean
  isDeletingThisRow: boolean
  onDeleteStale: (instance: SystemInstance) => void
}

/** One cluster instance row: identity, status, role, usage and actions. */
export function SystemInstanceRow(props: SystemInstanceRowProps) {
  const { t, i18n } = useTranslation()
  const instance = props.instance
  const resources = instance.info?.resources
  const storage = resources?.storage
  const isMaster = instance.info?.role?.is_master === true
  const isOnline = instance.status === 'online'
  const runtime = instance.info?.runtime

  return (
    <tr className='transition-colors hover:bg-zinc-900/50'>
      <td className='px-4 py-3.5'>
        <div className='flex min-w-0 items-center gap-2'>
          <span
            className={cn(
              'size-1.5 shrink-0',
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            aria-hidden='true'
          />
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <span className='max-w-[180px] truncate font-medium text-white'>
                {instance.info?.node?.name || instance.node_name}
              </span>
              {instance.info?.node?.should_configure_manually === true && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className='inline-flex shrink-0 cursor-help text-amber-500'
                          aria-label={t('Configure NODE_NAME')}
                        />
                      }
                    >
                      <AlertTriangle
                        className='size-3.5'
                        aria-hidden='true'
                      />
                    </TooltipTrigger>
                    <TooltipContent side='top' className='max-w-72'>
                      {t(
                        'This instance is using an automatic hostname. Set NODE_NAME to a stable unique value for multi-instance management.'
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className='mono max-w-[180px] truncate text-[11px] text-zinc-500'>
              {instance.info?.host?.hostname || '-'}
            </div>
          </div>
        </div>
      </td>
      <td className='px-4 py-3.5'>
        <span
          className={cn(
            'status-tag',
            isOnline ? 'text-emerald-500' : 'text-amber-500'
          )}
        >
          {t(instance.status)}
        </span>
      </td>
      <td className='px-4 py-3.5'>
        <span
          className='status-tag text-zinc-400'
          title={
            isMaster
              ? t('Master instances run scheduled background tasks.')
              : t('Worker instances do not run master-only background tasks.')
          }
        >
          {isMaster ? t('Master') : t('Worker')}
        </span>
      </td>
      <td className='px-4 py-3.5'>
        <InstanceUsageCell value={resources?.cpu?.usage_percent} />
      </td>
      <td className='px-4 py-3.5'>
        <InstanceUsageCell value={resources?.memory?.usage_percent} />
      </td>
      <td className='px-4 py-3.5'>
        <InstanceUsageCell
          value={storage?.used_percent}
          tooltip={
            storage ? (
              <div className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs'>
                <span className='text-zinc-500'>{t('Used')}</span>
                <span className='mono'>
                  {formatBytes(storage.used_bytes)}
                </span>
                <span className='text-zinc-500'>{t('Free')}</span>
                <span className='mono'>
                  {formatBytes(storage.free_bytes)}
                </span>
                <span className='text-zinc-500'>{t('Total')}</span>
                <span className='mono'>
                  {formatBytes(storage.total_bytes)}
                </span>
              </div>
            ) : undefined
          }
        />
      </td>
      <td className='mono px-4 py-3.5 text-xs text-zinc-400'>
        {runtime?.version || '-'}
      </td>
      <td className='mono px-4 py-3.5 text-xs text-zinc-400'>
        {runtime?.goos || runtime?.goarch
          ? [runtime.goos, runtime.goarch].filter(Boolean).join('/')
          : '-'}
      </td>
      <td className='mono whitespace-nowrap px-4 py-3.5 text-xs text-zinc-500'>
        {formatTimestampToDate(instance.started_at)}
      </td>
      <td className='mono whitespace-nowrap px-4 py-3.5 text-xs'>
        <span
          className={cn(
            'tabular-nums',
            isOnline ? 'text-zinc-300' : 'text-amber-500'
          )}
          title={formatTimestampToDate(instance.last_seen_at)}
        >
          {formatTimestampRelative(
            instance.last_seen_at,
            'seconds',
            toIntlLocale(i18n.language)
          )}
        </span>
      </td>
      <td className='px-4 py-3.5 text-right'>
        {instance.status === 'stale' ? (
          <Popconfirm
            title={t(
              'Delete stale instance "{{name}}"? If it has reported again, it will not be deleted.',
              { name: instance.node_name }
            )}
            okText={t('Delete')}
            cancelText={t('Cancel')}
            okVariant='destructive'
            onConfirm={() => props.onDeleteStale(instance)}
          >
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={props.deleting}
              aria-label={t('Delete stale instance')}
            >
              {props.isDeletingThisRow ? (
                <Loader2 className='size-4 animate-spin' aria-hidden='true' />
              ) : (
                <Trash2 className='size-4 text-red-500' aria-hidden='true' />
              )}
            </Button>
          </Popconfirm>
        ) : (
          <span className='text-zinc-700'>-</span>
        )}
      </td>
    </tr>
  )
}
