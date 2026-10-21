import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPaymentOutcome, refreshPaidSubscription } from '../src/features/payment/model/payment-outcome.ts'
import { isDemoCheckout, parseOrderCode } from '../src/features/payment/model/subscription-plans.ts'
import type { PaymentOrderResponse, SubscriptionResponse } from '../src/features/payment/model/payment-types.ts'

const order: PaymentOrderResponse = { id: 'order-1', order_code: 123456789, plan_tier: 'PLAN_99K', plan_name: 'Gói Cơ bản 99K', amount: 99000, currency: 'VND', status: 'PENDING', checkout_url: 'https://pay.payos.vn/order', created_at: '2026-10-02T10:00:00Z' }
const subscription: SubscriptionResponse = { plan_tier: 'PLAN_99K', plan_name: 'Gói Cơ bản 99K', status: 'ACTIVE', active: true, days_remaining: 30 }

test('a pending order never reports success from an existing active subscription', async () => {
  let subscriptionReads = 0
  const result = await loadPaymentOutcome(order.order_code, { getOrderDetails: async () => order, getMySubscription: async () => { subscriptionReads += 1; return subscription } })
  assert.equal(result.order.status, 'PENDING')
  assert.equal(result.subscription, null)
  assert.equal(subscriptionReads, 0)
})

test('verified PAID status fetches the activated subscription', async () => {
  const result = await loadPaymentOutcome(order.order_code, { getOrderDetails: async (code) => { assert.equal(code, order.order_code); return { ...order, status: 'PAID' } }, getMySubscription: async () => subscription })
  assert.equal(result.order.status, 'PAID')
  assert.equal(result.subscription, subscription)
})

test('subscription synchronization failure preserves the verified paid receipt', async () => {
  const result = await loadPaymentOutcome(order.order_code, { getOrderDetails: async () => ({ ...order, status: 'PAID' }), getMySubscription: async () => { throw new Error('temporarily unavailable') } })
  assert.equal(result.order.status, 'PAID')
  assert.equal(result.subscription, null)
})

test('subscription synchronization retries reuse the verified order without another order lookup', async () => {
  let subscriptionReads = 0
  const paidOrder = { ...order, status: 'PAID' as const }
  const result = await refreshPaidSubscription(paidOrder, {
    getOrderDetails: async () => { throw new Error('verified order must be reused') },
    getMySubscription: async () => { subscriptionReads += 1; return subscription },
  })
  assert.equal(result.order, paidOrder)
  assert.equal(result.subscription, subscription)
  assert.equal(subscriptionReads, 1)
})

test('cancelled and expired orders do not activate or fetch subscription', async () => {
  for (const status of ['CANCELLED', 'EXPIRED'] as const) {
    const result = await loadPaymentOutcome(order.order_code, { getOrderDetails: async () => ({ ...order, status }), getMySubscription: async () => { throw new Error('must not be called') } })
    assert.equal(result.order.status, status)
    assert.equal(result.subscription, null)
  }
})

test('order lookup failure remains an error, never a successful transaction', async () => {
  await assert.rejects(loadPaymentOutcome(order.order_code, { getOrderDetails: async () => { throw new Error('forbidden') }, getMySubscription: async () => subscription }), /forbidden/)
})

test('callback accepts only positive safe integer order codes', () => {
  assert.equal(parseOrderCode('123456789'), 123456789)
  for (const value of [null, '', '0', '-1', '1.5', '1e5', 'NaN', '9007199254740992', '1?mock=true']) assert.equal(parseOrderCode(value), null)
})

test('demo mode requires an actual mock query parameter', () => {
  assert.equal(isDemoCheckout('http://localhost:5173/payment/success?orderCode=1&mock=true'), true)
  assert.equal(isDemoCheckout('https://pay.payos.vn/mock=true'), false)
  assert.equal(isDemoCheckout('https://pay.payos.vn/?description=mock=true'), false)
})
