import type { DeepLinkResult, NotificationPage, NotificationState } from './notification-types'
import { ApiClientError } from '../../../core/api/api-error.ts'

export function notificationLoadingEnabled(authStatus: string, open: boolean) {
  return authStatus === 'authenticated' && open
}

export function buildNotificationsPath(cursor?: string, unreadOnly = false, limit = 20) {
  const query = new URLSearchParams({ limit: String(limit), unreadOnly: String(unreadOnly) })
  if (cursor) query.set('cursor', cursor)
  return `/notifications?${query}`
}

export function resetNotificationState(): NotificationState { return { items: [], nextCursor: undefined, hasMore: true } }

export function notificationPageState(current: NotificationState, page: NotificationPage, reset: boolean): NotificationState {
  const combined = reset ? page.items : [...current.items, ...page.items]
  const unique = [...new Map(combined.map((item) => [item.id, item])).values()]
  return { items: unique, nextCursor: page.next_cursor, hasMore: page.has_more }
}

export function markNotificationRead(state: NotificationState, id: string, readAt: string): NotificationState {
  return { ...state, items: state.items.map((item) => item.id === id ? { ...item, read_at: readAt } : item) }
}

export function markAllNotificationsRead(state: NotificationState, readAt: string): NotificationState {
  return { ...state, items: state.items.map((item) => item.read_at ? item : { ...item, read_at: readAt }) }
}

export function isRetryableNotificationError(reason: unknown) {
  return reason instanceof ApiClientError
    && reason.retryable
    && ![400, 401, 403, 404, 409, 422].includes(reason.status)
    && reason.code !== 'REQUEST_ABORTED'
}

const idPattern = '[^/?#]+'

export function adaptDeepLink(deepLink?: string): DeepLinkResult {
  if (!deepLink) return {}
  const invitation = deepLink.match(/^nutrimom:\/\/family\/invitations\?token=([^&#/?]+)$/)
  if (invitation) {
    try { return { path: `/family/invite?token=${encodeURIComponent(decodeURIComponent(invitation[1]))}` } }
    catch { return { message: 'Liên kết này chưa được hỗ trợ trên phiên bản web.' } }
  }
  const routes: Array<[RegExp, (id: string) => string]> = [
    [new RegExp(`^nutrimom://calendar/reminders/(${idPattern})$`), (id) => `/app?reminder=${encodeURIComponent(id)}#calendar`],
    [new RegExp(`^nutrimom://medical-records/(${idPattern})$`), (id) => `/app/profile/records?record=${encodeURIComponent(id)}`],
    [new RegExp(`^nutrimom://consultations/(${idPattern})$`), (id) => `/app/consultations/history?request=${encodeURIComponent(id)}`],
    [new RegExp(`^nutrimom://contact-requests/(${idPattern})$`), (id) => `/app/profile/support?request=${encodeURIComponent(id)}`],
    [new RegExp(`^nutrimom://family/tasks/(${idPattern})$`), (id) => `/app/family?tab=tasks&task=${encodeURIComponent(id)}`],
  ]
  if (deepLink === 'nutrimom://notifications') return { path: '/app' }
  for (const [pattern, build] of routes) {
    const match = deepLink.match(pattern)
    if (match) return { path: build(match[1]) }
  }
  return { message: 'Liên kết này chưa được hỗ trợ trên phiên bản web.' }
}

export function notificationTypeLabel(type: string) {
  return ({ CONSULTATION: 'Tư vấn', CONTACT: 'Hỗ trợ', FAMILY: 'Gia đình', REMINDER: 'Nhắc lịch', SYSTEM: 'Hệ thống' } as Record<string, string>)[type] || 'Thông báo'
}
