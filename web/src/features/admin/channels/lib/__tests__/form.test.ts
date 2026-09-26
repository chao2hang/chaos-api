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

  it('splits the stored model list into tag entries', () => {
    const patched = { ...minimalChannel, models: 'a,b , c' }
    expect(channelToFormValues(patched).models).toEqual(['a', 'b', 'c'])
  })

  it('seeds model mapping rows from the stored JSON object', () => {
    const patched = {
      ...minimalChannel,
      model_mapping: '{"gpt-4o": "gpt-4o-2024-08-06"}',
    }
    const mapping = channelToFormValues(patched).model_mapping
    expect(mapping).toHaveLength(1)
    expect(mapping[0]['source']).toBe('gpt-4o')
    expect(mapping[0]['target']).toBe('gpt-4o-2024-08-06')
    expect(mapping[0]['rowId']).toMatch(/^mapping-row-\d+$/)
  })
})

describe('buildChannelPayload', () => {
  it('omits the secret key entirely when the form key is empty', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: ['gpt-4o'],
      model_mapping: [],
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
      models: ['gpt-4o'],
      model_mapping: [],
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.key).toBe('sk-1234')
  })

  it('serializes model tags as the comma-separated model list', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: ['gpt-4o', 'gpt-4.1'],
      model_mapping: [],
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.models).toBe('gpt-4o,gpt-4.1')
  })

  it('serializes mapping rows into the stored JSON object', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: ['gpt-4o'],
      model_mapping: [
        { rowId: 'row-1', source: 'gpt-4o', target: 'gpt-4o-2024-08-06' },
        { rowId: 'row-2', source: 'alias', target: 'upstream' },
      ],
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.model_mapping).toBe(
      '{"gpt-4o":"gpt-4o-2024-08-06","alias":"upstream"}'
    )
  })

  it('drops blank or half-filled mapping rows when serializing', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: ['gpt-4o'],
      model_mapping: [
        { rowId: 'row-1', source: 'gpt-4o', target: 'gpt-4o-2024-08-06' },
        { rowId: 'row-2', source: '', target: '' },
        { rowId: 'row-3', source: 'half', target: '' },
        { rowId: 'row-4', source: '  ', target: 'upstream' },
      ],
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.model_mapping).toBe('{"gpt-4o":"gpt-4o-2024-08-06"}')
  })

  it('clears the stored model mapping when all tags are removed', () => {
    const payload = buildChannelPayload({
      name: 'OpenAI Test',
      type: '1',
      key: '',
      base_url: '',
      models: ['gpt-4o'],
      model_mapping: [],
      group: 'default',
      priority: '0',
      weight: '0',
      tag: '',
      remark: '',
      test_model: '',
    })
    expect(payload.model_mapping).toBe('')
  })

  it('supports channel with status_reason for auto-disabled diagnostics', () => {
    const channelWithReason: Channel = {
      ...minimalChannel,
      status: 3,
      status_reason: 'status_code=429, No deployments available',
    }
    expect(channelWithReason.status).toBe(3)
    expect(channelWithReason.status_reason).toBe(
      'status_code=429, No deployments available'
    )
  })
})
