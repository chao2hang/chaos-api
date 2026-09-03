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
    <div className="sharp-card p-3 flex flex-wrap items-center gap-3 mono text-xs">
      <span className="text-zinc-400 font-medium">
        {t('{{count}} selected', { count: props.selectedIds.length })}
      </span>
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => props.onBatchStatus(props.selectedIds, 1)}
        className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer"
      >
        {t('Enable')}
      </button>
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => props.onBatchStatus(props.selectedIds, 2)}
        className="btn-industrial-secondary text-xs disabled:opacity-30 cursor-pointer"
      >
        {t('Disable')}
      </button>
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setDeleteOpen(true)}
        className="btn-industrial-danger text-xs disabled:opacity-30 cursor-pointer"
      >
        {t('Delete')}
      </button>
      <button
        type="button"
        onClick={props.onClear}
        className="text-zinc-500 hover:text-zinc-300 underline transition-colors cursor-pointer ml-auto"
      >
        {t('Clear selection')}
      </button>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete selected channels?')}
        description={t('This will permanently delete {{count}} channels.', {
          count: props.selectedIds.length,
        })}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
        onConfirm={() => {
          props.onBatchDelete(props.selectedIds)
          setDeleteOpen(false)
        }}
      />
    </div>
  )
}
