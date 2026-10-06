import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { ApiClientError } from '../src/core/api/api-error.ts'
import type { VideoRoomInfo } from '../src/features/consultation-video/api/video-api.ts'
import { VideoCooldownError, VideoRequestCoordinator } from '../src/features/consultation-video/model/request-coordinator.ts'
import { callCapabilityError, canOfferPostCallReview, effectiveRoomState, hasReachedRoomClose, nextCallTimeWarning, nextRoomBoundary, postCallPath, remainingLabel, roomPath, shouldRefreshOnForeground } from '../src/features/consultation-video/model/video-room.ts'

const info = (overrides: Partial<VideoRoomInfo> = {}): VideoRoomInfo => ({
  request_id: 'request-1', user_name: 'Mai', expert_name: 'Bác sĩ An', specialty: 'HEALTH', note: null,
  expert: false, consultation_status: 'PENDING_CONSULTATION', state: 'SCHEDULED', can_join: false, configured: true,
  opens_at: '2026-10-06T02:00:00Z', closes_at: '2026-10-06T02:30:00Z', server_time: '2026-10-06T01:00:00Z',
  ...overrides,
})

test('remaining time uses the server adjusted clock and never shows negative time', () => {
  const end = '2026-10-03T02:35:00Z'
  assert.equal(remainingLabel(end, Date.parse('2026-10-03T02:30:01Z')), '04:59')
  assert.equal(remainingLabel(end, Date.parse(end)), '00:00')
  assert.equal(remainingLabel(end, Date.parse('2026-10-03T03:00:00Z')), '00:00')
})

test('time warnings fire once at ten, five, and one minute', () => {
  const shown = new Set<number>()
  assert.equal(nextCallTimeWarning(10 * 60_000, shown)?.minutes, 10)
  shown.add(10)
  assert.equal(nextCallTimeWarning(9 * 60_000, shown), null)
  assert.equal(nextCallTimeWarning(5 * 60_000, shown)?.minutes, 5)
  shown.add(5)
  assert.equal(nextCallTimeWarning(4 * 60_000, shown), null)
  assert.equal(nextCallTimeWarning(60_000, shown)?.minutes, 1)
  shown.add(1)
  assert.equal(nextCallTimeWarning(30_000, shown), null)
  assert.equal(nextCallTimeWarning(0, shown), null)
})

test('late entry selects only the warning appropriate to the remaining time', () => {
  const fiveMinuteEntry = new Set<number>()
  assert.equal(nextCallTimeWarning(4 * 60_000, fiveMinuteEntry)?.minutes, 5)
  fiveMinuteEntry.add(5)
  assert.equal(nextCallTimeWarning(3 * 60_000, fiveMinuteEntry), null)

  const oneMinuteEntry = new Set<number>()
  assert.equal(nextCallTimeWarning(30_000, oneMinuteEntry)?.minutes, 1)
  oneMinuteEntry.add(1)
  assert.equal(nextCallTimeWarning(29_000, oneMinuteEntry), null)
})
test('entry points return to the correct workspace without placing credentials in the URL', () => {
  assert.equal(roomPath('booking-123'), '/app/consultations/booking-123/call')
  assert.equal(roomPath('booking-123', true), '/expert/consultations/booking-123/call')
  assert.equal(roomPath('a/b?'), '/app/consultations/a%2Fb%3F/call')
})

test('room state machine opens and closes at the exact server boundaries', () => {
  const room = info()
  assert.equal(effectiveRoomState(room, Date.parse('2026-10-06T01:59:59.999Z')), 'SCHEDULED')
  assert.equal(effectiveRoomState(room, Date.parse(room.opens_at!)), 'READY')
  assert.equal(effectiveRoomState({ ...room, state: 'READY', can_join: true }, Date.parse(room.closes_at!) - 1), 'READY')
  assert.equal(effectiveRoomState({ ...room, state: 'READY', can_join: true }, Date.parse(room.closes_at!)), 'ENDED')
  assert.equal(hasReachedRoomClose(room, Date.parse(room.closes_at!) - 1), false)
  assert.equal(hasReachedRoomClose(room, Date.parse(room.closes_at!)), true)
  assert.equal(effectiveRoomState(info({ state: 'UNAVAILABLE' }), Date.parse('2026-10-06T01:00:00Z')), 'UNAVAILABLE')
  assert.equal(effectiveRoomState(info({ state: 'ENDED' }), Date.parse('2026-10-06T01:00:00Z')), 'ENDED')
  assert.deepEqual(nextRoomBoundary(room, Date.parse('2026-10-06T01:00:00Z')), { type: 'open', at: Date.parse(room.opens_at!) })
  assert.deepEqual(nextRoomBoundary({ ...room, state: 'READY' }, Date.parse('2026-10-06T02:00:00Z')), { type: 'close', at: Date.parse(room.closes_at!) })
})

test('foreground refresh only happens after data is older than thirty seconds', () => {
  assert.equal(shouldRefreshOnForeground(1_000, 31_000), false)
  assert.equal(shouldRefreshOnForeground(1_000, 31_001), true)
})

test('coordinator shares one in-flight promise for double-click join and complete', async () => {
  const coordinator = new VideoRequestCoordinator()
  let calls = 0
  let release!: (value: string) => void
  const task = () => { calls += 1; return new Promise<string>((resolve) => { release = resolve }) }
  const first = coordinator.run('request-1', 'join', task)
  const second = coordinator.run('request-1', 'join', task)
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.equal(first, second)
  release('token')
  assert.equal((await first).value, 'token')
})

test('coordinator marks late responses stale and cleanup permits a Strict Mode remount', async () => {
  const coordinator = new VideoRequestCoordinator()
  let release!: (value: string) => void
  const late = coordinator.run('request-1', 'info', () => new Promise<string>((resolve) => { release = resolve }))
  await Promise.resolve()
  coordinator.dispose('request-1')
  const fresh = coordinator.run('request-1', 'info', async () => 'fresh')
  release('old')
  assert.equal((await late).stale, true)
  assert.deepEqual(await fresh, { value: 'fresh', stale: false })
})

test('429 locks only the affected action and never retries automatically', async () => {
  let now = 1_000
  const coordinator = new VideoRequestCoordinator(() => now)
  let calls = 0
  const limited = () => {
    calls += 1
    return Promise.reject(new ApiClientError(429, { code: 'REQUEST_FAILED', message: 'slow down' }, 2_000))
  }
  await assert.rejects(coordinator.run('request-1', 'join', limited), VideoCooldownError)
  await assert.rejects(coordinator.run('request-1', 'join', limited), VideoCooldownError)
  assert.equal(calls, 1)
  assert.equal((await coordinator.run('request-1', 'info', async () => 'ok')).value, 'ok')
  assert.equal(coordinator.cooldownRemaining('request-1', 'join'), 2_000)
  now += 2_000
  assert.equal(coordinator.cooldownRemaining('request-1', 'join'), 0)
})

test('429 without Retry-After uses the thirty second fallback', async () => {
  const coordinator = new VideoRequestCoordinator(() => 5_000)
  await assert.rejects(coordinator.run('request-1', 'complete', async () => {
    throw new ApiClientError(429, { code: 'REQUEST_FAILED', message: 'slow down' })
  }), VideoCooldownError)
  assert.equal(coordinator.cooldownRemaining('request-1', 'complete'), 30_000)
})

test('post-call navigation separates expert schedule and user review', () => {
  assert.equal(postCallPath('request 1', true, false), '/expert?section=schedule')
  assert.equal(postCallPath('request 1', false, true), '/app/consultations/history?request=request+1&review=1')
  assert.equal(postCallPath('request 1', false, false), '/app/consultations/history?request=request+1')
})

test('consultation entry points use the requested icons, action order, and prominent expert CTA', async () => {
  const [list, link, page, schedule, expertCss] = await Promise.all([
    readFile(new URL('../src/features/consultation/components/ConsultationList.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation-video/components/VideoRoomLink.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation-video/pages/ConsultationCallPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/SchedulePanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/styles/expert-console.css', import.meta.url), 'utf8'),
  ])
  assert.match(list, /Hủy lịch[^]*<VideoRoomLink id=\{item\.id\}/)
  assert.match(link, /import \{ MdVideoCall \} from 'react-icons\/md'/)
  assert.match(link, /<MdVideoCall size=\{21\}/)
  assert.match(page, /import \{ TfiInfoAlt \} from 'react-icons\/tfi'/)
  assert.match(page, /<TfiInfoAlt size=\{24\}[^]*Thông tin buổi tư vấn/)
  assert.match(schedule, /className="expert-button expert-video-room-button"/)
  assert.match(expertCss, /\.expert-button\.expert-video-room-button \{[^}]*background: var\(--accent\)/)
})

test('review CTA is offered after completion or valid timeout, never for a cancelled booking', () => {
  const now = Date.parse(info().closes_at!)
  assert.equal(canOfferPostCallReview(info({ consultation_status: 'PENDING_CONSULTATION' }), now), true)
  assert.equal(canOfferPostCallReview(info({ consultation_status: 'COMPLETED', closes_at: null }), now), true)
  assert.equal(canOfferPostCallReview(info({ consultation_status: 'CANCELLED' }), now), false)
})

test('call capability gate requires HTTPS and E2EE before requesting credentials', () => {
  assert.match(callCapabilityError(false, true)!, /HTTPS/)
  assert.match(callCapabilityError(true, false)!, /mã hóa đầu cuối/)
  assert.equal(callCapabilityError(true, true), null)
})

test('call implementation is event-driven, lazy, encrypted, and preserves the backend contract', async () => {
  const [page, runtime, api, history] = await Promise.all([
    readFile(new URL('../src/features/consultation-video/pages/ConsultationCallPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation-video/components/LiveKitCallRuntime.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation-video/api/video-api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/consultation/components/ConsultationHistorySection.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(page, /lazy\(\(\) => import\('\.\.\/components\/LiveKitCallRuntime'\)\)/)
  assert.doesNotMatch(page, /setInterval\(\(\) => \{ void loadInfo/)
  assert.match(page, /visibilitychange/)
  assert.match(page, /shouldRefreshOnForeground/)
  assert.match(runtime, /await keyProvider\.setKey[^]*await nextRoom\.setE2EEEnabled\(true\)[^]*setRoom\(nextRoom\)/)
  assert.match(runtime, /intentional\.current = false/)
  assert.match(runtime, /VideoPresets\.h540[^]*maxBitrate: 700_000[^]*maxFramerate: 20/)
  assert.match(runtime, /ScreenSharePresets\.h720fps15/)
  assert.match(api, /`\$\{path\(id\)\}\/join`[^]*method: 'POST'/)
  assert.match(api, /`\$\{path\(id\)\}\/complete`[^]*method: 'POST'/)
  assert.match(history, /reviewRequested && item\.canReview/)
  assert.match(history, /item\.status === 'PENDING_CONSULTATION' && allowReviewRetry/)
  assert.match(history, /window\.setTimeout\(\(\) => loadFocused\(false\), POST_CALL_REVIEW_RETRY_MS\)/)
  assert.match(history, /window\.clearTimeout\(reviewRetryTimer\)/)
  assert.match(history, /if \(!shouldOpenReview\)[^]*focusedRef\.current\?\.focus/)
  assert.match(page, /const onPageHide = \(\) => disposeCall\(\)/)
  assert.match(page, /window\.setInterval\(tick, 1000\)/)
  assert.match(page, /return \(\) => window\.clearInterval\(timer\)/)
  assert.match(page, /setForcedEnded\(true\); disposeCall\(\)/)
  assert.match(page, /const leave = useCallback\(\(\) => \{ disposeCall\(\); setLeft\(true\); setError\(''\)/)
  assert.match(page, /const disconnected = useCallback\(\(\) => \{[^]*void loadInfo\(\)/)
  assert.match(page, /Đánh giá chuyên gia/)
  assert.match(page, /!info\?\.expert \|\| actionCooling\('complete'\)/)
  assert.match(page, /consultation_status: 'COMPLETED'/)
  assert.match(runtime, /trackPublications\.forEach\(\(publication\) => publication\.track\?\.stop\(\)\)/)
  assert.match(runtime, /finally\(\(\) => worker\.terminate\(\)\)/)
  assert.match(runtime, /info\.expert && <button[^]*Hoàn tất tư vấn/)
})
