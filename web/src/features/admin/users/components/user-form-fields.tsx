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
  InputNumber,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@chaos_team/chaos-ui'

import type { UseFormReturn } from 'react-hook-form'

import type { UserFormValues } from '../types'

type UserFormFieldsProps = {
  form: UseFormReturn<UserFormValues>
  groupOptions: string[]
  isEdit: boolean
}

export function UserFormFields(props: UserFormFieldsProps) {
  const { t } = useTranslation()
  const form = props.form

  return (
    <div className='grid gap-4'>
      <FormField
        control={form.control}
        name='username'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Username')}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='display_name'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Display Name')}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='password'
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {props.isEdit
                ? t('Password (leave blank to keep current)')
                : t('Password')}
            </FormLabel>
            <FormControl>
              <Input type='password' autoComplete='new-password' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='group'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Group')}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a group')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {props.groupOptions.map((group) => (
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
        name='quota'
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
      <FormField
        control={form.control}
        name='remark'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Remark')}</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
