import type { AdminPostItem, PostStatus } from './community-types.ts'

export const adminCommunityTabs = ['feed', 'pending', 'all', 'pinned', 'mine', 'saved', 'reports'] as const
export type AdminCommunityTab = typeof adminCommunityTabs[number]
export const reportStatusOptions = [{ value: 'OPEN', label: 'Chờ xử lý' }, { value: 'DISMISSED', label: 'Đã bỏ qua' }, { value: 'ACTION_TAKEN', label: 'Đã xử lý' }]
export function adminCommunityTab(value: string | null): AdminCommunityTab {
  return adminCommunityTabs.includes(value as AdminCommunityTab) ? value as AdminCommunityTab : 'feed'
}
export function postStatusFilter(value: string | null): PostStatus | undefined {
  return ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'].includes(value ?? '') ? value as PostStatus : undefined
}
export function canEditAdminPost(item: AdminPostItem, userId: string) {
  return item.post.author.id === userId && !item.deleted_at && item.post.status !== 'REMOVED'
}
/** Approval remains committed if the independent pin operation fails. */
export async function approveAndPin<T>(approve: () => Promise<T>, pin: () => Promise<T>) {
  const approved = await approve()
  try { return { item: await pin(), pinError: null } }
  catch (pinError) { return { item: approved, pinError } }
}
