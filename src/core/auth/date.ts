import { formatVietnamDate, isCalendarDate, vietnamDate } from '../date-time/vietnam.ts'

export function todayDate(now = new Date()) { return vietnamDate(now) }

export function isDateOnly(value: string) {
  return isCalendarDate(value)
}

export function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  return formatVietnamDate(value) || 'Chưa cập nhật'
}
