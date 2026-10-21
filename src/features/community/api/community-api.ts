import { apiClient } from '@/core/api/api-client'
import { invalidateProfileResources, profileRead } from '@/core/api/profile-requests'
import { communityEndpoints as endpoints } from '../model/community-endpoints'
import type {
  CommunityComment,
  CommunityNotification,
  CommunityPost,
  CursorPage,
  FeedPage,
  FeedQuery,
  MediaUpload,
  PostInput,
  PostStatus,
  ReportReason,
  SavedItem,
} from '../model/community-types'

const json = (body: unknown) => JSON.stringify(body)

export const communityApi = {
  feed: (query: FeedQuery, cursor: string | null, limit: number, signal?: AbortSignal) =>
    apiClient.request<FeedPage>(endpoints.feed(query, cursor, limit), { signal }),
  myPosts: (cursor: string | null, limit: number, status?: PostStatus, signal?: AbortSignal) =>
    apiClient.request<CursorPage<CommunityPost>>(endpoints.myPosts(cursor, limit, status), { signal }),
  post: (postId: string, signal?: AbortSignal) => apiClient.request<CommunityPost>(endpoints.post(postId), { signal }),
  createPost: (input: PostInput) =>
    apiClient.request<CommunityPost>(endpoints.posts, { method: 'POST', body: json(input), retryAfterRefresh: false }),
  updatePost: (postId: string, input: PostInput & { version: number }) =>
    apiClient.request<CommunityPost>(endpoints.post(postId), { method: 'PATCH', body: json(input), retryAfterRefresh: false }),
  deletePost: (postId: string) => apiClient.request<boolean>(endpoints.post(postId), { method: 'DELETE' }),
  uploadImage(file: Blob, filename: string, signal?: AbortSignal) {
    const body = new FormData()
    body.set('file', file, filename)
    // Một ảnh/lần, không tự gửi lại sau refresh để tránh upload đôi.
    return apiClient.request<MediaUpload>(endpoints.media, { method: 'POST', body, signal, timeoutMs: 60_000, retryAfterRefresh: false })
  },
  like: (postId: string, liked: boolean) =>
    apiClient.request<{ liked: boolean; like_count: number }>(endpoints.like(postId), { method: liked ? 'PUT' : 'DELETE' }),
  async save(postId: string, saved: boolean) {
    const result = await apiClient.request<{ saved: boolean }>(endpoints.save(postId), { method: saved ? 'PUT' : 'DELETE' })
    invalidateProfileResources('saved:')
    return result
  },
  comments: (postId: string, cursor: string | null, limit: number, signal?: AbortSignal) =>
    apiClient.request<CursorPage<CommunityComment>>(endpoints.comments(postId, cursor, limit), { signal }),
  addComment: (postId: string, content: string) =>
    apiClient.request<CommunityComment>(endpoints.comments(postId), { method: 'POST', body: json({ content }), retryAfterRefresh: false }),
  deleteComment: (commentId: string) => apiClient.request<boolean>(endpoints.comment(commentId), { method: 'DELETE' }),
  report: (postId: string, reason: ReportReason, note: string) =>
    apiClient.request<{ created: boolean }>(endpoints.reports(postId), { method: 'POST', body: json({ reason, note: note || undefined }), retryAfterRefresh: false }),
  notifications: (cursor: string | null, limit: number, signal?: AbortSignal) =>
    apiClient.request<CursorPage<CommunityNotification>>(endpoints.notifications(cursor, limit), { signal }),
  unreadCount: (signal?: AbortSignal) => apiClient.request<{ unread_count: number }>(endpoints.unreadCount, { signal }),
  markRead: (notificationId: string) => apiClient.request<boolean>(endpoints.markRead(notificationId), { method: 'POST' }),
  markAllRead: () => apiClient.request<{ updated: number }>(endpoints.markAllRead, { method: 'POST' }),
  savedItems: (type: 'ALL' | 'KNOWLEDGE' | 'COMMUNITY', cursor: string | null, limit: number, signal?: AbortSignal) => {
    const path = endpoints.savedItems(type, cursor, limit)
    // Cùng tiền tố `saved:` với Knowledge nên lưu/bỏ lưu ở đâu cũng làm mới danh sách này.
    return profileRead(`saved:items:${path}`, () => apiClient.request<CursorPage<SavedItem>>(path), signal)
  },
}
