import { apiClient } from '../../../core/api/api-client.ts'
import { createResourceCache, forConsumer, StaleResourceError } from '../../../core/api/resource-cache.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { historyQueryString } from '../model/payment-history.ts'
import type { MyEntitlementsDto, SubscriptionPlanDto } from '../model/entitlement-types.ts'
export type { PlanFeatureDto, ScanQuotaDto, SubscriptionPlanDto, MyEntitlementsDto } from '../model/entitlement-types.ts'
import type {
  PaymentOrderResponse,
  PaymentResponse,
  PlanTier,
  SubscriptionResponse,
  PaymentOrderPage,
  PaymentHistoryQuery,
} from '../model/payment-types'

let subscriptionRequest: Promise<SubscriptionResponse> | null = null
const orderRequests = new Map<number, Promise<PaymentOrderResponse>>()
let historyCache = createResourceCache(30_000)
const cancelRequests = new Map<string, Promise<PaymentOrderResponse>>()

// Let existing consumers finish; future reads acquire a fresh generation.
export function invalidatePaymentHistory() { historyCache = createResourceCache(30_000) }
if (typeof window !== 'undefined') {
  for (const event of ['nutrimom:session-cleared', 'nutrimom:session-changed']) {
    window.addEventListener(event, () => { historyCache.clear(); invalidatePaymentHistory(); orderRequests.clear(); cancelRequests.clear(); subscriptionRequest = null })
  }
}

function getMySubscription() {
  if (!subscriptionRequest) {
    const scope = getSessionScope()
    const request = apiClient.request<SubscriptionResponse>('/payments/my-subscription')
      .then((subscription) => {
        if (scope !== getSessionScope()) throw new StaleResourceError()
        return subscription
      })
      .finally(() => { if (subscriptionRequest === request) subscriptionRequest = null })
    subscriptionRequest = request
  }
  return subscriptionRequest
}

function getOrderDetails(orderCode: number) {
  const pending = orderRequests.get(orderCode)
  if (pending) return pending

  const scope = getSessionScope()
  const request = apiClient.request<PaymentOrderResponse>(`/payments/orders/${orderCode}`)
    .then((order) => {
      if (scope !== getSessionScope()) throw new StaleResourceError()
      return order
    })
    .finally(() => { if (orderRequests.get(orderCode) === request) orderRequests.delete(orderCode) })
  orderRequests.set(orderCode, request)
  return request
}

export const paymentApi = {
  listPlans: (signal?: AbortSignal) => apiClient.request<SubscriptionPlanDto[]>('/subscription-plans', { method: 'GET', authenticated: false, signal }),
  getMyEntitlements: (signal?: AbortSignal) => apiClient.request<MyEntitlementsDto>('/subscriptions/me', { method: 'GET', signal }),
  createCheckout: (planTier: PlanTier, idempotencyKey?: string) =>
    apiClient.request<PaymentResponse>('/payments/subscription-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_tier: planTier }),
      idempotencyKey,
    }).then((response) => { invalidatePaymentHistory(); return response }),

  getMySubscription,

  getOrderDetails,

  cancelOrder: (orderCode: number) => {
    const scope = getSessionScope()
    const key = `${scope}:${orderCode}`
    const existing = cancelRequests.get(key)
    if (existing) return existing
    const request = apiClient.request<PaymentOrderResponse>(`/payments/orders/${orderCode}/cancel`, { method: 'POST' })
      .then((order) => {
        if (getSessionScope() !== scope) throw new StaleResourceError()
        invalidatePaymentHistory()
        return order
      }).finally(() => { if (cancelRequests.get(key) === request) cancelRequests.delete(key) })
    cancelRequests.set(key, request)
    return request
  },

  getUserOrders: (query: PaymentHistoryQuery = {}, signal?: AbortSignal) => {
    const scope = getSessionScope()
    const path = `/payments/orders?${historyQueryString(query)}`
    return forConsumer(historyCache.run(`${scope}:${path}`, async () => {
      const result = await apiClient.request<PaymentOrderPage>(path)
      if (scope !== getSessionScope()) throw new StaleResourceError()
      if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.page) || result.page < 1
        || !Number.isSafeInteger(result.page_size) || result.page_size < 1
        || !Number.isSafeInteger(result.total_items) || result.total_items < 0
        || !Number.isSafeInteger(result.total_pages) || result.total_pages < 0) {
        throw new Error('Dữ liệu lịch sử giao dịch chưa đúng định dạng. Vui lòng thử lại hoặc liên hệ hỗ trợ.')
      }
      return result
    }), signal)
  },

  confirmMockPayment: (orderCode: number) =>
    apiClient.request<string>(`/payments/orders/${orderCode}/confirm-mock`, {
      method: 'POST',
    }),
}
