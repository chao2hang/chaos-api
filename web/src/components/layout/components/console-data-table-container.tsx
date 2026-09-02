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
import { cn } from '@/lib/utils'

type ConsoleDataTableContainerProps = {
  children: ReactNode
  className?: string
  fixedHeader?: boolean
}

/**
 * Standard full-height fixed-header data table container for console pages,
 * designed to work with Table from @chaos_team/chaos-ui/ui.
 *
 * When fixedHeader is true, the container reserves vertical space for
 * the table toolbar + sticky header, and makes the table body scroll
 * independently without spilling the page layout.
 */
export function ConsoleDataTableContainer(props: ConsoleDataTableContainerProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-hidden rounded-lg border',
        props.fixedHeader && 'flex flex-col',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
