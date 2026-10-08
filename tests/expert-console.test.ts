import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { authenticatedDestination, isExpertUser } from '../src/features/auth/model/role-routing.ts'
import { expertActionErrorMessage, REQUEST_ALREADY_CLAIMED_MESSAGE, SLOT_UNAVAILABLE_MESSAGE } from '../src/features/expert-console/model/expert-console-errors.ts'
import { mapConsultation, mapDaySchedule, mapDaySummary, mapExpertProfile, mapPage, mapReview, mapScheduleSlot } from '../src/features/expert-console/model/expert-console-mappers.ts'
import { buildConsultationQuery, buildReviewQuery, toQueryString } from '../src/features/expert-console/model/expert-console-query.ts'
import { sortConsultationsNewestFirst } from '../src/features/expert-console/model/expert-console-time.ts'
import { createExpertReadCoordinator } from '../src/features/expert-console/model/expert-read-coordinator.ts'
import type { Consultation } from '../src/features/expert-console/model/expert-console-types.ts'
import type { User } from '../src/features/auth/model/auth-types.ts'

function user(roles: string[]): User {
  return { id: 'user-1', phone: '0900000000', displayName: 'Test', role: roles[0] || 'USER', roles, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' }
}

function consultation(id: string, date: string | null, startTime: string, createdAt: string): Consultation {
  return {
    id, userId: 'user-1', userDisplayName: 'Nguyễn Mai', specialty: 'HEALTH', assignmentType: 'DIRECT',
    status: 'PENDING_CONSULTATION', slot: date ? { id: `slot-${id}`, date, startTime, endTime: '13:00' } : null,
    note: null, completedAt: null, createdAt,
  }
}

test('routes EXPERT and legacy DOCTOR personas exclusively to the expert console', () => {
  assert.equal(isExpertUser(user(['EXPERT'])), true)
  assert.equal(isExpertUser(user(['DOCTOR'])), true)
  assert.equal(isExpertUser(user(['USER'])), false)
  assert.equal(authenticatedDestination(user(['EXPERT'])), '/expert')
  assert.equal(authenticatedDestination(user(['DOCTOR'])), '/expert')
  assert.equal(authenticatedDestination(user(['ADMIN', 'EXPERT'])), '/admin')
  assert.equal(authenticatedDestination(user(['USER']), 'PROFILE_REQUIRED'), '/onboarding/profile')
})

test('serializes exact expert filters', () => {
  assert.equal(toQueryString({ date: '2026-10-05' }), '?date=2026-10-05')
  assert.equal(toQueryString({ from: '2026-10-05', to: '2026-11-04' }), '?from=2026-10-05&to=2026-11-04')
  assert.equal(buildConsultationQuery({ type: 'assigned', status: 'COMPLETED', from: '2026-09-01', to: '2026-09-30', query: '  An  ', page: 2, pageSize: 10 }), '?type=assigned&status=COMPLETED&from=2026-09-01&to=2026-09-30&q=An&page=2&pageSize=10')
  assert.equal(buildReviewQuery({ rating: 5, hasComment: true, sort: 'rating_desc', page: 1, pageSize: 10 }), '?rating=5&sort=rating_desc&has_comment=true&page=1&pageSize=10')
})

test('maps schedule, optional booking, summary, and consultation responses', () => {
  const profile = mapExpertProfile({ user_id: 'expert-1', phone: '0900000001', full_name: 'BS An', specialty: 'OBSTETRICS', title: 'Bác sĩ', workplace: null, years_of_experience: 8, bio: null, avatar_key: null, avatar_url: null, status: 'ACTIVE', average_rating: 4.8, rating_count: 12, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
  assert.equal(profile.averageRating, 4.8)
  assert.equal(profile.workplace, null)

  assert.deepEqual(mapScheduleSlot({ start_time: '08:00:00', end_time: '08:30:00', state: 'OPEN', past: false }), {
    startTime: '08:00', endTime: '08:30', state: 'OPEN', past: false, booking: null,
  })
  const schedule = mapDaySchedule({
    date: '2026-10-05', day_off: false, has_bookings: true,
    slots: [{ start_time: '09:00:00', end_time: '09:30:00', state: 'BOOKED', past: false, booking: { request_id: 'request-1', user_display_name: null } }],
  })
  assert.equal(schedule.hasBookings, true)
  assert.deepEqual(schedule.slots[0].booking, { requestId: 'request-1', userDisplayName: null })
  assert.deepEqual(mapDaySummary({ date: '2026-10-05', open_count: 22, booked_count: 1, closed_count: 1, day_off: false }), {
    date: '2026-10-05', openCount: 22, bookedCount: 1, closedCount: 1, dayOff: false,
  })

  const consultation = mapConsultation({ id: 'request-1', user_id: 'user-1', user_display_name: null, expert_user_id: 'expert-1', expert_name: 'BS An', specialty: 'OBSTETRICS', assignment_type: 'RANDOM', status: 'PENDING_CONSULTATION', slot: { id: 'slot-1', slot_date: '2026-09-25', start_time: '08:00:00', end_time: '08:30:00' }, note: 'Tư vấn dinh dưỡng', reviewed: false, can_review: false, completed_at: null, version: 1, created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z' })
  assert.equal(consultation.userDisplayName, null)
  assert.equal(consultation.slot?.id, 'slot-1')

  const page = mapPage({ items: [{ id: 'review-1', request_id: 'request-1', user_id: 'user-1', user_display_name: '  Nguyễn Mai  ', expert_user_id: 'expert-1', rating: 5, comment: null, created_at: '2026-09-25T00:00:00Z' }], page: 1, page_size: 10, total_items: 31, total_pages: 4 }, mapReview)
  assert.equal(page.totalItems, 31)
  assert.equal(page.items[0].comment, null)
  assert.equal(page.items[0].userDisplayName, 'Nguyễn Mai')
})

test('expert appointments are copied and ordered by latest slot before rendering', () => {
  const original = [
    consultation('old', '2026-10-08', '08:00', '2026-10-07T01:00:00Z'),
    consultation('unscheduled', null, '', '2026-10-08T06:00:00Z'),
    consultation('new', '2026-10-08', '12:30', '2026-10-07T02:00:00Z'),
  ]
  assert.deepEqual(sortConsultationsNewestFirst(original).map((item) => item.id), ['new', 'old', 'unscheduled'])
  assert.deepEqual(original.map((item) => item.id), ['old', 'unscheduled', 'new'])
})

test('expert read coordinator shares duplicate loads and blocks all reads during a 429 cooldown', async () => {
  let now = 1_000
  let calls = 0
  const coordinator = createExpertReadCoordinator(30_000, () => now)
  const request = async () => { calls += 1; return 'ok' }
  assert.deepEqual(await Promise.all([coordinator.run('same', request), coordinator.run('same', request)]), ['ok', 'ok'])
  assert.equal(calls, 1)

  let limitedCalls = 0
  await assert.rejects(coordinator.run('limited', async () => {
    limitedCalls += 1
    throw new ApiClientError(429, { code: 'REQUEST_FAILED', message: 'Too many requests' }, 5_000)
  }), ApiClientError)
  assert.equal(coordinator.isCoolingDown(), true)
  assert.equal(coordinator.remainingMs(), 5_000)
  await assert.rejects(coordinator.run('another-key', async () => { limitedCalls += 1; return 'blocked' }), ApiClientError)
  assert.equal(limitedCalls, 1)

  now += 5_000
  assert.equal(await coordinator.run('another-key', async () => { limitedCalls += 1; return 'allowed' }), 'allowed')
  assert.equal(limitedCalls, 2)
})

test('prioritizes validation fields and preserves conflict messages', () => {
  const validation = new ApiClientError(422, { code: 'VALIDATION_ERROR', message: 'Thông báo server', fields: { start_time: 'Giờ bắt đầu không hợp lệ.' } })
  assert.equal(expertActionErrorMessage(validation), 'Giờ bắt đầu không hợp lệ.')
  const serverOnly = new ApiClientError(409, { code: 'INVALID_CONSULTATION_STATE', message: 'Buổi tư vấn đã hoàn tất.' })
  assert.equal(expertActionErrorMessage(serverOnly), 'Buổi tư vấn đã hoàn tất.')
  assert.equal(SLOT_UNAVAILABLE_MESSAGE, 'Khung giờ này không còn khả dụng. Vui lòng chọn khung giờ khác.')
  assert.equal(REQUEST_ALREADY_CLAIMED_MESSAGE, 'Yêu cầu này vừa được chuyên gia khác tiếp nhận.')
})

test('expert API uses schedule endpoints and date-time payloads without legacy slot calls', async () => {
  const api = await readFile(new URL('../src/features/expert-console/api/expert-console-api.ts', import.meta.url), 'utf8')
  for (const endpoint of ['/expert/me', '/expert/schedule', '/expert/schedule/summary', '/expert/schedule/slot', '/expert/schedule/day-off', '/expert/consultation-requests', '/expert/reviews']) {
    assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')))
  }
  assert.match(api, /method: 'PUT', body: JSON\.stringify\(\{ slot_date: date, start_time: toApiSlotTime\(startTime\), closed \}\)/)
  assert.match(api, /JSON\.stringify\(\{ slot_date: date, day_off: dayOff \}\)/)
  assert.match(api, /JSON\.stringify\(\{ slot_date: date, start_time: toApiSlotTime\(startTime\) \}\)/)
  assert.doesNotMatch(api, /expert\/slots|slot_id/)
  assert.match(api, /scheduleSummary\(today, today, signal\)/)
  assert.match(api, /expertReadCoordinator\.run/)
})

test('WorkSchedulePanel implements controlled ReUI switches and safe optimistic updates', async () => {
  const [panel, switchSource, page] = await Promise.all([
    readFile(new URL('../src/features/expert-console/components/WorkSchedulePanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ui/switch.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/pages/ExpertDashboardPage.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(page, /label: 'Lịch làm việc'/)
  assert.match(page, /<WorkSchedulePanel/)
  assert.match(panel, /checked=\{schedule\.dayOff\}/)
  assert.match(panel, /checked=\{slot\.state === 'OPEN'\}/)
  assert.match(panel, /onCheckedChange=\{\(checked\) => void toggleSlot\(slot, checked\)\}/)
  assert.match(panel, /const original = slot[^]*replaceSlot\(optimistic\)[^]*catch \(error\)[^]*replaceSlot\(original\)/)
  assert.match(panel, /slot\.state === 'BOOKED' \? <div className="expert-booked-slot"/)
  assert.match(panel, /if \(checked\) setConfirmDayOff\(true\)/)
  assert.match(panel, /schedule\.hasBookings \? 'Ngày này đang có lịch đã đặt\./)
  assert.match(panel, /isExpertApiError\(error, 'SLOT_UNAVAILABLE'\)[^]*scheduleResource\.reload\(\)/)
  assert.match(switchSource, /data-checked:bg-\[#34c759\]/)
  assert.match(switchSource, /data-unchecked:bg-\[#aaa6b0\]/)
  assert.match(switchSource, /bg-white/)
  assert.match(switchSource, /focus-visible:ring/)
})

test('RANDOM acceptance selects only OPEN schedule slots and handles concurrency', async () => {
  const requests = await readFile(new URL('../src/features/expert-console/components/RequestsPanel.tsx', import.meta.url), 'utf8')
  assert.match(requests, /expertConsoleApi\.scheduleSummary\(minDate, maxDate, signal\)/)
  assert.match(requests, /expertConsoleApi\.schedule\(selectedDate, signal\)/)
  assert.match(requests, /slot\.state === 'OPEN' && !slot\.past && !schedule\?\.dayOff/)
  assert.match(requests, /acceptConsultation\(target\.id, targetDate, selectedStartTime\)/)
  assert.match(requests, /SLOT_UNAVAILABLE[^]*setSelectedStartTime\(null\)[^]*scheduleResource\.reload\(\)/)
  assert.match(requests, /REQUEST_ALREADY_CLAIMED[^]*setAccepting\(null\)/)
  assert.match(requests, /Bạn chưa có khung giờ có thể nhận lịch\./)
  assert.match(requests, /section: 'slots'/)
})

test('completion confirmation uses the green loading treatment from user support', async () => {
  const [schedule, css] = await Promise.all([
    readFile(new URL('../src/features/expert-console/components/SchedulePanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/styles/expert-console.css', import.meta.url), 'utf8'),
  ])
  assert.match(schedule, /runAsyncAction\(\{/)
  assert.match(schedule, /minimumMs: 2000/)
  assert.match(schedule, /className="nm-stateful-spinner"/)
  assert.match(schedule, /className="expert-button expert-complete-trigger"/)
  assert.match(schedule, /className="expert-button expert-complete-confirm"/)
  assert.match(schedule, /aria-busy=\{completingId === confirming\.id\}/)
  assert.match(css, /\.expert-button\.expert-complete-confirm[^}]*background: #34c759/)
})

test('expert console keeps accessible dialogs, reduced motion, refresh, and API boundaries', async () => {
  const [guards, router, provider, ui, page, css, sharedDialog, api, allExpertSources] = await Promise.all([
    readFile(new URL('../src/app/routing/RouteGuards.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/providers/AuthProvider.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/ExpertUI.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/pages/ExpertDashboardPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/styles/expert-console.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/shared/components/AccessibleDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/api/expert-console-api.ts', import.meta.url), 'utf8'),
    Promise.all(['ExpertUI.tsx', 'OverviewPanel.tsx', 'RequestsPanel.tsx', 'ReviewsPanel.tsx', 'SchedulePanel.tsx', 'WorkSchedulePanel.tsx'].map((name) => readFile(new URL(`../src/features/expert-console/components/${name}`, import.meta.url), 'utf8'))),
  ])
  assert.match(guards, /export function ExpertOnly/)
  assert.match(guards, /isExpertUser\(user\)/)
  assert.match(router, /path="expert" element=\{<ExpertOnly>/)
  assert.match(provider, /!isAdminUser\(currentUser\) && !isExpertUser\(currentUser\)/)
  assert.match(ui, /<AccessibleDialog/)
  assert.match(sharedDialog, /aria-modal="true"/)
  assert.match(sharedDialog, /aria-busy=\{busy\}/)
  assert.match(sharedDialog, /restoreDialogFocus\(opener\)/)
  assert.match(ui, /role=\{toast\.tone === 'error' \? 'alert' : 'status'\}/)
  assert.match(page, /useReducedMotion/)
  assert.match(page, /visibilitychange/)
  assert.match(page, /window\.addEventListener\('focus'/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /:root\[data-theme="dark"\]/)
  assert.doesNotMatch(api, /\bfetch\s*\(/)
  for (const source of allExpertSources) {
    assert.doesNotMatch(source, /\bfetch\s*\(/)
    assert.doesNotMatch(source, /mock data|mockData/i)
  }
})

test('expert filters animate both directions and date icons follow the active theme', async () => {
  const [ui, schedule, requests, css] = await Promise.all([
    readFile(new URL('../src/features/expert-console/components/ExpertUI.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/SchedulePanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/RequestsPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/styles/expert-console.css', import.meta.url), 'utf8'),
  ])
  assert.match(ui, /export function ExpertSelect/)
  assert.match(ui, /<AnimatePresence initial=\{false\}>/)
  assert.match(ui, /initial=.*opacity: 0, y: -7, scaleY: 0\.9/)
  assert.match(ui, /exit=.*opacity: 0, y: -7, scaleY: 0\.9/)
  assert.match(ui, /export function ExpertDateField/)
  assert.match(ui, /<CalendarBlank className="expert-date-field-icon"/)
  assert.match(schedule, /<ExpertSelect label="Trạng thái"/)
  assert.match(requests, /<ExpertSelect label="Trạng thái"/)
  assert.match(css, /\.expert-date-field-icon[^}]*color: currentColor/)
  assert.match(css, /\.expert-date-field input[^}]*color-scheme: light/)
  assert.match(css, /:root\[data-theme="dark"\] \.expert-date-field input[^}]*color-scheme: dark/)
})

test('request totals and dashboard metrics come from the expert APIs', async () => {
  const [api, overview, requests, page] = await Promise.all([
    readFile(new URL('../src/features/expert-console/api/expert-console-api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/OverviewPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/RequestsPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/pages/ExpertDashboardPage.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(api, /consultations\(\{ type: 'pool', page: 1, pageSize: 1 \}/)
  assert.match(api, /scheduleSummary\(today, today, signal\)/)
  assert.match(api, /upcomingConsultations: assigned\.totalItems/)
  assert.match(overview, /\{overview\?\.openToday \?\? 0\} slot/)
  assert.match(overview, /formatDate\(overview\.today\)/)
  assert.match(overview, /profile\?\.ratingCount \? profile\.averageRating\.toFixed\(1\)/)
  assert.match(requests, /Đã được giao <span>\{assignedTotal\}<\/span>/)
  assert.match(requests, /Đang chờ nhận <span>\{poolTotal\}<\/span>/)
  assert.match(page, /overview\.data\?\.upcomingConsultations/)
  assert.match(page, /aria-label=\{`\$\{count\} yêu cầu đã được giao`\}/)
})

test('expert sidebar profile is fully interactive and opens the read-only accessible dialog', async () => {
  const [page, dialog, css] = await Promise.all([
    readFile(new URL('../src/features/expert-console/pages/ExpertDashboardPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/ExpertProfileDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/styles/expert-console.css', import.meta.url), 'utf8'),
  ])
  assert.match(page, /className="expert-sidebar-profile" role="button" tabIndex=\{0\}[^]*onClick=\{openProfile\}/)
  assert.match(page, /function openProfile\(\)[^]*setProfileOpen\(true\)[^]*profile\.reload\(\)/)
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, />Đóng<\/button>/)
  assert.doesNotMatch(dialog, /avatarKey|version|Cập nhật|Chỉnh sửa/)
  assert.match(css, /\.expert-sidebar-profile:hover/)
  assert.match(css, /\.expert-sidebar-profile:focus-visible/)
})

test('review list uses display names, filtered totalItems, and an accessible detail dialog', async () => {
  const [panel, mapper, dto] = await Promise.all([
    readFile(new URL('../src/features/expert-console/components/ReviewsPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/model/expert-console-mappers.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/model/expert-console-dto.ts', import.meta.url), 'utf8'),
  ])
  assert.match(dto, /user_display_name\?: string \| null/)
  assert.match(mapper, /userDisplayName: dto\.user_display_name\?\.trim\(\) \|\| null/)
  assert.match(panel, /review\.userDisplayName \|\| 'Người dùng'/)
  assert.doesNotMatch(panel, /review\.userId\.slice/)
  assert.match(panel, /<strong>\{resource\.data\.totalItems\}<\/strong> kết quả phù hợp/)
  assert.match(panel, /role="button" tabIndex=\{0\} aria-haspopup="dialog"/)
  assert.match(panel, /<AccessibleDialog[^]*Mã buổi tư vấn/)
  assert.match(panel, /review_comment: event\.target\.checked \? 'true' : undefined/)
})
