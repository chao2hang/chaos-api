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
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ProfileDropdown } from '@/components/profile-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import type { TopNavLink } from '../types'

export interface PublicHeaderProps {
  /**
   * The public header intentionally renders only the site title (left)
   * plus the user's avatar (right) — or a sign-in link for guests. The
   * options below are kept for API compatibility with existing callers
   * but are not rendered.
   */
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  logo?: React.ReactNode
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

export function PublicHeader(props: PublicHeaderProps) {
  const { siteName: customSiteName, homeUrl = '/' } = props

  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const { auth } = useAuthStore()
  const { systemName, loading } = useSystemConfig()

  const isAuthenticated = !!auth.user
  const displaySiteName = customSiteName || systemName || DEFAULT_SYSTEM_NAME

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className='pointer-events-none fixed inset-x-0 top-0 z-50'>
      <div
        className={cn(
          'pointer-events-auto mx-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
          scrolled ? 'max-w-[52rem] px-3 pt-3' : 'max-w-7xl px-4 pt-0 md:px-6'
        )}
      >
        <nav
          className={cn(
            'flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
            scrolled
              ? 'bg-background/60 ring-border/50 h-12 rounded-2xl pr-1.5 pl-4 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.02)] ring-[0.5px] backdrop-blur-2xl dark:shadow-[0_2px_16px_-6px_rgba(0,0,0,0.4)]'
              : 'h-16 px-2'
          )}
        >
          {/* Site title */}
          <Link
            to={homeUrl}
            className='group flex shrink-0 items-center gap-2.5'
          >
            <span className='text-sm font-semibold tracking-tight'>
              {loading ? <Skeleton className='h-4 w-16' /> : displaySiteName}
            </span>
          </Link>

          {/* Right side: user avatar (signed in) or sign-in entry (guests) */}
          {isAuthenticated ? (
            <ProfileDropdown />
          ) : (
            <Link
              to='/sign-in'
              className='text-foreground/80 hover:bg-accent/60 hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors'
            >
              {t('Sign in')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
