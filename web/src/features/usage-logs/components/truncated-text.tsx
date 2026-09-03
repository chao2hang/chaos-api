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

type TruncatedTextProps = {
  text: string
  /** Characters shown before truncation. */
  displayLength?: number
  /** Show the full-value tooltip even when not truncated. */
  alwaysTooltip?: boolean
}

/** Truncated table text; hovering reveals the full value via tooltip. */
export function TruncatedText(props: TruncatedTextProps) {
  const displayLength = props.displayLength ?? 40
  const text = props.text
  if (!text) {
    return <span className='text-muted-foreground'>-</span>
  }
  const truncated = text.length > displayLength
  if (!truncated && !props.alwaysTooltip) {
    return <span className='text-xs'>{text}</span>
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className='text-xs' />}>
          {truncated ? `${text.slice(0, displayLength)}…` : text}
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-[420px] break-all'>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
