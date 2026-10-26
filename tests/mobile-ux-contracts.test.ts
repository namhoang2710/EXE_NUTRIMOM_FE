import assert from 'node:assert/strict'
import test from 'node:test'
import { effectiveTheme } from '../src/core/theme/theme-policy.ts'
import { createFeatureCooldown } from '../src/core/api/feature-cooldown.ts'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { brandDisplayName, compactNotificationBody } from '../src/shared/model/display-copy.ts'
import { canWriteWebReview, mergeReviewPage, parseReviewPage, parseReviewSummary, reviewDate, reviewDraftError, reviewQuery } from '../src/features/reviews/model/review-types.ts'

test('public pages stay light without changing the preference needed by authentication and private routes', () => {
  for (const path of ['/', '/about', '/services', '/community', '/experts', '/contact', '/blog/article']) assert.equal(effectiveTheme(path, 'dark'), 'light')
  for (const path of ['/login', '/register', '/otp', '/forgot-password', '/reset-password', '/auth/activate', '/app/reviews', '/admin/users', '/expert', '/payment/success']) assert.equal(effectiveTheme(path, 'dark'), 'dark')
})
test('server 429 blocks every query in a policy family and preserves the longest Retry-After', () => {
  let now = 1000
  const gate = createFeatureCooldown(() => now)
  const error = new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Chờ một chút' }, 5000)
  gate.record('public', error)
  now += 1000; gate.record('public', new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Chờ' }, 1000))
  assert.equal(gate.until('public'), 6000)
  assert.throws(() => gate.assert('public'), (value: unknown) => value instanceof ApiClientError && value.retryAfterMs === 4000)
  assert.doesNotThrow(() => gate.assert('private'))
  now = 6000; assert.doesNotThrow(() => gate.assert('public'))
  gate.clearExpired('public',0);assert.equal(gate.until('public'),6000,'An earlier concurrent success cannot clear a later 429')
  gate.clearExpired('public',6000);assert.equal(gate.until('public'),0)
})
test('review text counts Unicode code points, restricts customer authoring, and deduplicates cursors', () => {
  assert.equal(reviewDraftError(5, '🙂'.repeat(10)), '')
  assert.ok(reviewDraftError(2.5, 'Nội dung đánh giá'))
  assert.ok(reviewDraftError(5, '🙂'.repeat(1001)))
  assert.equal(canWriteWebReview({ status: 'ACTIVE', roles: ['USER'] }), true)
  for (const role of ['ADMIN', 'EXPERT', 'CONTENT_EDITOR', 'CONTENT_REVIEWER', 'CONTENT_PUBLISHER']) assert.equal(canWriteWebReview({ status: 'ACTIVE', roles: ['USER', role] }), false)
  assert.deepEqual(mergeReviewPage([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }, { id: 'b' }]), [{ id: 'a' }, { id: 'b' }])
  assert.equal(reviewQuery({ rating: '5', q: ' mẹ ' }, 'cursor+/='), 'limit=10&q=m%E1%BA%B9&rating=5&cursor=cursor%2B%2F%3D')
})
test('review summary refuses inconsistent counts and displays the empty state without a fabricated average', () => {
  const empty = { total: 0, by_rating: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } }
  assert.deepEqual(parseReviewSummary({ ...empty, average: 4.6 }), empty)
  assert.throws(() => parseReviewSummary({ ...empty, total: 1, average: 5 }))
  assert.equal(reviewDate('2026-10-24T18:00:00Z'), '25/10/2026')
})
test('public review contract rejects broken cursors and never retains private author fields', () => {
  const row = { id: 'r1', rating: 5, content: 'Cảm ơn NutriMom', created_at: '2026-10-25T00:00:00Z', author: { display_name: 'M*** A**', email: 'private@example.test', id: 'private-id' } }
  const page = parseReviewPage({ items: [row], has_more: false })
  assert.deepEqual(page.items[0].author, { display_name: 'M*** A**' })
  assert.throws(() => parseReviewPage({ items: [row], has_more: true }))
  assert.throws(() => parseReviewPage({ items: [{ ...row, rating: 9 }], has_more: false }))
})
test('brand aliases and notification precision are normalized without changing real names or times', () => {
  assert.equal(brandDisplayName('NutriMom Local Admin'), 'NutriMom')
  assert.equal(brandDisplayName('Nguyễn Minh Anh'), 'Nguyễn Minh Anh')
  assert.equal(compactNotificationBody('Lúc 14:05:54.56736300 hôm nay'), 'Lúc 14:05 hôm nay')
  assert.equal(compactNotificationBody('Lúc 14:05 ngày 26/10/2026'), 'Lúc 14:05 ngày 26/10/2026')
})
