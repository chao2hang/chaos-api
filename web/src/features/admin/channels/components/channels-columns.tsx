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

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Tag } from '@chaos_team/chaos-ui'
import type { ProColumn } from '@chaos_team/chaos-ui/business'

import { formatCurrencyUSD, formatQuota } from '@/lib/format'

import { getChannelTypeLabel, CHANNEL_STATUS_META } from '../constants'
import { formatResponseTime, summarizeModels } from '../lib/format'
import type { Channel } from '../types'
import { ChannelRowActions } from './channel-row-actions'

export interface ChannelRowHandlers {
  onEdit: (channel: Channel) => void
  onToggleStatus: (channel: Channel) => void
  onTest: (channel: Channel) => void
  onCopy: (channel: Channel) => void
  onDelete: (channel: Channel) => void
}

export interface UseChannelColumnsParams {
  actionPending: boolean
  handlers: ChannelRowHandlers
}

function renderStatusCell(props: { value: string; label: string }) {
  const meta = CHANNEL_STATUS_META[Number(props.value)]
  return <Tag color={meta?.color ?? 'gray'}>{props.label}</Tag>
}

function renderModelsCell(props: { value: string }) {
  const summary = summarizeModels(props.value)
  if (summary.display === '') {
    return <span className='text-muted-foreground'>-</span>
  }
  return (
    <span>
      {summary.display}
      {summary.extra > 0 ? (
        <span className='text-muted-foreground'> +{summary.extra}</span>
      ) : null}
    </span>
  )
}

function renderTagCell(props: { value: string }) {
  if (props.value === '') {
    return <span className='text-muted-foreground'>-</span>
  }
  return <Tag color='blue'>{props.value}</Tag>
}

/** Column definitions of the channels ProTable. */
export function useChannelColumns(
  params: UseChannelColumnsParams
): ProColumn<Channel>[] {
  const { t } = useTranslation()
  const { actionPending, handlers } = params

  return useMemo<ProColumn<Channel>[]>(
    () => [
      {
        key: 'id',
        title: t('ID'),
        dataIndex: 'id',
        width: 70,
        render: (value: unknown) => (
          <span className='tabular-nums'>{String(value)}</span>
        ),
      },
      {
        key: 'name',
        title: t('Name'),
        dataIndex: 'name',
        width: 180,
        fixed: 'left',
      },
      {
        key: 'type',
        title: t('Type'),
        dataIndex: 'type',
        width: 110,
        render: (value: unknown) => getChannelTypeLabel(Number(value)),
      },
      {
        key: 'status',
        title: t('Status'),
        dataIndex: 'status',
        width: 110,
        render: (value: unknown) => {
          const meta = CHANNEL_STATUS_META[Number(value)]
          const label = meta ? t(meta.labelKey) : String(value)
          return renderStatusCell({ value: String(value), label })
        },
      },
      {
        key: 'group',
        title: t('Group'),
        dataIndex: 'group',
        width: 110,
      },
      {
        key: 'models',
        title: t('Models'),
        dataIndex: 'models',
        width: 240,
        render: (value: unknown) => renderModelsCell({ value: String(value ?? '') }),
      },
      {
        key: 'priority',
        title: t('Priority'),
        dataIndex: 'priority',
        width: 80,
        align: 'right',
        render: (value: unknown) => (
          <span className='tabular-nums'>{String(value ?? 0)}</span>
        ),
      },
      {
        key: 'weight',
        title: t('Weight'),
        dataIndex: 'weight',
        width: 80,
        align: 'right',
        render: (value: unknown) => (
          <span className='tabular-nums'>{String(value ?? 0)}</span>
        ),
      },
      {
        key: 'used_quota',
        title: t('Used Quota'),
        dataIndex: 'used_quota',
        width: 110,
        align: 'right',
        render: (value: unknown) => (
          <span className='tabular-nums'>
            {formatQuota(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'balance',
        title: t('Balance'),
        dataIndex: 'balance',
        width: 100,
        align: 'right',
        render: (value: unknown) => (
          <span className='tabular-nums'>
            {formatCurrencyUSD(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'response_time',
        title: t('Response Time'),
        dataIndex: 'response_time',
        width: 110,
        align: 'right',
        render: (value: unknown) => (
          <span className='tabular-nums'>
            {formatResponseTime(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'tag',
        title: t('Tag'),
        dataIndex: 'tag',
        width: 110,
        render: (value: unknown) => renderTagCell({ value: String(value ?? '') }),
      },
      {
        key: 'actions',
        title: t('Actions'),
        width: 190,
        fixed: 'right',
        render: (_value: unknown, record: Channel) => (
          <ChannelRowActions
            channel={record}
            disabled={actionPending}
            {...handlers}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, actionPending, handlers]
  )
}
