import type { FeedQuery, PostStatus, ReportStatus } from './community-types.ts'

const id = (value: string) => encodeURIComponent(value)

function withQuery(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export const communityEndpoints = {
  feed: (query: FeedQuery, cursor: string | null, limit: number) => withQuery('/community/posts', {
    cursor, limit, topic: query.topic, hasImages: query.hasImages, saved: query.saved,
  }),
  post: (postId: string) => `/community/posts/${id(postId)}`,
  posts: '/community/posts',
  myPosts: (cursor: string | null, limit: number, status?: PostStatus) => withQuery('/community/me/posts', { cursor, limit, status }),
  media: '/community/media',
  like: (postId: string) => `/community/posts/${id(postId)}/like`,
  save: (postId: string) => `/community/posts/${id(postId)}/save`,
  comments: (postId: string, cursor?: string | null, limit?: number) => withQuery(`/community/posts/${id(postId)}/comments`, { cursor, limit }),
  comment: (commentId: string) => `/community/comments/${id(commentId)}`,
  reports: (postId: string) => `/community/posts/${id(postId)}/reports`,
  notifications: (cursor: string | null, limit: number) => withQuery('/community/notifications', { cursor, limit }),
  unreadCount: '/community/notifications/unread-count',
  markRead: (notificationId: string) => `/community/notifications/${id(notificationId)}/read`,
  markAllRead: '/community/notifications/read-all',
  savedItems: (type: 'ALL' | 'KNOWLEDGE' | 'COMMUNITY', cursor: string | null, limit: number) =>
    withQuery('/me/saved-items', { type, cursor, limit }),
  admin: {
    pendingCount: '/admin/community/posts/pending-count',
    posts: (status: PostStatus | undefined, cursor: string | null, limit: number, pinned = false) => withQuery('/admin/community/posts', { status, pinned, cursor, limit }),
    create: '/admin/community/posts',
    post: (postId: string) => `/admin/community/posts/${id(postId)}`,
    approve: (postId: string) => `/admin/community/posts/${id(postId)}/approve`,
    reject: (postId: string) => `/admin/community/posts/${id(postId)}/reject`,
    pin: (postId: string) => `/admin/community/posts/${id(postId)}/pin`,
    comment: (commentId: string) => `/admin/community/comments/${id(commentId)}`,
    reports: (status: ReportStatus | undefined, cursor: string | null, limit: number) => withQuery('/admin/community/reports', { status, cursor, limit }),
    resolve: (reportId: string) => `/admin/community/reports/${id(reportId)}/resolve`,
  },
} as const
