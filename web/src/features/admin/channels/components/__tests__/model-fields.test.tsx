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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/http-client')
const { ChannelDialog } = await import('../channel-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

type ApiMethod = (url: string, data?: unknown) => Promise<{ data: unknown }>

const apiClient = api as unknown as { put: ApiMethod }
const originalPut = apiClient.put

afterEach(() => {
  apiClient.put = originalPut
})

const editedChannel: Channel = {
  id: 42,
  type: 1,
  key: 'secret-sk-openai-xxx',
  status: 1,
  name: 'groq_j1H7',
  created_time: 1700000000,
  test_time: 0,
  response_time: 0,
  base_url: 'https://api.groq.com/openai',
  other: '',
  balance: 0,
  balance_updated_time: 0,
  models: 'qwen3.8-27b',
  group: 'default',
  used_quota: 0,
  model_mapping: '{"qwen3.8-27b": "qwen3.8-27b-upstream"}',
  status_code_mapping: '',
  priority: 101,
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

function renderEditDialog(channel: Channel) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ChannelDialog
          open
          channel={channel}
          groups={['default']}
          onOpenChange={() => {}}
        />
      </I18nextProvider>
    </QueryClientProvider>
  )
}

type TagHost = HTMLElement & { values?: string[] }

/** Find the AdminTagInput host whose current tags match the predicate. */
function findTagHost(match: (values: string[]) => boolean): TagHost {
  const hosts = [...document.querySelectorAll<TagHost>('aui-tag-input')]
  const host = hosts.find((item) => match(item.values ?? []))
  expect(host, 'expected a matching tag input').toBeTruthy()
  return host as TagHost
}

/** Simulate the user editing tags on an AdminTagInput host. */
function changeTags(host: TagHost, values: string[]): void {
  fireEvent(
    host,
    new CustomEvent('aui-tags-change', { detail: { values } })
  )
}

function queryMappingInputs(): HTMLInputElement[] {
  return screen.queryAllByLabelText('Source model') as HTMLInputElement[]
}

describe('ChannelDialog model fields', () => {
  test('seeds model tags and mapping rows from the stored channel record', async () => {
    renderEditDialog(editedChannel)

    await waitFor(() => {
      const modelsHost = findTagHost((values) => values.length === 1)
      expect(modelsHost.values).toEqual(['qwen3.8-27b'])
    })
    await waitFor(() => {
      const sourceInputs = queryMappingInputs()
      expect(sourceInputs).toHaveLength(1)
      expect(sourceInputs[0].value).toBe('qwen3.8-27b')
      expect(
        (screen.getByLabelText('Target model') as HTMLInputElement).value
      ).toBe('qwen3.8-27b-upstream')
    })
  })

  test('blocks saving and shows a validation error for an incomplete mapping row', async () => {
    let putCalls = 0
    apiClient.put = async () => {
      putCalls += 1
      return { data: { success: true, data: {} } }
    }
    renderEditDialog(editedChannel)

    const targetInput = await waitFor(
      () => screen.getByLabelText('Target model') as HTMLInputElement
    )
    fireEvent.change(targetInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Each model mapping needs a source model and a target model'
        )
      ).toBeTruthy()
    })
    expect(putCalls).toBe(0)
  })

  test('sends edited model tags and mapping with the update request', async () => {
    const payloads: Array<Record<string, unknown>> = []
    apiClient.put = async (_url, data) => {
      payloads.push(data as Record<string, unknown>)
      return { data: { success: true, data: {} } }
    }
    renderEditDialog(editedChannel)

    const modelsHost = await waitFor(() =>
      findTagHost((values) => values.includes('qwen3.8-27b'))
    )
    const targetInput = await waitFor(
      () => screen.getByLabelText('Target model') as HTMLInputElement
    )
    changeTags(modelsHost, ['qwen3.8-27b', 'qwen3.8-flash'])
    fireEvent.change(targetInput, { target: { value: 'qwen3.8-27b-full' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(payloads).toHaveLength(1)
    })
    expect(payloads[0]['models']).toBe('qwen3.8-27b,qwen3.8-flash')
    expect(payloads[0]['model_mapping']).toBe(
      '{"qwen3.8-27b":"qwen3.8-27b-full"}'
    )
  })

  test('adds and removes mapping rows from the editor', async () => {
    renderEditDialog(editedChannel)

    await waitFor(() => {
      expect(queryMappingInputs()).toHaveLength(1)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping' }))
    expect(queryMappingInputs()).toHaveLength(2)

    // The seeded row keeps its values while the new empty row exists.
    expect(queryMappingInputs()[0].value).toBe('qwen3.8-27b')

    fireEvent.click(screen.getAllByLabelText('Remove this mapping')[0])
    expect(queryMappingInputs()).toHaveLength(1)
  })
})
