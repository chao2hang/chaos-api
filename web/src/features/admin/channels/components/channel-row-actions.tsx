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
  ActivityIcon,
  CopyIcon,
  PencilIcon,
  PowerIcon,
  Trash2Icon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Popconfirm,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@chaos_team/chaos-ui'

import type { Channel } from '../types'

export interface ChannelRowActionsProps {
  channel: Channel
  disabled: boolean
  onEdit: (channel: Channel) => void
  onToggleStatus: (channel: Channel) => void
  onTest: (channel: Channel) => void
  onCopy: (channel: Channel) => void
  onDelete: (channel: Channel) => void
}

function ActionButton(props: {
  icon: ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-xs'
            disabled={props.disabled}
            aria-label={props.label}
            title={props.label}
            onClick={props.onClick}
          >
            {props.icon}
          </Button>
        }
      />
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  )
}

/** Inline action buttons rendered in the trailing table column. */
export function ChannelRowActions(props: ChannelRowActionsProps) {
  const { t } = useTranslation()
  const { channel, disabled } = props
  const enabled = channel.status === 1
  const toggleLabel = enabled ? t('Disable channel') : t('Enable channel')

  return (
    <div className='flex items-center justify-end gap-0.5'>
      <ActionButton
        icon={<PencilIcon />}
        label={t('Edit channel')}
        disabled={disabled}
        onClick={() => props.onEdit(channel)}
      />
      <ActionButton
        icon={<PowerIcon />}
        label={toggleLabel}
        disabled={disabled}
        onClick={() => props.onToggleStatus(channel)}
      />
      <ActionButton
        icon={<ActivityIcon />}
        label={t('Test channel')}
        disabled={disabled}
        onClick={() => props.onTest(channel)}
      />
      <ActionButton
        icon={<CopyIcon />}
        label={t('Copy channel')}
        disabled={disabled}
        onClick={() => props.onCopy(channel)}
      />
      <Popconfirm
        title={t('Delete this channel?')}
        description={t('Deleted channels cannot be recovered.')}
        okText={t('Delete')}
        cancelText={t('Cancel')}
        okVariant='destructive'
        onConfirm={() => props.onDelete(channel)}
      >
        <Button
          variant='ghost'
          size='icon-xs'
          disabled={disabled}
          aria-label={t('Delete channel')}
          title={t('Delete channel')}
          className='text-destructive'
        >
          <Trash2Icon />
        </Button>
      </Popconfirm>
    </div>
  )
}
