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

export type LogDurationVariant = 'success' | 'warning' | 'danger'

/**
 * Color variant of a usage-log duration, mirroring upstream new-api:
 * raw latency is green below 10s and amber below 30s; once a request
 * produced enough output tokens, generation throughput (tokens/s) is
 * the better signal, so >=30 is green and >=15 amber, else red.
 */
export function getResponseTimeColor(
  seconds: number,
  completionTokens: number
): LogDurationVariant {
  if (completionTokens >= 100 && seconds > 0) {
    const tokensPerSecond = completionTokens / seconds
    if (tokensPerSecond >= 30) return 'success'
    if (tokensPerSecond >= 15) return 'warning'
    return 'danger'
  }
  if (seconds < 10) return 'success'
  if (seconds < 30) return 'warning'
  return 'danger'
}
