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
import { DateTimePicker } from '@chaos_team/chaos-ui'
import { FilterBar, type FilterField } from '@chaos_team/chaos-ui/business'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { filterDateMsValue, filterTextValue } from '../lib/filter-values'
import type { UsageLogsSearch } from '../lib/search-schema'
import { unixMsToDate } from '../lib/time-range'
import type { UsageLogsSearchPatcher } from '../types'

type SimpleLogsFilterBarProps = {
  search: UsageLogsSearch
  admin: boolean
  /** i18n label for the id keyword input (MJ ID / Task ID). */
  filterLabel: string
  patchSearch: UsageLogsSearchPatcher
}

type FilterValues = Record<string, unknown>

/**
 * Shared filter bar for the drawing / task sections: an id keyword input,
 * an admin-only channel filter and a time range. State lives in the URL.
 */
export function SimpleLogsFilterBar(props: SimpleLogsFilterBarProps) {
  const { t } = useTranslation()
  const search = props.search

  const fields = useMemo<FilterField[]>(() => {
    const keywordField: FilterField = {
      key: 'filter',
      label: props.filterLabel,
      type: 'input',
      defaultValue: search.filter,
    }
    const channelField: FilterField = {
      key: 'channel',
      label: t('Channel ID'),
      type: 'input',
      defaultValue: search.channel,
    }
    const timeFields: FilterField[] = [
      {
        key: 'startTime',
        label: t('Start Time'),
        type: 'custom',
        defaultValue: unixMsToDate(search.startTime),
        render: (value, onChange) => (
          <DateTimePicker
            size='sm'
            placeholder={t('Start Time')}
            value={value instanceof Date ? value : null}
            onChange={(date) => onChange('startTime', date)}
          />
        ),
      },
      {
        key: 'endTime',
        label: t('End Time'),
        type: 'custom',
        defaultValue: unixMsToDate(search.endTime),
        render: (value, onChange) => (
          <DateTimePicker
            size='sm'
            placeholder={t('End Time')}
            value={value instanceof Date ? value : null}
            onChange={(date) => onChange('endTime', date)}
          />
        ),
      },
    ]
    return props.admin
      ? [keywordField, channelField, ...timeFields]
      : [keywordField, ...timeFields]
  }, [props.admin, props.filterLabel, search, t])

  const handleSearch = (values: FilterValues) => {
    props.patchSearch((prev) => ({
      ...prev,
      page: undefined,
      filter: filterTextValue(values.filter),
      channel: props.admin ? filterTextValue(values.channel) : undefined,
      startTime: filterDateMsValue(values.startTime),
      endTime: filterDateMsValue(values.endTime),
    }))
  }

  const handleReset = () => {
    props.patchSearch((prev) => ({
      ...prev,
      page: undefined,
      filter: undefined,
      channel: undefined,
      startTime: undefined,
      endTime: undefined,
    }))
  }

  return (
    <div className='sharp-card p-4 border border-zinc-800'>
      <FilterBar
        key={JSON.stringify(search)}
        fields={fields}
        onSearch={handleSearch}
        onReset={handleReset}
      />
    </div>
  )
}
