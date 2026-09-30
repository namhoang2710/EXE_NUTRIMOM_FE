export const SLOT_MINUTES = 30
export const OPENING_TIME = '08:00'
export const CLOSING_TIME = '20:00'
export const HORIZON_DAYS = 30
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export type SlotState = 'OPEN' | 'BOOKED' | 'CLOSED'
export type UnavailableReason = 'PAST' | 'DAY_OFF' | 'BOOKED' | 'CLOSED'

const reasonLabels: Record<UnavailableReason, string> = {
  PAST: 'Đã qua',
  DAY_OFF: 'Nghỉ cả ngày',
  BOOKED: 'Đã kín',
  CLOSED: 'Đã đóng',
}

function timeToMinutes(value: string) {
  const [hours, minutes] = normalizeSlotTime(value).split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function normalizeSlotTime(value: string) {
  return value.slice(0, 5)
}

export function toApiSlotTime(value: string) {
  return `${normalizeSlotTime(value)}:00`
}

export function slotEndTime(startTime: string) {
  return minutesToTime(timeToMinutes(startTime) + SLOT_MINUTES)
}

export function generateSlotStartTimes() {
  const values: string[] = []
  for (let minute = timeToMinutes(OPENING_TIME); minute < timeToMinutes(CLOSING_TIME); minute += SLOT_MINUTES) {
    values.push(minutesToTime(minute))
  }
  return values
}

export const SLOT_START_TIMES = generateSlotStartTimes()

export function unavailableReasonLabel(reason: UnavailableReason) {
  return reasonLabels[reason]
}

export function vietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

export function consultationHorizon(now = new Date()) {
  const minDate = vietnamToday(now)
  return { minDate, maxDate: addCalendarDays(minDate, HORIZON_DAYS) }
}

export function datesInConsultationHorizon(now = new Date()) {
  const { minDate } = consultationHorizon(now)
  return Array.from({ length: HORIZON_DAYS + 1 }, (_, index) => addCalendarDays(minDate, index))
}

export function isDateInConsultationHorizon(date: string, now = new Date()) {
  const { minDate, maxDate } = consultationHorizon(now)
  return date >= minDate && date <= maxDate
}
