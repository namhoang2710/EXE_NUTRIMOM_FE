import { apiClient } from '@/core/api/api-client'
import { adminMutation, adminRead, invalidateAdmin } from '@/features/admin/api/admin-read'
import { invalidateCommunityReads } from './community-requests'
import { communityEndpoints } from '../model/community-endpoints'
import type { AdminPostInput, AdminPostItem, AdminReportItem, CursorPage, PostStatus, ReportStatus } from '../model/community-types'

const endpoints = communityEndpoints.admin
const invalidates = ['/admin/community/posts', '/admin/community/reports']
const mutate = <T>(action: () => Promise<T>) => adminMutation(async () => {
  const value = await action()
  invalidateCommunityReads()
  return value
}, invalidates)
const post = <T>(path: string, body?: unknown) => mutate(() => apiClient.request<T>(path, {
  method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), retryAfterRefresh: false,
}))

export const communityAdminApi = {
  pendingCount: (signal?: AbortSignal) => adminRead(endpoints.pendingCount, (payload) => {
    const count = (payload as { pending_count?: unknown })?.pending_count
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new Error('Số bài chờ duyệt chưa hợp lệ.')
    return count
  }, signal, 3_000),
  posts: (status: PostStatus | undefined, cursor: string | null, limit: number, signal?: AbortSignal, pinned = false) =>
    adminRead(endpoints.posts(status, cursor, limit, pinned), (payload) => payload as CursorPage<AdminPostItem>, signal, 10_000),
  create: (input: AdminPostInput) => post<AdminPostItem>(endpoints.create, input),
  detail: (postId: string, signal?: AbortSignal) => adminRead(endpoints.post(postId), (payload) => payload as AdminPostItem, signal, 5_000),
  invalidate: () => { invalidateAdmin(...invalidates); invalidateCommunityReads() },
  reports: (status: ReportStatus | undefined, cursor: string | null, limit: number, signal?: AbortSignal) =>
    adminRead(endpoints.reports(status, cursor, limit), (payload) => payload as CursorPage<AdminReportItem>, signal, 10_000),
  approve: (postId: string) => post<AdminPostItem>(endpoints.approve(postId)),
  reject: (postId: string, reason: string) => post<AdminPostItem>(endpoints.reject(postId), { reason }),
  pin: (postId: string, pinned: boolean) => mutate(() => apiClient.request<AdminPostItem>(endpoints.pin(postId), {
    method: pinned ? 'PUT' : 'DELETE', retryAfterRefresh: false,
  })),
  remove: (postId: string, reason: string) => mutate(() => apiClient.request<AdminPostItem>(endpoints.post(postId), {
    method: 'DELETE', body: JSON.stringify({ reason: reason || undefined }), retryAfterRefresh: false,
  })),
  deleteComment: (commentId: string) => mutate(() => apiClient.request<boolean>(endpoints.comment(commentId), {
    method: 'DELETE', retryAfterRefresh: false,
  })),
  resolve: (reportId: string, action: 'DISMISS' | 'REMOVE_POST', note: string) =>
    post<AdminReportItem>(endpoints.resolve(reportId), { action, note: note || undefined }),
}
