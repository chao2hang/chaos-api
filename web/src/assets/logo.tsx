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
import { type SVGProps } from 'react'

import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='chaos-logo'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      width='24'
      fill='currentColor'
      role='img'
      aria-label='CHAOS_API'
      className={cn('size-6', className)}
      {...props}
    >
      <title>Chaos</title>
      {/* Modular "C" on a strict 4-unit grid + detached terminal cursor,
          offset slightly right on purpose: order with a fracture. */}
      <rect x='4' y='4' width='16' height='4' />
      <rect x='4' y='16' width='16' height='4' />
      <rect x='4' y='4' width='4' height='16' />
      <rect x='13' y='10' width='4' height='4' />
    </svg>
  )
}
