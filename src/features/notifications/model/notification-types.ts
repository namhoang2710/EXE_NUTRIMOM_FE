export type NotificationType = 'CONSULTATION' | 'CONTACT' | 'FAMILY' | 'REMINDER' | 'SYSTEM'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  deep_link?: string
  source_type?: string
  source_id?: string
  read_at?: string
  created_at: string
}

export interface NotificationPage {
  items: NotificationItem[]
  next_cursor?: string
  has_more: boolean
}

export interface NotificationState {
  items: NotificationItem[]
  nextCursor?: string
  hasMore: boolean
}

export interface DeepLinkResult {
  path?: string
  message?: string
}
