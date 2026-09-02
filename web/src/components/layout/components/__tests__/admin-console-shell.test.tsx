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
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { AdminConsoleShell } from '../admin-console-shell'

vi.mock('@/hooks/use-sidebar-view', () => ({
  useSidebarView: () => ({
    key: '__root',
    view: null,
    navGroups: [
      {
        id: 'general',
        title: 'General',
        items: [
          { title: 'API Keys', url: '/keys' },
          { title: 'Wallet', url: '/wallet' },
        ],
      },
    ],
  }),
}))

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    popoverOpen: false,
    setPopoverOpen: vi.fn(),
    unreadCount: 0,
    activeTab: 'notice',
    setActiveTab: vi.fn(),
    notice: '',
    announcements: [],
    loading: false,
  }),
}))

vi.mock('@/components/notification-popover', () => ({
  NotificationPopover: () => <div data-testid='console-notifications' />,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div data-testid='console-profile' />,
}))
vi.mock('@/components/search', () => ({
  Search: () => <div data-testid='console-search' />,
}))
vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid='console-language' />,
}))
vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => <div data-testid='console-config' />,
}))
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({ logo: '/logo.png', systemName: 'chaos-api' }),
}))
vi.mock('@/lib/cookies', () => ({
  getCookie: () => 'true',
}))

function renderShellAt(path: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <AdminConsoleShell>
        <div>page-content</div>
      </AdminConsoleShell>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(<RouterProvider router={router} />)
}

describe('AdminConsoleShell composition', () => {
  test('renders nav groups as sidebar links and injects business chrome slots', async () => {
    renderShellAt('/keys')

    const keysLink = await screen.findByRole('link', { name: /API Keys/ })
    expect(keysLink).toHaveAttribute('href', '/keys')
    expect(await screen.findByRole('link', { name: /Wallet/ })).toHaveAttribute(
      'href',
      '/wallet'
    )

    expect(screen.getByTestId('console-search')).toBeInTheDocument()
    expect(screen.getByTestId('console-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('console-profile')).toBeInTheDocument()
    expect(screen.getByTestId('console-config')).toBeInTheDocument()
    expect(screen.getByTestId('console-language')).toBeInTheDocument()
    expect(screen.getByText('page-content')).toBeInTheDocument()
  })
})
