import type { PaymentOrderResponse, SubscriptionResponse } from './payment-types'

interface PaymentStatusSource {
  getOrderDetails: (code: number) => Promise<PaymentOrderResponse>
  getMySubscription: () => Promise<SubscriptionResponse>
}

export async function loadPaymentOutcome(code: number, source: PaymentStatusSource) {
  const order = await source.getOrderDetails(code)
  return refreshPaidSubscription(order, source)
}

export async function refreshPaidSubscription(order: PaymentOrderResponse, source: PaymentStatusSource) {
  let subscription: SubscriptionResponse | null = null
  if (order.status === 'PAID') {
    // Keep the verified receipt when subscription synchronization needs a retry.
    subscription = await source.getMySubscription().catch(() => null)
  }
  return { order, subscription }
}
