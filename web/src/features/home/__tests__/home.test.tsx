/*
Copyright (C) 2023-2026 QuantumNous

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

For commercial licensing, please contact support@quantumnous.com
*/
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Home } from '../index'

const homeContent = vi.hoisted(() => ({
  content: '',
  isLoaded: true,
  isUrl: false,
}))

vi.mock('../hooks', () => ({
  useHomePageContent: () => homeContent,
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}))

vi.mock('@/components/layout/components/footer', () => ({
  Footer: () => <footer />,
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: { content: string }) => (
    <div data-testid='custom-content'>{props.content}</div>
  ),
}))

vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: null } }),
}))

vi.mock('../components/sections/hero', () => ({ Hero: () => <section /> }))
vi.mock('../components/sections/stats', () => ({ Stats: () => <section /> }))
vi.mock('../components/sections/features', () => ({
  Features: () => <section />,
}))
vi.mock('../components/sections/how-it-works', () => ({
  HowItWorks: () => <section />,
}))
vi.mock('../components/sections/cta', () => ({ CTA: () => <section /> }))

afterEach(() => {
  cleanup()
  homeContent.content = ''
  homeContent.isLoaded = true
  homeContent.isUrl = false
  vi.restoreAllMocks()
})

describe('home page dynamic background', () => {
  it('shows the animated background when no custom homepage content is configured', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(<Home />)

    expect(document.querySelector('canvas')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })

  it('keeps configured custom homepage content in place of the default background', () => {
    homeContent.content = '<div>Custom home</div>'

    render(<Home />)

    expect(screen.getByTestId('custom-content')).toHaveTextContent(
      'Custom home'
    )
    expect(document.querySelector('canvas')).toBeNull()
  })
})
