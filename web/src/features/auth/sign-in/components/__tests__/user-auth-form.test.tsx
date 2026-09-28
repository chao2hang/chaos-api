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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')

const toastErrorMock = vi.fn()
const toastInfoMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}))

const loginMock = vi.fn()
const beginVerificationPasskeyMock = vi.fn()
const finishVerificationPasskeyMock = vi.fn()
const handleLoginSuccessMock = vi.fn()
const redirectTo2FAMock = vi.fn()
const setPending2FAFlowTokenMock = vi.fn()
const detectPasskeySupportMock = vi.fn()
const credentialsGetMock = vi.fn()

vi.mock('@/features/auth/api', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  wechatLoginByCode: vi.fn(),
}))

vi.mock('@/features/auth/passkey', () => ({
  beginPasskeyLogin: vi.fn(),
  finishPasskeyLogin: vi.fn(),
  beginLoginVerificationPasskey: (...args: unknown[]) =>
    beginVerificationPasskeyMock(...args),
  finishLoginVerificationPasskey: (...args: unknown[]) =>
    finishVerificationPasskeyMock(...args),
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: handleLoginSuccessMock,
    redirectTo2FA: redirectTo2FAMock,
    redirectToLogin: vi.fn(),
    redirectToRegister: vi.fn(),
  }),
}))

vi.mock('@/features/auth/hooks/use-turnstile', () => ({
  useTurnstile: () => ({
    isTurnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileToken: '',
    setTurnstileToken: vi.fn(),
    validateTurnstile: () => true,
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ auth: { setPending2FAFlowToken: setPending2FAFlowTokenMock } }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { passkey_login: true, password_login_enabled: true },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: ReactNode }) => <a>{props.children}</a>,
}))

vi.mock('@/lib/passkey', () => ({
  isPasskeySupported: (...args: unknown[]) => detectPasskeySupportMock(...args),
  prepareCredentialRequestOptions: (payload: unknown) => payload,
  buildAssertionResult: vi.fn(() => ({ id: 'cred-1', rawId: 'cred-1' })),
}))

const { UserAuthForm } = await import('../user-auth-form')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

const authBundle = {
  access_token: 'access-token',
  token_type: 'Bearer',
  access_expires_at: 9999999999,
  user: { id: 1, username: 'admin', role: 100 },
  session: {
    sid: 'sid-1',
    current: true,
    login_method: 'password',
    ip: '127.0.0.1',
    user_agent: 'vitest',
    created_at: 1,
    last_active_at: 1,
    expires_at: 9999999999,
  },
}

function stubCredentials() {
  Object.defineProperty(window.navigator, 'credentials', {
    value: { get: credentialsGetMock },
    configurable: true,
  })
}

function renderSignInForm() {
  return render(
    <I18nextProvider i18n={i18n}>
      <UserAuthForm />
    </I18nextProvider>
  )
}

/** Wait until the support detection effect has re-rendered the form. */
async function waitForPasskeyReady() {
  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: 'Sign in with Passkey' })
    ).toBeEnabled()
  })
}

async function submitCredentials() {
  fireEvent.change(screen.getByLabelText('Username or Email'), {
    target: { value: 'admin' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await waitFor(() => {
    expect(loginMock).toHaveBeenCalledTimes(1)
  })
}

const originalCredentials = window.navigator.credentials

beforeEach(() => {
  detectPasskeySupportMock.mockResolvedValue(true)
  stubCredentials()
})

afterEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window.navigator, 'credentials', {
    value: originalCredentials,
    configurable: true,
  })
})

describe('UserAuthForm login verification challenge', () => {
  test('password login completing a passkey challenge signs the user in', async () => {
    loginMock.mockResolvedValue({
      success: true,
      message: '',
      data: {
        require_verification: true,
        flow_token: 'login-flow-token',
        expires_at: 9999999999,
        methods: [{ method: 'passkey', available: true }],
      },
    })
    beginVerificationPasskeyMock.mockResolvedValue({
      success: true,
      message: '',
      data: {
        flow_token: 'passkey-flow-token',
        expires_at: 9999999999,
        options: { challenge: 'challenge-string' },
      },
    })
    credentialsGetMock.mockResolvedValue({
      id: 'cred-1',
      type: 'public-key',
      response: {},
    })
    finishVerificationPasskeyMock.mockResolvedValue({
      success: true,
      message: '',
      data: authBundle,
    })

    renderSignInForm()
    await waitForPasskeyReady()
    await submitCredentials()

    await waitFor(() => {
      expect(handleLoginSuccessMock).toHaveBeenCalledTimes(1)
    })
    expect(beginVerificationPasskeyMock).toHaveBeenCalledWith(
      'login-flow-token'
    )
    expect(credentialsGetMock).toHaveBeenCalledWith({
      publicKey: { challenge: 'challenge-string' },
    })
    expect(finishVerificationPasskeyMock).toHaveBeenCalledWith(
      'login-flow-token',
      'passkey-flow-token',
      { id: 'cred-1', rawId: 'cred-1' }
    )
    expect(handleLoginSuccessMock).toHaveBeenCalledWith(authBundle, undefined)
  })

  test('challenge limited to passkey on a device without WebAuthn fails with guidance', async () => {
    detectPasskeySupportMock.mockResolvedValue(false)
    loginMock.mockResolvedValue({
      success: true,
      message: '',
      data: {
        require_verification: true,
        flow_token: 'login-flow-token',
        methods: [{ method: 'passkey', available: true }],
      },
    })

    renderSignInForm()
    await submitCredentials()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Passkey is not supported on this device'
      )
    })
    expect(beginVerificationPasskeyMock).not.toHaveBeenCalled()
    expect(handleLoginSuccessMock).not.toHaveBeenCalled()
  })

  test('challenge offering only 2FA falls back to the 2FA page with the flow token', async () => {
    loginMock.mockResolvedValue({
      success: true,
      message: '',
      data: {
        require_verification: true,
        flow_token: 'login-flow-token',
        methods: [{ method: '2fa', available: true }],
      },
    })

    renderSignInForm()
    await submitCredentials()

    await waitFor(() => {
      expect(redirectTo2FAMock).toHaveBeenCalledTimes(1)
    })
    expect(setPending2FAFlowTokenMock).toHaveBeenCalledWith('login-flow-token')
    expect(beginVerificationPasskeyMock).not.toHaveBeenCalled()
  })
})
