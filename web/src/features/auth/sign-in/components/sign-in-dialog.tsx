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

For commercial licensing, please contact chaos@chaos-api.local
*/
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import { TermsFooter } from '../../components/terms-footer'
import { UserAuthForm } from './user-auth-form'

interface SignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional redirect target passed through to UserAuthForm.
   * Typically omitted when the dialog is opened from a header button.
   */
  redirectTo?: string
}

/**
 * Modal wrapper around the existing UserAuthForm.
 *
 * Closes itself when the auth store reports a signed-in user so the
 * caller does not need to plumb success handlers through.
 */
export function SignInDialog({
  open,
  onOpenChange,
  redirectTo,
}: SignInDialogProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)

  useEffect(() => {
    if (open && isAuthenticated) {
      onOpenChange(false)
    }
  }, [open, isAuthenticated, onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Sign in')}
      titleClassName='text-lg font-semibold tracking-tight'
      contentClassName='sm:max-w-md'
      bodyClassName='pt-1'
    >
      <UserAuthForm redirectTo={redirectTo} />
      <TermsFooter
        variant='sign-in'
        status={status}
        className='mt-4 text-center'
      />
    </Dialog>
  )
}
