import { apiClient } from '@/core/api/api-client'
import { adminMutation, adminRead } from '@/features/admin/api/admin-read'
import { communityEndpoints } from '../model/community-endpoints'
import type { AdminPostItem, AdminReportItem, CursorPage, PostStatus, ReportStatus } from '../model/community-types'

const endpoints = communityEndpoints.admin
const invalidates = ['/admin/community/posts', '/admin/community/reports']
const post = <T>(path: string, body?: unknown) => adminMutation(() => apiClient.request<T>(path, {
  method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), retryAfterRefresh: false,
}), invalidates)

export const communityAdminApi = {
  posts: (status: PostStatus | undefined, cursor: string | null, limit: number, signal?: AbortSignal) =>
    adminRead(endpoints.posts(status, cursor, limit), (payload) => payload as CursorPage<AdminPostItem>, signal, 10_000),
  reports: (status: ReportStatus | undefined, cursor: string | null, limit: number, signal?: AbortSignal) =>
    adminRead(endpoints.reports(status, cursor, limit), (payload) => payload as CursorPage<AdminReportItem>, signal, 10_000),
  approve: (postId: string) => post<AdminPostItem>(endpoints.approve(postId)),
  reject: (postId: string, reason: string) => post<AdminPostItem>(endpoints.reject(postId), { reason }),
  pin: (postId: string, pinned: boolean) => adminMutation(() => apiClient.request<AdminPostItem>(endpoints.pin(postId), {
    method: pinned ? 'PUT' : 'DELETE', retryAfterRefresh: false,
  }), invalidates),
  remove: (postId: string, reason: string) => adminMutation(() => apiClient.request<AdminPostItem>(endpoints.post(postId), {
    method: 'DELETE', body: JSON.stringify({ reason: reason || undefined }), retryAfterRefresh: false,
  }), invalidates),
  deleteComment: (commentId: string) => adminMutation(() => apiClient.request<boolean>(endpoints.comment(commentId), {
    method: 'DELETE', retryAfterRefresh: false,
  }), invalidates),
  resolve: (reportId: string, action: 'DISMISS' | 'REMOVE_POST', note: string) =>
    post<AdminReportItem>(endpoints.resolve(reportId), { action, note: note || undefined }),
}
