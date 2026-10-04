import { useCallback, useEffect, useState } from 'react'
import { paymentApi } from '../api/payment-api'
import type { SubscriptionResponse } from '../model/payment-types'

export function useSubscription(enabled = true) {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await paymentApi.getMySubscription()
      setSubscription(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin gói hội viên.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      void reload()
    }
  }, [enabled, reload])

  return { subscription, loading, error, reload }
}
