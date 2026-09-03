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

/** Format a channel test response time (milliseconds) for display. */
export function formatResponseTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '-'
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`
  }
  return `${(ms / 1000).toFixed(2)} s`
}

export interface ModelSummary {
  display: string
  extra: number
}

/**
 * Summarize the comma-separated model list of a channel for a table cell:
 * keep the first `maxItems` entries and count the rest.
 */
export function summarizeModels(models: string, maxItems: number = 3): ModelSummary {
  const list = models
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
  const display = list.slice(0, maxItems).join(', ')
  const extra = Math.max(0, list.length - maxItems)
  return { display, extra }
}

/**
 * Normalize free-form model input (comma / newline / whitespace separated)
 * into the canonical comma-separated string stored on the channel.
 */
export function parseModelsInput(input: string): string {
  return input
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .join(',')
}
