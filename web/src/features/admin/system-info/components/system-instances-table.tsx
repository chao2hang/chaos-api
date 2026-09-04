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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { SystemInstance } from '../types'
import { SystemInstanceRow } from './system-instance-row'

const COLUMN_COUNT = 11

type SystemInstancesTableProps = {
  instances: SystemInstance[]
  loading: boolean
  error: boolean
  deleting: boolean
  deletingNodeName: string | null
  onRetry: () => void
  onDeleteStale: (instance: SystemInstance) => void
}

/** Industrial cluster instance table: heartbeats, role, resource usage. */
export function SystemInstancesTable(props: SystemInstancesTableProps) {
  const { t } = useTranslation()

  let body: ReactNode
  if (props.loading) {
    body = (
      <tr>
        <td
          colSpan={COLUMN_COUNT}
          className='mono py-12 text-center text-zinc-600'
        >
          {t('Loading...')}
        </td>
      </tr>
    )
  } else if (props.error) {
    body = (
      <tr>
        <td colSpan={COLUMN_COUNT} className='mono py-12 text-center'>
          <div className='flex flex-col items-center gap-3'>
            <span className='text-xs text-zinc-500'>
              {t('We could not load instances.')}
            </span>
            <button
              type='button'
              onClick={props.onRetry}
              className='btn-industrial-secondary mono cursor-pointer text-xs'
            >
              {t('Retry')}
            </button>
          </div>
        </td>
      </tr>
    )
  } else if (props.instances.length === 0) {
    body = (
      <tr>
        <td
          colSpan={COLUMN_COUNT}
          className='mono py-12 text-center text-zinc-600'
        >
          {t('No instances have reported yet.')}
        </td>
      </tr>
    )
  } else {
    body = props.instances.map((instance) => (
      <SystemInstanceRow
        key={instance.node_name}
        instance={instance}
        deleting={props.deleting}
        isDeletingThisRow={
          props.deleting && props.deletingNodeName === instance.node_name
        }
        onDeleteStale={props.onDeleteStale}
      />
    ))
  }

  return (
    <div className='w-full overflow-hidden border border-zinc-800 bg-[#0a0a0a]'>
      <div className='admin-no-scrollbar w-full overflow-x-auto'>
        <table className='mono w-full whitespace-nowrap text-left text-xs'>
          <thead className='border-b border-zinc-800 bg-zinc-900 uppercase text-zinc-500'>
            <tr>
              <th className='px-4 py-3 font-medium'>{t('Instances')}</th>
              <th className='px-4 py-3 font-medium'>{t('Status')}</th>
              <th className='px-4 py-3 font-medium'>{t('Role')}</th>
              <th className='px-4 py-3 font-medium'>{t('CPU')}</th>
              <th className='px-4 py-3 font-medium'>{t('Memory')}</th>
              <th className='px-4 py-3 font-medium'>{t('Storage')}</th>
              <th className='px-4 py-3 font-medium'>{t('Version')}</th>
              <th className='px-4 py-3 font-medium'>{t('Runtime')}</th>
              <th className='px-4 py-3 font-medium'>{t('Started')}</th>
              <th className='px-4 py-3 font-medium'>{t('Last Seen')}</th>
              <th className='px-4 py-3 text-right font-medium'>
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-zinc-900 text-zinc-300'>
            {body}
          </tbody>
        </table>
      </div>
    </div>
  )
}
