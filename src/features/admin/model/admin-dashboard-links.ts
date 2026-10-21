import type { AttentionItem, DashboardDto } from './admin-workspace-contract.ts'
export function attentionPath(item: AttentionItem) { return item.kind === 'SUPPORT_PENDING' ? `/admin/support/${item.source_id}` : `/admin/appointments?requestId=${item.source_id}` }
export function activityPath(item: DashboardDto['recent_activity'][number]) {
  return item.kind === 'USER_REGISTERED' ? `/admin/users?userId=${item.source_id}` : item.kind === 'PAYMENT_PAID' ? `/admin/revenue?orderCode=${item.order_code}` : item.kind === 'CONSULTATION_COMPLETED' ? `/admin/consultations?requestId=${item.source_id}` : `/admin/support/${item.source_id}`
}
