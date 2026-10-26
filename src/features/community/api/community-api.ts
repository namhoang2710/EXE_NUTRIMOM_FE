import { apiClient } from '@/core/api/api-client'
import { invalidateProfileResources, profileRead } from '@/core/api/profile-requests'
import { communityEndpoints as endpoints } from '../model/community-endpoints'
import { communityRead, communityWrite, refreshCommunityRead } from './community-requests'
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
    communityRead<FeedPage>(endpoints.feed(query, cursor, limit), signal),
  myPosts: (cursor: string | null, limit: number, status?: PostStatus, signal?: AbortSignal) =>
    communityRead<CursorPage<CommunityPost>>(endpoints.myPosts(cursor, limit, status), signal),
  post: (postId: string, signal?: AbortSignal) => communityRead<CommunityPost>(endpoints.post(postId), signal),
  refreshPost(postId: string, signal?: AbortSignal) {
    return refreshCommunityRead<CommunityPost>(endpoints.post(postId), signal)
  },
  createPost: (input: PostInput) =>
    communityWrite<CommunityPost>(endpoints.posts, { method: 'POST', body: json(input) }),
  updatePost: (postId: string, input: PostInput & { version: number }) =>
    communityWrite<CommunityPost>(endpoints.post(postId), { method: 'PATCH', body: json(input) }),
  deletePost: (postId: string) => communityWrite<boolean>(endpoints.post(postId), { method: 'DELETE' }),
  uploadImage(file: Blob, filename: string, signal?: AbortSignal) {
    const body = new FormData()
    body.set('file', file, filename)
    // Một ảnh/lần, không tự gửi lại sau refresh để tránh upload đôi.
    return communityWrite<MediaUpload>(endpoints.media, { method: 'POST', body, signal, timeoutMs: 60_000 })
  },
  like: (postId: string, liked: boolean) =>
    communityWrite<{ liked: boolean; like_count: number }>(endpoints.like(postId), { method: liked ? 'PUT' : 'DELETE' }),
  async save(postId: string, saved: boolean) {
    const result = await communityWrite<{ saved: boolean }>(endpoints.save(postId), { method: saved ? 'PUT' : 'DELETE' })
    invalidateProfileResources('saved:')
    return result
  },
  comments: (postId: string, cursor: string | null, limit: number, signal?: AbortSignal) =>
    communityRead<CursorPage<CommunityComment>>(endpoints.comments(postId, cursor, limit), signal),
  addComment: (postId: string, content: string) =>
    communityWrite<CommunityComment>(endpoints.comments(postId), { method: 'POST', body: json({ content }) }),
  deleteComment: (commentId: string) => communityWrite<boolean>(endpoints.comment(commentId), { method: 'DELETE' }),
  report: (postId: string, reason: ReportReason, note: string) =>
    communityWrite<{ created: boolean }>(endpoints.reports(postId), { method: 'POST', body: json({ reason, note: note || undefined }) }),
  notifications: (cursor: string | null, limit: number, signal?: AbortSignal) =>
    communityRead<CursorPage<CommunityNotification>>(endpoints.notifications(cursor, limit), signal),
  unreadCount: (signal?: AbortSignal) => communityRead<{ unread_count: number }>(endpoints.unreadCount, signal, 60_000),
  markRead: (notificationId: string) => communityWrite<boolean>(endpoints.markRead(notificationId), { method: 'POST' }),
  markAllRead: () => communityWrite<{ updated: number }>(endpoints.markAllRead, { method: 'POST' }),
  savedItems: (type: 'ALL' | 'KNOWLEDGE' | 'COMMUNITY', cursor: string | null, limit: number, signal?: AbortSignal) => {
    const path = endpoints.savedItems(type, cursor, limit)
    // Cùng tiền tố `saved:` với Knowledge nên lưu/bỏ lưu ở đâu cũng làm mới danh sách này.
    return profileRead(`saved:items:${path}`, () => apiClient.request<CursorPage<SavedItem>>(path), signal)
  },
}
