import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { authenticatedDestination, isExpertUser } from '../src/features/auth/model/role-routing.ts'
import { mapConsultation, mapExpertProfile, mapPage, mapReview, mapSlot } from '../src/features/expert-console/model/expert-console-mappers.ts'
import { buildConsultationQuery, buildReviewQuery, buildSlotQuery } from '../src/features/expert-console/model/expert-console-query.ts'
import type { User } from '../src/features/auth/model/auth-types.ts'

function user(roles: string[]): User {
  return { id: 'user-1', phone: '0900000000', displayName: 'Test', role: roles[0] || 'USER', roles, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' }
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

test('serializes exact Swagger filters and resets are represented by omitted values', () => {
  assert.equal(buildSlotQuery({ date: '2026-09-24', status: 'OPEN' }), '?date=2026-09-24&status=OPEN')
  assert.equal(buildConsultationQuery({ type: 'assigned', status: 'COMPLETED', from: '2026-09-01', to: '2026-09-30', query: '  An  ', page: 2, pageSize: 10 }), '?type=assigned&status=COMPLETED&from=2026-09-01&to=2026-09-30&q=An&page=2&pageSize=10')
  assert.equal(buildReviewQuery({ rating: 5, hasComment: true, sort: 'rating_desc', page: 1, pageSize: 10 }), '?rating=5&sort=rating_desc&has_comment=true&page=1&pageSize=10')
})

test('maps expert console snake_case responses without inventing unavailable fields', () => {
  const profile = mapExpertProfile({ user_id: 'expert-1', phone: '0900000001', full_name: 'BS An', specialty: 'OBSTETRICS', title: 'Bác sĩ', workplace: null, years_of_experience: 8, bio: null, avatar_key: null, avatar_url: null, status: 'ACTIVE', average_rating: 4.8, rating_count: 12, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
  assert.equal(profile.averageRating, 4.8)
  assert.equal(profile.workplace, null)

  const slot = mapSlot({ id: 'slot-1', expert_user_id: 'expert-1', slot_date: '2026-09-25', start_time: '08:00:00', end_time: '08:30:00', status: 'OPEN' })
  assert.deepEqual(slot, { id: 'slot-1', date: '2026-09-25', startTime: '08:00:00', endTime: '08:30:00', status: 'OPEN' })

  const consultation = mapConsultation({ id: 'request-1', user_id: 'user-1', user_display_name: 'Nguyễn Mai', expert_user_id: 'expert-1', expert_name: 'BS An', specialty: 'OBSTETRICS', assignment_type: 'RANDOM', status: 'PENDING_CONSULTATION', slot: { id: 'slot-1', slot_date: '2026-09-25', start_time: '08:00:00', end_time: '08:30:00' }, note: 'Tư vấn dinh dưỡng', reviewed: false, can_review: false, completed_at: null, version: 1, created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z' })
  assert.equal(consultation.userDisplayName, 'Nguyễn Mai')
  assert.equal(consultation.slot?.date, '2026-09-25')

  const page = mapPage({ items: [{ id: 'review-1', request_id: 'request-1', user_id: 'user-1', expert_user_id: 'expert-1', rating: 5, comment: null, created_at: '2026-09-25T00:00:00Z' }], page: 1, page_size: 10, total_items: 31, total_pages: 4 }, mapReview)
  assert.equal(page.totalItems, 31)
  assert.equal(page.items[0].comment, null)
})

test('guards, API actions and UI states cover the expert acceptance criteria', async () => {
  const [guards, api, resource, slots, requests, router, provider] = await Promise.all([
    readFile(new URL('../src/app/routing/RouteGuards.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/api/expert-console-api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/ExpertUI.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/SlotsPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/expert-console/components/RequestsPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/providers/AuthProvider.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(guards, /export function ExpertOnly/)
  assert.match(guards, /isExpertUser\(user\)/)
  assert.match(router, /path="expert" element=\{<ExpertOnly>/)
  assert.match(provider, /!isAdminUser\(currentUser\) && !isExpertUser\(currentUser\)/)
  for (const endpoint of ['/expert/me', '/expert/slots', '/expert/consultation-requests', '/expert/reviews']) assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')))
  assert.match(api, /method: 'DELETE'/)
  assert.match(api, /slot_id: slotId/)
  assert.match(api, /\/complete/)
  assert.match(resource, /if \(loading\)/)
  assert.match(resource, /if \(error\)/)
  assert.match(resource, /if \(empty\)/)
  assert.match(slots, /Xóa khung giờ trống\?/)
  assert.match(slots, /await resource\.reload\(\)/)
  assert.match(slots, /catch \(error\)/)
  assert.match(requests, /window\.setTimeout\([^]*350\)/)
  assert.match(requests, /request_page: undefined/)
})

