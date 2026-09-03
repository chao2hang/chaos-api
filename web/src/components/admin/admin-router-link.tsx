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
import type { AdminSiderLinkComponent } from '@chaos_team/chaos-ui/layout'
import { Link } from '@tanstack/react-router'

/**
 * Adapts TanStack Router's `Link` to chaos-ui's `AdminSiderLinkComponent`
 * contract so sidebar navigation stays client-side (no full page reloads).
 */
export const AdminRouterLink: AdminSiderLinkComponent = (props) => {
  return (
    <Link
      to={props.href as React.ComponentProps<typeof Link>['to']}
      className={props.className}
      onClick={props.onClick}
      aria-current={props['aria-current']}
      data-slot={props['data-slot']}
      data-menu-key={props['data-menu-key']}
      data-active-branch={props['data-active-branch']}
      style={props.style}
    >
      {props.children}
    </Link>
  )
}
