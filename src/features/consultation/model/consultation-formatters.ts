import type { ConsultationRequest, ConsultationSlot } from './consultation-types'

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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
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

export function isPastConsultationSlot(slot: Pick<ConsultationSlot, 'date' | 'startTime'>, now = new Date()) {
  const startsAt = new Date(`${slot.date}T${slot.startTime}+07:00`)
  return Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= now.getTime()
}

export function isSelectableConsultationSlot(slot: ConsultationSlot, now = new Date()) {
  return slot.status === 'OPEN' && !isPastConsultationSlot(slot, now)
}

export function canCancelConsultation(item: Pick<ConsultationRequest, 'status'>) {
  return item.status === 'PENDING_EXPERT' || item.status === 'PENDING_CONSULTATION'
}

export function canReviewConsultation(item: Pick<ConsultationRequest, 'canReview'>) {
  return item.canReview === true
}
