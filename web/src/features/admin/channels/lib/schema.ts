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
    models: z.string().min(1),
    model_mapping: z
      .string()
      .refine(
        (value) => {
          const trimmed = value.trim()
          if (trimmed === '') {
            return true
          }
          try {
            const parsed: unknown = JSON.parse(trimmed)
            return (
              typeof parsed === 'object' &&
              parsed !== null &&
              !Array.isArray(parsed)
            )
          } catch {
            return false
          }
        },
        { message: t('Model mapping must be a valid JSON object') }
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
