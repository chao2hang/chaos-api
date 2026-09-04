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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'
import type { ReactNode } from 'react'

import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

type InstanceUsageCellProps = {
  /** Usage percent (0-100). Invalid values render an empty meter. */
  value?: number
  /** Extra detail shown in a hover tooltip. */
  tooltip?: ReactNode
}

function usageBarClass(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-emerald-500'
}

/** Compact usage meter for CPU / memory / storage columns. */
export function InstanceUsageCell(props: InstanceUsageCellProps) {
  const rawValue = props.value
  const isValid =
    typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0
  const percent = isValid ? Math.min(100, Math.max(0, rawValue)) : null

  const meter = (
    <div className='flex min-w-[104px] items-center gap-2'>
      <div className='h-1 flex-1 overflow-hidden bg-zinc-800'>
        <div
          className={cn(
            'h-full transition-[width] duration-500',
            percent !== null ? usageBarClass(percent) : 'bg-zinc-700'
          )}
          style={percent !== null ? { width: `${percent}%` } : undefined}
        />
      </div>
      <span className='mono w-12 text-right text-[11px] text-zinc-400 tabular-nums'>
        {formatPercent(props.value)}
      </span>
    </div>
  )

  if (!props.tooltip) return meter

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<div className='w-full cursor-help' />}>
          {meter}
        </TooltipTrigger>
        <TooltipContent side='top'>{props.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
