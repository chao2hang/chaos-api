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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CHANNEL_TYPES } from '../constants'
import type { ChannelsSearch } from '../types'

type ChannelFilterBarProps = {
  keyword: string
  status: string[]
  type: string[]
  group: string
  groups: string[]
  onFilterChange: (patch: Partial<ChannelsSearch>) => void
}

const ALL_VALUE = '__all__'

/**
 * Hardcore industrial monospace filter bar for channels.
 */
export function ChannelFilterBar(props: ChannelFilterBarProps) {
  const { t } = useTranslation()
  const [keywordDraft, setKeywordDraft] = useState(props.keyword)

  useEffect(() => {
    setKeywordDraft(props.keyword)
  }, [props.keyword])

  const applyKeyword = () => {
    const trimmed = keywordDraft.trim()
    if (trimmed !== props.keyword) {
      props.onFilterChange({ filter: trimmed })
    }
  }

  const resetAll = () => {
    setKeywordDraft('')
    props.onFilterChange({
      filter: '',
      status: [],
      type: [],
      group: '',
    })
  }

  const statusLabel =
    props.status[0] === 'enabled'
      ? t('Enabled')
      : props.status[0] === 'disabled'
        ? t('Disabled')
        : t('All statuses')

  const selectedTypeOption = CHANNEL_TYPES.find((opt) => opt.value === props.type[0])
  const typeLabel = selectedTypeOption ? selectedTypeOption.label : t('All types')
  const groupLabel = props.group !== '' ? props.group : t('All groups')

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-[#0a0a0a] border border-zinc-800 sharp-card">
      <div className="relative flex-1 min-w-[200px]">
        <Input
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          placeholder={t('Search by channel name or keyword...')}
          className="bg-[#0a0a0a] border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-xs mono rounded-none h-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyKeyword()
            }
          }}
        />
      </div>

      <button
        type="button"
        onClick={applyKeyword}
        className="btn-industrial-secondary mono text-xs h-9 cursor-pointer"
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
        <SelectTrigger size="sm" className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none h-9" aria-label={t('Status')}>
          <SelectValue>{statusLabel}</SelectValue>
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
        <SelectTrigger size="sm" className="w-44 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none h-9" aria-label={t('Type')}>
          <SelectValue>{typeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none max-h-64">
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
        <SelectTrigger size="sm" className="w-36 bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none h-9" aria-label={t('Group')}>
          <SelectValue>{groupLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-zinc-300 mono text-xs rounded-none max-h-64">
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
          onClick={resetAll}
          className="btn-industrial-secondary text-xs mono text-zinc-400 hover:text-white h-9 cursor-pointer"
        >
          <RotateCcwIcon className="size-3.5" />
          {t('Reset')}
        </button>
      )}
    </div>
  )
}
