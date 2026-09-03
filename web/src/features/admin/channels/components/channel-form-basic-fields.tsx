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
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@chaos_team/chaos-ui'

import { CHANNEL_TYPES } from '../constants'
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
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Type')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(String(value))}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CHANNEL_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Base URL')}</FormLabel>
            <FormControl>
              <Input {...field} placeholder='https://api.example.com' />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
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
