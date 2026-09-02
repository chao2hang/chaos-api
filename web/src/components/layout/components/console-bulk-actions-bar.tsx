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
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConsoleBulkActionsBarProps = {
  selectedCount: number
  onClearSelection: () => void
  actions?: ReactNode
  className?: string
}

/**
 * Floating bulk actions bar anchored to the bottom of the page,
 * shown when one or more rows in the current table are selected.
 */
export function ConsoleBulkActionsBar(props: ConsoleBulkActionsBarProps) {
  const { t } = useTranslation()

  if (props.selectedCount === 0) return null

  return (
    <div
      className={cn(
        'sticky bottom-2 left-2 right-2 z-10 flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg backdrop-blur-sm',
        props.className
      )}
    >
      <span className='text-sm text-muted-foreground'>
        {t('Selected {{count}} items', { count: props.selectedCount })}
      </span>
      <div className='flex-1' />
      {props.actions}
      <Button variant='secondary' size='sm' onClick={props.onClearSelection}>
        {t('Cancel')}
      </Button>
    </div>
  )
}
