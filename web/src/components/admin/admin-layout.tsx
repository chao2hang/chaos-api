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
  // Register action node
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
        <aside className="w-60 border-r border-[#262626] flex flex-col p-6 bg-[#0a0a0a] shrink-0 select-none">
          <div className="mb-12">
            <Link to="/admin" className="block group">
              <div className="text-white font-bold text-lg tracking-tighter mono">
                CHAOS<span className="text-zinc-600">_API</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 tracking-[0.2em] uppercase">
                Enterprise Core
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto admin-no-scrollbar">
            {navSections.map((section) => (
              <div key={section.groupKey}>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">
                  {section.groupTitle}
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
                        <a
                          href={item.href}
                          className={cn(
                            'nav-item flex items-center',
                            isActive && 'active text-white'
                          )}
                        >
                          {item.label}
                        </a>
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
                <p className="text-white font-medium truncate">{username}</p>
                <p className="text-zinc-500 mono text-[10px]">v2.4.0-stable</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900">
              <Link
                to="/dashboard"
                className="text-zinc-500 hover:text-white mono text-[10px] tracking-wider uppercase transition-colors"
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
            <div className="text-xs mono text-zinc-500">
              PATH: <span className="text-zinc-300">{breadcrumb.section} / {breadcrumb.page}</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-green-500 inline-block"></span>
                <span className="text-[10px] mono uppercase tracking-wider text-zinc-300">Server: Optimal</span>
              </div>
              {headerAction ? (
                headerAction
              ) : (
                <a
                  href="/admin/channels"
                  className="bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-tight hover:bg-zinc-200 transition-colors mono"
                >
                  Deploy New
                </a>
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
