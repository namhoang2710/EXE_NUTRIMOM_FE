import { apiClient } from '@/core/api/api-client'
import { buildEventsPath, buildMonthPath, buildRemindersPath, buildSharedEventsPath, buildSharedMonthPath, occurrencePayload } from '../model/calendar-helpers'
import { normalizeCalendarEvents, normalizeCalendarMonth, normalizeReminderDetail, normalizeReminderList, normalizeSharedCalendarEvents, normalizeSharedCalendarMonth } from '../model/calendar-normalizers'
import type { CalendarSource, CreateReminderPayload, MedicalRecordReminderPayload, OccurrenceStatus, UpdateReminderPayload } from '../model/calendar-types'

export const calendarApi = {
  month: async (year: number, month: number, signal?: AbortSignal, timezone?: string) => normalizeCalendarMonth(await apiClient.request<unknown>(buildMonthPath(year, month, timezone), { signal })),
  events: async (from: string, to: string, signal?: AbortSignal, types: CalendarSource[] = [], timezone?: string) => normalizeCalendarEvents(await apiClient.request<unknown>(buildEventsPath(from, to, types, timezone), { signal })),
  sharedMonth: async (year: number, month: number, signal?: AbortSignal, timezone?: string) => normalizeSharedCalendarMonth(await apiClient.request<unknown>(buildSharedMonthPath(year, month, timezone), { signal })),
  sharedEvents: async (from: string, to: string, signal?: AbortSignal, types: CalendarSource[] = [], timezone?: string) => normalizeSharedCalendarEvents(await apiClient.request<unknown>(buildSharedEventsPath(from, to, types, timezone), { signal })),
  reminders: async (filters: { from?: string; to?: string; status?: string; timezone?: string } = {}, signal?: AbortSignal) => normalizeReminderList(await apiClient.request<unknown>(buildRemindersPath(filters), { signal })),
  reminder: async (id: string, signal?: AbortSignal) => normalizeReminderDetail(await apiClient.request<unknown>(`/calendar/reminders/${encodeURIComponent(id)}`, { signal })),
  createReminder: async (body: CreateReminderPayload) => normalizeReminderDetail(await apiClient.request<unknown>('/calendar/reminders', { method: 'POST', body: JSON.stringify(body) })),
  updateReminder: async (id: string, body: UpdateReminderPayload) => normalizeReminderDetail(await apiClient.request<unknown>(`/calendar/reminders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) })),
  deleteReminder: (id: string) => apiClient.request<void>(`/calendar/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateOccurrence: async (id: string, occurrenceAt: string, status?: OccurrenceStatus) => normalizeReminderDetail(await apiClient.request<unknown>(`/calendar/reminders/${encodeURIComponent(id)}/occurrences`, { method: 'PUT', body: JSON.stringify(occurrencePayload(occurrenceAt, status)) })),
  createFromMedicalRecord: async (recordId: string, body: MedicalRecordReminderPayload) => normalizeReminderDetail(await apiClient.request<unknown>(`/medical-records/${encodeURIComponent(recordId)}/reminders`, { method: 'POST', body: JSON.stringify(body) })),
}
