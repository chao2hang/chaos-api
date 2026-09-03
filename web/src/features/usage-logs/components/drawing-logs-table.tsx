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
import { SearchTable, type SearchTableProps } from '@chaos_team/chaos-ui/business'
import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchMjLogs } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { buildDrawingLogQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import type { MidjourneyLog, UsageLogsSearchPatcher } from '../types'
import { LogStatusTag } from './log-status-tag'
import { formatTimestampToDate } from '@/lib/format'

type DrawingLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

type MjColumns = SearchTableProps<MidjourneyLog>['columns']

/** Server-paginated table for drawing (Midjourney) logs (`/api/mj[/self]`). */
export function DrawingLogsTable(props: DrawingLogsTableProps) {
  const { t } = useTranslation()

  const params = buildDrawingLogQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'mj', props.admin, params],
    queryFn: () => fetchMjLogs(props.admin, params),
    placeholderData: (previous) => previous,
  })

  const columns = useMemo<MjColumns>(() => {
    const columns: MjColumns = [
      {
        key: 'time',
        title: t('Time'),
        width: 160,
        render: (_value, record) => (
          <span className='text-xs'>{formatTimestampToDate(record.submit_time)}</span>
        ),
      },
      {
        key: 'mj_id',
        title: t('MJ ID'),
        width: 160,
        ellipsis: true,
        render: (_value, record) => record.mj_id || '-',
      },
    ]
    if (props.admin) {
      columns.push(
        {
          key: 'user_id',
          title: t('User'),
          width: 90,
          render: (_value, record) => `#${record.user_id}`,
        },
        {
          key: 'channel_id',
          title: t('Channel'),
          width: 100,
          render: (_value, record) => (record.channel_id > 0 ? `#${record.channel_id}` : '-'),
        }
      )
    }
    columns.push(
      {
        key: 'action',
        title: t('Action'),
        width: 110,
        ellipsis: true,
        render: (_value, record) => record.action || '-',
      },
      {
        key: 'status',
        title: t('Status'),
        width: 120,
        render: (_value, record) => <LogStatusTag status={record.status} />,
      },
      {
        key: 'progress',
        title: t('Progress'),
        width: 90,
        render: (_value, record) => record.progress || '-',
      },
      {
        key: 'image_url',
        title: t('Image'),
        width: 220,
        render: (_value, record) => renderImageUrlLink(record.image_url, t),
      }
    )
    return columns
  }, [props.admin, t])

  return (
    <SearchTable
      columns={columns}
      dataSource={data?.items ?? []}
      rowKey='id'
      loading={isPending}
      emptyText={t('No drawing logs found')}
      pagination={{
        current: props.search.page ?? 1,
        pageSize: props.search.pageSize ?? DEFAULT_PAGE_SIZE,
        total: data?.total ?? 0,
        onChange: (nextPage, nextPageSize) => {
          props.patchSearch((prev) => ({
            ...prev,
            page: nextPage <= 1 ? undefined : nextPage,
            pageSize: nextPageSize,
          }))
        },
      }}
    />
  )
}

function renderImageUrlLink(
  imageUrl: string,
  t: (key: string) => string
): ReactNode {
  if (!imageUrl) {
    return '-'
  }
  return (
    <a
      className='text-primary max-w-[220px] truncate text-xs underline-offset-2 hover:underline'
      href={imageUrl}
      target='_blank'
      rel='noreferrer'
      title={imageUrl}
    >
      {t('Open image')}
    </a>
  )
}
