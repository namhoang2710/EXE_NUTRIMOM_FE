import { apiClient } from '../../../core/api/api-client.ts'
import type { MyEntitlementsDto, SubscriptionPlanDto } from '../model/entitlement-types.ts'
export type { PlanFeatureDto, ScanQuotaDto, SubscriptionPlanDto, MyEntitlementsDto } from '../model/entitlement-types.ts'
import type {
  PaymentOrderResponse,
  PaymentResponse,
  PlanTier,
  SubscriptionResponse,
} from '../model/payment-types'

let subscriptionRequest: Promise<SubscriptionResponse> | null = null
const orderRequests = new Map<number, Promise<PaymentOrderResponse>>()

function getMySubscription() {
  if (!subscriptionRequest) {
    subscriptionRequest = apiClient.request<SubscriptionResponse>('/payments/my-subscription')
      .finally(() => { subscriptionRequest = null })
  }
  return subscriptionRequest
}

function getOrderDetails(orderCode: number) {
  const pending = orderRequests.get(orderCode)
  if (pending) return pending

  const request = apiClient.request<PaymentOrderResponse>(`/payments/orders/${orderCode}`)
    .finally(() => { orderRequests.delete(orderCode) })
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
    }),

  getMySubscription,

  getOrderDetails,

  getUserOrders: () =>
    apiClient.request<PaymentOrderResponse[]>('/payments/orders'),

  confirmMockPayment: (orderCode: number) =>
    apiClient.request<string>(`/payments/orders/${orderCode}/confirm-mock`, {
      method: 'POST',
    }),
}
