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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  InputNumber,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@chaos_team/chaos-ui'
import { zodResolverAdapter } from '@chaos_team/chaos-ui/hooks'

import { adjustUserQuota } from '../api'
import { QUOTA_ADJUST_MODES, SUCCESS_MESSAGES } from '../constants'
import { buildQuotaAdjustPayload } from '../lib/manage-payload'
import { parseQuotaFromDollars } from '@/lib/format'
import type { User } from '../types'

const quotaAdjustSchema = z
  .object({
    mode: z.enum(['add', 'subtract', 'override']),
    value: z.number(),
  })
  .refine((data) => data.mode !== 'override' || data.value >= 0, {
    message: 'Override quota must not be negative',
    path: ['value'],
  })

type QuotaAdjustValues = z.infer<typeof quotaAdjustSchema>

type UserQuotaDialogProps = {
  user: User
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const DEFAULT_VALUES: QuotaAdjustValues = { mode: 'add', value: 0 }

const MODE_LABELS: Record<QuotaAdjustValues['mode'], string> = {
  add: 'Add quota',
  subtract: 'Subtract quota',
  override: 'Override quota',
}

export function UserQuotaDialog(props: UserQuotaDialogProps) {
  const { t } = useTranslation()

  const form = useForm<QuotaAdjustValues>({
    resolver: zodResolverAdapter(quotaAdjustSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    form.reset(DEFAULT_VALUES)
  }, [props.user, form])

  const adjustMutation = useMutation({
    mutationFn: (values: QuotaAdjustValues) => {
      const payload = buildQuotaAdjustPayload(
        props.user.id,
        values.mode,
        parseQuotaFromDollars(values.value)
      )
      return adjustUserQuota(payload)
    },
    onSuccess: () => {
      toast.success(t(SUCCESS_MESSAGES.QUOTA_ADJUSTED))
      props.onSaved()
    },
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onOpenChange(false)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {t('Adjust quota')} — {props.user.username}
          </DialogTitle>
        </DialogHeader>
        <Form<QuotaAdjustValues> {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              adjustMutation.mutate(values)
            )}
            className='flex flex-col gap-4'
          >
            <div className='grid gap-4'>
            <FormField
              control={form.control}
              name='mode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Mode')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUOTA_ADJUST_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {t(MODE_LABELS[mode])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='value'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Quota')}</FormLabel>
                  <FormControl>
                    <InputNumber
                      min={0}
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => props.onOpenChange(false)}
              >
                {t('Cancel')}
              </Button>
              <Button type='submit' loading={adjustMutation.isPending}>
                {t('Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
