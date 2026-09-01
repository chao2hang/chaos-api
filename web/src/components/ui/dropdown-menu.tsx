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
import { DropdownMenuItem as ChaosDropdownMenuItem } from '@chaos_team/chaos-ui/ui'
import * as React from 'react'

import {
  handleDropdownMenuItemSelect,
  type DropdownMenuItemSelectHandler,
} from './dropdown-menu-events'

type DropdownMenuItemProps = Omit<
  React.ComponentProps<typeof ChaosDropdownMenuItem>,
  'onClick' | 'onSelect'
> & {
  onClick?: React.MouseEventHandler<HTMLElement>
  /**
   * Radix-style select handler: runs after `onClick`, and calling
   * `event.preventDefault()` keeps the Base UI menu open.
   */
  onSelect?: DropdownMenuItemSelectHandler
}

function DropdownMenuItem(props: DropdownMenuItemProps) {
  const { onClick, onSelect, ...itemProps } = props
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      handleDropdownMenuItemSelect(event, onClick, onSelect)
    },
    [onClick, onSelect]
  )

  return (
    <ChaosDropdownMenuItem
      onClick={onClick || onSelect ? handleClick : undefined}
      {...itemProps}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@chaos_team/chaos-ui/ui'
export { DropdownMenuItem }
export type {
  DropdownMenuItemSelectEvent,
  DropdownMenuItemSelectHandler,
} from './dropdown-menu-events'
