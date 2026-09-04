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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudDownload, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ComboboxInput } from '@/components/ui/combobox-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import {
  applyUpstreamPricing,
  formatUpstreamPriceSummary,
  formatUpstreamRatioSummary,
  getMatchConfidence,
  getUpstreamPricingCatalog,
  matchUpstreamPricing,
  type UpstreamPricingEntry,
  type UpstreamPricingMatchItem,
} from './upstream-pricing'

const SYNC_FIELD_KEYS = [
  'ratio',
  'completion',
  'cache',
  'cache_creation',
] as const
type SyncFieldKey = (typeof SYNC_FIELD_KEYS)[number]

const fieldLabels: Record<SyncFieldKey, string> = {
  ratio: 'Model ratio',
  completion: 'Completion ratio',
  cache: 'Cache ratio',
  cache_creation: 'Cache write ratio',
}

const matchFilterLabels: Record<'all' | 'matched' | 'none', string> = {
  all: 'All',
  matched: 'Matched',
  none: 'No match',
}

const confidenceBadgeVariant: Record<
  'exact' | 'high' | 'medium' | 'low' | 'none',
  'success' | 'info' | 'warning' | 'neutral' | 'danger'
> = {
  exact: 'success',
  high: 'info',
  medium: 'warning',
  low: 'neutral',
  none: 'danger',
}

type MatchFilter = keyof typeof matchFilterLabels

type UpstreamPricingSyncDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpstreamPricingSyncDialog({
  open,
  onOpenChange,
}: UpstreamPricingSyncDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const matchQuery = useQuery({
    queryKey: ['upstream-pricing-match'],
    queryFn: () => matchUpstreamPricing(),
    enabled: open,
  })
  const catalogQuery = useQuery({
    queryKey: ['upstream-pricing-catalog'],
    queryFn: () => getUpstreamPricingCatalog(),
    enabled: open,
  })

  const items = useMemo(
    () => matchQuery.data?.data?.items ?? [],
    [matchQuery.data]
  )
  const catalog = useMemo(
    () => catalogQuery.data?.data?.models ?? [],
    [catalogQuery.data]
  )

  // Only user deviations from the default (best) match are stored.
  const [selections, setSelections] = useState<Record<string, string>>({})
  // Local models explicitly excluded from sync.
  const [excluded, setExcluded] = useState<Record<string, boolean>>({})
  const [syncFields, setSyncFields] = useState<Record<SyncFieldKey, boolean>>({
    ratio: true,
    completion: true,
    cache: true,
    cache_creation: true,
  })
  const [search, setSearch] = useState('')
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')

  const resolveSelection = (item: UpstreamPricingMatchItem) =>
    selections[item.model] ?? item.candidates[0]?.model_name

  const isIncluded = (item: UpstreamPricingMatchItem) =>
    !excluded[item.model] && Boolean(resolveSelection(item))

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset transient state when the dialog closes.
      setSearch('')
      setMatchFilter('all')
      setExcluded({})
    }
    onOpenChange(nextOpen)
  }

  const handleRefresh = () => {
    setSelections({})
    setExcluded({})
    matchQuery.refetch()
  }

  const entryByName = useMemo(() => {
    const map = new Map<string, UpstreamPricingEntry>()
    for (const entry of catalog) map.set(entry.model_name, entry)
    for (const item of items) {
      for (const entry of item.candidates) {
        if (!map.has(entry.model_name)) map.set(entry.model_name, entry)
      }
    }
    return map
  }, [catalog, items])

  const filteredItems = useMemo(() => {
    const searchLower = search.trim().toLowerCase()
    return items.filter((item) => {
      if (matchFilter === 'matched' && item.candidates.length === 0) {
        return false
      }
      if (matchFilter === 'none' && item.candidates.length > 0) {
        return false
      }
      if (searchLower && !item.model.toLowerCase().includes(searchLower)) {
        return false
      }
      return true
    })
  }, [items, search, matchFilter])

  const selectedItems = useMemo(
    () =>
      items.filter((item) => {
        const upstreamModel = resolveSelection(item)
        return !excluded[item.model] && Boolean(upstreamModel)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, excluded, selections]
  )

  const applyMutation = useMutation({
    mutationFn: () => {
      const payload = selectedItems
        .map((item) => ({
          model: item.model,
          upstream_model: resolveSelection(item) ?? '',
          fields: SYNC_FIELD_KEYS.filter((key) => syncFields[key]),
        }))
        .filter((item) => item.upstream_model !== '')
      return applyUpstreamPricing(payload)
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.message || t('Failed to sync upstream pricing'))
        return
      }
      const appliedCount = data.data?.applied_count ?? 0
      const skipped = data.data?.skipped ?? []
      if (appliedCount > 0) {
        toast.success(
          t('Synced pricing for {{count}} models', { count: appliedCount })
        )
      }
      for (const item of skipped) {
        toast.warning(t('Skipped {{model}}: {{reason}}', item))
      }
      queryClient.invalidateQueries({ queryKey: ['system-options'] })
      queryClient.invalidateQueries({ queryKey: ['upstream-pricing-match'] })
      if (appliedCount > 0 && skipped.length === 0) {
        onOpenChange(false)
      } else if (appliedCount === 0 && skipped.length === 0) {
        toast.info(t('No models selected to sync'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Failed to sync upstream pricing'))
    },
  })

  const toggleIncluded = (model: string, checked: boolean) => {
    setExcluded((prev) => {
      const next = { ...prev }
      if (checked) {
        delete next[model]
      } else {
        next[model] = true
      }
      return next
    })
  }

  const toggleAllFiltered = (checked: boolean) => {
    setExcluded((prev) => {
      const next = { ...prev }
      for (const item of filteredItems) {
        if (!checked) {
          next[item.model] = true
        } else if (resolveSelection(item)) {
          delete next[item.model]
        }
      }
      return next
    })
  }

  const upstreamCount = matchQuery.data?.data?.upstream_count ?? 0
  const matchedCount = matchQuery.data?.data?.matched_count ?? 0
  const unsetCount = matchQuery.data?.data?.unset_count ?? 0
  const isLoading = matchQuery.isPending
  const loadError =
    matchQuery.isError ||
    (matchQuery.data !== undefined && !matchQuery.data.success)
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => isIncluded(item))

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className='text-muted-foreground p-8 text-center text-sm'>
          {t('Matching upstream pricing...')}
        </div>
      )
    }
    if (loadError) {
      return (
        <div className='text-destructive p-8 text-center text-sm'>
          {matchQuery.data?.message || t('Failed to load upstream pricing')}
        </div>
      )
    }
    if (filteredItems.length === 0) {
      return (
        <div className='text-muted-foreground p-8 text-center text-sm'>
          {t('No models to sync')}
        </div>
      )
    }
    return (
      <table className='w-full caption-bottom text-sm'>
        <thead className='bg-muted/50 sticky top-0 z-10'>
          <tr className='border-b transition-colors'>
            <th className='h-9 w-10 px-2 text-left align-middle font-medium'>
              <Checkbox
                checked={allFilteredSelected}
                indeterminate={
                  !allFilteredSelected &&
                  filteredItems.some((item) => isIncluded(item))
                }
                onCheckedChange={(checked) =>
                  toggleAllFiltered(checked === true)
                }
                aria-label={t('Select all')}
              />
            </th>
            <th className='h-9 px-2 text-left align-middle font-medium'>
              {t('Model')}
            </th>
            <th className='h-9 w-20 px-2 text-left align-middle font-medium'>
              {t('Match')}
            </th>
            <th className='h-9 w-64 px-2 text-left align-middle font-medium'>
              {t('Upstream model')}
            </th>
            <th className='h-9 px-2 text-left align-middle font-medium'>
              {t('Upstream pricing')}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <UpstreamPricingRow
              key={item.model}
              item={item}
              selectedModel={resolveSelection(item)}
              included={isIncluded(item)}
              entryByName={entryByName}
              catalog={catalog}
              onSelect={(upstreamModel) =>
                setSelections((prev) => ({
                  ...prev,
                  [item.model]: upstreamModel,
                }))
              }
              onToggleIncluded={(checked) =>
                toggleIncluded(item.model, checked)
              }
            />
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CloudDownload className='size-4' />
            {t('Sync upstream pricing')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Fuzzy matches models without pricing against the upstream price catalog. Review each match and apply.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
          <span className='text-muted-foreground'>
            {t('{{count}} models without pricing', { count: unsetCount })}
          </span>
          <span className='text-muted-foreground'>
            {t('{{count}} matched upstream', { count: matchedCount })}
          </span>
          <span className='text-muted-foreground'>
            {t('Upstream catalog: {{count}} models', { count: upstreamCount })}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Filter models...')}
            className='h-8 w-44'
          />
          <div className='flex items-center gap-1 rounded-md border p-0.5'>
            {(Object.keys(matchFilterLabels) as MatchFilter[]).map((value) => (
              <button
                key={value}
                type='button'
                onClick={() => setMatchFilter(value)}
                className={`rounded px-2 py-0.5 text-xs ${
                  matchFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(matchFilterLabels[value])}
              </button>
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            {SYNC_FIELD_KEYS.map((key) => (
              <label
                key={key}
                className='flex cursor-pointer items-center gap-1.5 text-xs'
              >
                <Checkbox
                  checked={syncFields[key]}
                  onCheckedChange={(checked) =>
                    setSyncFields((prev) => ({
                      ...prev,
                      [key]: checked === true,
                    }))
                  }
                />
                {t(fieldLabels[key])}
              </label>
            ))}
          </div>
          <Button
            variant='outline'
            size='sm'
            className='ml-auto'
            onClick={handleRefresh}
            disabled={matchQuery.isFetching}
          >
            <RefreshCw
              data-icon='inline-start'
              className={matchQuery.isFetching ? 'animate-spin' : ''}
            />
            {t('Refresh')}
          </Button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto rounded-md border'>
          {renderBody()}
        </div>

        <DialogFooter className='items-center gap-2 border-t pt-3 sm:justify-between'>
          <span className='text-muted-foreground text-sm'>
            {t('{{count}} models selected', {
              count: selectedItems.length,
            })}
          </span>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={
                applyMutation.isPending ||
                selectedItems.length === 0 ||
                !SYNC_FIELD_KEYS.some((key) => syncFields[key])
              }
            >
              <CloudDownload data-icon='inline-start' />
              {applyMutation.isPending
                ? t('Syncing...')
                : t('Apply pricing ({{count}})', {
                    count: selectedItems.length,
                  })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UpstreamPricingRow({
  item,
  selectedModel,
  included,
  entryByName,
  catalog,
  onSelect,
  onToggleIncluded,
}: {
  item: UpstreamPricingMatchItem
  selectedModel?: string
  included: boolean
  entryByName: Map<string, UpstreamPricingEntry>
  catalog: UpstreamPricingEntry[]
  onSelect: (upstreamModel: string) => void
  onToggleIncluded: (checked: boolean) => void
}) {
  const { t } = useTranslation()
  const confidence = getMatchConfidence(item.score)
  const selectedEntry = selectedModel
    ? entryByName.get(selectedModel)
    : undefined

  const options = useMemo(() => {
    const source = catalog.length > 0 ? catalog : item.candidates
    return source.map((entry) => ({
      value: entry.model_name,
      label:
        (entry.vendor_name ? `${entry.vendor_name} · ` : '') + entry.model_name,
    }))
  }, [catalog, item.candidates])

  return (
    <tr
      className={`border-b transition-colors ${
        included ? '' : 'text-muted-foreground opacity-60'
      }`}
    >
      <td className='px-2 py-1.5 align-middle'>
        <Checkbox
          checked={included}
          disabled={!selectedModel}
          onCheckedChange={(checked) => onToggleIncluded(checked === true)}
          aria-label={t('Select row')}
        />
      </td>
      <td className='max-w-[240px] truncate px-2 py-1.5 align-middle font-mono text-xs'>
        {item.model}
      </td>
      <td className='px-2 py-1.5 align-middle'>
        {item.candidates.length > 0 ? (
          <StatusBadge
            variant={confidenceBadgeVariant[confidence]}
            label={
              confidence === 'exact'
                ? t('Exact')
                : `${Math.round(item.score * 100)}%`
            }
            copyable={false}
          />
        ) : (
          <span className='text-muted-foreground text-xs'>{t('No match')}</span>
        )}
      </td>
      <td className='px-2 py-1.5 align-middle'>
        <ComboboxInput
          options={options}
          value={selectedModel ?? ''}
          onValueChange={(value) => onSelect(value)}
          placeholder={t('Select upstream model...')}
          emptyText={t('No upstream model found')}
          className='h-8 w-full'
        />
      </td>
      <td className='px-2 py-1.5 align-middle text-xs'>
        {selectedEntry ? (
          <div className='flex flex-col gap-0.5'>
            <span>{formatUpstreamPriceSummary(selectedEntry) || '—'}</span>
            <span className='text-muted-foreground'>
              {formatUpstreamRatioSummary(selectedEntry) || '—'}
            </span>
          </div>
        ) : (
          <span className='text-muted-foreground'>—</span>
        )}
      </td>
    </tr>
  )
}
