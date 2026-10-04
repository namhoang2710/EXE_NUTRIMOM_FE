import type { ConsultationRequest } from './consultation-types'
import { vietnamToday } from './slot-grid.ts'

const vietnamDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const vietnamDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function todayInVietnam(now = new Date()) {
  return vietnamToday(now)
}

export function formatConsultationDate(date: string) {
  const value = new Date(`${date}T00:00:00+07:00`)
  return Number.isNaN(value.getTime()) ? date : vietnamDateFormatter.format(value)
}

export function formatConsultationDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : vietnamDateTimeFormatter.format(date)
}

export function formatConsultationTime(value: string) {
  return value.slice(0, 5)
}

export function canCancelConsultation(item: Pick<ConsultationRequest, 'status'>) {
  return item.status === 'PENDING_EXPERT' || item.status === 'PENDING_CONSULTATION'
}

export function canReviewConsultation(item: Pick<ConsultationRequest, 'canReview'>) {
  return item.canReview === true
}
