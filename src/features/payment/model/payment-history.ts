import type { PaymentHistoryQuery, PaymentOrderStatus } from './payment-types.ts'

export const paymentStatusLabels: Record<PaymentOrderStatus, string> = {
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy', EXPIRED: 'Đã hết hạn',
}

export function parseHistoryQuery(params: URLSearchParams): Required<Pick<PaymentHistoryQuery, 'page' | 'pageSize'>> & PaymentHistoryQuery {
  const page = Number(params.get('page') || 1)
  const pageSize = Number(params.get('pageSize') || 20)
  const status = params.get('status')
  const planTier = params.get('planTier')
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 20,
    ...(status && Object.hasOwn(paymentStatusLabels, status) ? { status: status as PaymentOrderStatus } : {}),
    ...(planTier === 'PLAN_99K' || planTier === 'PLAN_399K' ? { planTier } : {}),
  }
}

export function historyQueryString(query: PaymentHistoryQuery = {}) {
  const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 20) })
  if (query.status) params.set('status', query.status)
  if (query.planTier) params.set('planTier', query.planTier)
  return params.toString()
}
