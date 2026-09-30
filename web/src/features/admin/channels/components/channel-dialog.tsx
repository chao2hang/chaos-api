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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@chaos_team/chaos-ui'
import { zodResolverAdapter } from '@chaos_team/chaos-ui/hooks'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SecureVerificationDialog } from '@/features/auth/secure-verification'

import { createChannel, fetchUpstreamModels, updateChannel } from '../api'
import { useChannelKeyDisclosure } from '../hooks/use-channel-key-disclosure'
import {
  buildChannelPayload,
  channelToFormValues,
  EMPTY_CHANNEL_FORM,
} from '../lib/form'
import { getChannelFormSchema, type ChannelFormValues } from '../lib/schema'
import type { Channel } from '../types'
import { ChannelFormFields } from './channel-form-fields'
import { FetchModelsSelectDialog } from './fetch-models-select-dialog'

/** Creation mode picker + multi-key options, shown only when creating. */
function CreateModeFields({
  form,
}: {
  form: ReturnType<typeof useForm<ChannelFormValues>>
}) {
  const { t } = useTranslation()
  const createMode = form.watch('createMode')
  const multiKey = createMode === 'multi_to_single'

  return (
    <div className='grid gap-3 rounded-none border border-zinc-800 bg-[#0a0a0a] p-3'>
      <FormField
        control={form.control}
        name='createMode'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='mono text-xs text-zinc-400'>
              {t('Creation mode')}
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger
                  size='sm'
                  className='mono rounded-none border-zinc-800 bg-[#0a0a0a] text-xs'
                  aria-label={t('Creation mode')}
                >
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='rounded-none border-zinc-800 bg-[#0a0a0a]'>
                <SelectItem value='single'>{t('Single channel')}</SelectItem>
                <SelectItem value='batch'>
                  {t('Batch: one channel per key')}
                </SelectItem>
                <SelectItem value='multi_to_single'>
                  {t('Multi-key: one channel, many keys')}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      {multiKey && (
        <>
          <FormField
            control={form.control}
            name='multi_key_mode'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='mono text-xs text-zinc-400'>
                  {t('Multi-key polling mode')}
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger
                      size='sm'
                      className='mono rounded-none border-zinc-800 bg-[#0a0a0a] text-xs'
                      aria-label={t('Multi-key polling mode')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className='rounded-none border-zinc-800 bg-[#0a0a0a]'>
                    <SelectItem value='random'>{t('Random')}</SelectItem>
                    <SelectItem value='polling'>{t('Polling')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='batch_prefix_name'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-2'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    aria-label={t('Prefix channel names with the key')}
                  />
                </FormControl>
                <FormLabel className='mono text-xs text-zinc-400'>
                  {t('Prefix channel names with the key')}
                </FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
      {createMode !== 'single' && (
        <p className='mono text-xs text-zinc-500'>
          {t('Enter one key per line in the key field below.')}
        </p>
      )}
    </div>
  )
}

function getFirstErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  if (
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message
  }
  for (const value of Object.values(error)) {
    const msg = getFirstErrorMessage(value)
    if (msg) return msg
  }
  return null
}

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
  const [selectModelsOpen, setSelectModelsOpen] = useState(false)
  const [fetchedCandidateModels, setFetchedCandidateModels] = useState<
    string[]
  >([])

  const { channelKey, isChannelKeyLoading, handleRevealKey, verification } =
    useChannelKeyDisclosure(props.open, editingChannel?.id)

  const form = useForm<ChannelFormValues>({
    resolver: zodResolverAdapter(getChannelFormSchema(t)),
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
      if (!res.success) {
        return
      }
      if (!res.data || res.data.length === 0) {
        toast.warning(t('No models fetched from upstream'))
        return
      }
      const fetched = res.data.map((m) => m.trim()).filter(Boolean)
      if (fetched.length === 0) {
        toast.warning(t('No models fetched from upstream'))
        return
      }
      setFetchedCandidateModels(fetched)
      setSelectModelsOpen(true)
      toast.success(t('Fetched {{count}} models', { count: fetched.length }))
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('Failed to fetch models')
      )
    },
  })

  const handleApplySelectedModels = (selected: string[]) => {
    form.setValue('models', selected, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
    toast.success(t('Models filled to form'))
  }

  const submit = form.handleSubmit(
    async (values) => {
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
      if (values.createMode !== 'single' && values.key.trim() === '') {
        toast.error(t('Enter at least one key, one per line'))
        return
      }
      const res = await createChannel({
        mode: values.createMode,
        channel: payload,
        multi_key_mode: values.multi_key_mode,
        batch_add_set_key_prefix_2_name: values.batch_prefix_name,
      })
      if (res.success) {
        toast.success(t('Channel created'))
        invalidate()
        props.onOpenChange(false)
      }
    },
    (errors) => {
      const message = getFirstErrorMessage(errors)
      if (message) {
        toast.error(message)
      } else {
        toast.error(t('Please fix the highlighted fields before saving'))
      }
    }
  )

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto rounded-none border-zinc-800 bg-[#0f0f0f] text-white sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {editing ? t('Edit channel') : t('Create channel')}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {editing
              ? t(
                  'Update the channel configuration. Leave the key empty to keep it.'
                )
              : t('Add a new upstream provider channel.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className='flex flex-col gap-4'>
            {!editing && <CreateModeFields form={form} />}
            <ChannelFormFields
              form={form}
              groups={props.groups}
              editing={editing}
              fetching={fetchModels.isPending}
              onFetchModels={() => fetchModels.mutate()}
              channelKey={channelKey}
              isChannelKeyLoading={isChannelKeyLoading}
              onRevealKey={handleRevealKey}
            />
            <DialogFooter className='gap-2 border-t border-zinc-900 pt-2'>
              <button
                type='button'
                onClick={() => props.onOpenChange(false)}
                className='btn-industrial-secondary mono text-xs'
              >
                {t('Cancel')}
              </button>
              <button
                type='submit'
                disabled={form.formState.isSubmitting || fetchModels.isPending}
                className='btn-industrial-primary mono text-xs disabled:cursor-not-allowed disabled:opacity-50'
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2Icon className='size-3.5 animate-spin' />
                    {t('Saving...')}
                  </>
                ) : (
                  t('Save')
                )}
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <FetchModelsSelectDialog
        open={selectModelsOpen}
        models={fetchedCandidateModels}
        currentSelected={form.getValues('models')}
        onOpenChange={setSelectModelsOpen}
        onConfirm={handleApplySelectedModels}
      />
      <SecureVerificationDialog
        open={verification.open}
        onOpenChange={verification.setOpen}
        methods={verification.methods}
        state={verification.state}
        onVerify={async (method, code) => {
          await verification.executeVerification(method, code)
        }}
        onCancel={verification.cancel}
        onCodeChange={verification.setCode}
        onMethodChange={verification.switchMethod}
      />
    </Dialog>
  )
}
