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
  Button,
  Input,
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
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        size='sm'
        className='w-56'
        placeholder={t('Search channels')}
        value={keywordDraft}
        onChange={(event) => setKeywordDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            applyKeyword()
          }
        }}
      />
      <Button size='sm' variant='outline' onClick={applyKeyword}>
        <SearchIcon />
        {t('Search')}
      </Button>

      <Select
        value={props.status[0] ?? ALL_VALUE}
        onValueChange={(value) => {
          props.onFilterChange({
            status: value === ALL_VALUE ? [] : [String(value)],
          })
        }}
      >
        <SelectTrigger size='sm' className='w-32' aria-label={t('Status')}>
          <SelectValue placeholder={t('All statuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t('All statuses')}</SelectItem>
          <SelectItem value='enabled'>{t('Enabled')}</SelectItem>
          <SelectItem value='disabled'>{t('Disabled')}</SelectItem>
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
        <SelectTrigger size='sm' className='w-40' aria-label={t('Type')}>
          <SelectValue placeholder={t('All types')} />
        </SelectTrigger>
        <SelectContent>
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
        <SelectTrigger size='sm' className='w-36' aria-label={t('Group')}>
          <SelectValue placeholder={t('All groups')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t('All groups')}</SelectItem>
          {props.groups.map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size='sm'
        variant='ghost'
        onClick={() => {
          setKeywordDraft('')
          props.onFilterChange({ filter: '', status: [], type: [], group: '' })
        }}
      >
        {t('Reset')}
      </Button>
    </div>
  )
}
