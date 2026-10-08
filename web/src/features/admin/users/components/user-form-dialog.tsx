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
import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
} from '@chaos_team/chaos-ui'
import { zodResolverAdapter } from '@chaos_team/chaos-ui/hooks'

import {
  SecureVerificationDialog,
  useSecureVerification,
} from '@/features/auth/secure-verification'
import { createUser, updateUser } from '../api'
import { SUCCESS_MESSAGES } from '../constants'
import { parseQuotaFromDollars, quotaUnitsToEditableAmount } from '@/lib/format'
import { type User, type UserFormValues, userFormSchema } from '../types'
import { UserFormFields } from './user-form-fields'

type UserFormDialogProps = {
  open: boolean
  /** Null opens the create dialog; a user opens the edit dialog. */
  user: User | null
  groups: string[]
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const EMPTY_VALUES: UserFormValues = {
  username: '',
  display_name: '',
  password: '',
  group: '',
  quota: 0,
  remark: '',
}

export function UserFormDialog(props: UserFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = props.user !== null

  const form = useForm<UserFormValues>({
    resolver: zodResolverAdapter(userFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!props.open) return
    if (props.user === null) {
      form.reset(EMPTY_VALUES)
      return
    }
    form.reset({
      username: props.user.username,
      display_name: props.user.display_name,
      password: '',
      group: props.user.group,
      quota: quotaUnitsToEditableAmount(props.user.quota),
      remark: props.user.remark ?? '',
    })
  }, [props.open, props.user, form])

  const notifySaved = useCallback(() => {
    toast.success(
      isEdit
        ? t(SUCCESS_MESSAGES.USER_UPDATED)
        : t(SUCCESS_MESSAGES.USER_CREATED)
    )
    props.onSaved()
  }, [isEdit, t, props])

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
    successMessage: isEdit
      ? t(SUCCESS_MESSAGES.USER_UPDATED)
      : t(SUCCESS_MESSAGES.USER_CREATED),
    onSuccess: () => notifySaved(),
  })

  const submitValues = useCallback(
    (values: UserFormValues) => {
      const proofCall = (proofToken?: string) => {
        if (props.user === null) {
          return createUser(
            {
              username: values.username,
              display_name: values.display_name,
              password: values.password,
              group: values.group,
              quota: parseQuotaFromDollars(values.quota),
              remark: values.remark,
            },
            proofToken
          )
        }
        return updateUser(
          {
            id: props.user.id,
            username: values.username,
            display_name: values.display_name,
            password: values.password === '' ? undefined : values.password,
            group: values.group,
            quota: parseQuotaFromDollars(values.quota),
            remark: values.remark,
          },
          proofToken
        )
      }
      // An administrator-set password and account creation are gated server
      // side: the first attempt returns 403 and the verification dialog
      // retries with a proof (toasted via successMessage). Ungated edits
      // succeed on the first attempt and toast here.
      return withVerification(proofCall, {
        scope: props.user === null ? 'admin.user.create' : 'admin.user.update',
        context:
          props.user === null
            ? { role: 0 }
            : { user_id: props.user.id },
      })
        .then((result) => {
          if (result) notifySaved()
        })
        .catch(() => {
          // Verification and server errors are surfaced by the hook.
        })
    },
    [props, notifySaved, withVerification]
  )

  const groupOptions = [
    ...new Set([...props.groups, props.user?.group ?? ''].filter((g) => g !== '')),
  ]

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-lg bg-[#0f0f0f] border-zinc-800 text-white rounded-none'>
        <DialogHeader>
          <DialogTitle className='mono text-base text-white'>
            {isEdit ? t('Edit user') : t('Create user')}
          </DialogTitle>
        </DialogHeader>
        <Form<UserFormValues> {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              if (!isEdit && values.password === '') {
                form.setError('password', {
                  message: t('Password is required'),
                })
                return
              }
              void submitValues(values)
            })}
            className='flex flex-col gap-4'
          >
            <UserFormFields form={form} groupOptions={groupOptions} isEdit={isEdit} />
            <DialogFooter className='gap-2 pt-2 border-t border-zinc-900'>
              <button
                type='button'
                onClick={() => props.onOpenChange(false)}
                className='btn-industrial-secondary mono text-xs'
              >
                {t('Cancel')}
              </button>
              <button
                type='submit'
                disabled={verificationState.loading}
                className='btn-industrial-primary mono text-xs'
              >
                {t('Save')}
              </button>
            </DialogFooter>
          </form>
        </Form>
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
      </DialogContent>
    </Dialog>
  )
}
