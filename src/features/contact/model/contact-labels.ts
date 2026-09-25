import type { ContactRequestStatus, ContactTopic } from './contact-dto'

export const contactTopicOptions = [
  { value: 'POLICY', label: 'Chính sách' },
  { value: 'APP_USAGE', label: 'Cách sử dụng' },
  { value: 'ACCOUNT', label: 'Tài khoản' },
  { value: 'OTHER', label: 'Khác' },
] as const

export const contactStatusOptions = [
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'COMPLETED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
] as const

export const contactTopicValues = contactTopicOptions.map((option) => option.value)
export const contactStatusValues = contactStatusOptions.map((option) => option.value)

export function isContactTopic(value: string): value is ContactTopic {
  return (contactTopicValues as readonly string[]).includes(value)
}

export function isContactStatus(value: string): value is ContactRequestStatus {
  return (contactStatusValues as readonly string[]).includes(value)
}

export function contactTopicLabel(value: string) {
  return contactTopicOptions.find((option) => option.value === value)?.label ?? value
}

export function contactStatusLabel(value: string) {
  return contactStatusOptions.find((option) => option.value === value)?.label ?? value
}

/** Trùng với bảng tone của `StatusBadge` trong AdminUI nên dùng lại được class `.admin-badge`. */
export function contactStatusTone(value: string): 'positive' | 'negative' | 'warning' {
  if (value === 'COMPLETED') return 'positive'
  if (value === 'CANCELLED') return 'negative'
  return 'warning'
}

export function contactGenderLabel(value: string | null | undefined, fallback = '—') {
  if (value === 'FEMALE') return 'Nữ'
  if (value === 'MALE') return 'Nam'
  if (value === 'OTHER') return 'Khác'
  return fallback
}
