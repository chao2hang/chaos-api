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

import type { TFunction } from 'i18next'
import { z } from 'zod'

/** One model mapping row of the channel form: alias -> upstream model. */
export interface ModelMappingEntry {
  /** Stable UI identity of the row; generated, never persisted. */
  rowId: string
  source: string
  target: string
}

/**
 * Create/edit channel form schema. All inputs are text-based; numeric fields
 * are parsed in the payload builder so empty input degrades to 0.
 */
export function getChannelFormSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    key: z.string(),
    base_url: z.string(),
    models: z.array(z.string().min(1)).min(1),
    model_mapping: z
      .array(
        z.object({
          rowId: z.string(),
          source: z.string(),
          target: z.string(),
        })
      )
      .refine(
        (entries) =>
          entries.every(
            (entry) =>
              (entry.source.trim() === '') === (entry.target.trim() === '')
          ),
        {
          message: t(
            'Each model mapping needs a source model and a target model'
          ),
        }
      ),
    group: z.string().min(1),
    priority: z.string(),
    weight: z.string(),
    tag: z.string(),
    remark: z.string(),
    test_model: z.string(),
  })
}

export type ChannelFormValues = z.infer<ReturnType<typeof getChannelFormSchema>>
