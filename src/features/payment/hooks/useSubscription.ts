import { useCallback, useEffect, useRef, useState } from 'react'
import { paymentApi } from '../api/payment-api'
import type { SubscriptionResponse } from '../model/payment-types'

const subscriptionCacheTtlMs = 15_000
let cachedSubscription: SubscriptionResponse | null = null
let cachedAt = 0
let subscriptionLoad: Promise<SubscriptionResponse> | null = null
let cacheGeneration = 0

function hasFreshSubscription() {
  return cachedSubscription !== null && Date.now() - cachedAt < subscriptionCacheTtlMs
}

export function primeSubscriptionCache(subscription: SubscriptionResponse) {
  cacheGeneration += 1
  cachedSubscription = subscription
  cachedAt = Date.now()
  subscriptionLoad = null
}

function loadSubscription(force = false) {
  if (!force && hasFreshSubscription()) return Promise.resolve(cachedSubscription!)
  if (!subscriptionLoad) {
    const generation = cacheGeneration
    const pending = paymentApi.getMySubscription()
      .then((data) => {
        if (generation === cacheGeneration) {
          cachedSubscription = data
          cachedAt = Date.now()
        }
        return data
      })
    subscriptionLoad = pending
    void pending.then(
      () => { if (subscriptionLoad === pending) subscriptionLoad = null },
      () => { if (subscriptionLoad === pending) subscriptionLoad = null },
    )
  }
  return subscriptionLoad
}

if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () => {
    cacheGeneration += 1
    cachedSubscription = null
    cachedAt = 0
    subscriptionLoad = null
  })
}

export function useSubscription(enabled = true) {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(() => enabled && hasFreshSubscription() ? cachedSubscription : null)
  const [loading, setLoading] = useState(enabled && !hasFreshSubscription())
  const [error, setError] = useState<string | null>(null)
  const requestVersion = useRef(0)

  const run = useCallback(async (force: boolean) => {
    const version = ++requestVersion.current
    if (!force && hasFreshSubscription()) {
      setSubscription(cachedSubscription)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await loadSubscription(force)
      if (version !== requestVersion.current) return
      setSubscription(data)
    } catch (err: unknown) {
      if (version !== requestVersion.current) return
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin gói hội viên.'
      setError(msg)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [])

  const reload = useCallback(() => run(true), [run])

  useEffect(() => {
    if (!enabled) {
      requestVersion.current += 1
      setLoading(false)
      return
    }
    void run(false)
    return () => { requestVersion.current += 1 }
  }, [enabled, run])

  return { subscription, loading, error, reload }
}
