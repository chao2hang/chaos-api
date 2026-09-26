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
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  ComboboxInput,
  type ComboboxInputOption,
} from '@/components/ui/combobox-input'
import { cn } from '@/lib/utils'

import { createMappingRowId } from '../lib/form'
import type { ModelMappingEntry } from '../lib/schema'

type ModelMappingEditorProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  value: ModelMappingEntry[]
  onChange: (value: ModelMappingEntry[]) => void
  modelOptions: ComboboxInputOption[]
}

/**
 * One-row-per-mapping editor for the channel model mapping. Each row pairs a
 * source alias with an upstream model; both sides offer the channel's models
 * in a combobox and accept free text for names outside that list.
 */
export function ModelMappingEditor(props: ModelMappingEditorProps) {
  const { t } = useTranslation()

  const updateEntry = (index: number, patch: Partial<ModelMappingEntry>) => {
    props.onChange(
      props.value.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      )
    )
  }

  const removeEntry = (index: number) => {
    props.onChange(props.value.filter((_, entryIndex) => entryIndex !== index))
  }

  const addEntry = () => {
    props.onChange([
      ...props.value,
      { rowId: createMappingRowId(), source: '', target: '' },
    ])
  }

  return (
    <div
      id={props.id}
      role='group'
      aria-label={props['aria-label'] || t('Model mapping')}
      aria-describedby={props['aria-describedby']}
      aria-invalid={props['aria-invalid']}
      className={cn('flex flex-col gap-2', props.className)}
    >
      {props.value.map((entry, index) => (
        <div key={entry.rowId} className='flex items-center gap-2'>
          <ComboboxInput
            className='min-w-0 flex-1'
            options={props.modelOptions}
            value={entry.source}
            onValueChange={(next) => updateEntry(index, { source: next })}
            allowCustomValue
            placeholder={t('Source model')}
            aria-label={t('Source model')}
            emptyText='No matching model'
          />
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            aria-hidden='true'
            className='text-muted-foreground size-4 shrink-0'
          />
          <ComboboxInput
            className='min-w-0 flex-1'
            options={props.modelOptions}
            value={entry.target}
            onValueChange={(next) => updateEntry(index, { target: next })}
            allowCustomValue
            placeholder={t('Target model')}
            aria-label={t('Target model')}
            emptyText='No matching model'
          />
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('Remove this mapping')}
            onClick={() => removeEntry(index)}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              aria-hidden='true'
            />
          </Button>
        </div>
      ))}
      <div>
        <Button type='button' variant='outline' size='sm' onClick={addEntry}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden='true' />
          {t('Add mapping')}
        </Button>
      </div>
    </div>
  )
}
