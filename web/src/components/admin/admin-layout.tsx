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

import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/assets/logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { getAdminNavSections, getAdminPathBreadcrumb } from './admin-menu'

interface AdminHeaderActionContextValue {
  setHeaderAction: (node: ReactNode | null) => void
}

const AdminHeaderActionContext = createContext<AdminHeaderActionContextValue>({
  setHeaderAction: () => {},
})

export function useAdminHeaderAction(actionNode: ReactNode | null) {
  const ctx = useContext(AdminHeaderActionContext)
  useMemo(() => {
    ctx.setHeaderAction(actionNode)
  }, [actionNode, ctx])
}

type AdminLayoutProps = {
  children?: ReactNode
}

/**
 * Industrial minimalist Admin Layout referencing the terminal prototype.
 * Obsidian black (#0a0a0a), sharp borders (#262626), zero border-radius, pure white accents,
 * Space Grotesk / JetBrains Mono typography, and strict razor-thin divisions.
 */
export function AdminLayout(props: AdminLayoutProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const pathname = useLocation({ select: (location) => location.pathname })
  const [headerAction, setHeaderAction] = useState<ReactNode | null>(null)

  const navSections = useMemo(
    () => getAdminNavSections(user?.role),
    [user?.role]
  )

  const breadcrumb = useMemo(
    () => getAdminPathBreadcrumb(pathname),
    [pathname]
  )

  const username = user?.username || 'Root_Admin'
  const userInitial = username.slice(0, 2).toUpperCase()

  return (
    <AdminHeaderActionContext.Provider value={{ setHeaderAction }}>
      <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5] antialiased selection:bg-white selection:text-black">
        {/* 侧边栏：极致简约工业风 */}
        <aside className="w-64 border-r border-[#262626] flex flex-col justify-between p-6 bg-[#0a0a0a] shrink-0 select-none">
          <div className="flex-1 flex flex-col min-h-0">
            {/* 品牌 */}
            <div className="flex items-center space-x-3 mb-10 shrink-0">
              <Logo className="w-5 h-5 shrink-0 text-white" />
              <div>
                <span className="text-xs font-black tracking-widest block text-white mono">
                  CHAOS_API
                </span>
                <span className="text-[9px] text-zinc-500 tracking-wider block mono uppercase">
                  {t('Enterprise Core')}
                </span>
              </div>
            </div>

            {/* 导航 */}
            <nav className="space-y-6 overflow-y-auto admin-no-scrollbar flex-1 pr-1">
              {navSections.map((section) => (
                <div key={section.groupKey}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4 mono">
                    {t(section.groupTitle)}
                  </p>
                  <ul className="space-y-3 text-sm">
                    {section.items.map((item) => {
                      const isActive =
                        item.href === '/dashboard' || item.href === '/admin'
                          ? pathname === '/dashboard' ||
                            pathname.startsWith('/dashboard') ||
                            pathname === '/admin' ||
                            pathname === '/admin/'
                          : pathname.startsWith(item.pathPrefix)
                      return (
                        <li key={item.key}>
                          <Link
                            to={item.href as any}
                            className={cn(
                              'nav-item block py-1 pl-3 text-xs tracking-wide transition-colors cursor-pointer',
                              isActive
                                ? 'active text-white font-medium'
                                : 'text-zinc-500 hover:text-white'
                            )}
                          >
                            {t(item.label)}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* 底栏信息：严格复刻原型，纯方角头像 */}
          <div className="border-t border-zinc-800 pt-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center mono text-xs text-white font-bold shrink-0">
                {userInitial}
              </div>
              <div className="text-xs min-w-0">
                <p className="text-white font-medium truncate mono">{username}</p>
                <p className="text-zinc-500 mono text-[10px]">v2.4.0-stable</p>
              </div>
            </div>
            <div className="opacity-70 hover:opacity-100 transition-opacity shrink-0">
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0a]">
          {/* 顶栏：硬分割 */}
          <header className="h-16 border-b border-[#262626] flex items-center justify-between px-8 bg-[#0a0a0a] shrink-0">
            <div className="text-xs mono text-zinc-500 uppercase">
              PATH: <span className="text-zinc-300">{t(breadcrumb.sectionKey)} / {t(breadcrumb.pageKey)}</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 inline-block" />
                <span className="text-[10px] mono uppercase tracking-wider text-zinc-300">
                  {t('Server: Optimal')}
                </span>
              </div>
              {headerAction}
            </div>
          </header>

          {/* 画布区：完全贴合原型 */}
          <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
            {props.children ?? <Outlet />}
          </main>
        </div>
      </div>
    </AdminHeaderActionContext.Provider>
  )
}
