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

import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'

import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { type ModelTestItem, useModelTestRunner } from '../hooks/use-model-test-runner'
import type { Channel } from '../types'
import { formatResponseTime, splitModelNames } from '../lib/format'

export interface ModelTestDialogProps {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}

const CONCURRENCY_OPTIONS = ['1', '2', '3', '5', '10']

function parseChannelModels(models: string): string[] {
  return models
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

function statusClassName(status: ModelTestItem['status']): string {
  if (status === 'success') {
    return 'text-emerald-500'
  }
  if (status === 'failed') {
    return 'text-red-500'
  }
  if (status === 'running') {
    return 'text-sky-400'
  }
  return 'text-zinc-500'
}

/** Status cell of one model test row. */
function TestStatusCell(props: { item: ModelTestItem }) {
  const { t } = useTranslation()
  const labels: Record<ModelTestItem['status'], string> = {
    pending: t('Queued'),
    running: t('Running'),
    success: t('Passed'),
    failed: t('Failed'),
    cancelled: t('Cancelled'),
  }
  return (
    <span className={cn('inline-flex items-center gap-1', statusClassName(props.item.status))}>
      {props.item.status === 'running' && (
        <Loader2 className='size-3 animate-spin' aria-hidden='true' />
      )}
      {labels[props.item.status]}
    </span>
  )
}

/** Results table of the finished and in-flight model tests. */
function TestResultTable(props: { items: ModelTestItem[] }) {
  const { t } = useTranslation()
  if (props.items.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center border border-zinc-800 bg-[#0a0a0a] py-10 text-center text-xs text-zinc-600 mono'>
        {t('Run a test to see latency, TTFT and tokens per second.')}
      </div>
    )
  }
  return (
    <div className='flex-1 min-h-0 border border-zinc-800 bg-[#0a0a0a] overflow-auto admin-no-scrollbar'>
      <table className='w-full text-left text-xs mono whitespace-nowrap'>
        <thead className='sticky top-0 bg-zinc-900 text-zinc-500 uppercase border-b border-zinc-800'>
          <tr>
            <th className='py-2 px-3 font-medium'>{t('Model')}</th>
            <th className='py-2 px-3 font-medium'>{t('Status')}</th>
            <th className='py-2 px-3 font-medium'>{t('Time')}</th>
            <th className='py-2 px-3 font-medium'>{t('TTFT')}</th>
            <th className='py-2 px-3 font-medium'>{t('Tokens/s')}</th>
            <th className='py-2 px-3 font-medium'>{t('Prompt tokens')}</th>
            <th className='py-2 px-3 font-medium'>{t('Completion tokens')}</th>
            <th className='py-2 px-3 font-medium text-right'>{t('Total tokens')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-zinc-900 text-zinc-300'>
          {props.items.map((item) => (
            <tr key={item.model} className='hover:bg-zinc-900/50 transition-colors'>
              <td className='py-2 px-3 max-w-[180px] truncate text-white' title={item.model}>
                {item.model}
              </td>
              <td className='py-2 px-3'>
                {item.status === 'failed' && item.error ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className='inline-flex cursor-help' />}>
                      <TestStatusCell item={item} />
                    </TooltipTrigger>
                    <TooltipContent side='top' className='max-w-xs break-words text-xs'>
                      {item.error}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <TestStatusCell item={item} />
                )}
              </td>
              <td className='py-2 px-3 tabular-nums'>
                {formatResponseTime((item.time ?? 0) * 1000)}
              </td>
              <td className='py-2 px-3 tabular-nums'>
                {item.ttft === undefined ? '-' : formatResponseTime(item.ttft * 1000)}
              </td>
              <td className='py-2 px-3 tabular-nums'>
                {item.tokensPerSecond === undefined ? '-' : formatNumber(item.tokensPerSecond)}
              </td>
              <td className='py-2 px-3 tabular-nums'>
                {item.usage?.prompt_tokens === undefined
                  ? '-'
                  : formatNumber(item.usage.prompt_tokens)}
              </td>
              <td className='py-2 px-3 tabular-nums'>
                {item.usage?.completion_tokens === undefined
                  ? '-'
                  : formatNumber(item.usage.completion_tokens)}
              </td>
              <td className='py-2 px-3 tabular-nums text-right'>
                {item.usage?.total_tokens === undefined
                  ? '-'
                  : formatNumber(item.usage.total_tokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ModelTestDialog(props: ModelTestDialogProps) {
  if (!props.channel) {
    return null
  }
  return (
    <ModelTestDialogContent
      key={props.channel.id}
      channel={props.channel}
      onOpenChange={props.onOpenChange}
    />
  )
}

function ModelTestDialogContent(props: {
  channel: Channel
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const runner = useModelTestRunner(props.channel.id)
  const [selected, setSelected] = useState<string[]>(() =>
    parseChannelModels(props.channel.models)
  )
  const [extraModels, setExtraModels] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [search, setSearch] = useState('')
  const [stream, setStream] = useState(false)
  const [concurrency, setConcurrency] = useState('3')

  const allModels = useMemo(
    () => [...new Set([...parseChannelModels(props.channel.models), ...extraModels])],
    [props.channel.models, extraModels]
  )
  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return allModels
    }
    return allModels.filter((model) => model.toLowerCase().includes(query))
  }, [allModels, search])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allFilteredSelected =
    filteredModels.length > 0 && filteredModels.every((model) => selectedSet.has(model))

  const summary = useMemo(() => {
    let passed = 0
    let failed = 0
    let done = 0
    let successTime = 0
    let successTps = 0
    let tpsCount = 0
    for (const item of runner.items) {
      if (item.status === 'pending' || item.status === 'running') {
        continue
      }
      done++
      if (item.status === 'success') {
        passed++
        successTime += item.time ?? 0
        if ((item.tokensPerSecond ?? 0) > 0) {
          successTps += item.tokensPerSecond ?? 0
          tpsCount++
        }
      } else if (item.status === 'failed') {
        failed++
      }
    }
    return {
      passed,
      failed,
      done,
      avgTime: passed > 0 ? successTime / passed : 0,
      avgTps: tpsCount > 0 ? successTps / tpsCount : 0,
    }
  }, [runner.items])

  const toggleModel = (model: string) => {
    setSelected((prev) =>
      prev.includes(model) ? prev.filter((item) => item !== model) : [...prev, model]
    )
  }

  const toggleSelectAllFiltered = () => {
    const filteredSet = new Set(filteredModels)
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((model) => !filteredSet.has(model)))
    } else {
      setSelected((prev) => [...new Set([...prev, ...filteredModels])])
    }
  }

  const addCustomModels = () => {
    const names = splitModelNames(customInput)
    if (names.length === 0) {
      return
    }
    setExtraModels((prev) => [...new Set([...prev, ...names])])
    setSelected((prev) => [...new Set([...prev, ...names])])
    setCustomInput('')
  }

  const startTests = () => {
    runner.run(selected, { stream, concurrency: Number(concurrency) })
  }

  const total = runner.items.length
  const isRunning = runner.running

  let footerStatus = ''
  if (isRunning) {
    footerStatus = `${t('Testing')} ${summary.done}/${total}...`
  } else if (total > 0) {
    const avgTps = summary.avgTps > 0 ? formatNumber(summary.avgTps) : '-'
    footerStatus = `${t('Passed')}: ${summary.passed} · ${t('Failed')}: ${summary.failed} · ${t('Avg time')}: ${formatResponseTime(summary.avgTime * 1000)} · ${t('Avg tokens/s')}: ${avgTps}`
  }

  return (
    <Dialog open onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden gap-3 rounded-none border-zinc-800 bg-[#0f0f0f] text-white sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Test models')} · {props.channel.name}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t(
              'Run any model on this channel and compare latency, TTFT and tokens per second.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-wrap items-center gap-2'>
          <form
            className='flex flex-1 min-w-52 items-center gap-1.5'
            onSubmit={(event) => {
              event.preventDefault()
              addCustomModels()
            }}
          >
            <Input
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              placeholder={t('Add models to test (comma separated)')}
              disabled={isRunning}
              aria-label={t('Add models to test (comma separated)')}
              className='mono h-8 flex-1 rounded-none border-zinc-800 bg-[#0a0a0a] text-xs text-white'
            />
            <button
              type='submit'
              disabled={isRunning || customInput.trim() === ''}
              className='btn-industrial-secondary mono text-xs disabled:opacity-40'
            >
              {t('Add')}
            </button>
          </form>
          <label className='mono flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 select-none'>
            <Checkbox
              checked={stream}
              onCheckedChange={(checked) => setStream(checked === true)}
              disabled={isRunning}
              aria-label={t('Stream')}
            />
            {t('Stream')}
          </label>
          <Select
            value={concurrency}
            onValueChange={(value) => setConcurrency(String(value ?? '3'))}
            disabled={isRunning}
          >
            <SelectTrigger
              size='sm'
              className='w-28 mono text-xs rounded-none bg-[#0a0a0a] border-zinc-800'
              aria-label={t('Concurrency')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-none border-zinc-800 bg-[#0a0a0a]'>
              {CONCURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t('Concurrency')}: {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex max-h-40 flex-col gap-1 overflow-y-auto pr-1'>
          <div className='mono flex items-center justify-between gap-2 border-b border-zinc-800 px-1 pb-1.5 text-xs text-zinc-400'>
            <label className='flex cursor-pointer items-center gap-2 select-none'>
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleSelectAllFiltered}
                disabled={isRunning}
                aria-label={t('Select all')}
              />
              <span>{allFilteredSelected ? t('Clear all') : t('Select all')}</span>
            </label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search models...')}
              disabled={isRunning}
              aria-label={t('Search models...')}
              className='mono h-6 w-36 rounded-none border-zinc-800 bg-[#0a0a0a] px-2 text-xs text-white'
            />
            <span className='whitespace-nowrap'>
              {t('{{n}} model(s) selected', { n: selected.length })} / {allModels.length}
            </span>
          </div>
          {allModels.length === 0 ? (
            <div className='mono py-6 text-center text-xs text-zinc-600'>
              {t('No models to test. Add a model first.')}
            </div>
          ) : (
            filteredModels.map((model) => {
              const checked = selectedSet.has(model)
              return (
                <div
                  key={model}
                  className={cn(
                    'mono flex items-center gap-2 px-2 py-1 text-xs transition-colors',
                    checked
                      ? 'bg-zinc-900/80 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                  )}
                >
                  <Checkbox
                    id={`model-test-${model}`}
                    checked={checked}
                    onCheckedChange={() => toggleModel(model)}
                    disabled={isRunning}
                    aria-label={model}
                  />
                  <label
                    htmlFor={`model-test-${model}`}
                    className='flex-1 cursor-pointer truncate select-none'
                  >
                    {model}
                  </label>
                </div>
              )
            })
          )}
        </div>

        <TestResultTable items={runner.items} />

        <DialogFooter className='flex-wrap items-center gap-2 border-t border-zinc-900 pt-2'>
          <span className='mono text-xs text-zinc-500' aria-live='polite'>
            {footerStatus}
          </span>
          <div className='flex flex-1 items-center justify-end gap-2'>
            {isRunning && (
              <button
                type='button'
                onClick={runner.stop}
                className='btn-industrial-secondary mono text-xs'
              >
                {t('Stop')}
              </button>
            )}
            <button
              type='button'
              disabled={isRunning || selected.length === 0}
              onClick={startTests}
              className='btn-industrial-primary mono text-xs disabled:opacity-40'
            >
              {t('Run')}
            </button>
            <button
              type='button'
              onClick={() => props.onOpenChange(false)}
              className='btn-industrial-secondary mono text-xs'
            >
              {t('Close')}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
