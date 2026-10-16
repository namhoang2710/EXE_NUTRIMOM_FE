import assert from 'node:assert/strict'
import test from 'node:test'
import { apiClient } from '../src/core/api/api-client.ts'
import { paymentApi } from '../src/features/payment/api/payment-api.ts'
import type { PaymentOrderResponse, PaymentResponse, SubscriptionResponse } from '../src/features/payment/model/payment-types.ts'

const subscription: SubscriptionResponse = {
  plan_tier: 'PLAN_99K',
  plan_name: 'Gói Cơ bản',
  status: 'ACTIVE',
  active: true,
  days_remaining: 30,
}

const order: PaymentOrderResponse = {
  id: 'order-1',
  order_code: 123456789,
  plan_tier: 'PLAN_99K',
  plan_name: 'Gói Cơ bản',
  amount: 99000,
  currency: 'VND',
  status: 'PENDING',
  checkout_url: 'https://pay.payos.vn/order',
  created_at: '2026-10-02T10:00:00Z',
}

test('concurrent subscription and order reads share one in-flight request', async () => {
  const originalRequest = apiClient.request
  const calls = new Map<string, number>()
  apiClient.request = (async (path: string) => {
    calls.set(path, (calls.get(path) ?? 0) + 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    return path === '/payments/my-subscription' ? subscription : order
  }) as typeof apiClient.request

  try {
    const [firstSubscription, secondSubscription, firstOrder, secondOrder] = await Promise.all([
      paymentApi.getMySubscription(),
      paymentApi.getMySubscription(),
      paymentApi.getOrderDetails(order.order_code),
      paymentApi.getOrderDetails(order.order_code),
    ])

    assert.equal(firstSubscription, subscription)
    assert.equal(secondSubscription, subscription)
    assert.equal(firstOrder, order)
    assert.equal(secondOrder, order)
    assert.equal(calls.get('/payments/my-subscription'), 1)
    assert.equal(calls.get(`/payments/orders/${order.order_code}`), 1)
  } finally {
    apiClient.request = originalRequest
  }
})

test('checkout forwards a stable idempotency key to the API client', async () => {
  const originalRequest = apiClient.request
  let capturedKey: string | undefined
  const response: PaymentResponse = { ...order }
  apiClient.request = (async (_path: string, options?: { idempotencyKey?: string }) => {
    capturedKey = options?.idempotencyKey
    return response
  }) as typeof apiClient.request

  try {
    await paymentApi.createCheckout('PLAN_99K', 'checkout-attempt-1')
    assert.equal(capturedKey, 'checkout-attempt-1')
  } finally {
    apiClient.request = originalRequest
  }
})
