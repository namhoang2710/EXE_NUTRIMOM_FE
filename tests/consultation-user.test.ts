import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { runConsultationSubmission } from '../src/features/consultation/model/consultation-flow.ts'
import { canCancelConsultation, canReviewConsultation } from '../src/features/consultation/model/consultation-formatters.ts'
import { mapConsultationRequest, mapDayAvailability, serializeConsultationReview, serializeDirectConsultation, serializeRandomConsultation } from '../src/features/consultation/model/consultation-mappers.ts'
import { buildAvailabilityQuery, buildConsultationListQuery } from '../src/features/consultation/model/consultation-query.ts'
import { consultationHorizon, generateSlotStartTimes, normalizeSlotTime, slotEndTime, toApiSlotTime, unavailableReasonLabel, vietnamToday } from '../src/features/consultation/model/slot-grid.ts'
import { normalizeConsultationRating } from '../src/features/consultation/model/consultation-rating.ts'
import { mapExpertDetail } from '../src/features/experts/model/expert-mappers.ts'

const baseDto = {
  id: 'request-1',
  user_id: 'user-1',
  user_display_name: 'Nguyễn Mai',
  expert_user_id: 'expert-1',
  expert_name: 'BS An',
  specialty: 'OBSTETRICS' as const,
  assignment_type: 'DIRECT' as const,
  status: 'PENDING_CONSULTATION' as const,
  slot: { id: 'slot-1', slot_date: '2026-09-28', start_time: '09:00:00', end_time: '09:30:00' },
  note: 'Tư vấn thai kỳ',
  reviewed: false,
  can_review: true,
  completed_at: null,
  version: 2,
  created_at: '2026-09-27T01:00:00Z',
  updated_at: '2026-09-27T02:00:00Z',
}

test('maps the complete consultation DTO from snake_case to camelCase', () => {
  const result = mapConsultationRequest(baseDto)
  assert.equal(result.userDisplayName, 'Nguyễn Mai')
  assert.equal(result.expertUserId, 'expert-1')
  assert.equal(result.assignmentType, 'DIRECT')
  assert.equal(result.slot?.startTime, '09:00:00')
  assert.equal(result.canReview, true)
  assert.equal(result.createdAt, '2026-09-27T01:00:00Z')
  assert.equal('can_review' in result, false)
})

test('uses pageSize, never page_size, in the consultation list query', () => {
  const query = buildConsultationListQuery(3, 20)
  assert.equal(query, '?page=3&pageSize=20')
  assert.equal(query.includes('page_size'), false)
})

test('serializes exact direct, random, and review payload contracts', () => {
  assert.deepEqual(serializeDirectConsultation({ expertUserId: 'expert-1', date: '2026-10-05', startTime: '09:00', note: '  Cần tư vấn  ' }), {
    assignment_type: 'DIRECT', expert_user_id: 'expert-1', slot_date: '2026-10-05', start_time: '09:00:00', note: 'Cần tư vấn',
  })
  assert.deepEqual(serializeRandomConsultation({ specialty: 'HEALTH', note: '  ' }), {
    assignment_type: 'RANDOM', specialty: 'HEALTH',
  })
  assert.deepEqual(serializeConsultationReview({ rating: 5, comment: '  Rất tận tâm  ' }), {
    rating: 5, comment: 'Rất tận tâm',
  })
})

test('maps full-day availability and preserves unavailable reasons', () => {
  const result = mapDayAvailability({
    date: '2026-10-05',
    day_off: false,
    slots: [
      { start_time: '08:00:00', end_time: '08:30:00', available: true },
      { start_time: '08:30:00', end_time: '09:00:00', available: false, reason: 'BOOKED' },
    ],
  })
  assert.deepEqual(result, {
    date: '2026-10-05',
    dayOff: false,
    slots: [
      { startTime: '08:00', endTime: '08:30', available: true },
      { startTime: '08:30', endTime: '09:00', available: false, reason: 'BOOKED' },
    ],
  })
})

test('shared slot grid creates the exact 30-minute Vietnam booking horizon', () => {
  const slots = generateSlotStartTimes()
  assert.equal(slots.length, 24)
  assert.equal(slots[0], '08:00')
  assert.equal(slots.at(-1), '19:30')
  assert.equal(slotEndTime('19:30'), '20:00')
  assert.equal(normalizeSlotTime('08:00:00'), '08:00')
  assert.equal(toApiSlotTime('08:00'), '08:00:00')
  assert.equal(unavailableReasonLabel('PAST'), 'Đã qua')
  assert.equal(unavailableReasonLabel('DAY_OFF'), 'Nghỉ cả ngày')
  assert.equal(unavailableReasonLabel('BOOKED'), 'Đã kín')
  assert.equal(unavailableReasonLabel('CLOSED'), 'Đã đóng')
  const now = new Date('2026-09-28T17:30:00.000Z')
  assert.equal(vietnamToday(now), '2026-09-29')
  assert.deepEqual(consultationHorizon(now), { minDate: '2026-09-29', maxDate: '2026-10-29' })
  assert.equal(slots.every((start, index) => index === slots.length - 1 || slotEndTime(start) === slots[index + 1]), true)
  assert.equal(buildAvailabilityQuery('2026-10-05'), '?date=2026-10-05')
})

test('user booking uses availability and date-time input without legacy slot IDs', async () => {
  const [api, page, booking, grid] = await Promise.all([
    readFile(new URL('../src/features/consultation/api/consultation-api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/TimeSlotGrid.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(api, /\/availability\$\{buildAvailabilityQuery\(date\)\}/)
  assert.doesNotMatch(api, /\/slots|slot_id/)
  assert.match(page, /createDirect\(\{ expertUserId: expertId, date, startTime: selected\.startTime/)
  assert.match(page, /setSelectedStartTime\(null\)[^]*setDirectError\(SLOT_CONFLICT_MESSAGE\)[^]*loadAvailability\(\)/)
  assert.match(booking, /<DateStrip/)
  assert.match(booking, /<TimeSlotGrid/)
  assert.match(booking, /props\.availability\?\.dayOff/)
  assert.match(booking, /consultation-booking-bar/)
  assert.match(grid, /disabled=\{disabled \|\| !cell\.selectable\}/)
  assert.match(grid, /aria-pressed=\{selected\}/)
})

test('direct and random booking use the shared stateful button without false success', async () => {
  const [button, booking, page, styles, consultationStyles] = await Promise.all([
    readFile(new URL('../src/components/ui/stateful-button.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/shared/styles/product-ui.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
  ])
  assert.match(booking, /import \{ StatefulButton \} from '@\/components\/ui\/stateful-button'/)
  assert.match(booking, /onAction=\{props\.onDirectSubmit\}>Xác nhận đặt lịch<\/StatefulButton>/)
  assert.match(booking, /onAction=\{props\.onRandomSubmit\}>Gửi yêu cầu tư vấn<\/StatefulButton>/)
  assert.match(page, /const succeeded = await runConsultationSubmission/)
  assert.match(page, /onDirectSubmit=\{submitDirect\}/)
  assert.match(page, /onRandomSubmit=\{submitRandom\}/)
  assert.match(button, /succeeded = await onAction\(\) !== false/)
  assert.match(button, /if \(!succeeded\)[^]*setState\('idle'\)[^]*return/)
  assert.match(button, /setState\('success'\)[^]*setState\('idle'\)/)
  assert.match(button, /width: 20/)
  assert.match(styles, /\.nm-stateful-button[^}]*border-radius: 999px/)
  assert.match(styles, /\.nm-stateful-button[^}]*color: #fff[^}]*background: #22c55e/)
  assert.match(styles, /\.nm-stateful-button-content, \.nm-stateful-button-content > span \{ color: inherit; font-size: inherit; \}/)
  assert.match(consultationStyles, /\.consultation-booking-bar__field > span/)
  assert.doesNotMatch(consultationStyles, /\.consultation-booking-bar span \{/)
})

test('success is emitted only after the create API resolves', async () => {
  let resolveRequest!: (value: string) => void
  let success = ''
  const pending = runConsultationSubmission({
    submit: () => new Promise<string>((resolve) => { resolveRequest = resolve }),
    onSuccess: (value) => { success = value },
    onError: () => assert.fail('must not fail'),
  })
  await Promise.resolve()
  assert.equal(success, '')
  resolveRequest('created')
  assert.equal(await pending, true)
  assert.equal(success, 'created')
})

test('API failure never emits success', async () => {
  let successes = 0
  let errors = 0
  const result = await runConsultationSubmission({
    submit: async () => { throw new Error('offline') },
    onSuccess: () => { successes += 1 },
    onError: () => { errors += 1 },
  })
  assert.equal(result, false)
  assert.equal(successes, 0)
  assert.equal(errors, 1)
})

test('SLOT_UNAVAILABLE clears selection, reloads slots, and does not report success', async () => {
  let selected: string | null = 'slot-1'
  let reloads = 0
  let successes = 0
  await runConsultationSubmission({
    submit: async () => { throw new ApiClientError(409, { code: 'SLOT_UNAVAILABLE', message: 'slot taken' }) },
    onSuccess: () => { successes += 1 },
    onError: () => assert.fail('slot conflict uses its dedicated path'),
    onSlotConflict: async () => { selected = null; reloads += 1 },
  })
  assert.equal(selected, null)
  assert.equal(reloads, 1)
  assert.equal(successes, 0)
})

test('cancel and review actions are exposed only by backend-approved state', () => {
  const item = mapConsultationRequest(baseDto)
  assert.equal(canCancelConsultation(item), true)
  assert.equal(canCancelConsultation({ status: 'PENDING_EXPERT' }), true)
  assert.equal(canCancelConsultation({ status: 'COMPLETED' }), false)
  assert.equal(canCancelConsultation({ status: 'CANCELLED' }), false)
  assert.equal(canReviewConsultation(item), true)
  assert.equal(canReviewConsultation({ canReview: false }), false)
})

test('cancel and review reload the list, while direct cancel refreshes matching availability', async () => {
  const [page, history] = await Promise.all([
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/hooks/useConsultationHistory.ts', import.meta.url), 'utf8'),
  ])
  assert.match(history, /await consultationApi\.cancel\(item\.id\)[^]*load\(pageNumber\)/)
  assert.match(page, /item\.expertUserId === expertId && item\.slot\?\.date === date[^]*loadAvailability\(\)/)
  assert.match(history, /await consultationApi\.review\(reviewItem\.id[^]*await load\(pageNumber\)/)
})

test('navbar keeps consultations inside the expert booking flow', async () => {
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(navbar, /<NavLink to="\/app\/consultations"/)
  assert.match(navbar, /location\.pathname\.startsWith\('\/app\/consultations'\)/)
  assert.match(navbar, /Hướng dẫn khách hàng/)
  assert.match(navbar, /to="\/app\/experts"[^>]*>Tìm bác sĩ<\/Link>/)
  assert.match(navbar, /to="\/app\/consultations\/history"[^>]*>Lịch sử tư vấn<\/Link>/)
})

test('app navigation opens a new page at the top while preserving intentional hash targets', async () => {
  const layout = await readFile(new URL('../src/shared/layouts/AppLayout.tsx', import.meta.url), 'utf8')
  assert.match(layout, /const pathnameChanged = previous === null \|\| previous\.pathname !== location\.pathname/)
  assert.match(layout, /if \(location\.hash && \(pathnameChanged \|\| hashChanged\)\)[^]*scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/)
  assert.match(layout, /if \(pathnameChanged\) window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/)
})

test('consultation page uses the booking banner and offers a back link to experts', async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
  ])
  assert.match(page, /src="\/bannerbook\.jpg"/)
  assert.match(page, /<h1 id="consultation-banner-title">Đăng ký tư vấn<\/h1>/)
  assert.match(page, /<Link to="\/app\/experts">[^]*Quay lại danh sách chuyên gia<\/Link>/)
  assert.doesNotMatch(page, /TƯ VẤN CÙNG CHUYÊN GIA|Đặt lịch, theo dõi yêu cầu và chia sẻ đánh giá/)
  assert.match(styles, /\.consultation-banner__overlay[^]*background: rgb\(20 16 24 \/ 34%\)/)
})

test('consultation page resets inherited expert-list scroll before paint', async () => {
  const page = await readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8')
  assert.match(page, /useLayoutEffect\(\(\) => \{\s*window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)\s*\}, \[expertId\]\)/)
})

test('banner actions expose random booking and the exact expert directory target', async () => {
  const [page, actions, experts] = await Promise.all([
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ConsultationBannerActions.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/pages/ExpertsPage.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(actions, /<div className="consultation-banner-action is-phone"[^>]*>[^]*Gọi điện tổng đài[^]*<\/div>/)
  assert.match(actions, /className="consultation-banner-action is-booking"[^>]*onClick=\{onRandomBooking\}[^]*bookingActionContent/)
  assert.match(actions, /expertsTo = '\/app\/experts#expert-directory'/)
  assert.match(actions, /to=\{expertsTo\}[^]*Tìm bác sĩ/)
  assert.match(page, /function openRandomBooking\(\)[^]*setTab\('random'\)[^]*scrollIntoView/)
  assert.match(page, /<ConsultationBannerActions onRandomBooking=\{openRandomBooking\}/)
  assert.match(experts, /<section id="expert-directory"[^>]*aria-labelledby="experts-directory-title"/)
})

test('experts page replaces its old hero with the shared consultation banner', async () => {
  const [experts, expertStyles, page] = await Promise.all([
    readFile(new URL('../src/features/experts/pages/ExpertsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/pages/experts.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(experts, /className="consultation-banner"[^]*src="\/bannerbook\.jpg"/)
  assert.match(experts, /<ConsultationBannerActions randomBookingTo="\/app\/consultations\?mode=random#consultation-booking-form" expertsTo=\{`\$\{location\.pathname\}#expert-directory`\}/)
  assert.doesNotMatch(experts, /experts-hero|Đội ngũ đồng hành đáng tin cậy|Hồ sơ được xác thực|Tư vấn tận tâm/)
  assert.doesNotMatch(expertStyles, /\.experts-hero/)
  assert.match(page, /const randomMode = searchParams\.get\('mode'\) === 'random'/)
  assert.match(page, /useState<'direct' \| 'random'>\(\(\) => randomMode \? 'random' : 'direct'\)/)
})

test('selected expert rating uses the same gold as the expert directory', async () => {
  const [booking, consultationStyles, expertStyles, globalStyles] = await Promise.all([
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/pages/experts.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ])
  assert.match(booking, /className="consultation-expert-rating"><Star[^>]*weight="fill"/)
  assert.match(globalStyles, /--rating-gold: #e7a93f/)
  assert.match(consultationStyles, /--consultation-rating-gold: var\(--rating-gold\)/)
  assert.match(consultationStyles, /\.consultation-expert-meta \.consultation-expert-rating > svg \{\s*color: var\(--consultation-rating-gold\)/)
  assert.match(expertStyles, /--experts-gold: var\(--rating-gold\)/)
})

test('gold consultation action has a reduced-motion-safe border animation', async () => {
  const styles = await readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8')
  assert.match(styles, /\.consultation-banner-action\.is-booking::before[^]*conic-gradient[^]*animation: consultation-gold-border-spin 3\.6s linear infinite/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[^]*\.consultation-banner-action\.is-booking::before \{ animation: none; \}/)
})

test('consultation banner aligns with the responsive app header without extra top spacing', async () => {
  const styles = await readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8')
  assert.match(styles, /\.consultation-page \{[^}]*width: 100%;\s*margin: 0;\s*padding: 0 0 104px;/)
  assert.match(styles, /\.consultation-banner \{[^]*border-radius: 0;/)
  assert.match(styles, /\.consultation-booking-anchor \{\s*width: min\(100% - 40px, 1160px\);/)
  assert.match(styles, /@media \(max-width: 1100px\)[^]*\.consultation-booking-anchor,[^]*width: calc\(100% - 24px\);/)
  assert.doesNotMatch(styles, /\.consultation-page[^}]*padding-top:/)
})

test('dialogs and toasts expose accessible semantics', async () => {
  const [dialog, cancel, review, ratingSource, toast, booking] = await Promise.all([
    readFile(new URL('../src/shared/components/AccessibleDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/CancelConsultationDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ReviewConsultationDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/reui/rating.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ConsultationToast.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(cancel, /<AccessibleDialog/)
  assert.match(review, /<Rating rating=\{rating\}[^>]*editable/)
  assert.match(ratingSource, /role=\{editable \? 'radiogroup' : undefined\}/)
  assert.match(ratingSource, /aria-label=\{`\$\{i\} sao`\}/)
  assert.match(toast, /aria-live="polite"/)
  assert.match(toast, /role=\{toast\.tone === 'error' \? 'alert' : 'status'\}/)
  assert.match(booking, /role="tablist"/)
  assert.match(booking, /role="tabpanel"/)
})

test('ApiClientError preserves the original server message without changing the friendly message', () => {
  const error = new ApiClientError(400, { code: 'VALIDATION_ERROR', message: 'start_time không hợp lệ' })
  assert.equal(error.serverMessage, 'start_time không hợp lệ')
  assert.notEqual(error.message, error.serverMessage)
})

test('maps public expert detail and keeps bio out of the summary contract', () => {
  const detail = mapExpertDetail({
    user_id: 'expert/one', full_name: 'BS An', specialty: 'OBSTETRICS', title: 'Bác sĩ', workplace: 'Bệnh viện A',
    years_of_experience: 9, bio: '  Kinh nghiệm chăm sóc thai kỳ  ', avatar_url: null, average_rating: 4.7, rating_count: 18,
  })
  assert.equal(detail.userId, 'expert/one')
  assert.equal(detail.bio, 'Kinh nghiệm chăm sóc thai kỳ')
  assert.equal(detail.averageRating, 4.7)
  assert.equal(detail.ratingCount, 18)
})

test('public expert detail API is anonymous and encodes the user id', async () => {
  const api = await readFile(new URL('../src/features/experts/api/experts-api.ts', import.meta.url), 'utf8')
  assert.match(api, /`\/experts\/\$\{encodeURIComponent\(userId\)\}`/)
  assert.match(api, /async function detail[^]*authenticated: false/)
})

test('expert cards separate detail and booking actions for anonymous and authenticated sessions', async () => {
  const [page, card, dialog] = await Promise.all([
    readFile(new URL('../src/features/experts/pages/ExpertsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/components/ExpertCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/components/ExpertDetailDialog.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(card, /className="expert-card__detail-trigger"[^>]*type="button"[^>]*onClick=\{\(\) => onOpen\(expert\.userId\)\}/)
  assert.match(card, /event\.stopPropagation\(\); onBook\(expert\.userId\)/)
  assert.match(page, /if \(status === 'loading'\) return/)
  assert.match(page, /if \(status === 'anonymous'\)[^]*navigate\('\/login', \{ state: \{ from: bookingPath, expertUserId \} \}\)/)
  assert.match(page, /navigate\(bookingPath, \{ state: \{ expertUserId \} \}\)/)
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, /onClick=\{onBook\}/)
})

test('selected time can be toggled off and cleared from the booking bar', async () => {
  const [page, booking, styles] = await Promise.all([
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
  ])
  assert.match(page, /setSelectedStartTime\(\(current\) => current === startTime \? null : startTime\)/)
  assert.match(page, /if \(!expertId \|\| !expert \|\| directSubmitting\.current\) return false/)
  assert.match(booking, /className="consultation-clear-selection-slot"/)
  assert.match(booking, /className="consultation-clear-selection"[^>]*onClick=\{props\.onClearSelection\}[^>]*>Bỏ chọn<\/motion\.button>/)
  assert.match(booking, /function AnimatedBookingTime[^]*<AnimatePresence[^]*key=\{value\}/)
  assert.match(styles, /grid-template-columns: minmax\(110px, \.7fr\) minmax\(220px, 1fr\) minmax\(184px, auto\)/)
  assert.match(styles, /\.consultation-booking-bar\s*\{[^}]*min-height: 78px/s)
  assert.match(styles, /\.consultation-booking-bar__time\s*\{[^}]*grid-template-columns:[^;}]*86px/s)
  assert.match(page, /onClearSelection=\{\(\) => \{ setSelectedStartTime\(null\)/)
})

test('history has a protected route and shared controller links in header and account sidebar', async () => {
  const [router, navbar, account, bookingPage, historyPage] = await Promise.all([
    readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/user/layouts/AccountWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/pages/ConsultationHistoryPage.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(router, /path="app\/consultations\/history" element=\{<ProtectedRoute><AccountWorkspace \/><\/ProtectedRoute>\}[^]*<Route index element=\{<ConsultationHistoryPage \/>\}/)
  assert.match(navbar, /to="\/app\/consultations\/history"/)
  assert.match(account, /to: '\/app\/consultations\/history'[^]*label: 'Lịch sử tư vấn'/)
  assert.match(bookingPage, /<ConsultationHistorySection/)
  assert.match(historyPage, /<ConsultationHistorySection showHeading=\{false\} \/>/)
  assert.match(historyPage, /className="consultation-history-shell"/)
  assert.doesNotMatch(historyPage, /<BookingPanel/)
})

test('account sidebar nests profile under account settings and omits the pricing entry', async () => {
  const account = await readFile(new URL('../src/features/user/layouts/AccountWorkspace.tsx', import.meta.url), 'utf8')
  const settings = account.indexOf('Thiết lập tài khoản')
  const profile = account.indexOf('Hồ sơ cá nhân', settings)
  const password = account.indexOf('Mật khẩu', profile)
  const disable = account.indexOf('Vô hiệu hóa tài khoản', password)
  assert.ok(settings >= 0 && settings < profile && profile < password && password < disable)
  assert.doesNotMatch(account, /Gói dịch vụ & Bảng giá/)
})

test('ReUI rating is normalized to integer 1 through 5 and reviewed badge is gold', async () => {
  assert.equal(normalizeConsultationRating(4.6), 5)
  assert.equal(normalizeConsultationRating(0.2), 1)
  assert.equal(normalizeConsultationRating(12), 5)
  const [hook, dialog, styles] = await Promise.all([
    readFile(new URL('../src/features/consultation/hooks/useConsultationHistory.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ReviewConsultationDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
  ])
  assert.match(dialog, /<Rating rating=\{rating\} onRatingChange=\{onRatingChange\} editable/)
  assert.match(hook, /rating: normalizeConsultationRating\(rating\)/)
  assert.match(styles, /\.consultation-reviewed \{[^}]*color: var\(--rating-gold\)/)
  assert.match(dialog, /<Rating rating=\{rating\} onRatingChange=\{onRatingChange\} editable/)
})
