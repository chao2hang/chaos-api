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
import { AnimatedOutlet } from '@/components/page-transition'
import { SkipToMain } from '@/components/skip-to-main'
import { SearchProvider } from '@/context/search-provider'

import { AdminConsoleShell } from './admin-console-shell'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

/**
 * Authenticated console layout.
 *
 * The shell (header, sidebar, content frame) is chaos-ui's `AdminShell`
 * via {@link AdminConsoleShell}; global search (⌘K) and the command menu
 * are provided by `SearchProvider`.
 */
export function AuthenticatedLayout(props: AuthenticatedLayoutProps) {
  return (
    <SearchProvider>
      <SkipToMain />
      <AdminConsoleShell>
        {props.children ?? <AnimatedOutlet />}
      </AdminConsoleShell>
    </SearchProvider>
  )
}
