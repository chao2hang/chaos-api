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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ChannelFilterBar } = await import('../channel-filter-bar')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Search': 'Search',
        'Tag mode': 'Tag mode',
        'Reset': 'Reset',
        'All statuses': 'All statuses',
        'All types': 'All types',
        'All groups': 'All groups',
      },
    },
  },
})

describe('ChannelFilterBar layout and style consistency', () => {
  test('renders filter bar controls with coordinated height and without forced mono class', () => {
    const onFilterChange = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ChannelFilterBar
          keyword="glm"
          status={[]}
          type={[]}
          group=""
          groups={['default', 'vip']}
          tagMode={false}
          onFilterChange={onFilterChange}
        />
      </I18nextProvider>
    )

    const searchInput = screen.getByPlaceholderText(/search by channel name/i)
    const searchButton = screen.getByRole('button', { name: /search/i })
    const tagModeButton = screen.getByRole('button', { name: /tag mode/i })
    const resetButton = screen.getByRole('button', { name: /reset/i })

    // Inputs and buttons must not force monospace font on natural copy
    expect(searchInput.className).not.toContain('mono')
    expect(searchButton.className).not.toContain('mono')
    expect(tagModeButton.className).not.toContain('mono')
    expect(resetButton.className).not.toContain('mono')

    // Height must be strictly coordinated across all controls
    expect(searchInput.className).toContain('!h-9')
    expect(searchButton.className).toContain('!h-9')
    expect(tagModeButton.className).toContain('!h-9')
    expect(resetButton.className).toContain('!h-9')
  })

  test('commits trimmed keyword on search button click', () => {
    const onFilterChange = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ChannelFilterBar
          keyword=""
          status={[]}
          type={[]}
          group=""
          groups={[]}
          tagMode={false}
          onFilterChange={onFilterChange}
        />
      </I18nextProvider>
    )

    const searchInput = screen.getByPlaceholderText(/search by channel name/i)
    fireEvent.change(searchInput, { target: { value: '  openai-test  ' } })

    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(onFilterChange).toHaveBeenCalledWith({ filter: 'openai-test' })
  })

  test('clears active filters when reset is clicked', () => {
    const onFilterChange = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <ChannelFilterBar
          keyword="active-query"
          status={['enabled']}
          type={['1']}
          group="default"
          groups={['default']}
          tagMode={false}
          onFilterChange={onFilterChange}
        />
      </I18nextProvider>
    )

    const resetButton = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetButton)

    expect(onFilterChange).toHaveBeenCalledWith({
      filter: '',
      status: [],
      type: [],
      group: '',
    })
  })
})
