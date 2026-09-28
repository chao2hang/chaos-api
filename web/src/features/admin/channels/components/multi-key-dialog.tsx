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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@chaos_team/chaos-ui'

import { manageMultiKeys } from '../api'
import type { Channel } from '../types'

const PAGE_SIZE = 20

/** Row actions of one multi-key entry. */
function KeyStatusLabel(props: { status: number }) {
  const { t } = useTranslation()
  if (props.status === 1) {
    return <span className='text-emerald-500'>{t('Enabled')}</span>
  }
  if (props.status === 3) {
    return <span className='text-red-500'>{t('Auto disabled')}</span>
  }
  return <span className='text-zinc-500'>{t('Disabled')}</span>
}

function KeyRowActions(props: {
  channelId: number
  index: number
  enabled: boolean
  onAction: (action: 'enable_key' | 'disable_key' | 'delete_key') => void
  pending: boolean
}) {
  const { t } = useTranslation()
  return (
    <span className='flex items-center gap-1'>
      {props.enabled ? (
        <Button
          variant='ghost'
          size='xs'
          disabled={props.pending}
          onClick={() => props.onAction('disable_key')}
        >
          {t('Disable')}
        </Button>
      ) : (
        <Button
          variant='ghost'
          size='xs'
          disabled={props.pending}
          onClick={() => props.onAction('enable_key')}
        >
          {t('Enable')}
        </Button>
      )}
      <Button
        variant='ghost'
        size='xs'
        disabled={props.pending}
        className='text-red-500 hover:text-red-400'
        onClick={() => props.onAction('delete_key')}
      >
        {t('Delete')}
      </Button>
    </span>
  )
}

/**
 * Multi-key management dialog: paginated key list with per-key and bulk
 * actions (POST /api/channel/multi_key/manage).
 */
export function MultiKeyDialog(props: {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const open = props.channel !== null
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
  }

  const statusQuery = useQuery({
    queryKey: [
      'admin',
      'channels',
      'multi-key-status',
      props.channel?.id,
      page,
      statusFilter,
    ],
    enabled: open,
    queryFn: () => {
      const channel = props.channel
      if (!channel) {
        return Promise.resolve({ success: false, message: '' })
      }
      return manageMultiKeys({
        channel_id: channel.id,
        action: 'get_key_status',
        page,
        page_size: PAGE_SIZE,
        status:
          statusFilter === 'all'
            ? undefined
            : Number(statusFilter),
      })
    },
  })

  const action = useMutation({
    mutationFn: (input: {
      action: 'enable_key' | 'disable_key' | 'delete_key' | 'delete_disabled_keys'
      key_index?: number
    }) =>
      manageMultiKeys({
        channel_id: props.channel?.id ?? 0,
        action: input.action,
        key_index: input.key_index,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Multi-key action failed'))
        return
      }
      toast.success(t('Multi-key action completed'))
      invalidate()
      void statusQuery.refetch()
    },
  })

  const runAction = (
    input: Parameters<typeof action.mutate>[0],
    confirm?: string
  ) => {
    if (action.isPending) return
    if (confirm && !window.confirm(confirm)) return
    action.mutate(input)
  }

  const data = statusQuery.data?.data
  const keys = data?.keys ?? []

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Multi-key management')}
            {props.channel ? ` · ${props.channel.name}` : ''}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t(
              'Enable, disable or delete individual keys of this channel.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center justify-between gap-2'>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(String(value ?? 'all'))
              setPage(1)
            }}
          >
            <SelectTrigger
              size='sm'
              className='w-36 mono text-xs rounded-none bg-[#0a0a0a] border-zinc-800'
              aria-label={t('Key status filter')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-none border-zinc-800 bg-[#0a0a0a]'>
              <SelectItem value='all'>{t('All keys')}</SelectItem>
              <SelectItem value='1'>{t('Enabled keys')}</SelectItem>
              <SelectItem value='2'>{t('Manually disabled')}</SelectItem>
              <SelectItem value='3'>{t('Auto disabled')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            size='sm'
            disabled={action.isPending}
            onClick={() =>
              runAction(
                { action: 'delete_disabled_keys' },
                t('Delete all disabled keys of this channel?')
              )
            }
            className='mono text-xs'
          >
            {t('Delete disabled keys')}
          </Button>
        </div>

        <div className='mono text-xs text-zinc-400 flex gap-4'>
          <span>
            {t('Enabled')}: {data?.enabled_count ?? '-'}
          </span>
          <span>
            {t('Manually disabled')}: {data?.manual_disabled_count ?? '-'}
          </span>
          <span>
            {t('Auto disabled')}: {data?.auto_disabled_count ?? '-'}
          </span>
        </div>

        <div className='border border-zinc-800'>
          <table className='w-full text-left text-xs mono'>
            <thead className='bg-zinc-900 text-zinc-500 uppercase'>
              <tr>
                <th className='py-2 px-3'>#</th>
                <th className='py-2 px-3'>{t('Key')}</th>
                <th className='py-2 px-3'>{t('Status')}</th>
                <th className='py-2 px-3'>{t('Reason')}</th>
                <th className='py-2 px-3 text-right'>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-900 text-zinc-300'>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className='py-6 text-center text-zinc-600'>
                    {statusQuery.isPending ? t('Loading...') : t('No keys found')}
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.index}>
                    <td className='py-2 px-3 tabular-nums'>{key.index + 1}</td>
                    <td className='py-2 px-3'>{key.key_preview}…</td>
                    <td className='py-2 px-3'>
                      <KeyStatusLabel status={key.status} />
                    </td>
                    <td className='py-2 px-3 max-w-[180px] truncate text-zinc-500'>
                      {key.reason || '-'}
                    </td>
                    <td className='py-2 px-3 text-right'>
                      <KeyRowActions
                        channelId={props.channel?.id ?? 0}
                        index={key.index}
                        enabled={key.status === 1}
                        pending={action.isPending}
                        onAction={(actionName) =>
                          runAction(
                            {
                              action: actionName,
                              key_index: key.index,
                            },
                            actionName === 'delete_key'
                              ? t('Delete this key?')
                              : undefined
                          )
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(data?.total_pages ?? 0) > 1 && (
          <div className='flex items-center justify-between mono text-xs text-zinc-400'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className='mono text-xs'
            >
              {t('Prev')}
            </Button>
            <span>
              {page} / {data?.total_pages}
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= (data?.total_pages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              className='mono text-xs'
            >
              {t('Next')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
