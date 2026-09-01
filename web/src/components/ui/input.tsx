/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { Input as ChaosInput } from '@chaos_team/chaos-ui/ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

export type InputProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  /** Supports the legacy native numeric size and chaos-ui visual sizes. */
  size?: number | 'sm' | 'default'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    const { className, size, ...inputProps } = props
    const visualSize = size === 'sm' || size === 'default' ? size : undefined

    return (
      <ChaosInput
        ref={ref}
        {...inputProps}
        size={visualSize}
        className={cn(className)}
      />
    )
  }
)
Input.displayName = 'Input'
