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
  AdminShell,
  type AdminSiderLinkComponent,
} from '@chaos_team/chaos-ui/layout'
import { Link, useLocation } from '@tanstack/react-router'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { useNotifications } from '@/hooks/use-notifications'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { getCookie } from '@/lib/cookies'

import { buildConsoleMenuItems } from './admin-console-menu'

/**
 * Adapts TanStack Router's `Link` to chaos-ui's `AdminSiderLinkComponent`
 * contract so sidebar navigation stays client-side (no full page reloads).
 */
const RouterLink: AdminSiderLinkComponent = (props) => {
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

function SiderBrandLogo() {

  return (
    <span className='font-bold text-lg select-none'>
      Chaos
    </span>
  )
}

type AdminConsoleShellProps = {
  children?: ReactNode
}

/**
 * Authenticated console shell built on chaos-ui's `AdminShell`
 * (AdminHeader + AdminSider). Business chrome — notifications,
 * language, config drawer, profile — is injected through AdminShell's
 * slots; navigation data still comes from the URL-driven
 * `useSidebarView` (root nav vs. nested workspace views).
 */
export function AdminConsoleShell(props: AdminConsoleShellProps) {
  const { t } = useTranslation()
  const { view, navGroups } = useSidebarView()
  const pathname = useLocation({ select: (location) => location.pathname })
  const notifications = useNotifications()

  const menuItems = useMemo(
    () =>
      buildConsoleMenuItems(
        navGroups,
        view ? { label: t(view.parent.label), to: view.parent.to } : undefined
      ),
    [navGroups, view, t]
  )

  return (
    <AdminShell
      menuItems={menuItems}
      selectedMenuKey={pathname}
      selectedMatch='prefix'
      linkComponent={RouterLink}
      logo={<SiderBrandLogo />}
      logoCollapsed={
        <span className='font-bold select-none'>
          C
        </span>
      }
      userMenu={<ProfileDropdown />}
      notification={
        <NotificationPopover
          open={notifications.popoverOpen}
          onOpenChange={notifications.setPopoverOpen}
          unreadCount={notifications.unreadCount}
          activeTab={notifications.activeTab}
          onTabChange={notifications.setActiveTab}
          notice={notifications.notice}
          announcements={notifications.announcements}
          loading={notifications.loading}
        />
      }
      headerActions={
        <>
          <LanguageSwitcher />
          <ConfigDrawer />
        </>
      }
      defaultCollapsed={getCookie('sidebar_state') === 'false'}
      contentPadding={false}
      contentClassName='flex flex-col'
    >
      {props.children}
    </AdminShell>
  )
}
