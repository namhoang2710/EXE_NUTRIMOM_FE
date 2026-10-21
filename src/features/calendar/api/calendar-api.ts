import { apiClient } from '../../../core/api/api-client.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { invalidateProfileResources, profileRead, requireCurrentScope } from '../../../core/api/profile-requests.ts'
import { buildEventsPath, buildMonthPath, buildRemindersPath, buildSharedEventsPath, buildSharedMonthPath, occurrencePayload } from '../model/calendar-helpers.ts'
import { normalizeCalendarEvents, normalizeCalendarMonth, normalizeReminderDetail, normalizeReminderList, normalizeSharedCalendarEvents, normalizeSharedCalendarMonth } from '../model/calendar-normalizers.ts'
import type { CalendarSource, CreateReminderPayload, MedicalRecordReminderPayload, OccurrenceStatus, UpdateReminderPayload } from '../model/calendar-types.ts'

function read<T>(path: string, normalize: (value: unknown) => T, signal?: AbortSignal) {
  return profileRead(`calendar:${path}`, async () => normalize(await apiClient.request<unknown>(path)), signal)
}

async function mutate<T>(load: () => Promise<T>) {
  const scope = getSessionScope()
  const value = await load()
  requireCurrentScope(scope)
  invalidateProfileResources('calendar:')
  return value
}

if (typeof window !== 'undefined') window.addEventListener('nutrimom:calendar-changed', () => invalidateProfileResources('calendar:'))

export const calendarApi = {
  month: (year: number, month: number, signal?: AbortSignal, timezone?: string) => read(buildMonthPath(year, month, timezone), normalizeCalendarMonth, signal),
  events: (from: string, to: string, signal?: AbortSignal, types: CalendarSource[] = [], timezone?: string) => read(buildEventsPath(from, to, [...types].sort(), timezone), normalizeCalendarEvents, signal),
  sharedMonth: (year: number, month: number, signal?: AbortSignal, timezone?: string) => read(buildSharedMonthPath(year, month, timezone), normalizeSharedCalendarMonth, signal),
  sharedEvents: (from: string, to: string, signal?: AbortSignal, types: CalendarSource[] = [], timezone?: string) => read(buildSharedEventsPath(from, to, [...types].sort(), timezone), normalizeSharedCalendarEvents, signal),
  reminders: (filters: { from?: string; to?: string; status?: string; timezone?: string } = {}, signal?: AbortSignal) => read(buildRemindersPath(filters), normalizeReminderList, signal),
  reminder: (id: string, signal?: AbortSignal) => read(`/calendar/reminders/${encodeURIComponent(id)}`, normalizeReminderDetail, signal),
  createReminder: (body: CreateReminderPayload) => mutate(async () => normalizeReminderDetail(await apiClient.request<unknown>('/calendar/reminders', { method: 'POST', body: JSON.stringify(body) }))),
  updateReminder: (id: string, body: UpdateReminderPayload) => mutate(async () => normalizeReminderDetail(await apiClient.request<unknown>(`/calendar/reminders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }))),
  deleteReminder: (id: string) => mutate(() => apiClient.request<void>(`/calendar/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' })),
  updateOccurrence: (id: string, occurrenceAt: string, status?: OccurrenceStatus) => mutate(async () => normalizeReminderDetail(await apiClient.request<unknown>(`/calendar/reminders/${encodeURIComponent(id)}/occurrences`, { method: 'PUT', body: JSON.stringify(occurrencePayload(occurrenceAt, status)) }))),
  createFromMedicalRecord: (recordId: string, body: MedicalRecordReminderPayload) => mutate(async () => normalizeReminderDetail(await apiClient.request<unknown>(`/medical-records/${encodeURIComponent(recordId)}/reminders`, { method: 'POST', body: JSON.stringify(body) }))),
}
