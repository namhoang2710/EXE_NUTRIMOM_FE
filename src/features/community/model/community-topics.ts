import type { PostStatus, PostTopic, ReportReason } from './community-types.ts'

export const communityTopics: ReadonlyArray<{ value: PostTopic; label: string }> = [
  { value: 'PREGNANCY', label: 'Mang thai' },
  { value: 'NUTRITION', label: 'Dinh dưỡng' },
  { value: 'MOTHER_HEALTH', label: 'Sức khoẻ mẹ' },
  { value: 'BABY_CARE', label: 'Chăm sóc bé' },
  { value: 'SHARING', label: 'Tâm sự' },
  { value: 'OTHER', label: 'Khác' },
]

export const reportReasons: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: 'SPAM', label: 'Spam hoặc quảng cáo' },
  { value: 'OFFENSIVE', label: 'Ngôn từ xúc phạm, phản cảm' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch về sức khoẻ' },
  { value: 'HARASSMENT', label: 'Quấy rối, công kích cá nhân' },
  { value: 'OTHER', label: 'Lý do khác' },
]

export const postStatusLabels: Record<PostStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  REMOVED: 'Đã bị gỡ',
}

export function topicLabel(topic: PostTopic) {
  return communityTopics.find((item) => item.value === topic)?.label ?? 'Khác'
}

export function isPostTopic(value: string | null): value is PostTopic {
  return communityTopics.some((item) => item.value === value)
}

export const communityLimits = {
  postMaxChars: 5000,
  commentMaxChars: 1000,
  noteMaxChars: 500,
  maxImages: 4,
  maxImageBytes: 10 * 1024 * 1024,
  feedPageSize: 10,
} as const
