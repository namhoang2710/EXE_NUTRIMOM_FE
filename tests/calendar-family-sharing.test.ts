import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { clearDiagnosticEvents, diagnosticSummary, getDiagnosticEvents, logDiagnostic, redactDiagnosticValue } from '../src/core/diagnostics/logger.ts'
import { authenticatedDestination } from '../src/features/auth/model/role-routing.ts'
import { buildSharedEventsPath, buildSharedMonthPath } from '../src/features/calendar/model/calendar-helpers.ts'
import { normalizeSharedCalendarEvents, normalizeSharedCalendarMonth } from '../src/features/calendar/model/calendar-normalizers.ts'
import { normalizeCreatedInvitation, normalizeInvitationList, normalizeInvitationPreview } from '../src/features/family/model/invitation-normalizers.ts'
import { adaptDeepLink, isRetryableNotificationError } from '../src/features/notifications/model/notification-helpers.ts'

const event = { source: 'REMINDER', source_id: 'r1', title: 'Uống vitamin', starts_at: '2026-10-06T01:00:00Z', date: '2026-10-06' }

test('shared calendar uses dedicated endpoints and removes forbidden medical data at the boundary', () => {
  assert.equal(buildSharedMonthPath(2026, 10), '/family/shared-calendar/month?year=2026&month=10')
  assert.equal(buildSharedEventsPath('2026-10-01', '2026-10-07', ['REMINDER', 'MEDICAL_RECORD']), '/family/shared-calendar/events?from=2026-10-01&to=2026-10-07&types=REMINDER')
  const normalized = normalizeSharedCalendarEvents({ family_group_id: 'g1', owner_display_name: 'Mẹ An', allowed_sources: ['REMINDER'], events: [event, { ...event, source: 'MEDICAL_RECORD', source_id: 'm1' }] })
  assert.deepEqual(normalized.allowed_sources, ['REMINDER'])
  assert.deepEqual(normalized.events.map((item) => item.source), ['REMINDER'])
  const month = normalizeSharedCalendarMonth({ family_group_id: 'g1', owner_display_name: 'Mẹ An', allowed_sources: ['CONSULTATION'], days: [{ date: '2026-10-06', event_count: 2, types: ['MEDICAL_RECORD', 'CONSULTATION'] }] })
  assert.deepEqual(month.days[0].types, ['CONSULTATION'])
})

test('shared calendar UI is read-only and never loads owner reminder detail', async () => {
  const overview = await readFile(new URL('../src/features/calendar/components/CalendarOverview.tsx', import.meta.url), 'utf8')
  const dialog = await readFile(new URL('../src/features/calendar/components/CalendarEventDialog.tsx', import.meta.url), 'utf8')
  assert.match(overview, /if \(!shared && event\.source === 'REMINDER'\)/)
  assert.match(overview, /readOnly=\{shared\}/)
  assert.match(dialog, /readOnly \? <p className="calendar-read-only-note"/)
})

test('invitation preview and list validate status while list has no raw token or invite URL', () => {
  const created = normalizeCreatedInvitation({ id: 'i1', family_group_id: 'g1', invited_email: 'family@example.com', token: 'one-time', invite_url: 'https://app.test/family/invite?token=one-time', relationship: 'PARTNER', scopes: ['SHARED_CALENDAR'], status: 'PENDING', delivery_status: 'SENT', sent_at: '2026-10-05T00:00:00Z', expires_at: '2026-10-07T00:00:00Z', created_at: '2026-10-05T00:00:00Z' })
  assert.equal(created.delivery_status, 'SENT')
  const preview = normalizeInvitationPreview({ inviter_display_name: 'Mẹ An', relationship: 'PARTNER', relationship_label: 'Bạn đời', scopes: ['SHARED_CALENDAR'], scope_labels: ['Lịch dùng chung'], target_type: 'EMAIL', masked_target: 'a***@example.com', expires_at: '2026-10-07T00:00:00Z', status: 'PENDING' })
  assert.equal(preview.status, 'PENDING')
  const [summary] = normalizeInvitationList([{ id: 'i1', target_type: 'PHONE', masked_target: '***1234', relationship: 'PARTNER', scopes: ['SHARED_CALENDAR'], status: 'REVOKED', delivery_status: 'SKIPPED', expires_at: '2026-10-07T00:00:00Z', created_at: '2026-10-05T00:00:00Z', token: 'must-not-copy', invite_url: 'must-not-copy' }])
  assert.equal('token' in summary, false)
  assert.equal('invite_url' in summary, false)
})

test('all invitation preview and delivery states are represented in the UI contract', async () => {
  for (const status of ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const) {
    assert.equal(normalizeInvitationPreview({ inviter_display_name: 'Mẹ An', relationship: 'PARTNER', relationship_label: 'Bạn đời', scopes: ['SHARED_CALENDAR'], scope_labels: ['Lịch dùng chung'], target_type: 'PHONE', masked_target: '***1234', expires_at: '2026-10-07T00:00:00Z', status }).status, status)
  }
  const dialog = await readFile(new URL('../src/features/family/components/InvitationDialogs.tsx', import.meta.url), 'utf8')
  const page = await readFile(new URL('../src/features/family/pages/FamilyInvitePage.tsx', import.meta.url), 'utf8')
  for (const delivery of ['SENT', 'FAILED', 'SKIPPED']) assert.match(dialog, new RegExp(`case '${delivery}'`))
  assert.match(page, /preview\?\.status !== 'PENDING'/)
  assert.match(page, /navigate\('\/app\/family', \{ replace: true/)
})

test('family invitation deep links are allowlisted and malicious variants are rejected', () => {
  assert.equal(adaptDeepLink('nutrimom://family/invitations?token=abc%2B123').path, '/family/invite?token=abc%2B123')
  for (const link of ['nutrimom://family/invitations?token=a/b', 'nutrimom://family/invitations?next=https://evil.test&token=x', 'javascript:alert(1)']) assert.equal(adaptDeepLink(link).path, undefined)
})

test('login preserves only the exact internal invitation return URL', () => {
  const user = { id: 'u1', phone: '0900000000', displayName: 'An', roles: ['USER'] }
  assert.equal(authenticatedDestination(user, 'COMPLETED', '/family/invite?token=abc123'), '/family/invite?token=abc123')
  assert.equal(authenticatedDestination(user, 'COMPLETED', '//evil.test/family/invite?token=x'), '/app')
  assert.equal(authenticatedDestination(user, 'COMPLETED', '/family/invite?next=https://evil.test&token=x'), '/app')
})

test('notification retries only retryable server/network failures', () => {
  assert.equal(isRetryableNotificationError(new ApiClientError(503, { code: 'REQUEST_FAILED', message: 'busy', retryable: true })), true)
  assert.equal(isRetryableNotificationError(new ApiClientError(401, { code: 'UNAUTHORIZED', message: 'no', retryable: true })), false)
  assert.equal(isRetryableNotificationError(new ApiClientError(422, { code: 'VALIDATION_ERROR', message: 'bad', retryable: true })), false)
  assert.equal(isRetryableNotificationError(new ApiClientError(0, { code: 'REQUEST_ABORTED', message: 'abort', retryable: true })), false)
})

test('diagnostic buffer is bounded and redacts credentials, invitations, email and phone before storage/copy', () => {
  clearDiagnosticEvents()
  for (let index = 0; index < 205; index += 1) logDiagnostic({ level: 'warn', category: 'api', event: `failure-${index}`, reason: 'Authorization: Bearer secret email me@example.com phone 0901234567 nutrimom://family/invitations?token=raw-secret' })
  const events = getDiagnosticEvents()
  assert.equal(events.length, 200)
  const serialized = JSON.stringify(events)
  for (const secret of ['secret', 'me@example.com', '0901234567', 'raw-secret']) assert.equal(serialized.includes(secret), false)
  const redacted = JSON.stringify(redactDiagnosticValue({ Authorization: 'Bearer abc', invite_url: 'https://x?token=y', email: 'a@b.com' }))
  assert.equal(redacted.includes('abc'), false)
  assert.equal(diagnosticSummary('family-invitation', 'preview_failed', { code: 'INVALID', requestId: 'req-1' }).includes('request_id=req-1'), true)
})
