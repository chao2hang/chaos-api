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
import { describe, expect, test } from 'vitest'

import { resolveLegacyRoute } from './legacy-route'

describe('legacy frontend route migration', () => {
  test('maps former public and console routes to their current destinations', () => {
    const routes = {
      '/login': '/sign-in',
      '/forbidden': '/403',
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
      '/console/chat/42': '/dashboard',
    }

    for (const [source, target] of Object.entries(routes)) {
      expect(resolveLegacyRoute(source)).toBe(target)
    }
  })

  test('preserves search and hash while applying route-specific behavior', () => {
    expect(resolveLegacyRoute('/login?redirect=%2Fkeys#continue')).toBe(
      '/sign-in?redirect=%2Fkeys#continue'
    )
    expect(resolveLegacyRoute('/console/topup?source=email#orders')).toBe(
      '/wallet?source=email#orders'
    )
  })

  test('maps legacy settings tabs and retains unrelated parameters', () => {
    const settingsTabs = {
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

    for (const [tab, target] of Object.entries(settingsTabs)) {
      expect(
        resolveLegacyRoute(`/console/setting?tab=${tab}&from=bookmark#form`)
      ).toBe(`${target}?tab=${tab}&from=bookmark#form`)
    }
    expect(resolveLegacyRoute('/console/setting?tab=unknown')).toBe(
      '/admin/system-settings?tab=unknown'
    )
  })

  test('safely redirects unknown console locations without touching new routes', () => {
    expect(resolveLegacyRoute('/console/removed?page=2#old')).toBe(
      '/dashboard?page=2#old'
    )
    expect(resolveLegacyRoute('/dashboard')).toBe(null)
    expect(resolveLegacyRoute('/api/status')).toBe(null)
  })
})
