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
import { parseModelsInput } from './format'
import type { ChannelFormValues } from './schema'

/** Default form values for the create-channel dialog. */
export const EMPTY_CHANNEL_FORM: ChannelFormValues = {
  name: '',
  type: '1',
  key: '',
  base_url: '',
  models: '',
  group: 'default',
  priority: '0',
  weight: '0',
  tag: '',
  remark: '',
  test_model: '',
}

/** Seed the create/edit form from an existing channel record. */
export function channelToFormValues(channel: Channel): ChannelFormValues {
  return {
    name: channel.name,
    type: String(channel.type),
    key: '',
    base_url: channel.base_url ?? '',
    models: channel.models ?? '',
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
 * key means "keep the existing key", so it is omitted from the payload.
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
    models: parseModelsInput(values.models),
    group: values.group.trim(),
    priority: Number(values.priority) || 0,
    weight: Number(values.weight) || 0,
    tag: values.tag.trim(),
    remark: values.remark,
    test_model: values.test_model.trim(),
  }
}
