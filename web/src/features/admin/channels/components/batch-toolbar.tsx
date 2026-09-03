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

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@chaos_team/chaos-ui'
import { ConfirmDialog } from '@chaos_team/chaos-ui/business'

export interface BatchToolbarProps {
  selectedIds: number[]
  disabled: boolean
  onClear: () => void
  onBatchStatus: (ids: number[], status: number) => void
  onBatchDelete: (ids: number[]) => void
}

/** Actions shown when rows are selected: batch enable/disable/delete. */
export function BatchToolbar(props: BatchToolbarProps) {
  const { t } = useTranslation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  if (props.selectedIds.length === 0) {
    return null
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-muted-foreground text-sm'>
        {t('{{count}} selected', { count: props.selectedIds.length })}
      </span>
      <Button
        size='sm'
        variant='outline'
        disabled={props.disabled}
        onClick={() => props.onBatchStatus(props.selectedIds, 1)}
      >
        {t('Enable')}
      </Button>
      <Button
        size='sm'
        variant='outline'
        disabled={props.disabled}
        onClick={() => props.onBatchStatus(props.selectedIds, 2)}
      >
        {t('Disable')}
      </Button>
      <Button
        size='sm'
        variant='destructive'
        disabled={props.disabled}
        onClick={() => setDeleteOpen(true)}
      >
        {t('Delete')}
      </Button>
      <Button size='sm' variant='ghost' onClick={props.onClear}>
        {t('Clear selection')}
      </Button>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete selected channels?')}
        description={t('This will permanently delete {{count}} channels.', {
          count: props.selectedIds.length,
        })}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant='destructive'
        onConfirm={() => {
          setDeleteOpen(false)
          props.onBatchDelete(props.selectedIds)
        }}
      />
    </div>
  )
}
