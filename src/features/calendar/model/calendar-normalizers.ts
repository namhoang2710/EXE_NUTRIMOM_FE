import type { CalendarEventItem, CalendarMonthItem, CalendarSource, ConsultationCalendarStatus, ReminderDetail, ReminderRepeat, ReminderStatus, ReminderType, RepeatRule, SharedCalendarEvents, SharedCalendarMonth, SharedCalendarSource, Weekday } from './calendar-types.ts'
import { logDiagnostic } from '../../../core/diagnostics/logger.ts'

type JsonRecord = Record<string, unknown>

const sources = new Set<CalendarSource>(['MEDICAL_RECORD', 'CONSULTATION', 'REMINDER'])
const reminderTypes = new Set<ReminderType>(['FOLLOW_UP', 'ROUTINE_CHECKUP', 'CUSTOM'])
const reminderStatuses = new Set<ReminderStatus>(['SCHEDULED', 'DONE', 'CANCELLED', 'SKIPPED'])
const consultationStatuses = new Set<ConsultationCalendarStatus>(['PENDING_CONSULTATION', 'COMPLETED', 'CANCELLED'])
const repeatRules = new Set<RepeatRule>(['DAILY', 'WEEKLY', 'MONTHLY'])
const weekdays = new Set<Weekday>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
const datePattern = /^\d{4}-\d{2}-\d{2}$/

export class CalendarContractError extends Error {
  constructor(resource: string, reason: string) {
    super(`Dữ liệu ${resource} từ máy chủ không hợp lệ (${reason}).`)
    this.name = 'CalendarContractError'
    logDiagnostic({ level: 'error', category: 'calendar', event: 'contract_normalization_failed', reason: resource })
  }
}

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function isoDate(value: unknown) {
  const text = nonEmptyString(value)
  return text && datePattern.test(text) ? text : undefined
}

function isoInstant(value: unknown) {
  const text = nonEmptyString(value)
  return text && !Number.isNaN(Date.parse(text)) ? text : undefined
}

function devWarn(resource: string, index: number | undefined, reason: string) {
  logDiagnostic({ level: 'warn', category: 'calendar', event: 'contract_normalization_failed', reason: `${resource}${index === undefined ? '' : ` #${index}`}: ${reason}` })
}

function optionalString(value: unknown) { return typeof value === 'string' ? value : undefined }
function optionalBoolean(value: unknown) { return typeof value === 'boolean' ? value : undefined }
function optionalNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : undefined }

function eventStatus(source: CalendarSource, value: unknown) {
  const status = optionalString(value)
  if (!status || source === 'MEDICAL_RECORD') return undefined
  if (source === 'REMINDER' && reminderStatuses.has(status as ReminderStatus)) return status as ReminderStatus
  if (source === 'CONSULTATION' && consultationStatuses.has(status as ConsultationCalendarStatus)) return status as ConsultationCalendarStatus
  devWarn('event status', undefined, `${source}:${status}`)
  return undefined
}

function eventItem(value: unknown): CalendarEventItem | undefined {
  const item = record(value)
  if (!item) return undefined
  const source = sources.has(item.source as CalendarSource) ? item.source as CalendarSource : undefined
  const sourceId = nonEmptyString(item.source_id)
  const title = nonEmptyString(item.title)
  const date = isoDate(item.date)
  const startsAt = isoInstant(item.starts_at)
  if (!source || !sourceId || !title || !date || !startsAt) return undefined
  const common = {
    source,
    source_id: sourceId,
    title,
    date,
    starts_at: startsAt,
    ...(optionalString(item.subtitle) !== undefined ? { subtitle: optionalString(item.subtitle) } : {}),
    ...(isoInstant(item.ends_at) ? { ends_at: isoInstant(item.ends_at) } : {}),
    ...(optionalString(item.deep_link) !== undefined ? { deep_link: optionalString(item.deep_link) } : {}),
    ...(optionalBoolean(item.recurring) !== undefined ? { recurring: optionalBoolean(item.recurring) } : {}),
  }
  const status = eventStatus(source, item.status)
  if (source === 'REMINDER') return { ...common, source, ...(status ? { status: status as ReminderStatus } : {}) }
  if (source === 'CONSULTATION') return { ...common, source, ...(status ? { status: status as ConsultationCalendarStatus } : {}) }
  return { ...common, source }
}

export function normalizeCalendarEvents(value: unknown): CalendarEventItem[] {
  if (!Array.isArray(value)) { devWarn('danh sách sự kiện', undefined, 'response không phải mảng'); return [] }
  return value.flatMap((item, index) => {
    const normalized = eventItem(item)
    if (!normalized) devWarn('sự kiện', index, 'thiếu source/source_id/title/date/starts_at hợp lệ')
    return normalized ? [normalized] : []
  })
}

export function normalizeCalendarMonth(value: unknown): CalendarMonthItem[] {
  if (!Array.isArray(value)) { devWarn('lưới tháng', undefined, 'response không phải mảng'); return [] }
  return value.flatMap((valueItem, index) => {
    const item = record(valueItem)
    const date = isoDate(item?.date)
    const count = optionalNumber(item?.event_count)
    const types = Array.isArray(item?.types) ? item.types.filter((type): type is CalendarSource => sources.has(type as CalendarSource)) : undefined
    if (!date || count === undefined || count < 0 || !types) {
      devWarn('ngày trong lưới tháng', index, 'thiếu date/event_count/types hợp lệ')
      return []
    }
    return [{ date, event_count: count, types }]
  })
}

function sharedMetadata(value: unknown) {
  const item = record(value)
  const familyGroupId = nonEmptyString(item?.family_group_id)
  const ownerDisplayName = nonEmptyString(item?.owner_display_name)
  const allowed = Array.isArray(item?.allowed_sources)
    ? item.allowed_sources.filter((source): source is SharedCalendarSource => source === 'REMINDER' || source === 'CONSULTATION')
    : undefined
  if (!item || !familyGroupId || !ownerDisplayName || !allowed) throw new CalendarContractError('lịch được chia sẻ', 'thiếu family_group_id/owner_display_name/allowed_sources hợp lệ')
  return { item, family_group_id: familyGroupId, owner_display_name: ownerDisplayName, allowed_sources: [...new Set(allowed)] }
}

export function normalizeSharedCalendarEvents(value: unknown): SharedCalendarEvents {
  const meta = sharedMetadata(value)
  if (!Array.isArray(meta.item.events)) throw new CalendarContractError('lịch được chia sẻ', 'events không phải mảng')
  const allowed = new Set(meta.allowed_sources)
  return { family_group_id: meta.family_group_id, owner_display_name: meta.owner_display_name, allowed_sources: meta.allowed_sources, events: normalizeCalendarEvents(meta.item.events).filter((event) => event.source !== 'MEDICAL_RECORD' && allowed.has(event.source)) }
}

export function normalizeSharedCalendarMonth(value: unknown): SharedCalendarMonth {
  const meta = sharedMetadata(value)
  if (!Array.isArray(meta.item.days)) throw new CalendarContractError('lịch tháng được chia sẻ', 'days không phải mảng')
  const allowed = new Set<CalendarSource>(meta.allowed_sources)
  return { family_group_id: meta.family_group_id, owner_display_name: meta.owner_display_name, allowed_sources: meta.allowed_sources, days: normalizeCalendarMonth(meta.item.days).map((day) => ({ ...day, types: day.types.filter((type) => type !== 'MEDICAL_RECORD' && allowed.has(type)) })).filter((day) => day.types.length > 0) }
}

function repeat(value: unknown): ReminderRepeat | undefined {
  if (value === undefined || value === null) return undefined
  const item = record(value)
  const rule = repeatRules.has(item?.rule as RepeatRule) ? item?.rule as RepeatRule : undefined
  if (!item || !rule) return undefined
  const days = Array.isArray(item.days_of_week) ? item.days_of_week.filter((day): day is Weekday => weekdays.has(day as Weekday)) : undefined
  const times = Array.isArray(item.times_of_day) ? item.times_of_day.filter((time): time is string => typeof time === 'string') : undefined
  return {
    rule,
    ...(optionalNumber(item.interval) !== undefined ? { interval: optionalNumber(item.interval) } : {}),
    ...(days ? { days_of_week: days } : {}),
    ...(times ? { times_of_day: times } : {}),
    ...(isoDate(item.until) ? { until: isoDate(item.until) } : {}),
  }
}

export function normalizeReminderDetail(value: unknown): ReminderDetail {
  const item = record(value)
  if (!item) throw new CalendarContractError('chi tiết lịch nhắc', 'response không phải object')
  const id = nonEmptyString(item.id)
  const type = reminderTypes.has(item.type as ReminderType) ? item.type as ReminderType : undefined
  const title = nonEmptyString(item.title)
  const startsAt = isoInstant(item.starts_at)
  const date = isoDate(item.date)
  const status = reminderStatuses.has(item.status as ReminderStatus) ? item.status as ReminderStatus : undefined
  const version = optionalNumber(item.version)
  if (!id || !type || !title || !startsAt || !date || !status || version === undefined) {
    throw new CalendarContractError('chi tiết lịch nhắc', 'thiếu id/type/title/starts_at/date/status/version hợp lệ')
  }
  return {
    id, type, title, starts_at: startsAt, date, status, version,
    ...(optionalString(item.facility_name) !== undefined ? { facility_name: optionalString(item.facility_name) } : {}),
    ...(optionalString(item.note) !== undefined ? { note: optionalString(item.note) } : {}),
    ...(optionalNumber(item.remind_minutes_before) !== undefined ? { remind_minutes_before: optionalNumber(item.remind_minutes_before) } : {}),
    ...(optionalString(item.pregnancy_id) !== undefined ? { pregnancy_id: optionalString(item.pregnancy_id) } : {}),
    ...(repeat(item.repeat) ? { repeat: repeat(item.repeat) } : {}),
    ...(optionalBoolean(item.recurring) !== undefined ? { recurring: optionalBoolean(item.recurring) } : {}),
    ...(isoInstant(item.remind_at) ? { remind_at: isoInstant(item.remind_at) } : {}),
    ...(isoInstant(item.next_occurrence) ? { next_occurrence: isoInstant(item.next_occurrence) } : {}),
    ...(isoInstant(item.next_suggestion) ? { next_suggestion: isoInstant(item.next_suggestion) } : {}),
  }
}

export function normalizeReminderList(value: unknown): ReminderDetail[] {
  if (!Array.isArray(value)) { devWarn('danh sách lịch nhắc', undefined, 'response không phải mảng'); return [] }
  return value.flatMap((item, index) => {
    try { return [normalizeReminderDetail(item)] }
    catch { devWarn('lịch nhắc', index, 'item sai contract'); return [] }
  })
}
