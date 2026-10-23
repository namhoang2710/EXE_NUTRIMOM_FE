/** DTO theo hợp đồng BE `docs/community/api-contract.md` (JSON snake_case). */

export type PostTopic = 'PREGNANCY' | 'NUTRITION' | 'MOTHER_HEALTH' | 'BABY_CARE' | 'SHARING' | 'OTHER'
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED'
export type ReportReason = 'SPAM' | 'OFFENSIVE' | 'MISINFORMATION' | 'HARASSMENT' | 'OTHER'
export type ReportStatus = 'OPEN' | 'DISMISSED' | 'ACTION_TAKEN'
export type CommunityNotificationType = 'POST_LIKED' | 'POST_COMMENTED' | 'POST_APPROVED' | 'POST_REJECTED' | 'POST_REMOVED'

export interface CommunityAuthor {
  id: string
  display_name: string
  avatar_key: string | null
}

export interface CommunityImage {
  id: string
  url: string
  width: number
  height: number
}

export interface CommunityPost {
  id: string
  author: CommunityAuthor
  content: string
  topic: PostTopic
  images: CommunityImage[]
  like_count: number
  comment_count: number
  liked_by_me: boolean
  saved_by_me: boolean
  pinned: boolean
  official?: boolean
  status: PostStatus
  reject_reason?: string
  can_edit: boolean
  can_delete: boolean
  version: number
  published_at: string | null
  created_at: string
  edited_at: string | null
}

export interface CursorPage<T> {
  items: T[]
  next_cursor?: string | null
  has_more: boolean
}

export interface FeedPage extends CursorPage<CommunityPost> {
  pinned?: CommunityPost[]
}

export interface FeedQuery {
  topic?: PostTopic
  hasImages?: boolean
  saved?: boolean
}

export interface PostInput {
  content: string
  topic: PostTopic
  image_ids: string[]
}

export interface AdminPostInput extends PostInput {
  pinned?: boolean
}

export interface MediaUpload {
  id: string
  url: string
  width: number
  height: number
}

export interface CommunityComment {
  id: string
  post_id: string
  author: CommunityAuthor
  content: string
  can_delete: boolean
  created_at: string
}

export interface CommunityNotification {
  id: string
  type: CommunityNotificationType
  post_id: string
  comment_id?: string
  actor?: CommunityAuthor
  message: string
  read: boolean
  created_at: string
}

export interface SavedItem {
  type: 'KNOWLEDGE' | 'COMMUNITY'
  id: string
  slug?: string
  title?: string
  excerpt?: string
  thumbnail_url?: string
  saved_at: string
}

export interface AdminPostItem {
  post: CommunityPost
  open_report_count: number
  moderated_by?: string
  moderated_at?: string
  deleted_at?: string
}

export interface AdminReportItem {
  id: string
  post_id: string
  post_excerpt?: string
  post_status?: PostStatus
  post_deleted: boolean
  post_author?: CommunityAuthor
  reporter: CommunityAuthor
  reason: ReportReason
  note?: string
  status: ReportStatus
  open_report_count: number
  handled_by?: string
  handled_at?: string
  resolution_note?: string
  created_at: string
}
