export type PlanTier = 'FREE' | 'PLAN_99K' | 'PLAN_399K'
export type PaymentOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface CreatePaymentPayload {
  plan_tier: PlanTier
}

export interface PaymentResponse {
  order_code: number
  plan_tier: PlanTier
  plan_name: string
  amount: number
  currency: string
  status: PaymentOrderStatus
  checkout_url: string
  qr_code?: string | null
  description?: string
  expires_at?: string
}

export interface SubscriptionResponse {
  id?: string | null
  plan_tier: PlanTier
  plan_name: string
  status: SubscriptionStatus
  active: boolean
  start_date?: string | null
  end_date?: string | null
  days_remaining: number
}

export interface PaymentOrderResponse {
  id: string
  order_code: number
  plan_tier: PlanTier
  plan_name: string
  amount: number
  currency: string
  status: PaymentOrderStatus
  source: 'REAL' | 'DEMO' | 'LEGACY_UNKNOWN'
  checkout_url?: string
  qr_code?: string
  description?: string
  paid_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface PaymentOrderPage {
  items: PaymentOrderResponse[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface PaymentHistoryQuery {
  page?: number
  pageSize?: number
  status?: PaymentOrderStatus
  planTier?: Exclude<PlanTier, 'FREE'>
}
