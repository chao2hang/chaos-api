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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@chaos_team/chaos-ui'

import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../constants'

const ALL_VALUE = '__all__'

type FilterPatch = {
  filter?: string
  status?: ('1' | '2')[]
  role?: ('1' | '10' | '100')[]
  group?: string
}

type UsersFilterBarProps = {
  keyword: string
  status: string
  role: string
  group: string
  groupOptions: string[]
  onFilterChange: (patch: FilterPatch) => void
}

export function UsersFilterBar(props: UsersFilterBarProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState(props.keyword)
  const [lastPropKeyword, setLastPropKeyword] = useState(props.keyword)
  if (props.keyword !== lastPropKeyword) {
    setLastPropKeyword(props.keyword)
    setKeyword(props.keyword)
  }

  const commitKeyword = () => {
    const next = keyword.trim()
    if (next !== props.keyword) {
      props.onFilterChange({ filter: next })
    }
  }

  const handleStatusChange = (value: string) => {
    props.onFilterChange({
      status: value === ALL_VALUE ? [] : [value as '1' | '2'],
    })
  }

  const handleRoleChange = (value: string) => {
    props.onFilterChange({
      role: value === ALL_VALUE ? [] : [value as '1' | '10' | '100'],
    })
  }

  const handleGroupChange = (value: string) => {
    props.onFilterChange({ group: value === ALL_VALUE ? '' : value })
  }

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Input
        className='w-64'
        placeholder={t('Search username or display name')}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitKeyword()
        }}
        onBlur={commitKeyword}
      />
      <Select
        value={props.status || ALL_VALUE}
        onValueChange={(value) => handleStatusChange(String(value))}
      >
        <SelectTrigger className='w-36'>
          <SelectValue placeholder={t('Status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t('All statuses')}</SelectItem>
          {USER_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.role || ALL_VALUE}
        onValueChange={(value) => handleRoleChange(String(value))}
      >
        <SelectTrigger className='w-36'>
          <SelectValue placeholder={t('Role')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t('All roles')}</SelectItem>
          {USER_ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.group || ALL_VALUE}
        onValueChange={(value) => handleGroupChange(String(value))}
      >
        <SelectTrigger className='w-40'>
          <SelectValue placeholder={t('Group')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t('All groups')}</SelectItem>
          {props.groupOptions.map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
