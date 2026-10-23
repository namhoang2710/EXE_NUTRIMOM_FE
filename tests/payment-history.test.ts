import assert from 'node:assert/strict'
import test from 'node:test'
import { parseHistoryQuery, historyQueryString } from '../src/features/payment/model/payment-history.ts'
import { paymentApi, invalidatePaymentHistory } from '../src/features/payment/api/payment-api.ts'
import { apiClient } from '../src/core/api/api-client.ts'
import { clearSession } from '../src/core/auth/token-store.ts'
import type { PaymentOrderPage } from '../src/features/payment/model/payment-types.ts'

Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => null, removeItem: () => undefined } })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } })
const page: PaymentOrderPage = { items: [{ id: 'legacy', order_code: 9007199254740991, plan_tier: 'PLAN_399K', plan_name: 'Gói Toàn diện 399K', amount: 399000, currency: 'VND', status: 'PAID', source: 'LEGACY_UNKNOWN', created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z' }], page: 1, page_size: 20, total_items: 1, total_pages: 1 }

test('history defaults to all statuses and normalizes invalid URL values', () => {
  assert.deepEqual(parseHistoryQuery(new URLSearchParams()), { page: 1, pageSize: 20 })
  assert.deepEqual(parseHistoryQuery(new URLSearchParams('page=-1&pageSize=1000&status=unknown&planTier=FREE')), { page: 1, pageSize: 20 })
  assert.equal(parseHistoryQuery(new URLSearchParams('page=9007199254740992')).page, 1)
  assert.deepEqual(parseHistoryQuery(new URLSearchParams('page=2&pageSize=50&status=CANCELLED&planTier=PLAN_99K')), { page: 2, pageSize: 50, status: 'CANCELLED', planTier: 'PLAN_99K' })
  assert.equal(historyQueryString({ page: 2, pageSize: 10, status: 'PAID', planTier: 'PLAN_399K' }), 'page=2&pageSize=10&status=PAID&planTier=PLAN_399K')
})

test('history shares concurrent reads, accepts absent optional fields and caches by filters', async () => {
  const original = apiClient.request
  const paths: string[] = []
  invalidatePaymentHistory()
  apiClient.request = (async (path: string) => { paths.push(path); return page }) as typeof apiClient.request
  try {
    const results = await Promise.all([paymentApi.getUserOrders(), paymentApi.getUserOrders()])
    assert.equal(results[0], page)
    assert.equal(results[1]?.items[0]?.checkout_url, undefined)
    await paymentApi.getUserOrders()
    assert.deepEqual(paths, ['/payments/orders?page=1&pageSize=20'])
    await paymentApi.getUserOrders({ status: 'PENDING' })
    assert.equal(paths.length, 2)
    invalidatePaymentHistory()
    await paymentApi.getUserOrders()
    assert.equal(paths.length, 3)
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('aborting one consumer leaves the shared history request available to another', async () => {
  const original = apiClient.request
  let resolve!: (value: PaymentOrderPage) => void
  apiClient.request = (() => new Promise<PaymentOrderPage>((done) => { resolve = done })) as typeof apiClient.request
  const controller = new AbortController()
  try {
    const first = paymentApi.getUserOrders({}, controller.signal)
    const second = paymentApi.getUserOrders()
    await Promise.resolve()
    controller.abort()
    await assert.rejects(first, { name: 'AbortError' })
    resolve(page)
    assert.equal(await second, page)
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('history response cannot cross a session change', async () => {
  const original = apiClient.request
  let resolve!: (value: PaymentOrderPage) => void
  apiClient.request = (() => new Promise<PaymentOrderPage>((done) => { resolve = done })) as typeof apiClient.request
  try {
    const pending = paymentApi.getUserOrders()
    await Promise.resolve()
    clearSession()
    resolve(page)
    await assert.rejects(pending, { name: 'StaleResourceError' })
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('old flat-list contract produces a readable error instead of crashing the history page', async () => {
  const original = apiClient.request
  apiClient.request = (async () => []) as typeof apiClient.request
  try {
    await assert.rejects(paymentApi.getUserOrders(), /Dữ liệu lịch sử giao dịch chưa đúng định dạng/)
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('a mutation invalidates future history reads without failing an existing consumer', async () => {
  const original = apiClient.request
  let resolve!: (value: PaymentOrderPage) => void
  let calls = 0
  apiClient.request = (() => { calls++; return new Promise<PaymentOrderPage>((done) => { resolve = done }) }) as typeof apiClient.request
  try {
    const first = paymentApi.getUserOrders()
    await Promise.resolve()
    invalidatePaymentHistory()
    const finishOld = resolve
    const second = paymentApi.getUserOrders()
    await Promise.resolve()
    finishOld(page)
    resolve({ ...page, items: [] })
    assert.equal((await first).items.length, 1)
    assert.equal((await second).items.length, 0)
    assert.equal(calls, 2)
    assert.equal((await paymentApi.getUserOrders()).items.length, 0)
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('cancel deduplicates concurrent clicks, uses POST and accepts returned terminal status', async () => {
  const original = apiClient.request
  let calls = 0
  apiClient.request = (async (path: string, options?: { method?: string }) => {
    calls++
    assert.equal(path, '/payments/orders/123/cancel')
    assert.equal(options?.method, 'POST')
    await new Promise((resolve) => setTimeout(resolve, 5))
    return { ...page.items[0], status: 'EXPIRED' }
  }) as typeof apiClient.request
  try {
    const [a, b] = await Promise.all([paymentApi.cancelOrder(123), paymentApi.cancelOrder(123)])
    assert.equal(calls, 1)
    assert.equal(a.status, 'EXPIRED')
    assert.equal(a, b)
  } finally { apiClient.request = original; invalidatePaymentHistory() }
})

test('failed cancellation is not replayed automatically', async () => {
  const original = apiClient.request
  let calls = 0
  apiClient.request = (async () => { calls++; throw new Error('failed cancellation') }) as typeof apiClient.request
  try {
    await assert.rejects(paymentApi.cancelOrder(123), /failed cancellation/)
    assert.equal(calls, 1)
  } finally { apiClient.request = original }
})
