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

import type { Channel, ChannelPayload } from '../types'
import { splitModelNames } from './format'
import type { ChannelFormValues, ModelMappingEntry } from './schema'

/** Default form values for the create-channel dialog. */
export const EMPTY_CHANNEL_FORM: ChannelFormValues = {
  name: '',
  type: '1',
  key: '',
  base_url: '',
  models: [],
  model_mapping: [],
  group: 'default',
  priority: '0',
  weight: '0',
  tag: '',
  remark: '',
  test_model: '',
}

let mappingRowCounter = 0

/** Create a stable unique identity for a mapping row (UI-only). */
export function createMappingRowId(): string {
  mappingRowCounter += 1
  return `mapping-row-${mappingRowCounter}`
}

/**
 * Convert the stored model-mapping JSON object into mapping entries for the
 * row editor. Values that do not parse as an object are dropped so the
 * editor only ever shows editable entries.
 */
function storedMappingToEntries(mapping: string): ModelMappingEntry[] {
  const raw = mapping.trim()
  if (raw === '') {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return []
    }
    return Object.entries(parsed as Record<string, unknown>)
      .filter(
        (entry): entry is [string, string] =>
          entry[0] !== '' && typeof entry[1] === 'string' && entry[1] !== ''
      )
      .map(([name, target]) => ({
        rowId: createMappingRowId(),
        source: name,
        target,
      }))
  } catch {
    return []
  }
}

/**
 * Convert mapping entries back into the stored JSON object. Rows with a
 * blank side are still being typed (or added by accident) and are dropped;
 * a repeated source keeps the last target, matching JSON object semantics.
 */
function mappingEntriesToStored(entries: ModelMappingEntry[]): string {
  const mapping: Record<string, string> = {}
  for (const { source, target } of entries) {
    const trimmedSource = source.trim()
    const trimmedTarget = target.trim()
    if (trimmedSource === '' || trimmedTarget === '') {
      continue
    }
    mapping[trimmedSource] = trimmedTarget
  }
  if (Object.keys(mapping).length === 0) {
    return ''
  }
  return JSON.stringify(mapping)
}

/** Seed the create/edit form from an existing channel record. */
export function channelToFormValues(channel: Channel): ChannelFormValues {
  return {
    name: channel.name,
    type: String(channel.type),
    key: '',
    base_url: channel.base_url ?? '',
    models: splitModelNames(channel.models ?? ''),
    model_mapping: storedMappingToEntries(channel.model_mapping ?? ''),
    group: channel.group !== '' ? channel.group : 'default',
    priority: String(channel.priority ?? 0),
    weight: String(channel.weight ?? 0),
    tag: channel.tag ?? '',
    remark: channel.remark ?? '',
    test_model: channel.test_model ?? '',
  }
}

/**
 * Build the create/update request body from form values. On update an empty
 * key means "keep the existing key", so it is omitted from the payload. An
 * empty model mapping is sent as "" to clear the stored mapping.
 */
export function buildChannelPayload(
  values: ChannelFormValues
): ChannelPayload {
  const key = values.key.trim()
  return {
    name: values.name.trim(),
    type: Number(values.type) || 0,
    key: key !== '' ? key : undefined,
    base_url: values.base_url.trim(),
    models: values.models.join(','),
    model_mapping: mappingEntriesToStored(values.model_mapping),
    group: values.group.trim(),
    priority: Number(values.priority) || 0,
    weight: Number(values.weight) || 0,
    tag: values.tag.trim(),
    remark: values.remark,
    test_model: values.test_model.trim(),
  }
}
