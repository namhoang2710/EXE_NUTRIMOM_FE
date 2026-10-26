import { useCallback, useSyncExternalStore } from 'react'
import { useRetryCountdown } from '@/features/payment/hooks/usePaymentCooldown'
import { passwordCooldown } from '../api/password-api'

export function usePasswordCooldown(group: 'email-send' | 'code-verify') {
  const until = useSyncExternalStore(passwordCooldown.subscribe, useCallback(() => passwordCooldown.until(group), [group]), () => 0)
  return useRetryCountdown(until)
}
