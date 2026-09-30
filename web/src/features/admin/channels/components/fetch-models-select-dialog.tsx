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
} from '@chaos_team/chaos-ui'
import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface FetchModelsSelectDialogProps {
  open: boolean
  models: string[]
  currentSelected?: string[]
  onOpenChange: (open: boolean) => void
  onConfirm: (selected: string[]) => void
}

export function FetchModelsSelectDialog(props: FetchModelsSelectDialogProps) {
  if (!props.open) return null
  return <FetchModelsSelectContent {...props} />
}

function FetchModelsSelectContent(props: FetchModelsSelectDialogProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>(() => {
    const current = props.currentSelected ?? []
    if (current.length > 0) {
      const currentSet = new Set(current)
      const intersection = props.models.filter((m) => currentSet.has(m))
      return intersection.length > 0 ? intersection : props.models
    }
    return props.models
  })

  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return props.models
    return props.models.filter((m) => m.toLowerCase().includes(query))
  }, [props.models, search])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const allFilteredSelected =
    filteredModels.length > 0 && filteredModels.every((m) => selectedSet.has(m))

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredModels)
      setSelected(selected.filter((m) => !filteredSet.has(m)))
    } else {
      setSelected([...new Set([...selected, ...filteredModels])])
    }
  }

  const toggleModel = (model: string) => {
    if (selectedSet.has(model)) {
      setSelected(selected.filter((m) => m !== model))
    } else {
      setSelected([...selected, model])
    }
  }

  const handleConfirm = () => {
    props.onConfirm(selected)
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-y-auto rounded-none border-zinc-800 bg-[#0f0f0f] text-white sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {t('Select models')}
          </DialogTitle>
          <DialogDescription className='mono text-xs text-zinc-500'>
            {t('Select models and apply to channel models list.')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3 py-2'>
          <div className='relative'>
            <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search models...')}
              className='mono h-8 rounded-none border-zinc-800 bg-[#0a0a0a] pl-8 text-xs text-white'
            />
          </div>

          <div className='mono flex items-center justify-between border-b border-zinc-800 px-1 pb-2 text-xs text-zinc-400'>
            <label className='flex cursor-pointer items-center gap-2 select-none'>
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleSelectAllFiltered}
                aria-label={t('Select all')}
              />
              <span>
                {allFilteredSelected ? t('Clear all') : t('Select all')}
              </span>
            </label>
            <span>
              {t('{{n}} model(s) selected', { n: selected.length })} /{' '}
              {props.models.length}
            </span>
          </div>

          <div className='flex max-h-60 flex-col gap-1 overflow-y-auto pr-1'>
            {filteredModels.length === 0 ? (
              <div className='mono py-8 text-center text-xs text-zinc-600'>
                {t('No matching items')}
              </div>
            ) : (
              filteredModels.map((model) => {
                const checked = selectedSet.has(model)
                return (
                  <div
                    key={model}
                    className={`mono flex items-center gap-2 rounded-none px-2 py-1.5 text-xs transition-colors ${
                      checked
                        ? 'bg-zinc-900/80 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                    }`}
                  >
                    <Checkbox
                      id={`model-select-${model}`}
                      aria-label={model}
                      checked={checked}
                      onCheckedChange={() => toggleModel(model)}
                    />
                    <label
                      htmlFor={`model-select-${model}`}
                      className='flex-1 cursor-pointer truncate select-none'
                    >
                      {model}
                    </label>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className='gap-2 border-t border-zinc-900 pt-2'>
          <button
            type='button'
            onClick={() => props.onOpenChange(false)}
            className='btn-industrial-secondary mono text-xs'
          >
            {t('Cancel')}
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            className='btn-industrial-primary mono text-xs'
          >
            {t('Confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
