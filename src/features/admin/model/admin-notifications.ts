import { NotificationContractError, normalizeNotificationItem, normalizeNotificationPage } from '../../notifications/model/notification-normalizers.ts'
import { buildNotificationsPath } from '../../notifications/model/notification-helpers.ts'
import type { NotificationCategory, NotificationItem, NotificationState } from '../../notifications/model/notification-types.ts'
import { optionalRealtimeRevision } from './admin-realtime-contract.ts'

export const notificationCategories = ['ACCOUNT', 'PAYMENT', 'APPOINTMENT', 'SUPPORT', 'GENERAL'] as const
export const adminCategoryLabels: Record<NotificationCategory, string> = { ACCOUNT: 'Tài khoản', PAYMENT: 'Thanh toán & gói', APPOINTMENT: 'Lịch tư vấn', SUPPORT: 'Hỗ trợ', GENERAL: 'Khác' }
export interface AdminNotificationFilter { category?: NotificationCategory; unreadOnly: boolean }
export const adminNotificationCountPath = '/notifications/unread-count?audience=ADMIN'
export function parseAdminNotificationQuery(params: URLSearchParams) {
  const errors: Record<string, string> = {}
  for (const key of ['category', 'unreadOnly']) if (params.getAll(key).length > 1) errors[key] = 'Tham số bị lặp.'
  const category = params.get('category')
  const unread = params.get('unreadOnly')
  if (category !== null && !notificationCategories.includes(category as NotificationCategory)) errors.category = 'Nhóm thông báo không hợp lệ.'
  if (unread !== null && !['true', 'false'].includes(unread)) errors.unreadOnly = 'Bộ lọc chỉ nhận true hoặc false.'
  return { filter: { category: category === null ? undefined : category as NotificationCategory, unreadOnly: unread === 'true' }, errors, valid: !Object.keys(errors).length }
}
export function buildAdminNotificationsPath(filter: AdminNotificationFilter, cursor?: string) {
  const path = buildNotificationsPath(cursor, filter.unreadOnly)
  const params = new URLSearchParams(path.split('?')[1])
  params.set('audience', 'ADMIN')
  if (filter.category) params.set('category', filter.category)
  params.sort()
  return `/notifications?${params}`
}
export function buildAdminReadAllPath(category?: NotificationCategory) {
  const params = new URLSearchParams({ audience: 'ADMIN' })
  if (category) params.set('category', category)
  return `/notifications/read-all?${params}`
}
export function normalizeAdminNotification(value: unknown, category?: NotificationCategory): NotificationItem {
  const item = normalizeNotificationItem(value)
  if (!item || item.audience !== 'ADMIN' || !item.category || (category && item.category !== category)) throw new NotificationContractError('audience/category Admin hoặc item sai hợp đồng')
  return item
}
export function normalizeAdminNotificationPage(value: unknown, filter: AdminNotificationFilter) {
  const page = normalizeNotificationPage(value)
  // Unlike the legacy User feed, Admin must reject an invalid item instead of silently dropping it.
  const raw = value as { items: unknown[] }
  const items = raw.items.map((item) => normalizeAdminNotification(item, filter.category))
  if (filter.unreadOnly && items.some((item) => item.read_at)) throw new NotificationContractError('unreadOnly chứa thông báo đã đọc')
  if (page.has_more && !page.next_cursor) throw new NotificationContractError('has_more thiếu next_cursor')
  const revision = optionalRealtimeRevision(value)
  return { ...page, items, ...(revision === undefined ? {} : { realtime_revision: revision }) }
}
export function normalizeAdminNotificationCount(value: unknown) {
  const revision = optionalRealtimeRevision(value)
  return { count: normalizeNotificationTotal(value,'count'), ...(revision === undefined ? {} : { realtime_revision: revision }) }
}
export function normalizeNotificationTotal(value: unknown, field: 'count' | 'updated') {
  const total = value && typeof value === 'object' ? (value as Record<string, unknown>)[field] : undefined
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) throw new NotificationContractError(`${field} phải là số nguyên không âm`)
  return total
}
export function applyAdminRead(state: NotificationState, filter: AdminNotificationFilter, item: NotificationItem) {
  const items = state.items.map((old) => old.id === item.id ? item : old)
  return { ...state, items: filter.unreadOnly ? items.filter((old) => !old.read_at) : items }
}
export function applyAdminReadAll(state: NotificationState, filter: AdminNotificationFilter, category: NotificationCategory | undefined, readAt: string, knownIds?: ReadonlySet<string>) {
  const items = state.items.map((item) => !item.read_at && (!category || item.category === category) && (!knownIds || knownIds.has(item.id)) ? { ...item, read_at: readAt } : item)
  return { ...state, items: filter.unreadOnly ? items.filter((item) => !item.read_at) : items }
}

/** Serialize writes, with single flight per ID/scope. Never cancel or replay a sent POST. */
export function createAdminNotificationMutations() {
  const pending = new Map<string, Promise<unknown>>()
  let tail: Promise<unknown> = Promise.resolve()
  return {
    run<T>(key: string, action: () => Promise<T>): Promise<T> {
      const existing = pending.get(key)
      if (existing) return existing as Promise<T>
      const task = tail.catch(() => undefined).then(action).finally(() => { if (pending.get(key) === task) pending.delete(key) })
      pending.set(key, task); tail = task
      return task
    },
  }
}

export function createAdminCursorRecovery() {
  const recovered = new Set<string>()
  return { recover(key:string) { if (recovered.has(key)) return false; recovered.add(key); return true } }
}
