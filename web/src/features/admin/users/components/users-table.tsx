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
import {
  SearchTable,
  type SearchTableProps,
} from '@chaos_team/chaos-ui/business'
import { useTranslation } from 'react-i18next'

import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'

import { USER_STATUS } from '../constants'
import type { User } from '../types'
import { UserRowActions } from './user-row-actions'

type UsersTableProps = {
  items: User[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (user: User) => void
  onQuota: (user: User) => void
}

type UserCellValue = User[keyof User]

export function UsersTable(props: UsersTableProps) {
  const { t } = useTranslation()

  const columns: SearchTableProps<User>['columns'] = [
    { key: 'id', title: t('ID'), dataIndex: 'id', width: 70 },
    { key: 'username', title: t('Username'), dataIndex: 'username' },
    {
      key: 'display_name',
      title: t('Display Name'),
      dataIndex: 'display_name',
      hideOnMobile: true,
    },
    {
      key: 'role',
      title: t('Role'),
      dataIndex: 'role',
      width: 100,
      render: (value: UserCellValue) => getRoleLabel(Number(value)),
    },
    { key: 'group', title: t('Group'), dataIndex: 'group', width: 110 },
    {
      key: 'status',
      title: t('Status'),
      dataIndex: 'status',
      width: 90,
      render: (value: UserCellValue) =>
        value === USER_STATUS.ENABLED ? (
          <Tag color='green'>{t('Enabled')}</Tag>
        ) : (
          <Tag color='gray'>{t('Disabled')}</Tag>
        ),
    },
    {
      key: 'quota',
      title: t('Quota'),
      dataIndex: 'quota',
      align: 'right',
      render: (value: UserCellValue) => formatQuota(Number(value)),
    },
    {
      key: 'used_quota',
      title: t('Used Quota'),
      dataIndex: 'used_quota',
      align: 'right',
      hideOnMobile: true,
      render: (value: UserCellValue) => formatQuota(Number(value)),
    },
    {
      key: 'request_count',
      title: t('Request Count'),
      dataIndex: 'request_count',
      align: 'right',
      hideOnMobile: true,
    },
    {
      key: 'last_login_at',
      title: t('Last Login'),
      dataIndex: 'last_login_at',
      hideOnMobile: true,
      render: (value: UserCellValue) => formatTimestampToDate(Number(value)),
    },
    {
      key: 'actions',
      title: t('Actions'),
      width: 170,
      align: 'right',
      render: (_value: UserCellValue, record: User) => (
        <UserRowActions
          user={record}
          onEdit={props.onEdit}
          onQuota={props.onQuota}
        />
      ),
    },
  ]

  return (
    <SearchTable<User>
      columns={columns}
      dataSource={props.items}
      rowKey='id'
      loading={props.loading}
      emptyText={t('No users found')}
      pagination={{
        current: props.page,
        pageSize: props.pageSize,
        total: props.total,
        onChange: props.onPageChange,
      }}
    />
  )
}
