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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchTaskLogs } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { buildTaskLogQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import type { TaskLog, UsageLogsSearchPatcher } from '../types'
import { CopyableText } from './copyable-text'
import { LogStatusTag } from './log-status-tag'
import { formatTimestampToDate } from '@/lib/format'

type TaskLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

type TaskColumns = SearchTableProps<TaskLog>['columns']

/** Server-paginated table for async task logs (`/api/task[/self]`). */
export function TaskLogsTable(props: TaskLogsTableProps) {
  const { t } = useTranslation()

  const params = buildTaskLogQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'task', props.admin, params],
    queryFn: () => fetchTaskLogs(props.admin, params),
    placeholderData: (previous) => previous,
  })

  const columns = useMemo<TaskColumns>(() => {
    const columns: TaskColumns = [
      {
        key: 'time',
        title: t('Time'),
        width: 160,
        render: (_value, record) => (
          <span className='text-xs'>{formatTimestampToDate(record.submit_time)}</span>
        ),
      },
      {
        key: 'task_id',
        title: t('Task ID'),
        width: 180,
        render: (_value, record) => (
          <CopyableText text={record.task_id} displayLength={10} />
        ),
      },
    ]
    if (props.admin) {
      columns.push(
        {
          key: 'username',
          title: t('User'),
          width: 120,
          ellipsis: true,
          render: (_value, record) =>
            record.username ? record.username : `#${record.user_id}`,
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
        key: 'platform',
        title: t('Platform'),
        width: 110,
        ellipsis: true,
        render: (_value, record) => record.platform || '-',
      },
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
        key: 'finish_time',
        title: t('Finish Time'),
        width: 160,
        render: (_value, record) => (
          <span className='text-xs'>{formatTimestampToDate(record.finish_time)}</span>
        ),
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
      emptyText={t('No task logs found')}
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
