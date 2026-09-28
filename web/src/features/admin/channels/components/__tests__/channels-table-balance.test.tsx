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

import type { Channel } from '../../types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ChannelsTable } = await import('../channels-table')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
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

function renderTable(overrides?: { actionPending?: boolean; onQueryBalance?: (channel: Channel) => void }) {
  const onQueryBalance = overrides?.onQueryBalance ?? vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <ChannelsTable
        data={[listedChannel]}
        total={1}
        page={1}
        pageSize={10}
        loading={false}
        actionPending={overrides?.actionPending ?? false}
        selectedIds={[]}
        onSelectionChange={() => {}}
        onPageChange={() => {}}
        onEdit={() => {}}
        onToggleStatus={() => {}}
        onTest={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
        onQueryBalance={onQueryBalance}
      />
    </I18nextProvider>
  )
  return { onQueryBalance }
}

describe('ChannelsTable balance cell', () => {
  test('clicking the balance cell queries the balance of that channel', () => {
    const { onQueryBalance } = renderTable()

    fireEvent.click(
      screen.getByRole('button', { name: 'Click to query balance' })
    )

    expect(onQueryBalance).toHaveBeenCalledTimes(1)
    expect(onQueryBalance).toHaveBeenCalledWith(listedChannel)
  })

  test('balance query is disabled while another action is pending', () => {
    const { onQueryBalance } = renderTable({ actionPending: true })

    const balanceButton = screen.getByRole('button', {
      name: 'Click to query balance',
    })
    expect(balanceButton).toBeDisabled()

    fireEvent.click(balanceButton)
    expect(onQueryBalance).not.toHaveBeenCalled()
  })
})
