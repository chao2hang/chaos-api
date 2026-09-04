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

import { CloudDownloadIcon, Loader2Icon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@chaos_team/chaos-ui'

import { CHANNEL_TYPES, CODING_PLAN_TYPES } from '../constants'
import type { ChannelFormValues } from '../lib/schema'
import type { UseFormReturn } from 'react-hook-form'

interface ChannelFormFieldsProps {
  form: UseFormReturn<ChannelFormValues>
  groups: string[]
  fetching: boolean
  onFetchModels: () => void
}

/** Name, type, key, base URL and models fields of the channel form. */
export function ChannelFormBasicFields(props: ChannelFormFieldsProps) {
  const { t } = useTranslation()
  const { form } = props
  const baseUrl = form.watch('base_url')
  // A coding-plan selection matches when both the type and the base URL
  // (plan key) point at the same preset.
  const selectedPlan = CODING_PLAN_TYPES.find(
    (p) => p.type === form.getValues('type') && p.planBase === baseUrl
  )
  const typeSelectValue = selectedPlan
    ? `plan:${selectedPlan.planBase}`
    : form.getValues('type')
      ? `type:${form.getValues('type')}`
      : undefined
  // Base UI renders the raw value in the trigger unless an items map is given.
  const typeSelectItems = useMemo(() => {
    const items: Record<string, React.ReactNode> = {}
    for (const option of CHANNEL_TYPES) {
      items[`type:${option.value}`] = option.label
    }
    for (const preset of CODING_PLAN_TYPES) {
      items[`plan:${preset.planBase}`] = t(preset.labelKey)
    }
    return items
  }, [t])

  const handleTypeChange = (value: string | null) => {
    if (!value) return
    if (value.startsWith('plan:')) {
      const preset = CODING_PLAN_TYPES.find((p) => `plan:${p.planBase}` === value)
      if (!preset) return
      form.setValue('type', preset.type, { shouldValidate: true })
      form.setValue('base_url', preset.planBase, { shouldValidate: true })
      if (preset.models) {
        form.setValue('models', preset.models, { shouldValidate: true })
      }
      return
    }
    const typeId = value.slice('type:'.length)
    form.setValue('type', typeId, { shouldValidate: true })
    // Switching away from a coding plan: drop the stale plan base URL.
    if (CODING_PLAN_TYPES.some((p) => p.planBase === form.getValues('base_url'))) {
      form.setValue('base_url', '')
    }
  }

  return (
    <>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Name')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder='my-openai' />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='type'
          render={() => (
            <FormItem>
              <FormLabel required>{t('Type')}</FormLabel>
              <Select
                items={typeSelectItems}
                value={typeSelectValue}
                onValueChange={handleTypeChange}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {CHANNEL_TYPES.map((option) => (
                      <SelectItem key={option.value} value={`type:${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Coding Plan</SelectLabel>
                    {CODING_PLAN_TYPES.map((preset) => (
                      <SelectItem key={preset.planBase} value={`plan:${preset.planBase}`}>
                        {t(preset.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name='key'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Key')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type='password'
                autoComplete='new-password'
                placeholder={t('Leave empty to keep the existing key')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name='base_url'
        render={({ field }) => {
          const planManaged = CODING_PLAN_TYPES.some((p) => p.planBase === field.value)
          return (
            <FormItem>
              <FormLabel>{t('Base URL')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={planManaged ? '' : field.value}
                  placeholder={
                    planManaged
                      ? t('Auto-configured by the selected Coding Plan')
                      : 'https://api.example.com'
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormField
        control={form.control}
        name='models'
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t('Models')}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={3}
                placeholder={t('Comma-separated model names')}
              />
            </FormControl>
            <div className='flex items-center justify-between'>
              <FormMessage />
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={props.fetching}
                onClick={props.onFetchModels}
              >
                {props.fetching ? (
                  <Loader2Icon className='animate-spin' />
                ) : (
                  <CloudDownloadIcon />
                )}
                {t('Fetch models')}
              </Button>
            </div>
          </FormItem>
        )}
      />
    </>
  )
}
