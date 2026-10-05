import { apiClient } from '@/core/api/api-client'
import { buildNotificationsPath } from '../model/notification-helpers'
import { normalizeNotificationPage } from '../model/notification-normalizers'
import type { NotificationItem } from '../model/notification-types'

export const notificationsApi = {
  list: async (cursor?: string, unreadOnly = false, signal?: AbortSignal) => normalizeNotificationPage(await apiClient.request<unknown>(buildNotificationsPath(cursor, unreadOnly), { signal })),
  unreadCount: async () => {
    const result = await apiClient.request<{ count: number }>('/notifications/unread-count')
    if (!Number.isInteger(result.count) || result.count < 0) throw new Error('Dữ liệu số thông báo chưa đọc không hợp lệ.')
    return result.count
  },
  // Mutations intentionally do not accept AbortSignal: once sent, their result must be reconciled.
  markRead: (id: string) => apiClient.request<NotificationItem>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllRead: () => apiClient.request<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
}
