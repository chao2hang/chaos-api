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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useSecureVerification } from '@/features/auth/secure-verification'

import { getChannelKey } from '../api'

export function useChannelKeyDisclosure(
  open: boolean,
  channelId: number | null | undefined
) {
  const { t } = useTranslation()
  const verification = useSecureVerification()
  const { cancel: cancelVerification, startVerification } = verification
  const [disclosedKey, setDisclosedKey] = useState<{
    channelId: number
    key: string
  } | null>(null)
  const [isChannelKeyLoading, setIsChannelKeyLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<{
    open: boolean
    channelId: number | null | undefined
  }>({ open, channelId })

  if (activeSession.open !== open || activeSession.channelId !== channelId) {
    setActiveSession({ open, channelId })
    setDisclosedKey(null)
    setIsChannelKeyLoading(false)
  }

  const operation = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      operation.current?.abort()
      operation.current = null
      cancelVerification()
    }
  }, [open, channelId, cancelVerification])

  const handleRevealKey = useCallback(async () => {
    if (!channelId || !open || operation.current) return
    const current = new AbortController()
    operation.current = current

    const fetchKeyWithProof = async (proofToken?: string) => {
      if (!proofToken || operation.current !== current) return
      setIsChannelKeyLoading(true)
      try {
        const res = await getChannelKey(channelId, proofToken, current.signal)
        if (operation.current !== current) return
        if (!res.success) {
          throw new Error(res.message || t('Failed to fetch channel key'))
        }
        setDisclosedKey({ channelId, key: res.data?.key ?? '' })
        toast.success(t('Channel key unlocked'))
      } finally {
        if (operation.current === current) {
          operation.current = null
          setIsChannelKeyLoading(false)
        }
      }
    }

    try {
      await startVerification(fetchKeyWithProof, {
        scope: 'channel.key.read',
        context: { channel_id: channelId },
        title: t('Verify to view channel key'),
        description: t(
          'Use Passkey or 2FA to confirm your identity before revealing this channel key.'
        ),
      })
    } catch (error) {
      if (operation.current === current && !current.signal.aborted) {
        operation.current = null
        setIsChannelKeyLoading(false)
        const message =
          error instanceof Error
            ? error.message
            : t('Failed to fetch channel key')
        toast.error(message)
      }
    }
  }, [channelId, open, startVerification, t])

  const channelKey =
    open && channelId && disclosedKey?.channelId === channelId
      ? disclosedKey.key
      : null

  return { channelKey, isChannelKeyLoading, handleRevealKey, verification }
}
