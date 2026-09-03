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

import { buildConsoleMenuItems } from '../admin-console-menu'

describe('console menu conversion', () => {
  test('converts nav groups into expandable sections that keep group labels', () => {
    const menu = buildConsoleMenuItems([
      {
        id: 'general',
        title: 'General',
        items: [
          { title: 'Overview', url: '/dashboard/overview' },
          { title: 'API Keys', url: '/keys' },
        ],
      },
      {
        id: 'personal',
        title: 'Personal',
        items: [{ title: 'Wallet', url: '/wallet' }],
      },
    ])

    expect(menu).toHaveLength(2)
    expect(menu[0]).toMatchObject({
      key: 'group:general',
      label: 'General',
    })
    expect(menu[0].children).toEqual([
      {
        key: '/dashboard/overview',
        label: 'Overview',
        href: '/dashboard/overview',
      },
      { key: '/keys', label: 'API Keys', href: '/keys' },
    ])
    expect(menu[1]).toMatchObject({ key: 'group:personal', label: 'Personal' })
  })

  test('nests collapsible nav items as parent menus with child links', () => {
    const menu = buildConsoleMenuItems([
      {
        title: 'System Administration',
        items: [
          {
            title: 'Site & Branding',
            items: [
              { title: 'General', url: '/admin/system-settings/site/general' },
              {
                title: 'Branding',
                url: '/admin/system-settings/site/branding',
              },
            ],
          },
        ],
      },
    ])

    const parent = menu[0].children?.[0]
    expect(parent).toMatchObject({
      key: 'section:Site & Branding',
      label: 'Site & Branding',
    })
    expect(parent?.children).toEqual([
      {
        key: '/admin/system-settings/site/general',
        label: 'General',
        href: '/admin/system-settings/site/general',
      },
      {
        key: '/admin/system-settings/site/branding',
        label: 'Branding',
        href: '/admin/system-settings/site/branding',
      },
    ])
  })

  test('prepends a back item when a drill-in back target is provided', () => {
    const menu = buildConsoleMenuItems(
      [{ title: 'Admin', items: [{ title: 'Channels', url: '/channels' }] }],
      { label: 'Back to Dashboard', to: '/dashboard/overview' }
    )

    expect(menu[0]).toMatchObject({
      key: '__back__',
      label: 'Back to Dashboard',
      href: '/dashboard/overview',
    })
    expect(menu).toHaveLength(2)
  })
})
