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
 * Obsidian black (#0a0a0a), sharp borders (#262626), pure white accents,
 * JetBrains Mono accents, and strict razor-thin divisions.
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
      <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5] select-text">
        {/* 侧边栏：极致简约工业风 */}
        <aside className="w-64 border-r border-[#262626] flex flex-col p-6 bg-[#0a0a0a] shrink-0 select-none">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-5 h-5 bg-white flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 bg-black" />
            </div>
            <div>
              <span className="text-xs font-black tracking-widest block text-white mono">
                CHAOS_API
              </span>
              <span className="text-[9px] text-zinc-500 tracking-wider block mono uppercase">
                {t('Enterprise Core')}
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto admin-no-scrollbar">
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
                            'nav-item block py-1 text-xs tracking-wide transition-colors cursor-pointer',
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

          <div className="mt-auto pt-6 border-t border-zinc-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-sm flex items-center justify-center mono text-xs text-white font-bold shrink-0">
                {userInitial}
              </div>
              <div className="text-xs min-w-0">
                <p className="text-white font-medium truncate mono">{username}</p>
                <p className="text-zinc-500 mono text-[10px]">v2.4.0-stable</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900">
              <Link
                to="/dashboard"
                className="text-zinc-500 hover:text-white mono text-[10px] tracking-wider uppercase transition-colors cursor-pointer"
              >
                ← {t('Back to Console')}
              </Link>
              <div className="opacity-70 hover:opacity-100 transition-opacity">
                <LanguageSwitcher />
              </div>
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
              {headerAction ? (
                headerAction
              ) : (
                <Link
                  to="/admin/channels"
                  search={{ page: 1, pageSize: 10, filter: '', status: [], type: [], group: '' }}
                  className="bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-tight hover:bg-zinc-200 transition-colors mono cursor-pointer"
                >
                  {t('Deploy New')}
                </Link>
              )}
            </div>
          </header>

          {/* 页面内容注入 */}
          <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
            <div className="p-8 max-w-7xl mx-auto w-full">
              {props.children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </AdminHeaderActionContext.Provider>
  )
}
