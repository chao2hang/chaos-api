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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { Channel } from '../../types'

vi.mock('../../api', () => ({
  testChannel: vi.fn(),
  updateChannel: vi.fn(),
}))

const { testChannel, updateChannel } = await import('../../api')
const mockedTestChannel = vi.mocked(testChannel)
const mockedUpdateChannel = vi.mocked(updateChannel)
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ModelTestDialog } = await import('../model-test-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

const channel: Channel = {
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
  models: 'gpt-4o,gpt-4o-mini',
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

function renderDialog(models?: string) {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ModelTestDialog
          channel={models === undefined ? channel : { ...channel, models }}
          onOpenChange={onOpenChange}
        />
      </I18nextProvider>
    </QueryClientProvider>
  )
  return { onOpenChange }
}

function rowOf(model: string): HTMLElement {
  const cell = screen.getByTitle(model)
  expect(cell.tagName).toBe('TD')
  return cell.closest('tr') as HTMLElement
}

describe('ModelTestDialog', () => {
  test('preselects every model of the channel before running', () => {
    renderDialog()

    for (const model of ['gpt-4o', 'gpt-4o-mini']) {
      expect(screen.getByRole('checkbox', { name: model })).toBeChecked()
    }
  })

  test('shows the empty-state hint when the channel has no models', () => {
    renderDialog('')

    expect(
      screen.getByText('No models to test. Add a model first.')
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled()
  })

  test('runs a test per selected model and renders latency, throughput and usage', async () => {
    mockedTestChannel.mockImplementation(async (_id, options) => {
      const isGpt4o = options?.model === 'gpt-4o'
      return {
        success: true,
        message: '',
        time: isGpt4o ? 1.5 : 0.42,
        data: {
          model: options?.model,
          ttft: isGpt4o ? 0.1 : 0.05,
          tokens_per_second: isGpt4o ? 12.5 : 40,
          usage: {
            prompt_tokens: 9,
            completion_tokens: 16,
            total_tokens: 25,
          },
        },
      }
    })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    const firstRow = await screen.findByText('1.50 s')
    expect(firstRow).toBeTruthy()
    expect(mockedTestChannel).toHaveBeenCalledTimes(2)
    expect(mockedTestChannel).toHaveBeenCalledWith(7, {
      model: 'gpt-4o',
      stream: false,
      signal: expect.anything(),
    })
    expect(mockedTestChannel).toHaveBeenCalledWith(7, {
      model: 'gpt-4o-mini',
      stream: false,
      signal: expect.anything(),
    })

    expect(within(rowOf('gpt-4o')).getByText('Passed')).toBeTruthy()
    expect(within(rowOf('gpt-4o')).getByText('12.5')).toBeTruthy()
    expect(within(rowOf('gpt-4o')).getByText('25')).toBeTruthy()
    expect(within(rowOf('gpt-4o-mini')).getByText('420 ms')).toBeTruthy()
    expect(within(rowOf('gpt-4o-mini')).getByText('40')).toBeTruthy()
  })

  test('marks a model as failed when the backend rejects it', async () => {
    mockedTestChannel.mockImplementation(async (_id, options) => {
      if (options?.model === 'gpt-4o') {
        return {
          success: false,
          message: 'upstream error: quota exceeded',
          time: 0.2,
        }
      }
      return { success: true, message: '', time: 1.2 }
    })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(await screen.findByText('Passed')).toBeTruthy()
    expect(within(rowOf('gpt-4o')).getByText('Failed')).toBeTruthy()
    expect(within(rowOf('gpt-4o-mini')).getByText('Passed')).toBeTruthy()
    expect(screen.getByText(/Failed: 1/)).toBeTruthy()
    expect(screen.getByText(/Passed: 1/)).toBeTruthy()
  })

  test('adds a custom model and includes it in the test run', async () => {
    mockedTestChannel.mockResolvedValue({ success: true, message: '', time: 1 })
    renderDialog()

    const input = screen.getByLabelText('Add models to test (comma separated)')
    fireEvent.change(input, { target: { value: 'custom-model-x' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    const checkbox = screen.getByRole('checkbox', { name: 'custom-model-x' })
    expect(checkbox).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    const passedRows = await screen.findAllByText('Passed')
    expect(passedRows.length).toBeGreaterThanOrEqual(1)
    expect(within(rowOf('custom-model-x')).getByText('Passed')).toBeTruthy()
    expect(mockedTestChannel).toHaveBeenCalledWith(7, {
      model: 'custom-model-x',
      stream: false,
      signal: expect.anything(),
    })
  })

  test('stop aborts in-flight tests and cancels unfinished models', async () => {
    const signals: AbortSignal[] = []
    mockedTestChannel.mockImplementation((_id, options) => {
      const signal = options?.signal
      if (signal) {
        signals.push(signal)
      }
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findAllByText('Cancelled')).toHaveLength(2)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })

  test('keep only successful models button is disabled when no tests have run', () => {
    renderDialog()
    expect(
      screen.getByRole('button', { name: 'Keep only successful models' })
    ).toBeDisabled()
  })

  test('keep only successful models updates the channel and model list with only passed models', async () => {
    mockedTestChannel.mockImplementation(async (_id, options) => {
      if (options?.model === 'gpt-4o') {
        return {
          success: false,
          message: 'upstream error: quota exceeded',
          time: 0.2,
        }
      }
      return { success: true, message: '', time: 0.5 }
    })
    mockedUpdateChannel.mockResolvedValue({
      success: true,
      message: '',
      data: { ...channel, models: 'gpt-4o-mini' },
    })

    renderDialog()

    const keepBtn = screen.getByRole('button', {
      name: 'Keep only successful models',
    })
    expect(keepBtn).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(await screen.findByText('Passed')).toBeTruthy()
    expect(within(rowOf('gpt-4o')).getByText('Failed')).toBeTruthy()

    expect(keepBtn).toBeEnabled()

    fireEvent.click(keepBtn)

    expect(mockedUpdateChannel).toHaveBeenCalledTimes(1)
    expect(mockedUpdateChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        models: 'gpt-4o-mini',
      })
    )

    // The models in the checklist should now only show gpt-4o-mini
    expect(
      await screen.findByRole('checkbox', { name: 'gpt-4o-mini' })
    ).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'gpt-4o' })).toBeNull()
  })

  test('keep only successful models remains disabled if all tested models failed', async () => {
    mockedTestChannel.mockResolvedValue({
      success: false,
      message: 'service unavailable',
      time: 0.1,
    })

    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    const failedBadges = await screen.findAllByText('Failed')
    expect(failedBadges).toHaveLength(2)

    expect(
      screen.getByRole('button', { name: 'Keep only successful models' })
    ).toBeDisabled()
  })

  test('uses model mapping keys for preselection and displays upstream model when mapped', async () => {
    mockedTestChannel.mockImplementation(async (_id, options) => {
      return {
        success: true,
        message: '',
        time: 1.0,
        data: {
          model: options?.model,
          upstream_model: 'deepseek-ai/DeepSeek-V4-Flash',
        },
      }
    })

    const onOpenChange = vi.fn()
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <ModelTestDialog
            channel={{
              ...channel,
              models: 'deepseek-ai/DeepSeek-V4-Flash',
              model_mapping:
                '{"deepseek-v4-flash":"deepseek-ai/DeepSeek-V4-Flash"}',
            }}
            onOpenChange={onOpenChange}
          />
        </I18nextProvider>
      </QueryClientProvider>
    )

    // Should preselect the mapped alias key instead of the raw upstream model
    expect(
      screen.getByRole('checkbox', { name: 'deepseek-v4-flash' })
    ).toBeChecked()
    expect(
      screen.queryByRole('checkbox', { name: 'deepseek-ai/DeepSeek-V4-Flash' })
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    const passedText = await screen.findByText('Passed')
    expect(passedText).toBeTruthy()

    // Upstream model target should be displayed in the row
    expect(screen.getByText('→ deepseek-ai/DeepSeek-V4-Flash')).toBeTruthy()
  })
})
