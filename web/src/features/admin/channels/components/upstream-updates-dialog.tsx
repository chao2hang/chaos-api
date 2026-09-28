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

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
} from '@chaos_team/chaos-ui'

import { applyChannelUpstreamUpdates, detectChannelUpstreamUpdates } from '../api'
import type { Channel } from '../types'

function ModelList(props: { title: string; models: string[]; tone: string }) {
  if (props.models.length === 0) return null
  return (
    <div>
      <p className='mono text-xs text-zinc-500 mb-1'>
        {props.title} ({props.models.length})
      </p>
      <div className='mono text-xs bg-[#0a0a0a] border border-zinc-800 p-2 max-h-32 overflow-y-auto flex flex-wrap gap-1'>
        {props.models.map((model) => (
          <span key={model} className={props.tone}>
            {model}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Upstream model update dialog for one channel: detect drift against the
 * upstream model list, then apply (add/remove) the selected changes.
 */
export function UpstreamUpdatesDialog(props: {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const open = props.channel !== null
  const channelId = props.channel?.id ?? 0
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof detectChannelUpstreamUpdates>
  > | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
  }

  const detect = useMutation({
    mutationFn: () => detectChannelUpstreamUpdates(channelId),
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(res.message || t('Failed to detect upstream updates'))
        return
      }
      setResult(res)
    },
  })

  const apply = useMutation({
    mutationFn: () =>
      applyChannelUpstreamUpdates(
        channelId,
        result?.data?.add_models ?? [],
        result?.data?.remove_models ?? []
      ),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to apply updates'))
        return
      }
      toast.success(t('Upstream updates applied'))
      invalidate()
      setResult(null)
      props.onOpenChange(false)
    },
  })

  const detected = result?.data
  const hasChanges =
    (detected?.add_models.length ?? 0) > 0 ||
    (detected?.remove_models.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Upstream model updates')} · {props.channel?.name}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t('Compare the channel model list with the upstream.')}
          </DialogDescription>
        </DialogHeader>

        {detected ? (
          <div className='space-y-3'>
            <ModelList
              title={t('Added upstream')}
              models={detected.add_models}
              tone='text-emerald-500'
            />
            <ModelList
              title={t('Removed upstream')}
              models={detected.remove_models}
              tone='text-red-500'
            />
            {!hasChanges && (
              <p className='mono text-xs text-zinc-500'>
                {t('The model list already matches the upstream.')}
              </p>
            )}
            <div className='flex justify-end gap-2 pt-2 border-t border-zinc-900'>
              <Button
                variant='outline'
                size='sm'
                disabled={apply.isPending}
                onClick={() => setResult(null)}
                className='mono text-xs'
              >
                {t('Cancel')}
              </Button>
              <Button
                size='sm'
                disabled={apply.isPending || !hasChanges}
                onClick={() => apply.mutate()}
                className='mono text-xs'
              >
                {t('Apply updates')}
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex justify-center py-4'>
            <Button
              size='sm'
              disabled={detect.isPending}
              onClick={() => detect.mutate()}
              className='mono text-xs'
            >
              {detect.isPending ? t('Detecting...') : t('Detect updates')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
