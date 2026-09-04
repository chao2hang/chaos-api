/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type AdminPageProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Stable React page shell for the industrial admin console.
 *
 * The visual primitives are owned by blbui's tokens and styles, while the
 * application wrapper intentionally stays in light DOM so routed page content
 * cannot disappear when a custom-element registry is still loading during HMR.
 */
export function AdminPage(props: AdminPageProps) {
  return (
    <div
      className={cn(
        'aui-root flex min-h-0 flex-1 flex-col gap-6',
        'text-[#e5e5e5]'
      )}
    >
      <header className='flex flex-col gap-4 border-b border-[#262626] pb-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <h1 className='mono truncate text-lg font-bold tracking-tight text-white uppercase'>
            {props.title}
          </h1>
          {props.description ? (
            <p className='mono mt-1 text-xs text-zinc-500'>
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions ? (
          <div className='flex shrink-0 flex-wrap items-center gap-3'>
            {props.actions}
          </div>
        ) : null}
      </header>
      <div className='flex min-h-0 flex-1 flex-col gap-6'>{props.children}</div>
    </div>
  )
}
