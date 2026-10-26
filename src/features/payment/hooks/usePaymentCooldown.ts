import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'

const cooldowns = new Map<string, number>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const emit = () => listeners.forEach((listener) => listener())
if (typeof window !== 'undefined') {
  const clear = () => { cooldowns.clear(); emit() }
  window.addEventListener('nutrimom:session-cleared', clear)
  window.addEventListener('nutrimom:session-changed', clear)
}

export function useRetryCountdown(retryAt: number) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    setNow(Date.now())
    if (retryAt <= Date.now()) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= retryAt) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])
  return Math.max(0, Math.ceil((retryAt - now) / 1000))
}

/** Shared per account and operation, including navigation between screens. No automatic write retries. */
export function usePaymentCooldown(operation = 'subscription-checkout') {
  const key = `${getSessionScope()}:${operation}`
  const retryAt = useSyncExternalStore(subscribe, useCallback(() => cooldowns.get(key) ?? 0, [key]))
  const remaining = useRetryCountdown(retryAt)
  const handleRateLimit = useCallback((reason: unknown) => {
    if (!(reason instanceof ApiClientError) || reason.status !== 429) return false
    for (const [storedKey, expires] of cooldowns) if (expires <= Date.now()) cooldowns.delete(storedKey)
    cooldowns.set(key, Math.max(cooldowns.get(key) ?? 0, Date.now() + Math.max(1000, reason.retryAfterMs ?? 30_000)))
    emit()
    return true
  }, [key])
  return { remaining, blocked: Date.now() < retryAt, handleRateLimit }
}
