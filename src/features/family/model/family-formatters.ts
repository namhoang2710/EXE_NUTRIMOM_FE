import type { ActivityEvent, FamilyMember, FamilyRelationship, FamilyScope, FamilyTaskPriority, FamilyTaskStatus } from './family-types'

export const relationshipLabels: Record<FamilyRelationship, string> = {
  PARTNER: 'Bạn đời',
  SPOUSE: 'Vợ/chồng',
  PARENT: 'Cha/mẹ',
  SIBLING: 'Anh/chị/em',
  RELATIVE: 'Họ hàng',
  FRIEND: 'Bạn bè',
  OTHER: 'Khác',
}
export const scopeLabels: Record<FamilyScope, string> = {
  PREGNANCY_SUMMARY: 'Tóm tắt thai kỳ',
  FAMILY_TASKS: 'Việc gia đình',
  SHARED_CALENDAR: 'Lịch dùng chung',
  ALERTS: 'Cảnh báo',
  ACTIVITY_FEED: 'Hoạt động',
  MEDICAL_RECORDS: 'Hồ sơ y tế',
}

export const taskPriorityLabels: Record<FamilyTaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
}

export const taskStatusLabels: Record<FamilyTaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
}

export const activityTypeLabels: Record<ActivityEvent['type'], string> = {
  CONSULTATION_ACCEPTED: 'Tư vấn đã được tiếp nhận',
  CONSULTATION_COMPLETED: 'Tư vấn đã hoàn tất',
  CONSULTATION_CANCELLED: 'Tư vấn đã hủy',
  CONTACT_COMPLETED: 'Yêu cầu hỗ trợ đã hoàn tất',
  FAMILY_TASK_ASSIGNED: 'Đã giao việc gia đình',
  FAMILY_TASK_COMPLETED: 'Việc gia đình đã hoàn thành',
}

export function formatVietnamDateTime(value?: string) {
  if (!value) return 'Chưa đặt thời hạn'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian không hợp lệ'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

export function toIsoTimestamp(localValue: string) {
  if (!localValue) return undefined
  const timestamp = new Date(localValue)
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString()
}

export function shortUserId(userId: string) {
  if (userId.length <= 12) return userId
  return `${userId.slice(0, 6)}...${userId.slice(-4)}`
}

export function memberLabel(member?: FamilyMember) {
  if (!member) return 'Một thành viên gia đình'
  const relationship = relationshipLabels[member.relationship as FamilyRelationship] || member.relationship
  return `${relationship} (${shortUserId(member.user_id)})`
}

export function activityDayKey(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Không rõ ngày'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

