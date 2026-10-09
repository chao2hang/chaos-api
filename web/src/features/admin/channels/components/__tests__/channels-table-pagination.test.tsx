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
import { describe, expect, type Mock, test, vi } from 'vitest'

import type { Channel } from '../../types'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ChannelsTable } = await import('../channels-table')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Rows per page': 'Rows per page',
        '10 / page': '10 / page',
        '20 / page': '20 / page',
        '50 / page': '50 / page',
        '100 / page': '100 / page',
      },
    },
  },
})

const listedChannel: Channel = {
  id: 7,
  type: 1,
  key: 'secret-sk',
  status: 1,
  name: 'openai-main',
  created_time: 1700000000,
  test_time: 0,
  response_time: 120,
  base_url: 'https://api.openai.com',
  other: '',
  balance: 0,
  balance_updated_time: 0,
  models: 'gpt-4o',
  group: 'default',
  used_quota: 0,
  model_mapping: '',
  status_code_mapping: '',
  priority: 0,
  weight: 0,
  auto_ban: 1,
  tag: '',
  remark: '',
  max_input_tokens: 0,
  openai_organization: '',
  test_model: '',
  header_override: '',
  param_override: '',
  setting: '',
  settings: '',
  channel_info: null,
}

function renderTable(overrides?: {
  total?: number
  page?: number
  pageSize?: number
  loading?: boolean
  onPageChange?: Mock<(page: number, pageSize: number) => void>
}) {
  const onPageChange =
    overrides?.onPageChange ?? vi.fn<(page: number, pageSize: number) => void>()
  render(
    <I18nextProvider i18n={i18n}>
      <ChannelsTable
        data={[listedChannel]}
        total={overrides?.total ?? 45}
        page={overrides?.page ?? 2}
        pageSize={overrides?.pageSize ?? 10}
        loading={overrides?.loading ?? false}
        actionPending={false}
        selectedIds={[]}
        onSelectionChange={() => {}}
        onPageChange={onPageChange}
        onEdit={() => {}}
        onToggleStatus={() => {}}
        onTest={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
        onQueryBalance={() => {}}
      />
    </I18nextProvider>
  )
  return { onPageChange }
}

describe('ChannelsTable pagination and page size selection', () => {
  test('renders current page, total pages, and total count', () => {
    renderTable({ total: 45, page: 2, pageSize: 10 })

    expect(screen.getByText(/PAGE/)).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText(/45 TOTAL/)).toBeTruthy()
  })

  test('calls onPageChange with previous and next pages', () => {
    const { onPageChange } = renderTable({ total: 45, page: 2, pageSize: 10 })

    fireEvent.click(screen.getByRole('button', { name: 'PREV' }))
    expect(onPageChange).toHaveBeenCalledWith(1, 10)

    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    expect(onPageChange).toHaveBeenCalledWith(3, 10)
  })

  test('disables PREV on first page and NEXT on last page', () => {
    const { onPageChange } = renderTable({ total: 45, page: 1, pageSize: 10 })
    expect(screen.getByRole('button', { name: 'PREV' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'NEXT' })).toBeEnabled()

    renderTable({ total: 45, page: 5, pageSize: 10, onPageChange })
    expect(screen.getAllByRole('button', { name: 'NEXT' })[1]).toBeDisabled()
  })

  test('renders page size selector with current page size and triggers page change to page 1 on selection', () => {
    const { onPageChange } = renderTable({ total: 45, page: 3, pageSize: 10 })

    const selectTrigger = screen.getByRole('combobox', {
      name: 'Rows per page',
    })
    expect(selectTrigger).toBeTruthy()
    expect(selectTrigger).toHaveTextContent('10 / page')

    fireEvent.pointerDown(selectTrigger)
    fireEvent.click(selectTrigger)

    const option50 = screen.getByRole('option', { name: '50 / page' })
    expect(option50).toBeTruthy()

    fireEvent.pointerDown(option50)
    fireEvent.pointerUp(option50)
    fireEvent.click(option50)
    expect(onPageChange).toHaveBeenCalledWith(1, 50)
  })

  test('disables controls when loading is true', () => {
    renderTable({ total: 45, page: 2, pageSize: 10, loading: true })

    expect(screen.getByRole('button', { name: 'PREV' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'NEXT' })).toBeDisabled()
    expect(
      screen.getByRole('combobox', { name: 'Rows per page' })
    ).toBeDisabled()
  })
})
