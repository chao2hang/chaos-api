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

import { ProTable } from '@chaos_team/chaos-ui/business'

import type { Channel } from '../types'
import { useChannelColumns } from './channels-columns'

export interface ChannelsTableProps {
  data: Channel[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  actionPending: boolean
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (channel: Channel) => void
  onToggleStatus: (channel: Channel) => void
  onTest: (channel: Channel) => void
  onCopy: (channel: Channel) => void
  onDelete: (channel: Channel) => void
}

/** Paginated channels table with row selection and row actions. */
export function ChannelsTable(props: ChannelsTableProps) {
  const columns = useChannelColumns({
    actionPending: props.actionPending,
    handlers: {
      onEdit: props.onEdit,
      onToggleStatus: props.onToggleStatus,
      onTest: props.onTest,
      onCopy: props.onCopy,
      onDelete: props.onDelete,
    },
  })

  return (
    <ProTable<Channel>
      columns={columns}
      data={props.data}
      rowKey='id'
      loading={props.loading}
      density='compact'
      columnSettings={false}
      rowSelection={{
        selectedKeys: props.selectedIds.map(String),
        onChange: (keys: string[]) =>
          props.onSelectionChange(keys.map((key) => Number(key))),
        showCheckbox: true,
      }}
      pagination={{
        // ProTable pagination is 0-based; URL state is 1-indexed.
        current: Math.max(0, props.page - 1),
        pageSize: props.pageSize,
        total: props.total,
        onChange: (nextPage: number, nextPageSize: number) =>
          props.onPageChange(nextPage + 1, nextPageSize),
      }}
    />
  )
}
