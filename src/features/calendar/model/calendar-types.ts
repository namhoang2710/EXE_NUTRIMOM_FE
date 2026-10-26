export type CalendarSource = 'MEDICAL_RECORD' | 'CONSULTATION' | 'REMINDER'
export type CalendarView = 'MONTH' | 'WEEK' | 'DAY' | 'LIST'
export type ReminderType = 'FOLLOW_UP' | 'ROUTINE_CHECKUP' | 'CUSTOM'
export type ReminderStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'SKIPPED'
export type ConsultationCalendarStatus = 'PENDING_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
export type CalendarEventStatus = ReminderStatus | ConsultationCalendarStatus
export type RepeatRule = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type OccurrenceStatus = 'DONE' | 'SKIPPED'

export interface CalendarMonthItem { date: string; event_count: number; types: CalendarSource[] }
export type SharedCalendarSource = Exclude<CalendarSource, 'MEDICAL_RECORD'>

export interface SharedCalendarMetadata {
  family_group_id: string
  owner_display_name: string
  allowed_sources: SharedCalendarSource[]
}

export interface SharedCalendarEvents extends SharedCalendarMetadata { events: CalendarEventItem[] }
export interface SharedCalendarMonth extends SharedCalendarMetadata { days: CalendarMonthItem[] }

interface CalendarEventBase {
  source: CalendarSource
  source_id: string
  title: string
  subtitle?: string
  starts_at: string
  ends_at?: string
  date: string
  deep_link?: string
  recurring?: boolean
}

export type CalendarEventItem =
  | (CalendarEventBase & { source: 'REMINDER'; status?: ReminderStatus })
  | (CalendarEventBase & { source: 'CONSULTATION'; status?: ConsultationCalendarStatus })
  | (CalendarEventBase & { source: 'MEDICAL_RECORD'; status?: never })

export interface ReminderRepeat {
  rule: RepeatRule
  interval?: number
  days_of_week?: Weekday[]
  times_of_day?: string[]
  until?: string
}

export interface ReminderDetail {
  id: string
  type: ReminderType
  title: string
  starts_at: string
  date: string
  status: ReminderStatus
  facility_name?: string
  note?: string
  remind_minutes_before?: number
  pregnancy_id?: string
  repeat?: ReminderRepeat
  recurring?: boolean
  remind_at?: string
  next_occurrence?: string
  version: number
  next_suggestion?: string
}

export interface CreateReminderPayload {
  type: ReminderType
  title: string
  starts_at: string
  facility_name?: string
  note?: string
  remind_minutes_before?: number
  pregnancy_id?: string
  repeat?: ReminderRepeat
}

export type UpdateReminderPayload = Partial<CreateReminderPayload> & {
  version: number
  status?: 'DONE' | 'CANCELLED' | 'SCHEDULED'
  clear_remind_minutes_before?: true
  clear_repeat?: true
}

export interface MedicalRecordReminderPayload {
  type: ReminderType
  starts_at: string
  remind_minutes_before?: number
  title?: string
  note?: string
  repeat?: ReminderRepeat
}

export interface ReminderFormValue {
  type: ReminderType
  title: string
  startsAtLocal: string
  facilityName: string
  note: string
  remindEnabled: boolean
  remindMinutesBefore: number
  repeatMode: 'NONE' | 'DAILY' | 'EVERY_N_DAYS' | 'WEEKLY' | 'MONTHLY'
  interval: number
  daysOfWeek: Weekday[]
  timesOfDay: string[]
  until: string
}
