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

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { testChannel } from '../api'
import type { TestChannelUsage } from '../types'

export type ModelTestItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'

/** One model row of a channel test run. */
export interface ModelTestItem {
  model: string
  status: ModelTestItemStatus
  /** Upstream model name if mapped. */
  upstreamModel?: string
  /** Total request duration in seconds. */
  time?: number
  /** Time to first upstream response in seconds. */
  ttft?: number
  /** Completion tokens per second of the generation window. */
  tokensPerSecond?: number
  usage?: TestChannelUsage
  error?: string
}

export interface ModelTestRunOptions {
  stream: boolean
  concurrency: number
}

/**
 * Sequentially-safe parallel runner for channel model tests: executes the
 * model list with bounded concurrency, keeps one result row per model, and
 * aborts in-flight requests plus the remaining queue on stop/unmount.
 */
export function useModelTestRunner(channelId: number) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ModelTestItem[]>([])
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const run = useCallback(
    (models: string[], options: ModelTestRunOptions) => {
      const queue = [...new Set(models)]
      if (queue.length === 0 || running) {
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setItems(
        queue.map((model): ModelTestItem => ({ model, status: 'pending' }))
      )
      setRunning(true)

      const update = (model: string, patch: Partial<ModelTestItem>) => {
        setItems((prev) =>
          prev.map((item) =>
            item.model === model ? { ...item, ...patch } : item
          )
        )
      }

      let cursor = 0
      const worker = async () => {
        while (cursor < queue.length && !controller.signal.aborted) {
          const model = queue[cursor++]
          update(model, { status: 'running' })
          try {
            const res = await testChannel(channelId, {
              model,
              stream: options.stream,
              signal: controller.signal,
            })
            const upstreamModel =
              res.data?.upstream_model ??
              (res as { upstream_model?: string }).upstream_model
            if (!res.success || (res.data?.error ?? '') !== '') {
              update(model, {
                status: 'failed',
                upstreamModel,
                error: res.data?.error || res.message || t('Test failed'),
              })
              continue
            }
            update(model, {
              status: 'success',
              upstreamModel,
              time: res.time,
              ttft: res.data?.ttft,
              tokensPerSecond: res.data?.tokens_per_second,
              usage: res.data?.usage,
            })
          } catch (err) {
            if (controller.signal.aborted) {
              update(model, { status: 'cancelled' })
              continue
            }
            update(model, {
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }

      const workerCount = Math.max(
        1,
        Math.min(options.concurrency, queue.length)
      )
      const workers = Array.from({ length: workerCount }, () => worker())
      void Promise.all(workers).then(() => {
        if (controller.signal.aborted) {
          setItems((prev) =>
            prev.map((item) =>
              item.status === 'pending'
                ? { ...item, status: 'cancelled' }
                : item
            )
          )
        }
        setRunning(false)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
      })
    },
    [channelId, queryClient, running, t]
  )

  const runSingle = useCallback(
    (model: string, options: { stream: boolean }) => {
      const targetModel = model.trim()
      if (targetModel === '' || running) {
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setRunning(true)

      setItems((prev) => {
        const exists = prev.some((item) => item.model === targetModel)
        if (exists) {
          return prev.map((item) =>
            item.model === targetModel
              ? {
                  model: targetModel,
                  status: 'running',
                  error: undefined,
                  time: undefined,
                  ttft: undefined,
                  tokensPerSecond: undefined,
                  usage: undefined,
                  upstreamModel: undefined,
                }
              : item
          )
        }
        return [
          ...prev,
          {
            model: targetModel,
            status: 'running',
          },
        ]
      })

      const update = (patch: Partial<ModelTestItem>) => {
        setItems((prev) =>
          prev.map((item) =>
            item.model === targetModel ? { ...item, ...patch } : item
          )
        )
      }

      void (async () => {
        try {
          const res = await testChannel(channelId, {
            model: targetModel,
            stream: options.stream,
            signal: controller.signal,
          })
          const upstreamModel =
            res.data?.upstream_model ??
            (res as { upstream_model?: string }).upstream_model
          if (!res.success || (res.data?.error ?? '') !== '') {
            update({
              status: 'failed',
              upstreamModel,
              error: res.data?.error || res.message || t('Test failed'),
            })
          } else {
            update({
              status: 'success',
              upstreamModel,
              time: res.time,
              ttft: res.data?.ttft,
              tokensPerSecond: res.data?.tokens_per_second,
              usage: res.data?.usage,
            })
          }
        } catch (err) {
          if (controller.signal.aborted) {
            update({ status: 'cancelled' })
          } else {
            update({
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            })
          }
        } finally {
          setRunning(false)
          if (abortRef.current === controller) {
            abortRef.current = null
          }
          void queryClient.invalidateQueries({
            queryKey: ['admin', 'channels'],
          })
        }
      })()
    },
    [channelId, queryClient, running, t]
  )

  return { items, running, run, runSingle, stop }
}
