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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, KeyRound, MoreHorizontal, Pencil, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popconfirm,
} from '@chaos_team/chaos-ui'

import { manageUser, resetUserPasskey, resetUserTwoFactor } from '../api'
import { SUCCESS_MESSAGES, USERS_QUERY_KEY, USER_STATUS } from '../constants'
import type { User } from '../types'

type UserRowActionsProps = {
  user: User
  onEdit: (user: User) => void
  onQuota: (user: User) => void
}

export function UserRowActions(props: UserRowActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = props.user

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY] })
  }

  const manageMutation = useMutation({
    mutationFn: manageUser,
    onSuccess: () => {
      toast.success(t(SUCCESS_MESSAGES.USER_UPDATED))
      invalidateUsers()
    },
  })

  const resetPasskeyMutation = useMutation({
    mutationFn: () => resetUserPasskey(user.id),
    onSuccess: () => {
      toast.success(t(SUCCESS_MESSAGES.PASSKEY_RESET))
      invalidateUsers()
    },
  })

  const resetTwoFactorMutation = useMutation({
    mutationFn: () => resetUserTwoFactor(user.id),
    onSuccess: () => {
      toast.success(t(SUCCESS_MESSAGES.TWO_FACTOR_RESET))
      invalidateUsers()
    },
  })

  const handleToggleStatus = () => {
    const action =
      user.status === USER_STATUS.ENABLED ? 'disable' : 'enable'
    manageMutation.mutate({ id: user.id, action })
  }

  const handleRoleChange = (action: 'promote' | 'demote') => {
    manageMutation.mutate({ id: user.id, action })
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant='ghost' size='icon-sm' aria-label={t('More actions')} />
          }
        >
          <MoreHorizontal className='size-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onSelect={() => props.onEdit(user)}>
            <Pencil className='size-4' />
            {t('Edit user')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => props.onQuota(user)}>
            <Coins className='size-4' />
            {t('Adjust quota')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleStatus}>
            {user.status === USER_STATUS.ENABLED
              ? t('Disable user')
              : t('Enable user')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleRoleChange('promote')}>
            {t('Promote to admin')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleRoleChange('demote')}>
            {t('Demote to user')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popconfirm
        title={t('Reset this passkey registration?')}
        okText={t('Reset')}
        cancelText={t('Cancel')}
        onConfirm={() => resetPasskeyMutation.mutate()}
      >
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('Reset passkey')}
        >
          <KeyRound className='size-4' />
        </Button>
      </Popconfirm>
      <Popconfirm
        title={t('Reset this two-factor setup?')}
        okText={t('Reset')}
        cancelText={t('Cancel')}
        onConfirm={() => resetTwoFactorMutation.mutate()}
      >
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('Reset two-factor authentication')}
        >
          <ShieldOff className='size-4' />
        </Button>
      </Popconfirm>
      <Popconfirm
        title={t('Delete this user?')}
        description={t('This action cannot be undone.')}
        okText={t('Delete')}
        cancelText={t('Cancel')}
        okVariant='destructive'
        onConfirm={() => manageMutation.mutate({ id: user.id, action: 'delete' })}
      >
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('Delete user')}
        >
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </Popconfirm>
    </div>
  )
}
