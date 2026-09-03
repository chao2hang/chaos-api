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
import dayjs from '@/lib/dayjs'

/** Convert a unix-ms URL timestamp to unix-seconds API param (omit invalid). */
export function unixMsToApiSeconds(ms?: number): number | undefined {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return undefined
  }
  return Math.floor(ms / 1000)
}

/** Convert a unix-ms URL timestamp to a Date for date pickers (null = empty). */
export function unixMsToDate(ms?: number): Date | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return null
  }
  return dayjs(ms).toDate()
}

/** Convert a picked Date back to unix-ms for the URL (undefined = cleared). */
export function dateToUnixMs(date: Date | null | undefined): number | undefined {
  if (date == null) {
    return undefined
  }
  const ms = dayjs(date).valueOf()
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}
