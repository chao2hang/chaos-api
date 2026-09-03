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

import { describe, expect, it } from 'vitest'

import type { Channel } from '../../types'
import { buildChannelPayload, channelToFormValues } from '../form'

const minimalChannel: Channel = {
  id: 7,
  type: 14,
  key: 'secret-sk-ant-xxx',
  status: 1,
  name: 'My Claude',
  created_time: 1700000000,
  test_time: 1700000001,
  response_time: 456,
  base_url: 'https://api.anthropic.com',
  other: '',
  balance: 0,
  balance_updated_time: 0,
  models: 'claude-3-5-sonnet-20241022,claude-3-opus',
  group: 'paid',
  used_quota: 123456,
  model_mapping: '',
  status_code_mapping: '',
  priority: 5,
  weight: 10,
  auto_ban: 1,
  tag: 'premium',
  remark: 'Managed channel',
  max_input_tokens: 128000,
  openai_organization: '',
  test_model: 'claude-3-5-sonnet-20241022',
  header_override: '',
  param_override: '',
  setting: '',
  settings: '',
  channel_info: null,
}

describe('channelToFormValues', () => {
  it('copies all scalar fields and blanks the secret key for safety', () => {
    const values = channelToFormValues(minimalChannel)
    expect(values.name).toBe('My Claude')
    expect(values.type).toBe('14')
    expect(values.key).toBe('')
    expect(values.group).toBe('paid')
    expect(values.priority).toBe('5')
  })

  it('falls back to "default" for empty group', () => {
    const patched = { ...minimalChannel, group: '' }
    expect(channelToFormValues(patched).group).toBe('default')
  })
})

describe('buildChannelPayload', () => {
  it('omits the secret key entirely when the form key is empty', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: 'gpt-4o',
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.key).toBeUndefined()
    expect(payload.name).toBe('OpenAI Test')
    expect(payload.type).toBe(1)
    expect(payload.priority).toBe(0)
  })

  it('includes the trimmed secret key when non-empty', () => {
    const payload = buildChannelPayload({
      name: '',
      type: '1',
      key: '  sk-1234 ',
      base_url: '',
      models: 'gpt-4o',
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.key).toBe('sk-1234')
  })
})
