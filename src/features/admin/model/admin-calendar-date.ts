import { realDate } from './admin-workspace-query.ts'

export function adminCalendarDate(value: string) {
  return realDate(value) ? new Date(`${value}T00:00:00+07:00`) : undefined
}
export function adminCalendarLabel(value: string) {
  const date = adminCalendarDate(value)
  return date ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Chọn ngày'
}
