import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  buildEventsPath,
  buildMonthPath,
  buildRemindersPath,
  calendarEventKey,
  calendarStatusLabel,
  isCalendarStatusComplete,
  formatCalendarDate,
  localDateTimeToUtc,
  medicalRecordReminderDefaults,
  medicalRecordReminderPayload,
  moveCalendarMonth,
  nextWeeklyAnchor,
  occurrenceActionMode,
  occurrencePayload,
  reminderPatchPayload,
  validateReminderForm,
} from '../src/features/calendar/model/calendar-helpers.ts'
import { CALENDAR_TOAST_DURATION, runCalendarAction, scheduleCalendarToastDismiss } from '../src/features/calendar/model/calendar-action-feedback.ts'
import type { CalendarEventItem, ReminderDetail, ReminderFormValue } from '../src/features/calendar/model/calendar-types.ts'
import { CalendarContractError, normalizeCalendarEvents, normalizeCalendarMonth, normalizeReminderDetail } from '../src/features/calendar/model/calendar-normalizers.ts'
import { adaptDeepLink, buildNotificationsPath, markAllNotificationsRead, markNotificationRead, notificationLoadingEnabled, notificationPageState, resetNotificationState } from '../src/features/notifications/model/notification-helpers.ts'
import { NotificationContractError, normalizeNotificationPage } from '../src/features/notifications/model/notification-normalizers.ts'
import { commitNotificationAction, createNotificationMutationCoordinator, createNotificationRequestCoordinator } from '../src/features/notifications/model/notification-request-coordinator.ts'
import { dashboardGreeting } from '../src/features/user/model/dashboard-greeting.ts'

const event: CalendarEventItem = { source: 'REMINDER', source_id: 'series-1', title: 'Uống vitamin', starts_at: '2026-10-03T01:00:00Z', date: '2026-10-03', recurring: true }
const form: ReminderFormValue = { type: 'CUSTOM', title: 'Uống vitamin', startsAtLocal: '2099-10-03T08:00', facilityName: '', note: '', remindEnabled: true, remindMinutesBefore: 10, repeatMode: 'NONE', interval: 1, daysOfWeek: [], timesOfDay: [], until: '' }

test('calendar queries use exact month, event, and reminder contracts without an implicit timezone', () => {
  assert.equal(buildMonthPath(2026, 10), '/calendar/month?year=2026&month=10')
  assert.equal(buildEventsPath('2026-10-01', '2026-10-07', ['REMINDER', 'CONSULTATION']), '/calendar/events?from=2026-10-01&to=2026-10-07&types=REMINDER&types=CONSULTATION')
  assert.equal(buildRemindersPath({ from: '2026-10-01', status: 'SCHEDULED' }), '/calendar/reminders?from=2026-10-01&status=SCHEDULED')
})

test('month grid loads summary from /month while agenda loads events for its visible range', async () => {
  const hook = await readFile(new URL('../src/features/calendar/hooks/useCalendarData.ts', import.meta.url), 'utf8')
  assert.match(hook, /calendarApi\.month\(anchor\.getFullYear\(\), anchor\.getMonth\(\) \+ 1/)
  assert.match(hook, /calendarApi\.events\(range\.from, range\.to/)
  assert.match(hook, /view === 'MONTH'.*from: selectedDate, to: selectedDate/)
})

test('calendar items preserve backend date and use the required composite key', () => {
  assert.equal(calendarEventKey(event), 'REMINDER:series-1:2026-10-03T01:00:00Z')
  assert.equal(event.date, '2026-10-03')
})

test('calendar API boundary skips invalid list items and never accepts startTime in place of starts_at', () => {
  const events = normalizeCalendarEvents([
    event,
    { source: 'REMINDER', source_id: 'broken', title: 'Thiếu starts_at', startTime: '08:00', date: '2026-10-03' },
    undefined,
  ])
  assert.deepEqual(events, [event])
  assert.deepEqual(normalizeCalendarEvents(undefined), [])
  assert.deepEqual(normalizeCalendarMonth([undefined, { date: '2026-10-03', event_count: 1, types: ['REMINDER'] }]), [{ date: '2026-10-03', event_count: 1, types: ['REMINDER'] }])
})

test('calendar statuses are normalized by source and unknown values are omitted', () => {
  const normalized = normalizeCalendarEvents([
    { ...event, status: 'SCHEDULED' },
    { ...event, source: 'CONSULTATION', source_id: 'c1', status: 'PENDING_CONSULTATION' },
    { ...event, source: 'CONSULTATION', source_id: 'c2', status: 'COMPLETED' },
    { ...event, source: 'MEDICAL_RECORD', source_id: 'm1', status: 'COMPLETED' },
    { ...event, source_id: 'r2', status: 'UNKNOWN' },
  ])
  assert.equal(normalized[0].status, 'SCHEDULED')
  assert.equal(normalized[1].status, 'PENDING_CONSULTATION')
  assert.equal(normalized[2].status, 'COMPLETED')
  assert.equal(normalized[3].status, undefined)
  assert.equal(normalized[4].status, undefined)
  assert.equal(calendarStatusLabel('PENDING_CONSULTATION'), 'Đã đặt lịch')
  assert.equal(calendarStatusLabel('COMPLETED'), 'Đã hoàn thành')
  assert.equal(isCalendarStatusComplete('DONE'), true)
  assert.equal(isCalendarStatusComplete('COMPLETED'), true)
  assert.equal(isCalendarStatusComplete('PENDING_CONSULTATION'), false)
})

test('month navigation always anchors on day one across long months, February, leap years, and year boundaries', () => {
  for (const day of [29, 30, 31]) {
    const next = moveCalendarMonth(new Date(2026, 0, day), 1)
    assert.deepEqual([next.getFullYear(), next.getMonth(), next.getDate()], [2026, 1, 1])
  }
  assert.deepEqual([moveCalendarMonth(new Date(2026, 11, 31), 1).getFullYear(), moveCalendarMonth(new Date(2026, 11, 31), 1).getMonth()], [2027, 0])
  assert.deepEqual([moveCalendarMonth(new Date(2026, 0, 31), -1).getFullYear(), moveCalendarMonth(new Date(2026, 0, 31), -1).getMonth()], [2025, 11])
  assert.equal(moveCalendarMonth(new Date(2024, 1, 29), 1).getMonth(), 2)
})

test('malformed reminder detail fails safely at the API boundary', () => {
  assert.throws(() => normalizeReminderDetail({ id: 'r1', title: 'Thiếu giờ', startTime: '08:00' }), CalendarContractError)
})

test('datetime-local is parsed as local time before conversion to UTC', () => {
  const local = '2099-10-03T08:30'
  assert.equal(localDateTimeToUtc(local), new Date(local).toISOString())
  assert.notEqual(localDateTimeToUtc(local), `${local}:00.000Z`)
})

test('Vietnam calendar labels can include weekday and time without invalid Intl options', () => {
  assert.doesNotThrow(() => formatCalendarDate('2026-10-02T09:30:00+07:00', true))
  assert.match(formatCalendarDate('2026-10-02T09:30:00+07:00', true), /2026/)
})

test('weekly reminders move their anchor to the nearest selected weekday', () => {
  const start = '2026-10-01T09:00'
  const anchored = nextWeeklyAnchor(start, ['MONDAY', 'WEDNESDAY'])
  assert.equal(new Date(anchored).getDay(), 1)
  assert.equal(anchored.endsWith('T09:00'), true)
})

test('repeat validation enforces interval, weekly days, six times, and until boundary', () => {
  const invalid: ReminderFormValue = { ...form, repeatMode: 'WEEKLY', interval: 366, daysOfWeek: [], timesOfDay: ['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'], until: '2099-10-02' }
  const errors = validateReminderForm(invalid, new Date('2026-01-01T00:00:00Z'))
  assert.ok(errors.interval)
  assert.ok(errors.days_of_week)
  assert.ok(errors.times_of_day)
  assert.ok(errors.until)
})

test('PATCH always includes version and emits clear flags rather than null', () => {
  const original: ReminderDetail = { id: 'r1', type: 'CUSTOM', title: 'Uống vitamin', starts_at: localDateTimeToUtc(form.startsAtLocal), date: '2099-10-03', status: 'SCHEDULED', facility_name: 'Phòng khám', note: 'Mang sổ', remind_minutes_before: 10, repeat: { rule: 'DAILY' }, version: 7 }
  const patch = reminderPatchPayload({ ...form, remindEnabled: false }, original)
  assert.equal(patch.version, 7)
  assert.equal(patch.clear_remind_minutes_before, true)
  assert.equal(patch.clear_repeat, true)
  assert.equal(patch.facility_name, '')
  assert.equal(patch.note, '')
  assert.equal(Object.values(patch).includes(null as never), false)
})

test('an active recurring reminder can change metadata while preserving its past anchor', () => {
  const pastForm: ReminderFormValue = { ...form, title: 'Vitamin mới', startsAtLocal: '2025-01-01T08:00', repeatMode: 'DAILY', note: 'Ghi chú mới' }
  const original: ReminderDetail = { id: 'past', type: 'CUSTOM', title: 'Vitamin cũ', starts_at: localDateTimeToUtc(pastForm.startsAtLocal), date: '2025-01-01', status: 'SCHEDULED', note: '', repeat: { rule: 'DAILY' }, version: 4 }
  assert.equal(validateReminderForm(pastForm, new Date('2026-10-03T00:00:00Z'), original.starts_at).starts_at, undefined)
  const patch = reminderPatchPayload(pastForm, original)
  assert.equal(patch.starts_at, undefined)
  assert.equal(patch.title, 'Vitamin mới')
  assert.equal(patch.note, 'Ghi chú mới')
  assert.equal(patch.version, 4)
  assert.ok(validateReminderForm({ ...pastForm, startsAtLocal: '2025-01-02T08:00' }, new Date('2026-10-03T00:00:00Z'), original.starts_at).starts_at)
})

test('occurrence API sends the event starts_at verbatim and conflict UI refetches', async () => {
  const api = await readFile(new URL('../src/features/calendar/api/calendar-api.ts', import.meta.url), 'utf8')
  const dialog = await readFile(new URL('../src/features/calendar/components/ReminderDialog.tsx', import.meta.url), 'utf8')
  assert.match(api, /occurrencePayload\(occurrenceAt, status\)/)
  assert.match(dialog, /VERSION_CONFLICT[^]*calendarApi\.reminder\(detail\.id\)/)
  assert.match(dialog, /Dữ liệu đã thay đổi, vui lòng tải lại/)
})

test('occurrence payload preserves starts_at and serializes DONE, SKIPPED, and undo exactly', () => {
  const startsAt = '2026-10-03T01:00:00.000+07:00'
  assert.deepEqual(occurrencePayload(startsAt, 'DONE'), { occurrence_at: startsAt, status: 'DONE' })
  assert.deepEqual(occurrencePayload(startsAt, 'SKIPPED'), { occurrence_at: startsAt, status: 'SKIPPED' })
  assert.deepEqual(occurrencePayload(startsAt), { occurrence_at: startsAt })
})

test('occurrence actions and all reminder statuses use clear Vietnamese labels', () => {
  assert.equal(occurrenceActionMode(), 'SET')
  assert.equal(occurrenceActionMode('SCHEDULED'), 'SET')
  assert.equal(occurrenceActionMode('DONE'), 'UNDO')
  assert.equal(occurrenceActionMode('SKIPPED'), 'UNDO')
  assert.deepEqual(['SCHEDULED', 'DONE', 'SKIPPED', 'CANCELLED'].map(calendarStatusLabel), ['Đã lên lịch', 'Đã làm', 'Đã bỏ qua', 'Đã hủy'])
})

test('medical-record reminder uses the record endpoint and documented defaults', async () => {
  const defaults = medicalRecordReminderDefaults('2026-10-01T02:00:00Z', new Date('2026-10-02T00:00:00Z'))
  assert.equal(defaults.type, 'FOLLOW_UP')
  assert.equal(defaults.remindMinutesBefore, 1440)
  const payload = medicalRecordReminderPayload({ ...defaults, remindEnabled: true })
  assert.deepEqual(Object.keys(payload).sort(), ['remind_minutes_before', 'starts_at', 'type'])
  const overdue = medicalRecordReminderDefaults('2025-01-01T02:00:00Z', new Date('2026-10-02T10:00:00'))
  const tomorrow = new Date(overdue.startsAtLocal)
  assert.equal(tomorrow.getHours(), 9)
  assert.equal(tomorrow.getDate(), 3)
  const api = await readFile(new URL('../src/features/calendar/api/calendar-api.ts', import.meta.url), 'utf8')
  assert.match(api, /`\/medical-records\/\$\{encodeURIComponent\(recordId\)\}\/reminders`/)
})

test('calendar and notification API modules expose every required endpoint', async () => {
  const calendar = await readFile(new URL('../src/features/calendar/api/calendar-api.ts', import.meta.url), 'utf8')
  const notifications = await readFile(new URL('../src/features/notifications/api/notifications-api.ts', import.meta.url), 'utf8')
  for (const endpoint of ['/calendar/reminders', '/occurrences', '/medical-records/', '/reminders']) assert.ok(calendar.includes(endpoint))
  assert.match(notifications, /buildNotificationsPath\(cursor, unreadOnly\)/)
  assert.match(notifications, /`\/notifications\/\$\{encodeURIComponent\(id\)\}\/read`/)
  assert.match(notifications, /'\/notifications\/read-all'/)
})

test('notification cursor stays opaque, appends on load more, and resets on refresh', () => {
  const cursor = 'opaque+/= cursor'
  assert.equal(new URL(buildNotificationsPath(cursor), 'https://nutrimom.test').searchParams.get('cursor'), cursor)
  const first = notificationPageState(resetNotificationState(), { items: [{ id: '1', type: 'SYSTEM', title: 'A', body: 'A', created_at: '2026-10-01T00:00:00Z' }], next_cursor: cursor, has_more: true }, true)
  const second = notificationPageState(first, { items: [{ id: '2', type: 'SYSTEM', title: 'B', body: 'B', created_at: '2026-09-30T00:00:00Z' }], has_more: false }, false)
  assert.deepEqual(second.items.map((item) => item.id), ['1', '2'])
  assert.deepEqual(resetNotificationState(), { items: [], nextCursor: undefined, hasMore: true })
})

test('notification loading waits until authentication is resolved and the bell is open', () => {
  assert.equal(notificationLoadingEnabled('loading', true), false)
  assert.equal(notificationLoadingEnabled('anonymous', true), false)
  assert.equal(notificationLoadingEnabled('authenticated', false), false)
  assert.equal(notificationLoadingEnabled('authenticated', true), true)
})

test('notification response normalization renders items, accepts empty pages, and rejects a broken contract', () => {
  const item = { id: 'n1', type: 'SYSTEM', title: 'Lịch mới', body: 'Bạn có lịch mới', created_at: '2026-10-02T00:00:00Z' }
  assert.deepEqual(normalizeNotificationPage({ items: [item], next_cursor: 'opaque+/=', has_more: true }), { items: [item], next_cursor: 'opaque+/=', has_more: true })
  assert.deepEqual(normalizeNotificationPage({ items: [], has_more: false }), { items: [], has_more: false })
  assert.deepEqual(normalizeNotificationPage({ items: [null, item, { id: 'broken' }], has_more: false }).items, [item])
  assert.throws(() => normalizeNotificationPage({ has_more: false }), NotificationContractError)
  assert.throws(() => normalizeNotificationPage({ items: [], has_more: 'false' }), NotificationContractError)
})

test('notification request coordinator survives Strict Mode replay, deduplicates, and rejects stale results', () => {
  const coordinator = createNotificationRequestCoordinator()
  const first = coordinator.start('first-page')
  assert.equal(coordinator.canStart('first-page'), false)
  coordinator.cleanup()
  coordinator.setup()
  assert.equal(coordinator.canStart('first-page'), true)
  const second = coordinator.start('first-page')
  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(second), true)
  assert.equal(coordinator.finish(first), false)
  assert.equal(coordinator.finish(second), true)
})

test('notification read mutations commit only after API success', async () => {
  let commits = 0
  await commitNotificationAction(async () => 'ok', () => true, () => { commits += 1 })
  assert.equal(commits, 1)
  await assert.rejects(commitNotificationAction(async () => { throw new Error('API failed') }, () => true, () => { commits += 1 }))
  assert.equal(commits, 1)
  await commitNotificationAction(async () => 'stale', () => false, () => { commits += 1 })
  assert.equal(commits, 1)
})

test('notification mutations deduplicate per id while read and read-all remain safely concurrent', async () => {
  const coordinator = createNotificationMutationCoordinator()
  let readCalls = 0
  let readAllCalls = 0
  let finishRead!: (value: string) => void
  let finishReadAll!: (value: number) => void
  const readRequest = () => { readCalls += 1; return new Promise<string>((resolve) => { finishRead = resolve }) }
  const readAllRequest = () => { readAllCalls += 1; return new Promise<number>((resolve) => { finishReadAll = resolve }) }
  const first = coordinator.runRead('n1', readRequest)
  const duplicate = coordinator.runRead('n1', readRequest)
  const all = coordinator.runReadAll(readAllRequest)
  const duplicateAll = coordinator.runReadAll(readAllRequest)
  assert.equal(readCalls, 1)
  assert.equal(readAllCalls, 1)
  finishRead('read')
  finishReadAll(0)
  assert.deepEqual(await Promise.all([first, duplicate, all, duplicateAll]), ['read', 'read', 0, 0])
  await coordinator.runRead('n1', async () => { readCalls += 1; return 'retried' })
  assert.equal(readCalls, 2)
})

test('read and read-all update local notification state only after callers receive API success', () => {
  const state = notificationPageState(resetNotificationState(), { items: [{ id: '1', type: 'SYSTEM', title: 'A', body: 'A', created_at: '2026-10-01T00:00:00Z' }], has_more: false }, true)
  const read = markNotificationRead(state, '1', '2026-10-02T00:00:00Z')
  assert.equal(read.items[0].read_at, '2026-10-02T00:00:00Z')
  assert.equal(markAllNotificationsRead(state, '2026-10-03T00:00:00Z').items[0].read_at, '2026-10-03T00:00:00Z')
})

test('deep-link adapter allows only known app routes', () => {
  assert.equal(adaptDeepLink('nutrimom://calendar/reminders/a/b').path, undefined)
  assert.equal(adaptDeepLink('nutrimom://calendar/reminders/r1').path, '/app?reminder=r1#calendar')
  assert.equal(adaptDeepLink('nutrimom://medical-records/m1').path, '/app/profile/records?record=m1')
  assert.equal(adaptDeepLink('nutrimom://consultations/c1').path, '/app/consultations/history?request=c1')
  assert.equal(adaptDeepLink('nutrimom://contact-requests/q1').path, '/app/profile/support?request=q1')
  assert.equal(adaptDeepLink('nutrimom://family/tasks/t1').path, '/app/family?tab=tasks&task=t1')
  assert.equal(adaptDeepLink('https://malicious.test').path, undefined)
})

test('dashboard greeting follows pregnancy and no-pregnancy contracts', () => {
  assert.deepEqual(dashboardGreeting({ profile_summary: { display_name: 'An', salutation: 'chị', role: 'MOM' }, pregnancy_summary: { id: 'p', status: 'ACTIVE', gestational_week: 20, gestational_day: 3, trimester: 2, days_until_due: 100, calculation_source: 'LMP', version: 1 } }), { title: 'Chào mẹ An', subtitle: 'Hiện tại bé đã được 20 tuần 3 ngày.' })
  assert.deepEqual(dashboardGreeting({ profile_summary: { display_name: 'Nguyễn Bé Cò', salutation: 'chị', role: 'USER' } }), { title: 'Chào chị, Nguyễn Bé Cò', subtitle: 'Chúc chị một ngày mới an lành.' })
})

test('overview routes and navbar no longer expose a second calendar implementation or Trang chủ label', async () => {
  const router = await readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8')
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  const page = await readFile(new URL('../src/features/user/pages/AppHomePage.tsx', import.meta.url), 'utf8')
  assert.match(router, /path="dashboard" element=\{<Navigate to="\/app" replace \/>\}/)
  assert.match(router, /path="calendar" element=\{<Navigate to="\/app#calendar" replace \/>\}/)
  assert.match(navbar, />Tổng quan<\/NavLink>/)
  assert.doesNotMatch(navbar, />Trang chủ<\/NavLink>/)
  assert.match(page, /<CalendarOverview/)
  assert.doesNotMatch(page, /mock|demo events/i)
})

test('calendar controls stay aligned, shared selects are styled, and the overview uses the available width', async () => {
  const calendar = await readFile(new URL('../src/features/calendar/components/CalendarOverview.tsx', import.meta.url), 'utf8')
  const timelines = await readFile(new URL('../src/features/calendar/components/CalendarTimelineViews.tsx', import.meta.url), 'utf8')
  const calendarStyles = await readFile(new URL('../src/features/calendar/styles/calendar.css', import.meta.url), 'utf8')
  const select = await readFile(new URL('../src/components/ui/animated-select.tsx', import.meta.url), 'utf8')
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  assert.match(calendar, /calendar-header-actions[^]*calendar-view-tabs[^]*calendar-create-button/)
  assert.match(calendar, /calendar-view-mobile[^]*AnimatedSelect/)
  assert.match(select, /import '\.\/animated-select\.css'/)
  assert.match(calendarStyles, /\.nm-overview-page \{ width: 100%/)
  assert.match(calendarStyles, /\.nm-overview-hero-band \{ background:/)
  assert.doesNotMatch(calendarStyles, /100vw/)
  assert.match(calendarStyles, /\.calendar-month-grid button \{[^]*border-right: 1px solid var\(--border\)/)
  assert.match(timelines, /length: 24/)
  assert.match(timelines, /length: 7/)
  assert.match(timelines, /event\.date === date && hourFor\(event\) === hour/)
  assert.match(calendar, /view === 'WEEK' \? <CalendarWeekView[^]*view === 'DAY' \? <CalendarDayView/)
  assert.match(navbar, /aria-label="NutriMom - Tổng quan"/)
  assert.doesNotMatch(navbar, /<span>NutriMom<\/span>/)
})

test('calendar action success never fires on API failure', async () => {
  let success = 0
  await assert.rejects(runCalendarAction(async () => { throw new Error('failed') }, () => { success += 1 }))
  assert.equal(success, 0)
  await runCalendarAction(async () => 'saved', () => { success += 1 })
  assert.equal(success, 1)
})

test('calendar toast uses a four-second timer and cancels it on cleanup', () => {
  let delay = 0
  let handler: (() => void) | undefined
  let cancelled = 0
  let closed = 0
  const cleanup = scheduleCalendarToastDismiss(
    () => { closed += 1 },
    (next, timeout) => { handler = next; delay = timeout; return 27 },
    (timer) => { cancelled = timer },
  )
  assert.equal(CALENDAR_TOAST_DURATION, 4000)
  assert.equal(delay, 4000)
  handler?.()
  assert.equal(closed, 1)
  cleanup()
  assert.equal(cancelled, 27)
})

test('calendar dialog exposes contextual occurrence actions and a unified management group', async () => {
  const dialog = await readFile(new URL('../src/features/calendar/components/CalendarEventDialog.tsx', import.meta.url), 'utf8')
  assert.match(dialog, /occurrenceMode === 'SET'[^]*Đánh dấu đã làm[^]*Bỏ qua lần này/)
  assert.match(dialog, /occurrenceMode === 'UNDO'[^]*Hoàn tác đánh dấu/)
  assert.doesNotMatch(dialog, />Bỏ đánh dấu</)
  assert.match(dialog, /calendar-management-actions[^]*>Sửa<[^]*>Xóa lịch</)
})
