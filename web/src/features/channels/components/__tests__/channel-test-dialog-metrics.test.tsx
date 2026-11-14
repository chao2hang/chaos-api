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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { channelSchema, type Channel } from '../../types'
import { ChannelsProvider, useChannels } from '../channels-provider'
import { ChannelTestDialog } from '../dialogs/channel-test-dialog'

const originalAuth = useAuthStore.getState().auth

function OpenDialog(props: { channel: Channel }) {
  const { setCurrentRow } = useChannels()
  useEffect(() => {
    setCurrentRow(props.channel)
  }, [props.channel, setCurrentRow])
  return <ChannelTestDialog open onOpenChange={() => {}} />
}

function createChannel(): Channel {
  return channelSchema.parse({
    id: 9,
    name: 'Test channel',
    type: 1,
    key: '',
    status: 1,
    created_time: 1,
    test_time: 0,
    response_time: 0,
    balance_updated_time: 0,
    models: 'model-a',
  })
}

beforeEach(() => {
  useAuthStore.setState({
    auth: {
      ...originalAuth,
      user: { id: 1, username: 'root', role: ROLE.SUPER_ADMIN },
    },
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/channel/test/9') {
      return {
        data: {
          success: true,
          time: 0.64,
          model: 'model-a',
          ttft: 0.25,
          tokens_per_second: 31.5,
          usage: {
            prompt_tokens: 12,
            completion_tokens: 30,
            total_tokens: 42,
          },
        },
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  useAuthStore.setState({ auth: originalAuth })
  vi.restoreAllMocks()
})

test('a successful stream test displays TTFT, throughput, and token usage', async () => {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChannelsProvider>
        <OpenDialog channel={createChannel()} />
      </ChannelsProvider>
    </QueryClientProvider>
  )

  await user.click(await screen.findByRole('button', { name: 'Test Connection' }))

  expect(await screen.findByText('TTFT: 250 ms')).toBeTruthy()
  expect(screen.getByText('31.5 tokens/s')).toBeTruthy()
  expect(screen.getByText('Total tokens: 42')).toBeTruthy()
})
