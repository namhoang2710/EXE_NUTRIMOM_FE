import type { PaymentOrderResponse, PlanTier, SubscriptionResponse } from './payment-types.ts'

export function paymentExpiry(expiresAt?: string): number | null {
  const value = expiresAt ? Date.parse(expiresAt) : NaN
  return Number.isFinite(value) ? value : null
}

/** A deadline only gates the link. Only BE may change the order status. */
export function canResumePayment(order: PaymentOrderResponse, now = Date.now()): boolean {
  const expiry = paymentExpiry(order.expires_at)
  return order.source === 'REAL' && order.status === 'PENDING' && expiry !== null && expiry > now
    && safePayOSUrl(order.checkout_url) !== null
}

export function safePayOSUrl(value?: string): string | null {
  try {
    const url = new URL(value ?? '')
    return url.protocol === 'https:' && url.hostname === 'pay.payos.vn' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

const rank: Record<PlanTier, number> = { FREE: 0, PLAN_99K: 1, PLAN_399K: 2 }
export function subscriptionCoversOrder(subscription: SubscriptionResponse | null, plan: PlanTier): boolean {
  return Boolean(subscription?.active && rank[subscription.plan_tier] >= rank[plan])
}

export function paymentDateTime(value?: string): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—'
}
