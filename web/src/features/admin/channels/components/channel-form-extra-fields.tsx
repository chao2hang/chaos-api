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

import { useTranslation } from 'react-i18next'

import {
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
import type { UseFormReturn } from 'react-hook-form'

import type { ChannelFormValues } from '../lib/schema'

interface ChannelFormExtraFieldsProps {
  form: UseFormReturn<ChannelFormValues>
  groups: string[]
}

/** Group, priority/weight, tag, test model and remark fields. */
export function ChannelFormExtraFields(props: ChannelFormExtraFieldsProps) {
  const { t } = useTranslation()
  const { form } = props

  return (
    <>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <FormField
          control={form.control}
          name='group'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Group')}</FormLabel>
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
                  <SelectItem value='default'>{t('Default')}</SelectItem>
                  {props.groups
                    .filter((group) => group !== 'default')
                    .map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
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
          name='priority'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Priority')}</FormLabel>
              <FormControl>
                <Input {...field} type='number' />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='weight'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Weight')}</FormLabel>
              <FormControl>
                <Input {...field} type='number' />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <FormField
          control={form.control}
          name='tag'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Tag')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='test_model'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Test Model')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name='remark'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Remark')}</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
