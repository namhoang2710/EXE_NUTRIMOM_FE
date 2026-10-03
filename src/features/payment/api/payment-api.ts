import { apiClient } from '@/core/api/api-client'
import type {
  PaymentOrderResponse,
  PaymentResponse,
  PlanTier,
  SubscriptionResponse,
} from '../model/payment-types'

export const paymentApi = {
  createCheckout: (planTier: PlanTier) =>
    apiClient.request<PaymentResponse>('/payments/subscription-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_tier: planTier }),
    }),

  getMySubscription: () =>
    apiClient.request<SubscriptionResponse>('/payments/my-subscription'),

  getOrderDetails: (orderCode: number) =>
    apiClient.request<PaymentOrderResponse>(`/payments/orders/${orderCode}`),

  getUserOrders: () =>
    apiClient.request<PaymentOrderResponse[]>('/payments/orders'),

  confirmMockPayment: (orderCode: number) =>
    apiClient.request<string>(`/payments/orders/${orderCode}/confirm-mock`, {
      method: 'POST',
    }),
}
