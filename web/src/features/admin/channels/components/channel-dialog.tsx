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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
} from '@chaos_team/chaos-ui'
import { zodResolverAdapter } from '@chaos_team/chaos-ui/hooks'

import { createChannel, fetchUpstreamModels, updateChannel } from '../api'
import {
  buildChannelPayload,
  channelToFormValues,
  EMPTY_CHANNEL_FORM,
} from '../lib/form'
import {
  channelFormSchema,
  type ChannelFormValues,
} from '../lib/schema'
import type { Channel } from '../types'
import { ChannelFormFields } from './channel-form-fields'

export interface ChannelDialogProps {
  open: boolean
  channel: Channel | null
  groups: string[]
  onOpenChange: (open: boolean) => void
}

/** Create/edit channel dialog (POST /api/channel, PUT /api/channel/). */
export function ChannelDialog(props: ChannelDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const editingChannel = props.channel
  const editing = editingChannel !== null

  const form = useForm<ChannelFormValues>({
    resolver: zodResolverAdapter(channelFormSchema),
    defaultValues: EMPTY_CHANNEL_FORM,
  })

  useEffect(() => {
    if (props.open) {
      form.reset(
        props.channel ? channelToFormValues(props.channel) : EMPTY_CHANNEL_FORM
      )
    }
  }, [props.open, props.channel, form])

  const fetchModels = useMutation({
    mutationFn: () => {
      const values = form.getValues()
      const key = values.key.trim()
      return fetchUpstreamModels({
        base_url: values.base_url.trim(),
        type: Number(values.type) || 0,
        key: key !== '' ? key : undefined,
        channel_id: editingChannel?.id,
      })
    },
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        return
      }
      form.setValue('models', res.data.join(','), { shouldValidate: true })
      toast.success(t('Fetched {{count}} models', { count: res.data.length }))
    },
  })

  const submit = form.handleSubmit(async (values) => {
    const payload = buildChannelPayload(values)
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
    }
    if (editingChannel !== null) {
      const res = await updateChannel({
        ...payload,
        id: editingChannel.id,
      })
      if (res.success) {
        toast.success(t('Channel updated'))
        invalidate()
        props.onOpenChange(false)
      }
      return
    }
    const res = await createChannel({ mode: 'single', channel: payload })
    if (res.success) {
      toast.success(t('Channel created'))
      invalidate()
      props.onOpenChange(false)
    }
  })

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {editing ? t('Edit channel') : t('Create channel')}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t('Update the channel configuration. Leave the key empty to keep it.')
              : t('Add a new upstream provider channel.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className='flex flex-col gap-4'>
            <ChannelFormFields
              form={form}
              groups={props.groups}
              fetching={fetchModels.isPending}
              onFetchModels={() => fetchModels.mutate()}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => props.onOpenChange(false)}
              >
                {t('Cancel')}
              </Button>
              <Button type='submit'>{t('Save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
