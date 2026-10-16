import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { authenticatedDestination } from '../src/features/auth/model/role-routing.ts'
import type { User } from '../src/features/auth/model/auth-types.ts'
import { identifyTimedOutInvitation, reconcileTimedOutInvitation } from '../src/features/family/model/invitation-reconciliation.ts'
import { FamilyInvitationContractError, normalizeInvitationList, normalizeReceivedInvitations } from '../src/features/family/model/invitation-normalizers.ts'
import { createAbortableRequestCoordinator, createInvitationPreviewRequestCoordinator } from '../src/features/family/model/received-invitation-requests.ts'
import type { FamilyInvitationSummary, ReceivedFamilyInvitation } from '../src/features/family/model/family-types.ts'
import { adaptDeepLink } from '../src/features/notifications/model/notification-helpers.ts'
import { normalizeNotificationPage } from '../src/features/notifications/model/notification-normalizers.ts'

const received: ReceivedFamilyInvitation = {
  id: 'invitation-1',
  inviter_display_name: 'Mẹ An',
  relationship: 'PARTNER',
  relationship_label: 'Bạn đời',
  scopes: ['PREGNANCY_SUMMARY', 'SHARED_CALENDAR'],
  scope_labels: ['Tóm tắt thai kỳ', 'Lịch dùng chung'],
  target_type: 'EMAIL',
  masked_target: 'a***@example.com',
  status: 'PENDING',
  expires_at: '2026-10-10T00:00:00Z',
  created_at: '2026-10-09T00:00:00Z',
}

const summary: FamilyInvitationSummary = {
  id: 'invitation-1',
  target_type: 'EMAIL',
  masked_target: 'f***@example.com',
  relationship: 'PARTNER',
  scopes: ['FAMILY_TASKS'],
  status: 'PENDING',
  expires_at: '2026-10-11T00:00:00Z',
  created_at: '2026-10-09T01:00:00Z',
}

test('received normalizer accepts the exact recipient contract without owner-only fields', () => {
  const [item] = normalizeReceivedInvitations([received])
  assert.deepEqual(item, received)
  for (const forbidden of ['token', 'delivery_status', 'sent_at']) assert.equal(forbidden in item, false)
})

test('received normalizer remains compatible with PHONE history and ignores unrelated fields', () => {
  const [item] = normalizeReceivedInvitations([{ ...received, target_type: 'PHONE', masked_target: '***1234', unrelated: { anything: true } }])
  assert.equal(item.target_type, 'PHONE')
  assert.equal(item.masked_target, '***1234')
})

test('received normalizer fails a broken top-level contract but preserves valid siblings', () => {
  assert.throws(() => normalizeReceivedInvitations({ items: [received] }), FamilyInvitationContractError)
  assert.deepEqual(normalizeReceivedInvitations([{ broken: true }, received]), [received])
})

test('owner list accepts missing delivery_status without inventing SENT', () => {
  const [item] = normalizeInvitationList([summary])
  assert.equal(item.delivery_status, undefined)
  assert.equal(item.target_type, 'EMAIL')
})

test('new invitation ID deep link maps to the protected detail route and encodes its segment', () => {
  assert.equal(adaptDeepLink('nutrimom://family/invitations/invitation%20one').path, '/app/family/invitations/invitation%20one')
  assert.equal(adaptDeepLink('nutrimom://family/invitations/123e4567-e89b-12d3-a456-426614174000').path, '/app/family/invitations/123e4567-e89b-12d3-a456-426614174000')
})

test('legacy token deep link remains supported', () => {
  assert.equal(adaptDeepLink('nutrimom://family/invitations?token=abc%2B123').path, '/family/invite?token=abc%2B123')
})

test('invitation deep-link allowlist rejects extra slash, query, fragment and encoded slash', () => {
  for (const link of [
    'nutrimom://family/invitations/a/b',
    'nutrimom://family/invitations/a?next=https://evil.test',
    'nutrimom://family/invitations/a#fragment',
    'nutrimom://family/invitations/a%2Fb',
    'https://evil.test/app/family/invitations/a',
  ]) assert.equal(adaptDeepLink(link).path, undefined)
})

test('notification with missing or null deep link is retained by normalization', () => {
  const base = { id: 'n1', type: 'FAMILY', title: 'Lời mời', body: 'Bạn có lời mời mới', created_at: '2026-10-09T00:00:00Z' }
  assert.deepEqual(normalizeNotificationPage({ items: [base, { ...base, id: 'n2', deep_link: null }], has_more: false }).items, [base, { ...base, id: 'n2' }])
})

test('received request coordinator deduplicates callers and serves its TTL cache', async () => {
  let calls = 0
  let resolve!: (value: string[]) => void
  const coordinator = createAbortableRequestCoordinator<string[]>(45_000)
  const request = () => { calls += 1; return new Promise<string[]>((done) => { resolve = done }) }
  const first = coordinator.acquire(request)
  first.release()
  const strictReplay = coordinator.acquire(request)
  assert.equal(calls, 1)
  assert.equal(first.promise, strictReplay.promise)
  resolve(['one'])
  assert.deepEqual(await strictReplay.promise, ['one'])
  strictReplay.release()
  assert.deepEqual(await coordinator.acquire(request).promise, ['one'])
  assert.equal(calls, 1)
})

test('received request coordinator invalidation prevents an older response replacing a newer one', async () => {
  const coordinator = createAbortableRequestCoordinator<string[]>(45_000)
  let resolveOld!: (value: string[]) => void
  const old = coordinator.acquire(() => new Promise<string[]>((resolve) => { resolveOld = resolve }))
  coordinator.invalidate()
  const fresh = coordinator.acquire(async () => ['fresh'])
  assert.deepEqual(await fresh.promise, ['fresh'])
  resolveOld(['stale'])
  assert.deepEqual(await old.promise, ['stale'])
  assert.deepEqual(coordinator.snapshot(), ['fresh'])
})

test('received request coordinator aborts only after its last consumer releases', async () => {
  const coordinator = createAbortableRequestCoordinator<string[]>(45_000)
  let aborted = false
  const first = coordinator.acquire((signal) => {
    signal.addEventListener('abort', () => { aborted = true }, { once: true })
    return new Promise<string[]>(() => undefined)
  })
  const second = coordinator.acquire(async () => ['unused'])
  first.release()
  await new Promise((resolve) => setTimeout(resolve, 2))
  assert.equal(aborted, false)
  second.release()
  await new Promise((resolve) => setTimeout(resolve, 2))
  assert.equal(aborted, true)
})

test('preview requests are deduplicated per invitation ID for Strict Mode replay', async () => {
  const coordinator = createInvitationPreviewRequestCoordinator()
  let calls = 0
  let resolve!: (value: typeof received) => void
  const request = () => { calls += 1; return new Promise<typeof received>((done) => { resolve = done }) }
  const first = coordinator.acquire('invitation-1', request)
  first.release()
  const replay = coordinator.acquire('invitation-1', request)
  assert.equal(calls, 1)
  resolve(received)
  assert.deepEqual(await replay.promise, received)
  replay.release()
})

test('timeout reconciliation performs at most two controlled list reads', async () => {
  let reads = 0
  let waits = 0
  const result = await reconcileTimedOutInvitation(async () => {
    reads += 1
    return reads === 1 ? [] : [summary]
  }, { invitedEmail: 'family@example.com', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'], submittedAt: Date.parse('2026-10-09T01:00:20Z') }, {
    wait: async () => { waits += 1 },
  })
  assert.equal(result.status, 'found')
  assert.equal(reads, 2)
  assert.equal(waits, 1)

  reads = 0
  const missing = await reconcileTimedOutInvitation(async () => { reads += 1; return [] }, { invitedEmail: 'family@example.com', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'], submittedAt: Date.parse('2026-10-09T01:00:20Z') }, { wait: async () => undefined })
  assert.equal(missing.status, 'not_found')
  assert.equal(reads, 2)
})

test('timeout reconciliation refuses to claim success for ambiguous matches', () => {
  assert.equal(identifyTimedOutInvitation([summary, { ...summary, id: 'invitation-2' }], { invitedEmail: 'family@example.com', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'], submittedAt: Date.parse('2026-10-09T01:00:20Z') }).status, 'ambiguous')
})

test('login preserves exact ID invitation return path and rejects redirect variants', () => {
  const user: User = { id: 'u1', phone: '0900000000', displayName: 'An', role: 'MOM', roles: ['USER'], status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z' }
  assert.equal(authenticatedDestination(user, 'COMPLETED', '/app/family/invitations/invitation-1'), '/app/family/invitations/invitation-1')
  for (const path of [
    '//evil.test/app/family/invitations/invitation-1',
    '/app/family/invitations/invitation-1?next=https://evil.test',
    '/app/family/invitations/invitation-1#fragment',
    '/app/family/invitations/a%2Fb',
  ]) assert.equal(authenticatedDestination(user, 'COMPLETED', path), '/app')
})

test('family API and routes expose encoded ID preview and accept without merging token logic', async () => {
  const api = await readFile(new URL('../src/features/family/api/family-api.ts', import.meta.url), 'utf8')
  const router = await readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8')
  const tokenPage = await readFile(new URL('../src/features/family/pages/FamilyInvitePage.tsx', import.meta.url), 'utf8')
  const idPage = await readFile(new URL('../src/features/family/pages/FamilyInvitationByIdPage.tsx', import.meta.url), 'utf8')
  assert.match(api, /receivedInvitations:.*'\/family-invitations\/received'/)
  assert.match(api, /previewInvitationById:.*encodeURIComponent\(id\).*\/preview/)
  assert.match(api, /acceptInvitationById:.*encodeURIComponent\(id\).*\/accept`.*method: 'POST'/)
  assert.match(router, /path="family\/invitations\/:invitationId"/)
  assert.match(tokenPage, /familyApi\.previewInvitation\(token/)
  assert.match(tokenPage, /familyApi\.acceptInvitation\(token\)/)
  assert.match(tokenPage, /receivedInvitationRequests\.invalidate\(\)/)
  assert.match(idPage, /familyApi\.previewInvitationById\(invitationId/)
  assert.match(idPage, /familyApi\.acceptInvitationById\(invitationId\)/)
  assert.match(idPage, /receivedInvitationRequests\.invalidate\(\)/)
  assert.match(idPage, /accepting\.current/)
})

test('email-only create UI never offers phone or SMS and timeout never repeats POST', async () => {
  const dialog = await readFile(new URL('../src/features/family/components/InvitationDialogs.tsx', import.meta.url), 'utf8')
  const requests = await readFile(new URL('../src/features/family/model/family-requests.ts', import.meta.url), 'utf8')
  assert.match(dialog, /type="email"/)
  assert.match(dialog, /autoComplete="email"/)
  assert.doesNotMatch(dialog, /targetType|invited_phone|type="tel"|SMS/)
  assert.doesNotMatch(requests, /invited_phone/)
  assert.equal((dialog.match(/familyApi\.createInvitation\(/g) ?? []).length, 1)
  assert.match(dialog, /REQUEST_TIMEOUT[^]*verifyAfterTimeout\(criteria\)/)
  assert.match(dialog, /reconcileTimedOutInvitation\(/)
  assert.match(dialog, /Liên kết không còn có thể khôi phục từ danh sách/)
})

test('Family Hub renders received invitations independently of group presence and without polling', async () => {
  const page = await readFile(new URL('../src/features/family/pages/FamilyPage.tsx', import.meta.url), 'utf8')
  const inbox = await readFile(new URL('../src/features/family/components/ReceivedInvitationList.tsx', import.meta.url), 'utf8')
  assert.match(page, /void loadReceivedInvitations\(\)[^]*await loadFamilyBootstrap\(\)/)
  assert.match(page, /<ReceivedInvitationList[^]*\{loading \? <FamilyLoadingState/)
  assert.match(inbox, /Lời mời dành cho bạn/)
  assert.match(inbox, /family-pending-badge/)
  assert.match(inbox, /to=\{`\/app\/family\/invitations\/\$\{encodeURIComponent\(item\.id\)\}`\}/)
  assert.doesNotMatch(`${page}${inbox}`, /setInterval|poll/i)
})

test('Family Hub hides the received invitation frame when the inbox is empty', async () => {
  const inbox = await readFile(new URL('../src/features/family/components/ReceivedInvitationList.tsx', import.meta.url), 'utf8')
  assert.match(inbox, /if \(!items\.length && !error\) return null/)
  assert.doesNotMatch(inbox, /Bạn chưa có lời mời nào đang chờ\./)
})

test('notification rows without deep links are non-navigation articles with a separate read control', async () => {
  const bell = await readFile(new URL('../src/features/notifications/components/NotificationBell.tsx', import.meta.url), 'utf8')
  assert.match(bell, /if \(!item\.deep_link\) return <article/)
  assert.match(bell, /className="nm-notification-read"/)
  assert.doesNotMatch(bell, /if \(!item\.deep_link\)[^\n]*activate\(item\)/)
})

test('owner history explains missing delivery status instead of showing an unknown label', async () => {
  const list = await readFile(new URL('../src/features/family/components/InvitationList.tsx', import.meta.url), 'utf8')
  assert.match(list, /Chưa xác nhận được việc gửi email/)
  assert.doesNotMatch(list, /Chưa xác định/)
})
