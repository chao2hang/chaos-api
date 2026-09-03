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
import z from 'zod'

const logTypeValues = ['0', '1', '2', '3', '4', '5', '6', '7'] as const

/**
 * Search params shared by `/usage-logs/$section` and `/admin/usage-logs/$section`.
 * `type` (log-type values) is only meaningful for the `common` section;
 * `filter` holds the keyword input and doubles as mj_id / task_id for the
 * drawing / task sections.
 */
export const usageLogsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(undefined),
  type: z
    .preprocess((value) => {
      if (value == null || value === '') return undefined
      return Array.isArray(value) ? value : [value]
    }, z.array(z.enum(logTypeValues)).optional())
    .catch([]),
  filter: z.string().optional().catch(''),
  model: z.string().optional().catch(''),
  token: z.string().optional().catch(''),
  channel: z.string().optional().catch(''),
  group: z.string().optional().catch(''),
  username: z.string().optional().catch(''),
  requestId: z.string().optional().catch(''),
  upstreamRequestId: z.string().optional().catch(''),
  /** Unix milliseconds. */
  startTime: z.number().optional(),
  /** Unix milliseconds. */
  endTime: z.number().optional(),
})

export type UsageLogsSearch = z.infer<typeof usageLogsSearchSchema>
