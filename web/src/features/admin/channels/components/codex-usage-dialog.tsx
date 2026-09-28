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
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@chaos_team/chaos-ui'

import { getCodexUsage, refreshCodexCredential, resetCodexUsage } from '../api'
import type { Channel } from '../types'

/**
 * Codex account usage dialog: usage snapshot plus credential refresh and
 * usage reset actions (GET /api/channel/:id/codex/usage).
 */
export function CodexUsageDialog(props: {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const open = props.channel !== null
  const channelId = props.channel?.id ?? 0

  const usageQuery = useQuery({
    queryKey: ['admin', 'channels', 'codex-usage', channelId],
    enabled: open,
    queryFn: () => getCodexUsage(channelId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
  }

  const refresh = useMutation({
    mutationFn: () => refreshCodexCredential(channelId),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to refresh credential'))
        return
      }
      toast.success(t('Credential refreshed'))
      invalidate()
      void usageQuery.refetch()
    },
  })

  const reset = useMutation({
    mutationFn: () => resetCodexUsage(channelId),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to reset usage'))
        return
      }
      toast.success(t('Usage reset'))
      invalidate()
      void usageQuery.refetch()
    },
  })

  const usageText = JSON.stringify(usageQuery.data?.data ?? null, null, 2)

  function renderUsageBody() {
    if (usageQuery.isPending) {
      return t('Loading...')
    }
    if (usageQuery.data?.success) {
      return usageText
    }
    return usageQuery.data?.message || t('Failed to load usage')
  }

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Codex usage')} · {props.channel?.name}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t('Live usage of the Codex account bound to this channel.')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
            className='mono text-xs'
          >
            {t('Refresh credential')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={reset.isPending}
            onClick={() => reset.mutate()}
            className='mono text-xs'
          >
            {t('Reset usage')}
          </Button>
        </div>

        <pre className='mono text-xs text-zinc-300 bg-[#0a0a0a] border border-zinc-800 p-3 overflow-x-auto max-h-80 whitespace-pre-wrap break-all'>
          {usageQuery.isPending
            ? t('Loading...')
            : renderUsageBody()}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
