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
  Input,
} from '@chaos_team/chaos-ui'

import { deleteOllamaModel, getOllamaVersion } from '../api'
import type { Channel } from '../types'

/**
 * Ollama channel dialog: server version probe, model deletion and a live
 * streamed model pull (POST /api/channel/ollama/pull/stream).
 */
export function OllamaDialog(props: {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const open = props.channel !== null
  const channelId = props.channel?.id ?? 0
  const [modelName, setModelName] = useState('')
  const [pullLog, setPullLog] = useState('')
  const [pulling, setPulling] = useState(false)

  const versionQuery = useQuery({
    queryKey: ['admin', 'channels', 'ollama-version', channelId],
    enabled: open,
    queryFn: () => getOllamaVersion(channelId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
  }

  const remove = useMutation({
    mutationFn: (name: string) => deleteOllamaModel(channelId, name),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to delete model'))
        return
      }
      toast.success(t('Model deleted'))
      invalidate()
    },
  })

  const pull = async () => {
    const model = modelName.trim()
    if (model === '' || pulling) return
    setPulling(true)
    setPullLog('')
    try {
      const res = await fetch('/api/channel/ollama/pull/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel_id: channelId, model_name: model }),
      })
      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => null)) as
          | { message?: string }
          | null
        toast.error(payload?.message || t('Failed to pull model'))
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        setPullLog((current) => current + decoder.decode(value))
      }
      toast.success(t('Model pulled'))
      invalidate()
    } catch {
      toast.error(t('Failed to pull model'))
    } finally {
      setPulling(false)
    }
  }

  const versionText = JSON.stringify(versionQuery.data?.data ?? null, null, 2)

  function renderVersionBody() {
    if (versionQuery.isPending) {
      return t('Loading...')
    }
    if (versionQuery.data?.success) {
      return versionText
    }
    return versionQuery.data?.message || t('Failed to load version')
  }

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Ollama models')} · {props.channel?.name}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t('Pull or remove models on the Ollama server of this channel.')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex gap-2'>
          <Input
            value={modelName}
            onChange={(event) => setModelName(event.target.value)}
            placeholder={t('Model name, e.g. llama3.1:8b')}
            className='mono text-xs rounded-none bg-[#0a0a0a] border-zinc-800'
            aria-label={t('Model name')}
          />
          <Button
            size='sm'
            disabled={pulling || modelName.trim() === ''}
            onClick={() => void pull()}
            className='mono text-xs shrink-0'
          >
            {pulling ? t('Pulling...') : t('Pull model')}
          </Button>
        </div>

        {(pullLog !== '' || pulling) && (
          <pre className='mono text-xs text-zinc-300 bg-[#0a0a0a] border border-zinc-800 p-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-all'>
            {pullLog}
          </pre>
        )}

        <div className='flex items-center justify-between gap-2'>
          <span className='mono text-xs text-zinc-500'>{t('Server version')}</span>
          <Button
            variant='outline'
            size='sm'
            disabled={remove.isPending || modelName.trim() === ''}
            onClick={() => {
              const model = modelName.trim()
              if (window.confirm(t('Delete model {{model}}?', { model }))) {
                remove.mutate(model)
              }
            }}
            className='mono text-xs'
          >
            {t('Delete model')}
          </Button>
        </div>

        <pre className='mono text-xs text-zinc-300 bg-[#0a0a0a] border border-zinc-800 p-3 max-h-40 overflow-x-auto whitespace-pre-wrap break-all'>
          {versionQuery.isPending
            ? t('Loading...')
            : renderVersionBody()}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
