export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** A timestamp without an offset in our Vietnamese forms is a Vietnam wall time. */
export function vietnamLocalDateTimeToIso(value: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?$/.exec(value)
  if (!match || !isCalendarDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] || 0) > 59) return undefined
  const date = new Date(`${value}+07:00`)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

function instant(value: string | Date) {
  if (value instanceof Date) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isCalendarDate(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(Number.NaN)
  const normalized = vietnamLocalDateTimeToIso(value) ?? value
  return new Date(normalized)
}

const inputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function vietnamDateTimeInput(value: string | Date = new Date()) {
  const date = instant(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = Object.fromEntries(inputFormatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function vietnamDate(value: string | Date = new Date()) {
  return vietnamDateTimeInput(value).slice(0, 10)
}

export function formatVietnamDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  const date = instant(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', ...options, timeZone: VIETNAM_TIME_ZONE,
  }).format(date)
}

export function formatVietnamTimestamp(value: string | Date) {
  return formatVietnamDate(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** Calendar grids use wall-date objects for arithmetic, never API timestamps. */
export function vietnamCalendarNow(now = new Date()) {
  return new Date(vietnamDateTimeInput(now))
}
