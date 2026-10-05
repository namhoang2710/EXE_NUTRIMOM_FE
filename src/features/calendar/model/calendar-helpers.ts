import type { CalendarEventItem, CalendarEventStatus, CalendarSource, CreateReminderPayload, MedicalRecordReminderPayload, OccurrenceStatus, ReminderDetail, ReminderFormValue, ReminderRepeat, UpdateReminderPayload, Weekday } from './calendar-types'

const pad = (value: number) => String(value).padStart(2, '0')

export function localDate(date = new Date()) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }

export function toLocalDateTimeValue(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localDateTimeToUtc(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) throw new Error('Thời gian bắt đầu chưa hợp lệ.')
  return date.toISOString()
}

export function calendarEventKey(event: CalendarEventItem) { return `${event.source}:${event.source_id}:${event.starts_at}` }

const statusLabels: Record<CalendarEventStatus, string> = {
  SCHEDULED: 'Đã lên lịch',
  DONE: 'Đã làm',
  SKIPPED: 'Đã bỏ qua',
  CANCELLED: 'Đã hủy',
  PENDING_CONSULTATION: 'Đã đặt lịch',
  COMPLETED: 'Đã hoàn thành',
}

export function calendarStatusLabel(status?: CalendarEventStatus) {
  return status ? statusLabels[status] : undefined
}

export function isCalendarStatusComplete(status?: CalendarEventStatus) {
  return status === 'DONE' || status === 'COMPLETED'
}

export function occurrenceActionMode(status?: string) {
  return status === 'DONE' || status === 'SKIPPED' ? 'UNDO' as const : 'SET' as const
}

export function occurrencePayload(occurrenceAt: string, status?: OccurrenceStatus) {
  return status ? { occurrence_at: occurrenceAt, status } : { occurrence_at: occurrenceAt }
}

export function buildMonthPath(year: number, month: number, timezone?: string) {
  const query = new URLSearchParams({ year: String(year), month: String(month) })
  if (timezone) query.set('timezone', timezone)
  return `/calendar/month?${query}`
}

export function buildEventsPath(from: string, to: string, types: CalendarSource[] = [], timezone?: string) {
  const query = new URLSearchParams({ from, to })
  for (const type of types) query.append('types', type)
  if (timezone) query.set('timezone', timezone)
  return `/calendar/events?${query}`
}

export function buildSharedMonthPath(year: number, month: number, timezone?: string) {
  return buildMonthPath(year, month, timezone).replace('/calendar/month', '/family/shared-calendar/month')
}

export function buildSharedEventsPath(from: string, to: string, types: CalendarSource[] = [], timezone?: string) {
  return buildEventsPath(from, to, types.filter((type) => type !== 'MEDICAL_RECORD'), timezone).replace('/calendar/events', '/family/shared-calendar/events')
}

export function buildRemindersPath(filters: { from?: string; to?: string; status?: string; timezone?: string } = {}) {
  const query = new URLSearchParams()
  if (filters.from) query.set('from', filters.from)
  if (filters.to) query.set('to', filters.to)
  if (filters.status) query.set('status', filters.status)
  if (filters.timezone) query.set('timezone', filters.timezone)
  const suffix = query.toString()
  return `/calendar/reminders${suffix ? `?${suffix}` : ''}`
}

export function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next }

export function moveCalendarMonth(anchor: Date, direction: -1 | 1) {
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}

export function startOfWeek(date: Date) {
  const day = (date.getDay() + 6) % 7
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - day)
  return start
}

export function visibleRange(view: 'WEEK' | 'DAY' | 'LIST', anchor: Date) {
  if (view === 'DAY') return { from: localDate(anchor), to: localDate(anchor) }
  const from = view === 'WEEK' ? startOfWeek(anchor) : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = view === 'WEEK' ? addDays(from, 6) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return { from: localDate(from), to: localDate(to) }
}

const weekdayIndex: Record<Weekday, number> = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 }

export function nextWeeklyAnchor(startsAtLocal: string, selected: Weekday[]) {
  if (!selected.length) return startsAtLocal
  const start = new Date(startsAtLocal)
  if (Number.isNaN(start.getTime())) return startsAtLocal
  const indexes = selected.map((day) => weekdayIndex[day])
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(start, offset)
    if (indexes.includes(candidate.getDay())) {
      candidate.setHours(start.getHours(), start.getMinutes(), 0, 0)
      return `${localDate(candidate)}T${pad(candidate.getHours())}:${pad(candidate.getMinutes())}`
    }
  }
  return startsAtLocal
}

export function buildRepeat(value: ReminderFormValue): ReminderRepeat | undefined {
  if (value.repeatMode === 'NONE') return undefined
  const rule = value.repeatMode === 'WEEKLY' ? 'WEEKLY' : value.repeatMode === 'MONTHLY' ? 'MONTHLY' : 'DAILY'
  const repeat: ReminderRepeat = { rule }
  if (value.interval !== 1 || value.repeatMode === 'EVERY_N_DAYS') repeat.interval = value.interval
  if (rule === 'WEEKLY') repeat.days_of_week = value.daysOfWeek
  if (value.timesOfDay.length) repeat.times_of_day = value.timesOfDay
  if (value.until) repeat.until = value.until
  return repeat
}

export function validateReminderForm(value: ReminderFormValue, now = new Date(), originalStartsAt?: string) {
  const errors: Record<string, string> = {}
  const start = new Date(value.startsAtLocal)
  if (!value.title.trim()) errors.title = 'Hãy nhập tiêu đề.'
  else if (value.title.trim().length > 255) errors.title = 'Tiêu đề tối đa 255 ký tự.'
  if (!value.startsAtLocal || Number.isNaN(start.getTime())) errors.starts_at = 'Hãy chọn thời gian bắt đầu.'
  else {
    const originalTime = originalStartsAt ? new Date(originalStartsAt).getTime() : Number.NaN
    const startChanged = !Number.isFinite(originalTime) || start.getTime() !== originalTime
    if (startChanged && start <= now) errors.starts_at = 'Thời gian bắt đầu phải ở tương lai.'
  }
  if (value.note.length > 2000) errors.note = 'Ghi chú tối đa 2000 ký tự.'
  if (value.facilityName.length > 255) errors.facility_name = 'Tên cơ sở tối đa 255 ký tự.'
  if (value.remindEnabled && (!Number.isInteger(value.remindMinutesBefore) || value.remindMinutesBefore < 0 || value.remindMinutesBefore > 10080)) errors.remind_minutes_before = 'Thời gian nhắc phải từ 0 đến 10080 phút.'
  if (value.repeatMode !== 'NONE' && (!Number.isInteger(value.interval) || value.interval < 1 || value.interval > 365)) errors.interval = 'Khoảng lặp phải từ 1 đến 365.'
  if (value.repeatMode === 'WEEKLY' && value.daysOfWeek.length === 0) errors.days_of_week = 'Hãy chọn ít nhất một thứ.'
  if (value.timesOfDay.length > 6) errors.times_of_day = 'Chỉ được chọn tối đa 6 mốc giờ mỗi ngày.'
  if (new Set(value.timesOfDay).size !== value.timesOfDay.length) errors.times_of_day = 'Các mốc giờ không được trùng nhau.'
  const startDate = value.startsAtLocal.slice(0, 10)
  if (value.until && startDate && value.until < startDate) errors.until = 'Ngày kết thúc không thể trước ngày bắt đầu.'
  return errors
}

function compact<T extends Record<string, unknown>>(value: T): T { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')) as T }

export function reminderCreatePayload(value: ReminderFormValue, pregnancyId?: string): CreateReminderPayload {
  const anchored = value.repeatMode === 'WEEKLY' ? nextWeeklyAnchor(value.startsAtLocal, value.daysOfWeek) : value.startsAtLocal
  return compact({ type: value.type, title: value.title.trim(), starts_at: localDateTimeToUtc(anchored), facility_name: value.facilityName.trim() || undefined, note: value.note.trim() || undefined, remind_minutes_before: value.remindEnabled ? value.remindMinutesBefore : undefined, pregnancy_id: pregnancyId, repeat: buildRepeat(value) })
}

function sameJson(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right) }

export function reminderPatchPayload(value: ReminderFormValue, original: ReminderDetail): UpdateReminderPayload {
  const rawStart = localDateTimeToUtc(value.startsAtLocal)
  const startChanged = new Date(rawStart).getTime() !== new Date(original.starts_at).getTime()
  const next = reminderCreatePayload(value, original.pregnancy_id)
  const payload: UpdateReminderPayload = { version: original.version }
  if (next.type !== original.type) payload.type = next.type
  if (next.title !== original.title) payload.title = next.title
  if (startChanged) payload.starts_at = next.starts_at
  const facilityName = value.facilityName.trim()
  const note = value.note.trim()
  if (facilityName !== (original.facility_name || '')) payload.facility_name = facilityName
  if (note !== (original.note || '')) payload.note = note
  if (!value.remindEnabled && original.remind_minutes_before !== undefined) payload.clear_remind_minutes_before = true
  else if (value.remindEnabled && next.remind_minutes_before !== original.remind_minutes_before) payload.remind_minutes_before = next.remind_minutes_before
  if (!next.repeat && original.repeat) payload.clear_repeat = true
  else if (next.repeat && !sameJson(next.repeat, original.repeat)) payload.repeat = next.repeat
  return payload
}

export function medicalRecordReminderDefaults(occurredAt: string, now = new Date()) {
  const occurred = new Date(occurredAt)
  let target = addDays(occurred, 28)
  if (Number.isNaN(target.getTime()) || target <= now) { target = addDays(now, 1); target.setHours(9, 0, 0, 0) }
  return { type: 'FOLLOW_UP' as const, startsAtLocal: `${localDate(target)}T${pad(target.getHours())}:${pad(target.getMinutes())}`, remindMinutesBefore: 1440 }
}

export function medicalRecordReminderPayload(input: { type: MedicalRecordReminderPayload['type']; startsAtLocal: string; remindEnabled: boolean; remindMinutesBefore: number; title?: string; note?: string; repeat?: ReminderRepeat }): MedicalRecordReminderPayload {
  return compact({ type: input.type, starts_at: localDateTimeToUtc(input.startsAtLocal), remind_minutes_before: input.remindEnabled ? input.remindMinutesBefore : undefined, title: input.title?.trim() || undefined, note: input.note?.trim() || undefined, repeat: input.repeat })
}

export function formatEventTime(event: Pick<CalendarEventItem, 'starts_at' | 'ends_at' | 'source'>) {
  const format = (value: string) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  const start = format(event.starts_at)
  return event.source === 'CONSULTATION' && event.ends_at ? `${start}–${format(event.ends_at)}` : start
}

export function formatCalendarDate(value: Date | string, includeTime = false) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit' as const, minute: '2-digit' as const } : {}),
  }).format(date)
}

export function calendarRangeError(error: unknown) {
  const value = error as { status?: number; serverMessage?: string; message?: string }
  if (value.status === 422) return value.serverMessage || 'Khoảng lịch quá rộng hoặc có quá 2000 mốc. Vui lòng thu hẹp khoảng thời gian.'
  return value.message || 'Không thể tải lịch. Vui lòng thử lại.'
}
