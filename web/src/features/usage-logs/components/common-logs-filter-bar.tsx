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
import { FilterBar, MultiSelect, type FilterField } from '@chaos_team/chaos-ui/business'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  filterDateMsValue,
  filterLogTypeValue,
  filterTextValue,
} from '../lib/filter-values'
import type { UsageLogsSearch } from '../lib/search-schema'
import { unixMsToDate } from '../lib/time-range'
import { LOG_TYPE_OPTIONS } from '../constants'
import type { UsageLogsSearchPatcher } from '../types'

type CommonLogsFilterBarProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

type FilterValues = Record<string, unknown>

/** Filter bar for the common logs section; state lives in the URL. */
export function CommonLogsFilterBar(props: CommonLogsFilterBarProps) {
  const { t } = useTranslation()
  const search = props.search

  const fields = useMemo<FilterField[]>(() => {
    const baseFields: FilterField[] = [
      {
        key: 'type',
        label: t('Log Type'),
        type: 'custom',
        defaultValue: search.type ?? [],
        render: (value, onChange) => (
          <MultiSelect
            size='sm'
            clearable
            className='min-w-48'
            placeholder={t('All Types')}
            options={LOG_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(next) => onChange('type', next)}
          />
        ),
      },
      { key: 'model', label: t('Model'), type: 'input', defaultValue: search.model },
      { key: 'token', label: t('Token Name'), type: 'input', defaultValue: search.token },
      { key: 'group', label: t('Group'), type: 'input', defaultValue: search.group },
      { key: 'requestId', label: t('Request ID'), type: 'input', defaultValue: search.requestId },
      {
        key: 'upstreamRequestId',
        label: t('Upstream Request ID'),
        type: 'input',
        defaultValue: search.upstreamRequestId,
      },
    ]
    const adminFields: FilterField[] = [
      { key: 'username', label: t('Username'), type: 'input', defaultValue: search.username },
      { key: 'channel', label: t('Channel ID'), type: 'input', defaultValue: search.channel },
    ]
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
      ? [...baseFields.slice(0, 2), ...adminFields, ...baseFields.slice(2), ...timeFields]
      : [...baseFields, ...timeFields]
  }, [props.admin, search, t])

  const handleSearch = (values: FilterValues) => {
    props.patchSearch((prev) => ({
      ...prev,
      page: undefined,
      type: filterLogTypeValue(values.type),
      model: filterTextValue(values.model),
      token: filterTextValue(values.token),
      group: filterTextValue(values.group),
      requestId: filterTextValue(values.requestId),
      upstreamRequestId: filterTextValue(values.upstreamRequestId),
      username: props.admin ? filterTextValue(values.username) : undefined,
      channel: props.admin ? filterTextValue(values.channel) : undefined,
      startTime: filterDateMsValue(values.startTime),
      endTime: filterDateMsValue(values.endTime),
    }))
  }

  const handleReset = () => {
    props.patchSearch((prev) => ({
      ...prev,
      page: undefined,
      type: undefined,
      model: undefined,
      token: undefined,
      group: undefined,
      requestId: undefined,
      upstreamRequestId: undefined,
      username: undefined,
      channel: undefined,
      startTime: undefined,
      endTime: undefined,
    }))
  }

  // Remount the bar when the URL state changes so its draft values mirror
  // the applied filters (including back/forward navigation).
  return (
    <FilterBar
      key={JSON.stringify(props.search)}
      fields={fields}
      collapsible
      onSearch={handleSearch}
      onReset={handleReset}
    />
  )
}
