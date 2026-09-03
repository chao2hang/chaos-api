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

import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@chaos_team/chaos-ui'

import { CHANNEL_TYPES } from '../constants'
import type { ChannelsSearch } from '../types'

const ALL_VALUE = '__all__'

export interface ChannelFilterBarProps {
  keyword: string
  status: string[]
  type: string[]
  group: string
  groups: string[]
  onFilterChange: (patch: Partial<ChannelsSearch>) => void
}

/** Keyword + status/type/group filter selects driving the URL search params. */
export function ChannelFilterBar(props: ChannelFilterBarProps) {
  const { t } = useTranslation()
  const [keywordDraft, setKeywordDraft] = useState(props.keyword)
  const [lastPropKeyword, setLastPropKeyword] = useState(props.keyword)
  if (props.keyword !== lastPropKeyword) {
    setLastPropKeyword(props.keyword)
    setKeywordDraft(props.keyword)
  }

  const applyKeyword = () => {
    props.onFilterChange({ filter: keywordDraft.trim() })
  }

  return (
    <div className="sharp-card p-4 flex flex-wrap items-center gap-3">
      <div className="relative">
        <input
          type="text"
          className="w-56 bg-[#0a0a0a] border border-zinc-800 text-white text-xs mono px-3 py-1.5 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600 rounded-none"
          placeholder={t('Search channels')}
          value={keywordDraft}
          onChange={(event) => setKeywordDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              applyKeyword()
            }
          }}
        />
      </div>

      <button
        type="button"
        onClick={applyKeyword}
        className="btn-industrial-secondary mono text-xs"
      >
        <SearchIcon className="size-3.5" />
        {t('Search')}
      </button>

      <Select
        value={props.status[0] ?? ALL_VALUE}
        onValueChange={(value) => {
          props.onFilterChange({
            status: value === ALL_VALUE ? [] : [String(value)],
          })
        }}
      >
        <SelectTrigger size="sm" className="w-32 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none" aria-label={t('Status')}>
          <SelectValue placeholder={t('All statuses')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All statuses')}</SelectItem>
          <SelectItem value="enabled">{t('Enabled')}</SelectItem>
          <SelectItem value="disabled">{t('Disabled')}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={props.type[0] ?? ALL_VALUE}
        onValueChange={(value) => {
          props.onFilterChange({
            type: value === ALL_VALUE ? [] : [String(value)],
          })
        }}
      >
        <SelectTrigger size="sm" className="w-40 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none" aria-label={t('Type')}>
          <SelectValue placeholder={t('All types')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All types')}</SelectItem>
          {CHANNEL_TYPES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={props.group !== '' ? props.group : ALL_VALUE}
        onValueChange={(value) => {
          props.onFilterChange({
            group: value === ALL_VALUE ? '' : String(value),
          })
        }}
      >
        <SelectTrigger size="sm" className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none" aria-label={t('Group')}>
          <SelectValue placeholder={t('All groups')} />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none">
          <SelectItem value={ALL_VALUE}>{t('All groups')}</SelectItem>
          {props.groups.map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(keywordDraft !== '' ||
        props.status.length > 0 ||
        props.type.length > 0 ||
        props.group !== '') && (
        <button
          type="button"
          onClick={() => {
            setKeywordDraft('')
            props.onFilterChange({
              filter: '',
              status: [],
              type: [],
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
