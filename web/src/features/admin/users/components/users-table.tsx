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

import { useTranslation } from 'react-i18next'

import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { getRoleLabelKey } from '@/lib/roles'
import { cn } from '@/lib/utils'

import { USER_STATUS } from '../constants'
import type { User } from '../types'
import { UserRowActions } from './user-row-actions'

export type UsersTableProps = {
  items: User[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (user: User) => void
  onQuota: (user: User) => void
}

/**
 * Hardcore industrial users table matching the terminal prototype:
 * sharp borders, monospace typography, uppercase headers, and .status-tag tags.
 */
export function UsersTable(props: UsersTableProps) {
  const { t } = useTranslation()
  const totalPages = Math.ceil(props.total / props.pageSize)

  return (
    <div className="w-full border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <div className="w-full overflow-x-auto admin-no-scrollbar">
        <table className="w-full text-left text-xs mono whitespace-nowrap">
          <thead className="bg-zinc-900 text-zinc-500 uppercase border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-medium">{t('ID')}</th>
              <th className="py-3 px-4 font-medium">{t('Username')}</th>
              <th className="py-3 px-4 font-medium">{t('Display Name')}</th>
              <th className="py-3 px-4 font-medium">{t('Role')}</th>
              <th className="py-3 px-4 font-medium">{t('Group')}</th>
              <th className="py-3 px-4 font-medium">{t('Status')}</th>
              <th className="py-3 px-4 font-medium">{t('Quota')}</th>
              <th className="py-3 px-4 font-medium">{t('Used Quota')}</th>
              <th className="py-3 px-4 font-medium">{t('Created At')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {props.loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-zinc-600 mono">
                  {t('Loading...')}
                </td>
              </tr>
            ) : props.items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-zinc-600 mono">
                  {t('No users found')}
                </td>
              </tr>
            ) : (
              props.items.map((user) => {
                const isEnabled = user.status === USER_STATUS.ENABLED
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-zinc-500">{user.id}</td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-[180px] truncate">
                      {user.username}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 max-w-[180px] truncate">
                      {user.display_name || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      {t(getRoleLabelKey(Number(user.role)))}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {user.group || 'default'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'status-tag',
                          isEnabled ? 'text-emerald-500' : 'text-zinc-500'
                        )}
                      >
                        {isEnabled ? t('Enabled') : t('Disabled')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      {formatQuota(user.quota)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">
                      {formatQuota(user.used_quota)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">
                      {user.created_at ? formatTimestampToDate(user.created_at) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <UserRowActions
                        user={user}
                        onEdit={props.onEdit}
                        onQuota={props.onQuota}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 极简工业风底部分页 */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-zinc-800 bg-[#0c0c0c] text-xs mono text-zinc-500 gap-3">
        <div>
          PAGE <span className="text-white">{props.page}</span> OF{' '}
          <span className="text-white">{totalPages || 1}</span> ({props.total} TOTAL)
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={props.page <= 1 || props.loading}
            onClick={() => props.onPageChange(props.page - 1, props.pageSize)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            PREV
          </button>
          <button
            type="button"
            disabled={props.page >= totalPages || props.loading}
            onClick={() => props.onPageChange(props.page + 1, props.pageSize)}
            className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  )
}
