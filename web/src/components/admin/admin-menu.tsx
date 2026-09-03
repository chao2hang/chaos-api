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
import { ROLE } from '@/lib/roles'

export interface AdminNavSection {
  groupKey: string
  groupTitle: string
  items: AdminNavItem[]
}

export interface AdminNavItem {
  key: string
  label: string
  href: string
  pathPrefix: string
  requiredRole?: number
}

interface NavItemConfig {
  key: string
  label: string
  href: string
  pathPrefix: string
  requiredRole?: number
}

interface NavSectionConfig {
  groupKey: string
  groupTitle: string
  items: NavItemConfig[]
}

const ADMIN_SECTIONS_CONFIG: NavSectionConfig[] = [
  {
    groupKey: 'management',
    groupTitle: 'Management',
    items: [
      {
        key: 'console',
        label: 'Console',
        href: '/dashboard',
        pathPrefix: '/dashboard',
      },
      {
        key: 'distribution',
        label: 'Distribution',
        href: '/admin/channels',
        pathPrefix: '/admin/channels',
        requiredRole: ROLE.ADMIN,
      },
      {
        key: 'access-keys',
        label: 'Access Keys',
        href: '/keys',
        pathPrefix: '/keys',
      },
      {
        key: 'users',
        label: 'Users',
        href: '/admin/users',
        pathPrefix: '/admin/users',
        requiredRole: ROLE.ADMIN,
      },
      {
        key: 'models',
        label: 'Models',
        href: '/admin/models',
        pathPrefix: '/admin/models',
        requiredRole: ROLE.ADMIN,
      },
      {
        key: 'subscriptions',
        label: 'Subscriptions',
        href: '/admin/subscriptions',
        pathPrefix: '/admin/subscriptions',
        requiredRole: ROLE.ADMIN,
      },
      {
        key: 'redemptions',
        label: 'Redemptions',
        href: '/admin/redemption-codes',
        pathPrefix: '/admin/redemption-codes',
        requiredRole: ROLE.ADMIN,
      },
    ],
  },
  {
    groupKey: 'analysis',
    groupTitle: 'Analysis',
    items: [
      {
        key: 'traffic-logs',
        label: 'Traffic Logs',
        href: '/admin/usage-logs',
        pathPrefix: '/admin/usage-logs',
      },
      {
        key: 'usage-report',
        label: 'Usage Report',
        href: '/dashboard',
        pathPrefix: '/dashboard',
      },
      {
        key: 'system-info',
        label: 'System Info',
        href: '/admin/system-info',
        pathPrefix: '/admin/system-info',
        requiredRole: ROLE.SUPER_ADMIN,
      },
    ],
  },
  {
    groupKey: 'system',
    groupTitle: 'System',
    items: [
      {
        key: 'system-settings',
        label: 'System Settings',
        href: '/admin/system-settings',
        pathPrefix: '/admin/system-settings',
        requiredRole: ROLE.SUPER_ADMIN,
      },
      {
        key: 'task-plugins',
        label: 'Task Plugins',
        href: '/admin/task-plugins',
        pathPrefix: '/admin/task-plugins',
        requiredRole: ROLE.SUPER_ADMIN,
      },
    ],
  },
]

/**
 * Build the categorized admin sections, filtered by user role.
 */
export function getAdminNavSections(role: number | undefined): AdminNavSection[] {
  const effectiveRole = role ?? ROLE.GUEST
  return ADMIN_SECTIONS_CONFIG.map((section) => ({
    groupKey: section.groupKey,
    groupTitle: section.groupTitle,
    items: section.items.filter(
      (item) => item.requiredRole === undefined || effectiveRole >= item.requiredRole
    ),
  })).filter((section) => section.items.length > 0)
}

/**
 * Get path breadcrumb i18n keys based on the current pathname.
 */
export function getAdminPathBreadcrumb(pathname: string): { sectionKey: string; pageKey: string } {
  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard') ||
    pathname === '/admin' ||
    pathname === '/admin/'
  ) {
    return { sectionKey: 'System', pageKey: 'Dashboard' }
  }
  if (pathname.startsWith('/keys')) {
    return { sectionKey: 'Management', pageKey: 'Access Keys' }
  }
  if (pathname.startsWith('/admin/channels')) {
    return { sectionKey: 'Management', pageKey: 'Distribution' }
  }
  if (pathname.startsWith('/admin/users')) {
    return { sectionKey: 'Management', pageKey: 'Users' }
  }
  if (pathname.startsWith('/admin/models')) {
    return { sectionKey: 'Management', pageKey: 'Models' }
  }
  if (pathname.startsWith('/admin/subscriptions')) {
    return { sectionKey: 'Management', pageKey: 'Subscriptions' }
  }
  if (pathname.startsWith('/admin/redemption-codes')) {
    return { sectionKey: 'Management', pageKey: 'Redemptions' }
  }
  if (pathname.startsWith('/admin/usage-logs') || pathname.startsWith('/usage-logs')) {
    return { sectionKey: 'Analysis', pageKey: 'Traffic Logs' }
  }
  if (pathname.startsWith('/admin/system-info')) {
    return { sectionKey: 'Analysis', pageKey: 'System Info' }
  }
  if (pathname.startsWith('/admin/system-settings')) {
    return { sectionKey: 'System', pageKey: 'System Settings' }
  }
  if (pathname.startsWith('/admin/task-plugins')) {
    return { sectionKey: 'System', pageKey: 'Task Plugins' }
  }
  return { sectionKey: 'System', pageKey: 'Console' }
}
