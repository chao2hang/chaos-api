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
import {
  BoxesIcon,
  CreditCardIcon,
  FileClockIcon,
  PlugZapIcon,
  RadioTowerIcon,
  ServerCogIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon,
} from 'lucide-react'
import type { MenuItem } from '@chaos_team/chaos-ui/layout'

import { ROLE } from '@/lib/roles'

type AdminMenuItemConfig = {
  key: string
  labelKey: string
  href: string
  icon: React.ReactNode
  requiredRole?: number
}

const ADMIN_MENU_CONFIG: AdminMenuItemConfig[] = [
  {
    key: '/admin/channels',
    labelKey: 'Channels',
    href: '/admin/channels',
    icon: <RadioTowerIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/users',
    labelKey: 'Users',
    href: '/admin/users',
    icon: <UsersIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/usage-logs',
    labelKey: 'Usage Logs',
    href: '/admin/usage-logs/common',
    icon: <FileClockIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/models',
    labelKey: 'Models',
    href: '/admin/models',
    icon: <BoxesIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/redemption-codes',
    labelKey: 'Redemption Codes',
    href: '/admin/redemption-codes',
    icon: <TicketIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/subscriptions',
    labelKey: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: <CreditCardIcon className='size-4' aria-hidden='true' />,
  },
  {
    key: '/admin/system-settings',
    labelKey: 'System Settings',
    href: '/admin/system-settings',
    icon: <SettingsIcon className='size-4' aria-hidden='true' />,
    requiredRole: ROLE.SUPER_ADMIN,
  },
  {
    key: '/admin/task-plugins',
    labelKey: 'Task Plugins',
    href: '/admin/task-plugins',
    icon: <PlugZapIcon className='size-4' aria-hidden='true' />,
    requiredRole: ROLE.SUPER_ADMIN,
  },
  {
    key: '/admin/system-info',
    labelKey: 'System Info',
    href: '/admin/system-info',
    icon: <ServerCogIcon className='size-4' aria-hidden='true' />,
    requiredRole: ROLE.SUPER_ADMIN,
  },
]

/**
 * Build the admin console sidebar menu, filtered by the current user's
 * role. Each entry links into the dedicated `/admin` route section.
 */
export function buildAdminMenuItems(
  role: number | undefined,
  t: (key: string) => string
): MenuItem[] {
  const effectiveRole = role ?? ROLE.GUEST
  return ADMIN_MENU_CONFIG.filter(
    (item) =>
      item.requiredRole === undefined || effectiveRole >= item.requiredRole
  ).map((item) => ({
    key: item.key,
    label: t(item.labelKey),
    icon: item.icon,
    href: item.href,
  }))
}
