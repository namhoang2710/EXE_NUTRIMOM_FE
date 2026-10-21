import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClientError, parseApiError, parseRetryAfterMs } from '../src/core/api/api-error.ts'
import { createRateLimitGuard } from '../src/core/api/rate-limit-guard.ts'

test('rate limit deadline spans query changes, returns remaining delay and expires without extending itself', () => {
  let now = 1_000
  const guard = createRateLimitGuard(() => now)
  const key = guard.key('user-a', 'GET', '/calendar/month?month=10')
  const error = new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Too many', request_id: 'rate-request' }, 12_000)
  guard.record(key, error)
  now += 5_000
  assert.throws(() => guard.assertAvailable(guard.key('user-a', 'get', '/calendar/month?month=11')), (error: unknown) =>
    error instanceof ApiClientError && error.status === 429 && error.retryAfterMs === 7_000 && error.requestId === 'rate-request')
  assert.doesNotThrow(() => guard.assertAvailable(guard.key('user-b', 'GET', '/calendar/month')))
  assert.doesNotThrow(() => guard.assertAvailable(guard.key('user-a', 'GET', '/calendar/events')))
  assert.doesNotThrow(() => guard.assertAvailable(guard.key('user-a', 'POST', '/calendar/month')))
  now += 7_000
  assert.doesNotThrow(() => guard.assertAvailable(key))
})

test('missing Retry-After falls back to 30 seconds, shorter responses do not shorten a limit and clearing removes it', () => {
  let now = 0
  const guard = createRateLimitGuard(() => now)
  guard.record('key', new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Wait' }))
  now = 1_000
  guard.record('key', new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Wait' }, 1_000))
  assert.throws(() => guard.assertAvailable('key'), (error: unknown) => error instanceof ApiClientError && error.retryAfterMs === 29_000)
  guard.clear()
  assert.doesNotThrow(() => guard.assertAvailable('key'))
  guard.record('key', new ApiClientError(500, { code: 'REQUEST_FAILED', message: 'Failed' }))
  assert.doesNotThrow(() => guard.assertAvailable('key'))
})

test('Retry-After accepts seconds and HTTP dates, including a non-JSON proxy 429', async () => {
  assert.equal(parseRetryAfterMs('12'), 12_000)
  assert.equal(parseRetryAfterMs('Mon, 19 Oct 2026 14:00:12 GMT', Date.parse('2026-10-19T14:00:00Z')), 12_000)
  const error = await parseApiError(new Response('Too many requests', { status: 429, headers: { 'Retry-After': '8' } }))
  assert.equal(error.status, 429)
  assert.equal(error.retryAfterMs, 8_000)
  assert.match(error.message, /Vui lòng chờ/)
})
