import { useEffect, useState } from 'react'
import { paymentExpiry } from '../model/payment-lifecycle'

/** Clock updates only an on-screen deadline. It never triggers an API request. */
export function usePaymentClock(expiresAt?: string) {
  const [now, setNow] = useState(Date.now)
  const expiry = paymentExpiry(expiresAt)
  useEffect(() => {
    setNow(Date.now())
    if (expiry === null || expiry <= Date.now()) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= expiry) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expiry])
  return now
}
