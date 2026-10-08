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
import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { Coins, KeyRound, MoreHorizontal, Pencil, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SecureVerificationDialog, useSecureVerification } from '@/features/auth/secure-verification'

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

type ManageAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete'

export function UserRowActions(props: UserRowActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = props.user
  const lastGatedActionRef = useRef<'manage' | 'reset_passkey' | 'reset_2fa'>(
    null
  )

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY] })
  }

  const {
    open: verificationOpen,
    setOpen: setVerificationOpen,
    methods: dialogMethods,
    state: verificationState,
    withVerification,
    executeVerification,
    cancel: cancelVerification,
    setCode,
    switchMethod,
  } = useSecureVerification({
    onSuccess: () => {
      const action = lastGatedActionRef.current
      lastGatedActionRef.current = null
      if (action === 'reset_passkey') {
        toast.success(t(SUCCESS_MESSAGES.PASSKEY_RESET))
      } else if (action === 'reset_2fa') {
        toast.success(t(SUCCESS_MESSAGES.TWO_FACTOR_RESET))
      } else {
        toast.success(t(SUCCESS_MESSAGES.USER_UPDATED))
      }
      invalidateUsers()
    },
  })

  const handleManage = (action: ManageAction) => {
    lastGatedActionRef.current = 'manage'
    void withVerification(() => manageUser({ id: user.id, action }), {
      scope: action === 'delete' ? 'admin.user.delete' : 'admin.user.manage',
      context:
        action === 'delete'
          ? { user_id: user.id }
          : { user_id: user.id, action },
    }).catch(() => {
      // Non-verification errors are already surfaced by the hook's dialog
      // flow; nothing else to clean up here.
    })
  }

  const handleResetPasskey = () => {
    lastGatedActionRef.current = 'reset_passkey'
    void withVerification(() => resetUserPasskey(user.id), {
      scope: 'admin.user.passkey.reset',
      context: { user_id: user.id },
    }).catch(() => {})
  }

  const handleResetTwoFactor = () => {
    lastGatedActionRef.current = 'reset_2fa'
    void withVerification(() => resetUserTwoFactor(user.id), {
      scope: 'admin.user.2fa.disable',
      context: { user_id: user.id },
    }).catch(() => {})
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
          <DropdownMenuItem onSelect={() => handleManage(user.status === USER_STATUS.ENABLED ? 'disable' : 'enable')}>
            {user.status === USER_STATUS.ENABLED
              ? t('Disable user')
              : t('Enable user')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleManage('promote')}>
            {t('Promote to admin')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleManage('demote')}>
            {t('Demote to user')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popconfirm
        title={t('Reset this passkey registration?')}
        okText={t('Reset')}
        cancelText={t('Cancel')}
        onConfirm={handleResetPasskey}
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
        onConfirm={handleResetTwoFactor}
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
        onConfirm={() => handleManage('delete')}
      >
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('Delete user')}
        >
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </Popconfirm>
      <SecureVerificationDialog
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        methods={dialogMethods}
        state={verificationState}
        onVerify={(method, code) => {
          void executeVerification(method, code)
        }}
        onCancel={cancelVerification}
        onCodeChange={setCode}
        onMethodChange={switchMethod}
      />
    </div>
  )
}
