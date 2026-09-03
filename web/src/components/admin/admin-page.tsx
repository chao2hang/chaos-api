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
import { PageHeader } from '@chaos_team/chaos-ui/business'
import type { ReactNode } from 'react'

type AdminPageProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Standard admin console page scaffold: a padded content frame with a
 * chaos-ui `PageHeader` followed by the page body. All admin pages use
 * this to keep spacing, heading hierarchy and action placement uniform.
 */
export function AdminPage(props: AdminPageProps) {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6'>
      <PageHeader
        title={props.title}
        description={props.description}
        actions={props.actions}
        size='sm'
      />
      <div className='flex min-h-0 flex-1 flex-col gap-4'>{props.children}</div>
    </div>
  )
}
