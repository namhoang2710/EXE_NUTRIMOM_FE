import assert from 'node:assert/strict'
import test from 'node:test'
import { canResumePayment, paymentExpiry, safePayOSUrl, subscriptionCoversOrder } from '../src/features/payment/model/payment-lifecycle.ts'
import type { PaymentOrderResponse, SubscriptionResponse } from '../src/features/payment/model/payment-types.ts'

const now = Date.parse('2026-10-23T02:00:00Z')
const order: PaymentOrderResponse = { id: 'order', order_code: 9007199254740991, plan_tier: 'PLAN_99K', plan_name: 'Gói Cơ bản 99K', amount: 99000, currency: 'VND', status: 'PENDING', source: 'REAL', checkout_url: 'https://pay.payos.vn/web/123', created_at: '2026-10-23T01:59:00Z', updated_at: '2026-10-23T01:59:00Z', expires_at: '2026-10-23T02:04:00Z' }

test('resume requires real pending order, valid PayOS URL and a known future deadline', () => {
  assert.equal(canResumePayment(order, now), true)
  for (const status of ['PAID', 'CANCELLED', 'EXPIRED'] as const) assert.equal(canResumePayment({ ...order, status }, now), false)
  for (const source of ['DEMO', 'LEGACY_UNKNOWN'] as const) assert.equal(canResumePayment({ ...order, source }, now), false)
  for (const expires_at of [undefined, 'bad date', '2026-10-23T02:00:00Z', '2026-10-23T01:59:00Z']) assert.equal(canResumePayment({ ...order, expires_at }, now), false)
  for (const checkout_url of [undefined, 'javascript:alert(1)', 'http://pay.payos.vn/web/123', 'https://pay.payos.vn.evil.test', 'https://user:password@pay.payos.vn/test']) assert.equal(canResumePayment({ ...order, checkout_url }, now), false)
  assert.equal(order.status, 'PENDING')
})

test('unknown deadlines stay unknown, not unlimited', () => {
  assert.equal(paymentExpiry(), null)
  assert.equal(paymentExpiry('broken'), null)
  assert.equal(paymentExpiry(order.expires_at), now + 240_000)
  assert.equal(safePayOSUrl(order.checkout_url), order.checkout_url)
})

test('higher active subscription covers a cheaper paid order; lower or inactive does not', () => {
  const subscription: SubscriptionResponse = { plan_tier: 'PLAN_399K', plan_name: 'Gói Toàn diện 399K', status: 'ACTIVE', active: true, days_remaining: 30 }
  assert.equal(subscriptionCoversOrder(subscription, 'PLAN_99K'), true)
  assert.equal(subscriptionCoversOrder(subscription, 'PLAN_399K'), true)
  assert.equal(subscriptionCoversOrder({ ...subscription, active: false }, 'PLAN_99K'), false)
  assert.equal(subscriptionCoversOrder({ ...subscription, plan_tier: 'PLAN_99K' }, 'PLAN_399K'), false)
  assert.equal(subscriptionCoversOrder(null, 'PLAN_399K'), false)
})
