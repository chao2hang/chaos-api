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
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

/**
 * Format a byte count as a compact human-readable value
 * ("60.6 GB"). Invalid input renders "-".
 */
export function formatBytes(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-'
  }
  if (value === 0) return '0 B'

  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    BYTE_UNITS.length - 1
  )
  if (exponent <= 0) return `${value} B`

  const scaled = value / 1024 ** exponent
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(scaled)} ${BYTE_UNITS[exponent]}`
}
