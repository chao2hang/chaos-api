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
    <div className="sharp-card p-4 flex flex-wrap items-center gap-3">
      <input
        type="text"
        className="w-64 bg-[#0a0a0a] border border-zinc-800 text-white text-xs mono px-3 py-1.5 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600 rounded-none"
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
        <SelectTrigger className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectValue placeholder={t('Status')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
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
        <SelectTrigger className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectValue placeholder={t('Role')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
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
        <SelectTrigger className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectValue placeholder={t('Group')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All groups')}</SelectItem>
          {props.groupOptions.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(keyword !== '' || props.status || props.role || props.group) && (
        <button
          type="button"
          onClick={() => {
            setKeyword('')
            props.onFilterChange({
              filter: '',
              status: [],
              role: [],
              group: '',
            })
          }}
          className="text-zinc-500 hover:text-zinc-300 mono text-xs underline ml-auto transition-colors"
        >
          {t('Clear')}
        </button>
      )}
    </div>
  )
}
