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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  batchDeleteChannels,
  batchUpdateChannelStatus,
  copyChannel,
  deleteChannel,
  testChannel,
  updateChannelStatus,
} from '../api'
import { formatResponseTime } from '../lib/format'
import type { TestChannelResponse } from '../types'

export interface UseChannelActionsParams {
  /** Called after a batch mutation succeeds so the caller can clear selection. */
  onBatchDone: () => void
}

/** Row and batch mutations shared by the channels page widgets. */
export function useChannelActions(params: UseChannelActionsParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
  }

  const toggleStatus = useMutation({
    mutationFn: (input: { id: number; status: number }) =>
      updateChannelStatus(input.id, input.status),
    onSuccess: (res) => {
      if (!res.success) {
        return
      }
      toast.success(t('Channel status updated'))
      invalidate()
    },
  })

  const test = useMutation({
    mutationFn: (id: number) => testChannel(id),
    onSuccess: (res: TestChannelResponse) => {
      if (!res.success) {
        return
      }
      const error = res.data?.error
      if (error !== undefined && error !== '') {
        toast.error(`${t('Test failed')}: ${error}`)
        return
      }
      const ms = res.time ?? res.data?.response_time ?? 0
      toast.success(`${t('Test succeeded')} · ${formatResponseTime(ms)}`)
    },
  })

  const copy = useMutation({
    mutationFn: (id: number) => copyChannel(id),
    onSuccess: (res) => {
      if (!res.success) {
        return
      }
      toast.success(t('Channel copied'))
      invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteChannel(id),
    onSuccess: (res) => {
      if (!res.success) {
        return
      }
      toast.success(t('Channel deleted'))
      invalidate()
    },
  })

  const batchStatus = useMutation({
    mutationFn: (input: { ids: number[]; status: number }) =>
      batchUpdateChannelStatus(input.ids, input.status),
    onSuccess: (res) => {
      if (!res.success) {
        return
      }
      toast.success(t('Channels updated'))
      invalidate()
      params.onBatchDone()
    },
  })

  const batchDelete = useMutation({
    mutationFn: (ids: number[]) => batchDeleteChannels(ids),
    onSuccess: (res) => {
      if (!res.success) {
        return
      }
      toast.success(t('Channels deleted'))
      invalidate()
      params.onBatchDone()
    },
  })

  return { toggleStatus, test, copy, remove, batchStatus, batchDelete }
}
