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
const legacyOrigin = 'https://legacy-route.invalid'

const legacyConsoleRoutes: Record<string, string> = {
  '/console': '/dashboard',
  '/console/models': '/admin/models',
  '/console/deployment': '/admin/models',
  '/console/subscription': '/admin/subscriptions',
  '/console/channel': '/admin/channels',
  '/console/token': '/keys',
  '/console/playground': '/dashboard',
  '/console/redemption': '/admin/redemption-codes',
  '/console/user': '/admin/users',
  '/console/personal': '/profile',
  '/console/log': '/usage-logs',
  '/console/midjourney': '/usage-logs/drawing',
  '/console/task': '/usage-logs/task',
}

const legacySettingsTabs: Record<string, string> = {
  operation: '/admin/system-settings',
  dashboard: '/admin/system-settings',
  chats: '/admin/system-settings',
  drawing: '/admin/system-settings',
  payment: '/admin/system-settings',
  ratio: '/admin/system-settings',
  ratelimit: '/admin/system-settings',
  models: '/admin/system-settings',
  'model-deployment': '/admin/system-settings',
  performance: '/admin/system-settings',
  system: '/admin/system-settings',
  other: '/admin/system-settings',
}

function normalizeLegacyPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}

function buildTargetHref(targetPath: string, source: URL): string {
  const target = new URL(targetPath, legacyOrigin)
  source.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })
  target.hash = source.hash
  return `${target.pathname}${target.search}${target.hash}`
}

export function resolveLegacyRoute(rawHref: string): string | null {
  let source: URL
  try {
    source = new URL(rawHref, legacyOrigin)
  } catch {
    return null
  }

  const pathname = normalizeLegacyPath(source.pathname)
  if (pathname === '/login') {
    return buildTargetHref('/sign-in', source)
  }
  if (pathname === '/forbidden') {
    return buildTargetHref('/403', source)
  }
  if (pathname === '/console/topup') {
    return buildTargetHref('/wallet', source)
  }
  if (pathname === '/console/setting') {
    const tab = source.searchParams.get('tab') ?? ''
    const target = legacySettingsTabs[tab] ?? '/admin/system-settings'
    return buildTargetHref(target, source)
  }
  if (pathname === '/console/chat' || pathname.startsWith('/console/chat/')) {
    return buildTargetHref('/dashboard', source)
  }

  const target = legacyConsoleRoutes[pathname]
  if (target) return buildTargetHref(target, source)
  if (pathname.startsWith('/console/')) {
    return buildTargetHref('/dashboard', source)
  }

  return null
}
