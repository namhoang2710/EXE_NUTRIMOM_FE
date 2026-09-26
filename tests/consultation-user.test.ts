import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { runConsultationSubmission } from '../src/features/consultation/model/consultation-flow.ts'
import { canCancelConsultation, canReviewConsultation, isSelectableConsultationSlot } from '../src/features/consultation/model/consultation-formatters.ts'
import { mapConsultationRequest, serializeConsultationReview, serializeDirectConsultation, serializeRandomConsultation } from '../src/features/consultation/model/consultation-mappers.ts'
import { buildConsultationListQuery } from '../src/features/consultation/model/consultation-query.ts'
import type { ConsultationSlot } from '../src/features/consultation/model/consultation-types.ts'

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
  assert.deepEqual(serializeDirectConsultation({ expertUserId: 'expert-1', slotId: 'slot-1', note: '  Cần tư vấn  ' }), {
    assignment_type: 'DIRECT', expert_user_id: 'expert-1', slot_id: 'slot-1', note: 'Cần tư vấn',
  })
  assert.deepEqual(serializeRandomConsultation({ specialty: 'HEALTH', note: '  ' }), {
    assignment_type: 'RANDOM', specialty: 'HEALTH',
  })
  assert.deepEqual(serializeConsultationReview({ rating: 5, comment: '  Rất tận tâm  ' }), {
    rating: 5, comment: 'Rất tận tâm',
  })
})

test('BOOKED and elapsed slots cannot be selected', () => {
  const future = new Date('2026-09-28T00:00:00Z')
  const open: ConsultationSlot = { id: '1', expertUserId: 'e', date: '2026-09-28', startTime: '09:00:00', endTime: '09:30:00', status: 'OPEN' }
  assert.equal(isSelectableConsultationSlot(open, future), true)
  assert.equal(isSelectableConsultationSlot({ ...open, status: 'BOOKED' }, future), false)
  assert.equal(isSelectableConsultationSlot({ ...open, date: '2026-09-27', startTime: '06:00:00' }, new Date('2026-09-27T01:00:01Z')), false)
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

test('cancel and review reload the list, while direct cancel can refresh matching slots', async () => {
  const page = await readFile(new URL('../src/features/consultation/pages/ConsultationsPage.tsx', import.meta.url), 'utf8')
  assert.match(page, /await consultationApi\.cancel\(cancelItem\.id\)[^]*loadConsultations\(pageNumber\)/)
  assert.match(page, /cancelItem\.expertUserId === expertId[^]*refreshes\.push\(loadSlots\(\)\)/)
  assert.match(page, /await consultationApi\.review\(reviewItem\.id[^]*await loadConsultations\(pageNumber\)/)
})

test('navbar keeps consultations inside the expert booking flow', async () => {
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(navbar, /<NavLink to="\/app\/consultations"/)
  assert.match(navbar, /location\.pathname === '\/app\/consultations'/)
  assert.match(navbar, /Hướng dẫn khách hàng/)
  assert.match(navbar, /to="\/app\/experts"[^>]*>Tìm bác sĩ<\/Link>/)
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
  const [booking, consultationStyles, expertStyles] = await Promise.all([
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/styles/consultation.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/experts/pages/experts.css', import.meta.url), 'utf8'),
  ])
  assert.match(booking, /className="consultation-expert-rating"><Star[^>]*weight="fill"/)
  assert.match(consultationStyles, /--consultation-rating-gold: #e7a93f/)
  assert.match(consultationStyles, /\.consultation-expert-meta \.consultation-expert-rating > svg \{\s*color: var\(--consultation-rating-gold\)/)
  assert.match(expertStyles, /--experts-gold: #e7a93f/)
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
  const [dialog, cancel, review, toast, booking] = await Promise.all([
    readFile(new URL('../src/shared/components/AccessibleDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/CancelConsultationDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ReviewConsultationDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ConsultationToast.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/BookingPanel.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(cancel, /<AccessibleDialog/)
  assert.match(review, /role="radiogroup"/)
  assert.match(review, /aria-label=\{`\$\{value\} sao`\}/)
  assert.match(toast, /aria-live="polite"/)
  assert.match(toast, /role=\{toast\.tone === 'error' \? 'alert' : 'status'\}/)
  assert.match(booking, /role="tablist"/)
  assert.match(booking, /role="tabpanel"/)
})

test('ApiClientError preserves the original server message without changing the friendly message', () => {
  const error = new ApiClientError(400, { code: 'VALIDATION_ERROR', message: 'slot_id không hợp lệ' })
  assert.equal(error.serverMessage, 'slot_id không hợp lệ')
  assert.notEqual(error.message, error.serverMessage)
})
