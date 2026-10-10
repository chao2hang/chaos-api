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
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { updateChannel } from '../api'
import {
  type ModelTestItem,
  useModelTestRunner,
} from '../hooks/use-model-test-runner'
import { formatResponseTime, splitModelNames } from '../lib/format'
import type { Channel } from '../types'

export interface ModelTestDialogProps {
  channel: Channel | null
  onOpenChange: (open: boolean) => void
}

const CONCURRENCY_OPTIONS = ['1', '2', '3', '5', '10']

function parseChannelModels(models: string, modelMapping?: string): string[] {
  const list = models
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

  if (
    !modelMapping ||
    modelMapping.trim() === '' ||
    modelMapping.trim() === '{}'
  ) {
    return list
  }

  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(modelMapping)
  } catch {
    return list
  }

  const inModels = new Set(list)
  const targetToKeys: Record<string, string[]> = {}
  for (const [alias, target] of Object.entries(mapping)) {
    const trimmedAlias = alias.trim()
    const trimmedTarget = typeof target === 'string' ? target.trim() : ''
    if (
      trimmedAlias !== '' &&
      trimmedTarget !== '' &&
      inModels.has(trimmedTarget)
    ) {
      if (!targetToKeys[trimmedTarget]) {
        targetToKeys[trimmedTarget] = []
      }
      targetToKeys[trimmedTarget].push(trimmedAlias)
    }
  }

  const seen = new Set<string>()
  const exposed: string[] = []
  for (const m of list) {
    const aliases = targetToKeys[m]
    if (aliases && aliases.length > 0) {
      for (const alias of aliases) {
        if (!seen.has(alias)) {
          seen.add(alias)
          exposed.push(alias)
        }
      }
    } else if (!seen.has(m)) {
      seen.add(m)
      exposed.push(m)
    }
  }

  return exposed
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
    <span
      className={cn(
        'inline-flex items-center gap-1',
        statusClassName(props.item.status)
      )}
    >
      {props.item.status === 'running' && (
        <Loader2 className='size-3 animate-spin' aria-hidden='true' />
      )}
      {labels[props.item.status]}
    </span>
  )
}

/** Results table of the finished and in-flight model tests. */
function TestResultTable(props: {
  items: ModelTestItem[]
  onTestModel?: (model: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  if (props.items.length === 0) {
    return (
      <div className='mono flex flex-1 items-center justify-center border border-zinc-800 bg-[#0a0a0a] py-10 text-center text-xs text-zinc-600'>
        {t('Run a test to see latency, TTFT and tokens per second.')}
      </div>
    )
  }
  return (
    <div className='admin-no-scrollbar min-h-0 flex-1 overflow-auto border border-zinc-800 bg-[#0a0a0a]'>
      <table className='mono w-full text-left text-xs whitespace-nowrap'>
        <thead className='sticky top-0 border-b border-zinc-800 bg-zinc-900 text-zinc-500 uppercase'>
          <tr>
            <th className='px-3 py-2 font-medium'>{t('Model')}</th>
            <th className='px-3 py-2 font-medium'>{t('Status')}</th>
            <th className='px-3 py-2 font-medium'>{t('Time')}</th>
            <th className='px-3 py-2 font-medium'>{t('TTFT')}</th>
            <th className='px-3 py-2 font-medium'>{t('Tokens/s')}</th>
            <th className='px-3 py-2 font-medium'>{t('Prompt tokens')}</th>
            <th className='px-3 py-2 font-medium'>{t('Completion tokens')}</th>
            <th className='px-3 py-2 text-right font-medium'>
              {t('Total tokens')}
            </th>
            <th className='px-3 py-2 text-right font-medium'>{t('Actions')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-zinc-900 text-zinc-300'>
          {props.items.map((item) => {
            const isItemRunning = item.status === 'running'
            const canTest = !props.disabled && !isItemRunning
            return (
              <tr
                key={item.model}
                onClick={() => {
                  if (canTest) {
                    props.onTestModel?.(item.model)
                  }
                }}
                className={cn(
                  'transition-colors',
                  canTest ? 'cursor-pointer hover:bg-zinc-800/60' : 'opacity-85'
                )}
                title={canTest ? t('Click to test this model') : undefined}
              >
                <td
                  className='max-w-[200px] truncate px-3 py-2 text-white'
                  title={
                    item.upstreamModel && item.upstreamModel !== item.model
                      ? `${item.model} → ${item.upstreamModel}`
                      : item.model
                  }
                >
                  <div className='flex flex-col truncate'>
                    <span className='truncate'>{item.model}</span>
                    {item.upstreamModel &&
                      item.upstreamModel !== item.model && (
                        <span className='truncate text-[10px] font-normal text-zinc-500'>
                          → {item.upstreamModel}
                        </span>
                      )}
                  </div>
                </td>
                <td className='px-3 py-2'>
                  {item.status === 'failed' && item.error ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            className='inline-flex cursor-help'
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <TestStatusCell item={item} />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        className='max-w-xs text-xs break-words'
                      >
                        {item.error}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <TestStatusCell item={item} />
                  )}
                </td>
                <td className='px-3 py-2 tabular-nums'>
                  {formatResponseTime((item.time ?? 0) * 1000)}
                </td>
                <td className='px-3 py-2 tabular-nums'>
                  {item.ttft === undefined
                    ? '-'
                    : formatResponseTime(item.ttft * 1000)}
                </td>
                <td className='px-3 py-2 tabular-nums'>
                  {item.tokensPerSecond === undefined
                    ? '-'
                    : formatNumber(item.tokensPerSecond)}
                </td>
                <td className='px-3 py-2 tabular-nums'>
                  {item.usage?.prompt_tokens === undefined
                    ? '-'
                    : formatNumber(item.usage.prompt_tokens)}
                </td>
                <td className='px-3 py-2 tabular-nums'>
                  {item.usage?.completion_tokens === undefined
                    ? '-'
                    : formatNumber(item.usage.completion_tokens)}
                </td>
                <td className='px-3 py-2 text-right tabular-nums'>
                  {item.usage?.total_tokens === undefined
                    ? '-'
                    : formatNumber(item.usage.total_tokens)}
                </td>
                <td className='px-3 py-2 text-right'>
                  <button
                    type='button'
                    disabled={props.disabled || isItemRunning}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.onTestModel?.(item.model)
                    }}
                    className='btn-industrial-secondary mono px-2 py-0.5 text-xs disabled:opacity-40'
                    title={t('Click to test this model')}
                    aria-label={`${t('Test')} ${item.model}`}
                  >
                    {isItemRunning ? (
                      <Loader2
                        className='inline size-3 animate-spin'
                        aria-hidden='true'
                      />
                    ) : (
                      t('Test')
                    )}
                  </button>
                </td>
              </tr>
            )
          })}
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
  const queryClient = useQueryClient()
  const runner = useModelTestRunner(props.channel.id)
  const [channelModels, setChannelModels] = useState<string[]>(() =>
    parseChannelModels(props.channel.models, props.channel.model_mapping)
  )
  const [selected, setSelected] = useState<string[]>(() =>
    parseChannelModels(props.channel.models, props.channel.model_mapping)
  )
  const [extraModels, setExtraModels] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [search, setSearch] = useState('')
  const [stream, setStream] = useState(false)
  const [concurrency, setConcurrency] = useState('3')
  const [isApplying, setIsApplying] = useState(false)

  const allModels = useMemo(
    () => [...new Set([...channelModels, ...extraModels])],
    [channelModels, extraModels]
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
    filteredModels.length > 0 &&
    filteredModels.every((model) => selectedSet.has(model))

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
      prev.includes(model)
        ? prev.filter((item) => item !== model)
        : [...prev, model]
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

  const startSingleTest = (model: string) => {
    runner.runSingle(model, { stream })
  }

  const successfulModels = useMemo(
    () => [
      ...new Set(
        runner.items
          .filter((item) => item.status === 'success')
          .map((item) => item.model)
      ),
    ],
    [runner.items]
  )

  const keepSuccessfulModels = async () => {
    if (successfulModels.length === 0 || runner.running || isApplying) {
      return
    }
    setIsApplying(true)
    try {
      // Map successful models back to upstream models if they are aliases
      let nextRawModels = successfulModels
      if (
        props.channel.model_mapping &&
        props.channel.model_mapping.trim() !== ''
      ) {
        try {
          const mapping = JSON.parse(props.channel.model_mapping) as Record<
            string,
            string
          >
          const mapped = new Set<string>()
          for (const m of successfulModels) {
            if (
              mapping[m] &&
              typeof mapping[m] === 'string' &&
              mapping[m].trim() !== ''
            ) {
              mapped.add(mapping[m].trim())
            } else {
              mapped.add(m)
            }
          }
          nextRawModels = [...mapped]
        } catch {
          // ignore mapping parse failure
        }
      }

      const res = await updateChannel({
        id: props.channel.id,
        name: props.channel.name,
        type: props.channel.type,
        base_url: props.channel.base_url,
        group: props.channel.group,
        models: nextRawModels.join(','),
        model_mapping: props.channel.model_mapping,
        status_code_mapping: props.channel.status_code_mapping,
        priority: props.channel.priority,
        weight: props.channel.weight,
        tag: props.channel.tag,
        remark: props.channel.remark,
        test_model: props.channel.test_model,
        other: props.channel.other,
        setting: props.channel.setting,
        settings: props.channel.settings,
        openai_organization: props.channel.openai_organization,
        header_override: props.channel.header_override,
        param_override: props.channel.param_override,
        auto_ban: props.channel.auto_ban,
        max_input_tokens: props.channel.max_input_tokens,
      })
      if (!res.success) {
        toast.error(res.message || t('Failed to update channel'))
        return
      }
      toast.success(t('Channel updated'))
      setChannelModels(successfulModels)
      setExtraModels([])
      setSelected(successfulModels)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsApplying(false)
    }
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
      <DialogContent className='flex max-h-[85vh] flex-col gap-3 overflow-hidden rounded-none border-zinc-800 bg-[#0f0f0f] text-white sm:max-w-3xl'>
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
            className='flex min-w-52 flex-1 items-center gap-1.5'
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
              className='mono w-28 rounded-none border-zinc-800 bg-[#0a0a0a] text-xs'
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
              <span>
                {allFilteredSelected ? t('Clear all') : t('Select all')}
              </span>
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
              {t('{{n}} model(s) selected', { n: selected.length })} /{' '}
              {allModels.length}
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
                    'mono flex items-center justify-between gap-2 px-2 py-1 text-xs transition-colors',
                    checked
                      ? 'bg-zinc-900/80 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                  )}
                >
                  <div className='flex min-w-0 flex-1 items-center gap-2'>
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
                  <button
                    type='button'
                    disabled={isRunning}
                    onClick={() => startSingleTest(model)}
                    className='btn-industrial-secondary mono shrink-0 px-2 py-0.5 text-[11px] disabled:opacity-40'
                    title={t('Click to test this model')}
                    aria-label={`${t('Test')} ${model}`}
                  >
                    {t('Test')}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <TestResultTable
          items={runner.items}
          onTestModel={startSingleTest}
          disabled={isRunning}
        />

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
              disabled={
                isRunning || isApplying || successfulModels.length === 0
              }
              onClick={keepSuccessfulModels}
              className='btn-industrial-secondary mono text-xs disabled:opacity-40'
            >
              {isApplying && (
                <Loader2
                  className='mr-1.5 inline size-3 animate-spin'
                  aria-hidden='true'
                />
              )}
              {t('Keep only successful models')}
            </button>
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
