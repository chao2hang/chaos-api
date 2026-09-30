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

import { useMutation } from '@tanstack/react-query'
import { Loader2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@chaos_team/chaos-ui'

import {
  deleteDisabledChannels,
  fixChannelAbilities,
  getChannelOps,
  testAllChannels,
  updateAllChannelsBalance,
} from '../api'
import { formatServerTaskHint } from '../lib/ops'

/**
 * Header dropdown with whole-fleet channel maintenance actions: test all,
 * refresh all balances, repair abilities, clean disabled channels, and the
 * current retry/auto-disable policy snapshot.
 */
export function ChannelsOpsMenu() {
  const { t } = useTranslation()
  const [opsDialogOpen, setOpsDialogOpen] = useState(false)

  const runAction = (
    mutation: {
      isPending: boolean
      mutate: () => void
    },
    label: string
  ) => {
    if (mutation.isPending) return
    toast.info(label)
    mutation.mutate()
  }

  const testAll = useMutation({
    mutationFn: testAllChannels,
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(
          res.message || t('Failed to start the channel test task')
        )
        return
      }
      toast.success(
        formatServerTaskHint(res.data, t('Channel test task queued'))
      )
    },
  })

  const refreshBalances = useMutation({
    mutationFn: updateAllChannelsBalance,
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to update balances'))
        return
      }
      toast.success(t('Balances updated'))
    },
  })

  const fixAbilities = useMutation({
    mutationFn: fixChannelAbilities,
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to fix channel abilities'))
        return
      }
      const data = res.data
      if (data && typeof data === 'object' && 'success' in data) {
        const fails = Number(data.fails ?? 0)
        toast.success(
          fails > 0
            ? t('Abilities fixed with {{count}} failures', { count: fails })
            : t('Abilities fixed')
        )
        return
      }
      toast.success(t('Abilities fixed'))
    },
  })

  const cleanDisabled = useMutation({
    mutationFn: deleteDisabledChannels,
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to delete disabled channels'))
        return
      }
      const removed = Number(res.data ?? 0)
      toast.success(t('Deleted {{count}} disabled channels', { count: removed }))
    },
  })

  const opsInfo = useMutation({
    mutationFn: getChannelOps,
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(res.message || t('Failed to load channel ops'))
        return
      }
      setOpsDialogOpen(true)
    },
  })

  const busy =
    testAll.isPending ||
    refreshBalances.isPending ||
    fixAbilities.isPending ||
    cleanDisabled.isPending ||
    opsInfo.isPending

  const opsData = opsInfo.data?.data

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type='button'
              className='btn-industrial-secondary text-xs !h-9 px-3.5 cursor-pointer inline-flex items-center gap-1.5'
              disabled={busy}
              aria-label={t('Channel maintenance')}
            >
              {busy ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Wrench className='size-3.5' />
              )}
              {t('Channel maintenance')}
            </button>
          }
        />
        <DropdownMenuContent className='rounded-none border-zinc-800 bg-[#0a0a0a] text-xs'>
          <DropdownMenuItem
            disabled={testAll.isPending}
            onClick={() => runAction(testAll, t('Queuing channel test task...'))}
          >
            {t('Test all channels')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={refreshBalances.isPending}
            onClick={() =>
              runAction(refreshBalances, t('Refreshing all channel balances...'))
            }
          >
            {t('Refresh all balances')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={fixAbilities.isPending}
            onClick={() =>
              runAction(fixAbilities, t('Fixing channel abilities...'))
            }
          >
            {t('Fix abilities')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={cleanDisabled.isPending}
            onClick={() =>
              runAction(cleanDisabled, t('Deleting disabled channels...'))
            }
          >
            {t('Delete disabled channels')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={opsInfo.isPending}
            onClick={() => runAction(opsInfo, t('Loading channel ops...'))}
          >
            {t('Maintenance policy')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={opsDialogOpen} onOpenChange={setOpsDialogOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-md bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
          <DialogHeader>
            <DialogTitle className='mono text-base text-white'>
              {t('Maintenance policy')}
            </DialogTitle>
            <DialogDescription className='mono text-xs text-zinc-500'>
              {t('Current retry and automatic-disable policy.')}
            </DialogDescription>
          </DialogHeader>
          <dl className='mono text-xs space-y-2 text-zinc-300'>
            <div className='flex justify-between gap-4'>
              <dt className='text-zinc-500'>{t('Retry times')}</dt>
              <dd className='tabular-nums'>{opsData?.retry_times ?? '-'}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className='text-zinc-500'>{t('Automatic disable')}</dt>
              <dd>{opsData?.request_policy.automatic_disable ? t('On') : t('Off')}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className='text-zinc-500'>{t('Policy source')}</dt>
              <dd>{opsData?.request_policy.source ?? '-'}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  )
}
