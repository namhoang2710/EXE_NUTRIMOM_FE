export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const vietnamDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: VIETNAM_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Hiển thị một mốc thời gian tuyệt đối (OffsetDateTime) theo giờ Việt Nam.
 * Ghép tay từ `formatToParts` để kết quả không phụ thuộc dấu phân cách của ICU.
 */
export function formatVietnamDateTime(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  const parts: Record<string, string> = {}
  for (const part of vietnamDateTime.formatToParts(date)) parts[part.type] = part.value
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

/**
 * Hiển thị một ngày không có múi giờ (LocalDate, ví dụ `date_of_birth`).
 * Cố tình không đi qua `new Date()` để không bị dịch ngày khi đổi timezone.
 */
export function formatPlainDate(value: string | null | undefined, fallback = '—') {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback
}
