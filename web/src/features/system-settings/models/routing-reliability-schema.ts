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
import * as z from 'zod'

import { parseHttpStatusCodeRules } from '@/lib/http-status-code-rules'

const channelTestModes = [
  'scheduled_all',
  'auto_ban_only',
  'passive_recovery',
] as const

const maxChannelTestConcurrency = 32

export const routingReliabilityNumericStringSchema = z
  .string()
  .refine((value) => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return !Number.isNaN(Number(trimmed)) && Number(trimmed) >= 0
  }, 'Enter a non-negative number or leave empty')

export const createRoutingReliabilitySchema = (
  t: (key: string, options?: Record<string, unknown>) => string
) =>
  z
    .object({
      RetryTimes: z.coerce.number().min(0).max(10),
      ChannelDisableThreshold: routingReliabilityNumericStringSchema,
      AutomaticDisableChannelEnabled: z.boolean(),
      AutomaticEnableChannelEnabled: z.boolean(),
      AutomaticDisableKeywords: z.string(),
      AutomaticDisableStatusCodes: z.string(),
      AutomaticRetryStatusCodes: z.string(),
      monitor_setting: z.object({
        auto_test_channel_enabled: z.boolean(),
        auto_test_channel_minutes: z.coerce
          .number()
          .int()
          .min(1, t('Interval must be at least 1 minute')),
        channel_test_concurrency: z.coerce
          .number()
          .int(t('Enter a positive integer'))
          .min(1, t('Channel test concurrency must be between 1 and 32'))
          .max(
            maxChannelTestConcurrency,
            t('Channel test concurrency must be between 1 and 32')
          ),
        channel_test_mode: z.enum(channelTestModes),
        active_probe_enabled: z.boolean(),
        active_probe_interval_minutes: z.coerce
          .number()
          .int(t('Enter a positive integer'))
          .min(
            1,
            t('Active probe interval must be between 1 and 43200 minutes')
          )
          .max(
            43200,
            t('Active probe interval must be between 1 and 43200 minutes')
          ),
        active_probe_concurrency: z.coerce
          .number()
          .int(t('Enter a positive integer'))
          .min(1, t('Active probe concurrency must be between 1 and 32'))
          .max(
            maxChannelTestConcurrency,
            t('Active probe concurrency must be between 1 and 32')
          ),
      }),
    })
    .superRefine((values, ctx) => {
      const disableParsed = parseHttpStatusCodeRules(
        values.AutomaticDisableStatusCodes
      )
      if (!disableParsed.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['AutomaticDisableStatusCodes'],
          message: t('Invalid status code rules: {{tokens}}', {
            tokens: disableParsed.invalidTokens.join(', '),
          }),
        })
      }

      const retryParsed = parseHttpStatusCodeRules(
        values.AutomaticRetryStatusCodes
      )
      if (!retryParsed.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['AutomaticRetryStatusCodes'],
          message: t('Invalid status code rules: {{tokens}}', {
            tokens: retryParsed.invalidTokens.join(', '),
          }),
        })
      }
    })
