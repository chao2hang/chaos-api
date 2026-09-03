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
import { CopyButton, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@chaos_team/chaos-ui'
import { useTranslation } from 'react-i18next'

type CopyableTextProps = {
  text: string
  /** Characters shown before truncation. */
  displayLength?: number
}

/** Truncated monospace text with a full-value tooltip and a copy button. */
export function CopyableText(props: CopyableTextProps) {
  const { t } = useTranslation()
  const displayLength = props.displayLength ?? 12
  const text = props.text
  if (!text) {
    return <span className='text-muted-foreground'>-</span>
  }
  const truncated = text.length > displayLength
  const display = truncated ? `${text.slice(0, displayLength)}…` : text
  return (
    <span className='inline-flex max-w-full items-center gap-1'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className='font-mono text-xs' />}>
            {display}
          </TooltipTrigger>
          <TooltipContent side='top' className='max-w-[360px] break-all'>
            {text}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CopyButton text={text} icon variant='ghost' size='icon-xs' aria-label={t('Copy to clipboard')} />
    </span>
  )
}
