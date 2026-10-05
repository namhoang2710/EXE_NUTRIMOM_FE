import type { NotificationItem, NotificationPage, NotificationType } from './notification-types.ts'
import { logDiagnostic } from '../../../core/diagnostics/logger.ts'

type JsonRecord = Record<string, unknown>

const notificationTypes = new Set<NotificationType>(['CONSULTATION', 'CONTACT', 'FAMILY', 'REMINDER', 'SYSTEM'])

export class NotificationContractError extends Error {
  constructor(reason: string) {
    super(`Dữ liệu thông báo từ máy chủ không hợp lệ (${reason}).`)
    this.name = 'NotificationContractError'
    logDiagnostic({ level: 'error', category: 'notification', event: 'contract_normalization_failed', reason })
  }
}

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function normalizeNotificationItem(value: unknown): NotificationItem | undefined {
  const item = record(value)
  if (!item) return undefined
  const id = nonEmptyString(item.id)
  const type = notificationTypes.has(item.type as NotificationType) ? item.type as NotificationType : undefined
  const title = nonEmptyString(item.title)
  const body = typeof item.body === 'string' ? item.body : undefined
  const createdAtValue = nonEmptyString(item.created_at)
  const createdAt = createdAtValue && !Number.isNaN(Date.parse(createdAtValue)) ? createdAtValue : undefined
  if (!id || !type || !title || body === undefined || !createdAt) return undefined
  return {
    id,
    type,
    title,
    body,
    created_at: createdAt,
    ...(optionalString(item.deep_link) !== undefined ? { deep_link: optionalString(item.deep_link) } : {}),
    ...(optionalString(item.source_type) !== undefined ? { source_type: optionalString(item.source_type) } : {}),
    ...(optionalString(item.source_id) !== undefined ? { source_id: optionalString(item.source_id) } : {}),
    ...(optionalString(item.read_at) !== undefined && !Number.isNaN(Date.parse(optionalString(item.read_at)!)) ? { read_at: optionalString(item.read_at) } : {}),
  }
}

export function normalizeNotificationPage(value: unknown): NotificationPage {
  const page = record(value)
  if (!page) throw new NotificationContractError('response không phải object')
  if (!Array.isArray(page.items)) throw new NotificationContractError('items không phải mảng')
  if (typeof page.has_more !== 'boolean') throw new NotificationContractError('has_more không phải boolean')
  if (page.next_cursor !== undefined && typeof page.next_cursor !== 'string') {
    throw new NotificationContractError('next_cursor không phải chuỗi')
  }
  return {
    items: page.items.flatMap((item) => {
      const normalized = normalizeNotificationItem(item)
      return normalized ? [normalized] : []
    }),
    has_more: page.has_more,
    ...(typeof page.next_cursor === 'string' ? { next_cursor: page.next_cursor } : {}),
  }
}
