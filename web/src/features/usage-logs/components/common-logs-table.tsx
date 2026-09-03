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
import { Tag } from '@chaos_team/chaos-ui'
import { SearchTable, type SearchTableProps } from '@chaos_team/chaos-ui/business'
import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchUsageLogs } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { buildUsageLogQueryParams } from '../lib/query-params'
import type { UsageLogsSearch } from '../lib/search-schema'
import type { UsageLog, UsageLogsSearchPatcher } from '../types'
import { CopyableText } from './copyable-text'
import { LogTypeBadge } from './log-type-badge'
import { TruncatedText } from './truncated-text'
import {
  formatLogQuota,
  formatNumber,
  formatTimestampToDate,
  formatUseTime,
} from '@/lib/format'

type CommonLogsTableProps = {
  search: UsageLogsSearch
  admin: boolean
  patchSearch: UsageLogsSearchPatcher
}

type LogColumns = SearchTableProps<UsageLog>['columns']

function renderStreamTag(
  isStream: boolean,
  t: (key: string) => string
): ReactNode {
  if (isStream) {
    return <Tag color='primary'>{t('Stream')}</Tag>
  }
  return <Tag color='default'>{t('Non-Stream')}</Tag>
}

function renderChannelCell(record: UsageLog): ReactNode {
  if (record.channel_name) {
    return `#${record.channel} ${record.channel_name}`
  }
  if (record.channel > 0) {
    return `#${record.channel}`
  }
  return '-'
}

/** Server-paginated table for common usage logs (`/api/log[/self]`). */
export function CommonLogsTable(props: CommonLogsTableProps) {
  const { t } = useTranslation()

  const params = buildUsageLogQueryParams(props.search, props.admin)
  const { data, isPending } = useQuery({
    queryKey: ['usage-logs', 'list', props.admin, params],
    queryFn: () => fetchUsageLogs(props.admin, params),
    placeholderData: (previous) => previous,
  })

  const columns = useMemo<LogColumns>(() => {
    const columns: LogColumns = [
      {
        key: 'time',
        title: t('Time'),
        width: 160,
        render: (_value, record) => (
          <span className='text-xs'>{formatTimestampToDate(record.created_at)}</span>
        ),
      },
    ]
    if (props.admin) {
      columns.push({
        key: 'username',
        title: t('Username'),
        width: 120,
        ellipsis: true,
        render: (_value, record) => record.username || '-',
      })
    }
    columns.push(
      {
        key: 'token_name',
        title: t('Token Name'),
        width: 130,
        ellipsis: true,
        render: (_value, record) => record.token_name || '-',
      },
      {
        key: 'model_name',
        title: t('Model'),
        width: 160,
        render: (_value, record) => (
          <TruncatedText text={record.model_name} displayLength={24} />
        ),
      },
      {
        key: 'prompt_tokens',
        title: t('Prompt Tokens'),
        width: 100,
        align: 'right',
        render: (_value, record) => formatNumber(record.prompt_tokens),
      },
      {
        key: 'completion_tokens',
        title: t('Completion Tokens'),
        width: 100,
        align: 'right',
        render: (_value, record) => formatNumber(record.completion_tokens),
      },
      {
        key: 'quota',
        title: t('Quota'),
        width: 110,
        align: 'right',
        render: (_value, record) => formatLogQuota(record.quota),
      },
      {
        key: 'use_time',
        title: t('Use Time'),
        width: 90,
        align: 'right',
        render: (_value, record) => formatUseTime(record.use_time),
      },
      {
        key: 'is_stream',
        title: t('Stream'),
        width: 100,
        render: (_value, record) => renderStreamTag(record.is_stream, t),
      },
      {
        key: 'type',
        title: t('Type'),
        width: 90,
        render: (_value, record) => <LogTypeBadge log={record} />,
      },
      {
        key: 'content',
        title: t('Content'),
        width: 240,
        render: (_value, record) => (
          <TruncatedText text={record.content} displayLength={40} />
        ),
      },
      {
        key: 'request_id',
        title: t('Request ID'),
        width: 180,
        render: (_value, record) => (
          <CopyableText text={record.request_id} displayLength={10} />
        ),
      }
    )
    if (props.admin) {
      columns.push(
        {
          key: 'channel',
          title: t('Channel'),
          width: 140,
          render: (_value, record) => renderChannelCell(record),
        },
        {
          key: 'group',
          title: t('Group'),
          width: 100,
          ellipsis: true,
          render: (_value, record) => record.group || '-',
        }
      )
    }
    return columns
  }, [props.admin, t])

  return (
    <SearchTable
      columns={columns}
      dataSource={data?.items ?? []}
      rowKey='id'
      loading={isPending}
      emptyText={t('No logs found')}
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
