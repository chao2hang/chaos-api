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
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SectionPageLayout } from '../section-page-layout'

describe('SectionPageLayout slot contract', () => {
  test('renders title, breadcrumb, actions and content from their slots', () => {
    render(
      <SectionPageLayout>
        <SectionPageLayout.Breadcrumb>
          <nav aria-label='crumbs'>crumb-trail</nav>
        </SectionPageLayout.Breadcrumb>
        <SectionPageLayout.Title>API Keys</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <button type='button'>Add Key</button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <table aria-label='keys'>table-body</table>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    expect(screen.getByRole('heading', { name: 'API Keys' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'crumbs' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add Key' })).toBeVisible()
    expect(screen.getByRole('table', { name: 'keys' })).toBeVisible()
  })

  test('locks content overflow when fixedContent is set and scrolls otherwise', () => {
    const { rerender } = render(
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>Keys</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div>fixed</div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const fixedContent = screen.getByText('fixed').parentElement
    expect(fixedContent?.className).toContain('overflow-hidden')

    rerender(
      <SectionPageLayout>
        <SectionPageLayout.Title>Keys</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div>flowing</div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const flowingContent = screen.getByText('flowing').parentElement
    expect(flowingContent?.className).toContain('overflow-auto')
  })
})
