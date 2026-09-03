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
import { AdminShell } from '@chaos_team/chaos-ui/layout'
import { Link, useLocation } from '@tanstack/react-router'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useAuthStore } from '@/stores/auth-store'

import { buildAdminMenuItems } from './admin-menu'
import { AdminRouterLink } from './admin-router-link'

function SiderBrandLogo() {
  return (
    <span className='font-bold text-lg select-none'>Chaos</span>
  )
}

function BackToConsoleLink() {
  const { t } = useTranslation()
  return (
    <Link
      to='/dashboard'
      className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors'
    >
      {t('Back to Console')}
    </Link>
  )
}

type AdminLayoutProps = {
  children?: ReactNode
}

/**
 * Dedicated admin console layout, rebuilt from scratch on chaos-ui's
 * `AdminShell`. Intentionally minimal: no global search, no theme
 * customization drawer — just navigation, language/theme switching and
 * the shared profile menu. Route-level `beforeLoad` guards enforce the
 * ADMIN role requirement; this component only shapes the chrome.
 */
export function AdminLayout(props: AdminLayoutProps) {
  const { t } = useTranslation()
  const userRole = useAuthStore((s) => s.auth.user?.role)
  const pathname = useLocation({ select: (location) => location.pathname })

  const menuItems = useMemo(
    () => buildAdminMenuItems(userRole, t),
    [userRole, t]
  )

  return (
    <AdminShell
      menuItems={menuItems}
      selectedMenuKey={pathname}
      selectedMatch='prefix'
      linkComponent={AdminRouterLink}
      logo={<SiderBrandLogo />}
      logoCollapsed={<span className='font-bold select-none'>C</span>}
      userMenu={<ProfileDropdown />}
      headerActions={
        <>
          <BackToConsoleLink />
          <LanguageSwitcher />
          <ThemeSwitch />
        </>
      }
      contentPadding={false}
      contentClassName='flex flex-col'
    >
      {props.children}
    </AdminShell>
  )
}
