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

type AdminPageProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Industrial admin page wrapper:
 * Hard horizontal border, monospace title, sub-label, and top action buttons.
 */
export function AdminPage(props: AdminPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-white mono">
            {props.title}
          </h1>
          {props.description && (
            <p className="text-xs text-zinc-500 mt-1 mono">
              {props.description}
            </p>
          )}
        </div>
        {props.actions && (
          <div className="flex items-center space-x-3 shrink-0">{props.actions}</div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6">{props.children}</div>
    </div>
  )
}
