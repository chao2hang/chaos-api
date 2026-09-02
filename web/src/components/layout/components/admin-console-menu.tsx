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
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import type { MenuItem } from '@chaos_team/chaos-ui/layout'

import type {
  NavCollapsible,
  NavGroup,
  NavItem,
  NavLink,
  SidebarView,
} from '@/components/layout/types'

function renderNavIcon(icon: NavItem['icon']): ReactNode {
  if (!icon) return undefined
  const Icon = icon
  return <Icon className='size-4 shrink-0' aria-hidden='true' />
}

function navItemToMenuItem(item: NavItem): MenuItem {
  // `NavLink` declares `items?: never`, so the union cannot be narrowed with
  // `'items' in item`; probe the runtime shape instead.
  const children = (item as NavCollapsible).items
  if (children) {
    return {
      key: `section:${item.title}`,
      label: item.title,
      icon: renderNavIcon(item.icon),
      children: children.map((child) => ({
        key: child.url as string,
        label: child.title,
        href: child.url as string,
      })),
    }
  }

  const link = item as NavLink
  return {
    key: link.url as string,
    label: link.title,
    icon: renderNavIcon(link.icon),
    href: link.url as string,
    badge: link.badge,
  }
}

/**
 * Converts the app's nav groups (role-filtered, URL-driven) into chaos-ui
 * `MenuItem[]`. Each group becomes an expandable section so the group
 * labels (General / Personal / Admin) survive the data-driven sidebar.
 */
export function buildConsoleMenuItems(
  navGroups: NavGroup[],
  backTarget?: { label: string; to: SidebarView['parent']['to'] }
): MenuItem[] {
  const sections = navGroups.map((group) => ({
    key: `group:${group.id ?? group.title}`,
    label: group.title,
    children: group.items.map(navItemToMenuItem),
  }))

  if (!backTarget) return sections

  return [
    {
      key: '__back__',
      label: backTarget.label,
      href: backTarget.to,
      icon: <ChevronLeft className='size-4 shrink-0' aria-hidden='true' />,
    },
    ...sections,
  ]
}
