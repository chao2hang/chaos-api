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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@chaos_team/chaos-ui'
import { RotateCcwIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../constants'
import type {
  UserRoleFilterValue,
  UserStatusFilterValue,
} from '../types'

export type FilterPatch = {
  keyword?: string
  status?: UserStatusFilterValue[]
  role?: UserRoleFilterValue[]
  group?: string
}

export type UsersFilterBarProps = {
  keyword: string
  status: UserStatusFilterValue
  role: UserRoleFilterValue
  group: string
  groupOptions: string[]
  onFilterChange: (patch: FilterPatch) => void
}

const ALL_VALUE = '__all__'

export function UsersFilterBar(props: UsersFilterBarProps) {
  const { t } = useTranslation()
  const [keywordInput, setKeywordInput] = useState(props.keyword)

  const commitKeyword = () => {
    if (keywordInput !== props.keyword) {
      props.onFilterChange({ keyword: keywordInput.trim() })
    }
  }

  const handleStatusChange = (val: string) => {
    props.onFilterChange({
      status: val === ALL_VALUE ? [] : [val as UserStatusFilterValue],
    })
  }

  const handleRoleChange = (val: string) => {
    props.onFilterChange({
      role: val === ALL_VALUE ? [] : [val as UserRoleFilterValue],
    })
  }

  const handleGroupChange = (val: string) => {
    props.onFilterChange({ group: val === ALL_VALUE ? '' : val })
  }

  const handleReset = () => {
    setKeywordInput('')
    props.onFilterChange({
      keyword: '',
      status: [],
      role: [],
      group: '',
    })
  }

  const hasActiveFilters = Boolean(
    props.keyword || props.status || props.role || props.group
  )

  let statusLabel = t('All statuses')
  if (props.status === '1') {
    statusLabel = t('Active')
  } else if (props.status === '2') {
    statusLabel = t('Disabled')
  }

  const roleOption = USER_ROLE_OPTIONS.find((opt) => opt.value === props.role)
  const roleLabel = roleOption ? t(roleOption.label) : t('All roles')
  const groupLabel = props.group ? props.group : t('All groups')

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-[#0a0a0a] border border-zinc-800 sharp-card">
      <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
        <Input
          placeholder={t('Search users by username, email, display name...')}
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          className="bg-[#0a0a0a] border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-xs rounded-none !h-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitKeyword()
          }}
          onBlur={commitKeyword}
        />
      </div>

      <button
        type="button"
        onClick={commitKeyword}
        className="btn-industrial-secondary text-xs !h-9 px-3 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
      >
        <SearchIcon className="size-3.5" />
        {t('Search')}
      </button>

      <Select
        value={props.status || ALL_VALUE}
        onValueChange={(value) => handleStatusChange(String(value))}
      >
        <SelectTrigger className="w-28 sm:w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none !h-9">
          <SelectValue>{statusLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All statuses')}</SelectItem>
          {USER_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={props.role || ALL_VALUE}
        onValueChange={(value) => handleRoleChange(String(value))}
      >
        <SelectTrigger className="w-28 sm:w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none !h-9">
          <SelectValue>{roleLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All roles')}</SelectItem>
          {USER_ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={props.group || ALL_VALUE}
        onValueChange={(value) => handleGroupChange(String(value))}
      >
        <SelectTrigger className="w-28 sm:w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none !h-9">
          <SelectValue>{groupLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 text-xs rounded-none max-h-64">
          <SelectItem value={ALL_VALUE}>{t('All groups')}</SelectItem>
          {props.groupOptions.map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="btn-industrial-secondary text-xs text-zinc-400 hover:text-white !h-9 px-3 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
        >
          <RotateCcwIcon className="size-3.5" />
          {t('Reset')}
        </button>
      )}
    </div>
  )
}
