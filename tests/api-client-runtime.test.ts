import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>()
  get length() { return this.#values.size }
  clear() { this.#values.clear() }
  getItem(key: string) { return this.#values.get(key) ?? null }
  key(index: number) { return [...this.#values.keys()][index] ?? null }
  removeItem(key: string) { this.#values.delete(key) }
  setItem(key: string, value: string) { this.#values.set(key, value) }
}

const events = new EventTarget()
Object.assign(globalThis, {
  window: {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    setTimeout,
    clearTimeout,
  },
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
})

const { apiClient } = await import('../src/core/api/api-client.ts')
const { clearSession, getSession, saveApiSession } = await import('../src/core/auth/token-store.ts')
const { clearDiagnosticEvents, getDiagnosticEvents } = await import('../src/core/diagnostics/logger.ts')
await import('../src/features/auth/api/auth-api.ts')

function authResponse(accessToken: string, refreshToken: string) {
  return {
    access_token: accessToken,
    expires_in: 900,
    refresh_token: refreshToken,
    refresh_expires_in: 2_592_000,
    token_type: 'Bearer',
    user: {
      id: 'user-1', phone: '0900000000', display_name: 'Runtime Test', roles: ['USER'],
      status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z',
    },
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(status >= 400 ? data : { data, meta: { request_id: 'test', server_time: '2026-10-02T00:00:00Z' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function unauthorized(code = 'UNAUTHORIZED') {
  return jsonResponse({ error: { code, message: 'Unauthorized', retryable: false } }, 401)
}

function resetSession() {
  clearSession()
  localStorage.clear()
  localStorage.setItem('nutrimom.device-id', 'runtime-device')
}

test('protected requests attach the current Bearer token', async () => {
  resetSession()
  saveApiSession(authResponse('access-one', 'refresh-one'))
  let authorization = ''
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    authorization = new Headers(init?.headers).get('Authorization') ?? ''
    return jsonResponse({ ok: true })
  }) as typeof fetch

  await apiClient.request('/calendar/month?year=2026&month=10')
  assert.equal(authorization, 'Bearer access-one')
})

test('API diagnostics correlate client/server request ids without retaining query values', async () => {
  resetSession(); clearDiagnosticEvents(); saveApiSession(authResponse('access-one', 'refresh-one'))
  let clientRequestId = ''
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    clientRequestId = new Headers(init?.headers).get('X-Request-Id') ?? ''
    return jsonResponse({ ok: true })
  }) as typeof fetch
  await apiClient.request('/family-invitations/preview?token=super-secret')
  const success = getDiagnosticEvents().find((event) => event.event === 'request_succeeded')
  assert.equal(success?.client_request_id, clientRequestId)
  assert.equal(success?.server_request_id, 'test')
  assert.equal(success?.route_template, '/family-invitations/preview')
  assert.equal(JSON.stringify(getDiagnosticEvents()).includes('super-secret'), false)
})

test('concurrent 401 responses create one refresh, rotate both tokens, and retry every request once', async () => {
  resetSession()
  saveApiSession(authResponse('expired-access', 'refresh-before-rotation'))
  let refreshCalls = 0
  const protectedAttempts = new Map<string, number>()
  let refreshBody: Record<string, unknown> | undefined

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.endsWith('/auth/refresh')) {
      refreshCalls += 1
      refreshBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      await new Promise((resolve) => setTimeout(resolve, 5))
      return jsonResponse(authResponse('fresh-access', 'fresh-refresh'))
    }
    const count = (protectedAttempts.get(path) ?? 0) + 1
    protectedAttempts.set(path, count)
    const authorization = new Headers(init?.headers).get('Authorization')
    return authorization === 'Bearer fresh-access' ? jsonResponse({ path }) : unauthorized()
  }) as typeof fetch

  const [month, notifications, reminder] = await Promise.all([
    apiClient.request<{ path: string }>('/calendar/month?year=2026&month=10'),
    apiClient.request<{ path: string }>('/notifications?limit=20&unreadOnly=false'),
    apiClient.request<{ path: string }>('/calendar/reminders/reminder-1'),
  ])

  assert.equal(refreshCalls, 1)
  assert.deepEqual(refreshBody, { refresh_token: 'refresh-before-rotation', device_id: 'runtime-device' })
  assert.equal(getSession()?.accessToken, 'fresh-access')
  assert.equal(getSession()?.refreshToken, 'fresh-refresh')
  assert.deepEqual([...protectedAttempts.values()], [2, 2, 2])
  assert.ok(month.path.includes('/calendar/month'))
  assert.ok(notifications.path.includes('/notifications'))
  assert.ok(reminder.path.includes('/calendar/reminders/reminder-1'))
})

test('a retried request that still receives 401 does not refresh or retry forever', async () => {
  resetSession()
  saveApiSession(authResponse('expired-access', 'refresh-before-rotation'))
  let refreshCalls = 0
  let protectedCalls = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/auth/refresh')) {
      refreshCalls += 1
      return jsonResponse(authResponse('fresh-access', 'fresh-refresh'))
    }
    protectedCalls += 1
    return unauthorized()
  }) as typeof fetch

  await assert.rejects(apiClient.request('/calendar/reminders/reminder-1'), (reason: unknown) => {
    return reason instanceof Error && reason.name === 'ApiClientError'
  })
  assert.equal(refreshCalls, 1)
  assert.equal(protectedCalls, 2)
})

test('429 responses preserve Retry-After for a visible client countdown', async () => {
  resetSession()
  saveApiSession(authResponse('access-one', 'refresh-one'))
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: 'REQUEST_FAILED', message: 'Too many requests', retryable: true } }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '12' },
  })) as typeof fetch

  await assert.rejects(apiClient.request('/family-invitations'), (reason: unknown) => {
    return reason instanceof Error
      && 'status' in reason
      && reason.status === 429
      && 'retryAfterMs' in reason
      && reason.retryAfterMs === 12_000
  })
})

test('refresh failure clears the session and emits one auth-state event for concurrent callers', async () => {
  resetSession()
  saveApiSession(authResponse('expired-access', 'invalid-refresh'))
  let clearedEvents = 0
  const onCleared = () => { clearedEvents += 1 }
  window.addEventListener('nutrimom:session-cleared', onCleared)
  let refreshCalls = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/auth/refresh')) {
      refreshCalls += 1
      return unauthorized('INVALID_REFRESH_TOKEN')
    }
    return unauthorized()
  }) as typeof fetch

  const results = await Promise.allSettled([
    apiClient.request('/calendar/events?from=2026-10-02&to=2026-10-02'),
    apiClient.request('/notifications?limit=20&unreadOnly=false'),
  ])
  window.removeEventListener('nutrimom:session-cleared', onCleared)

  assert.equal(refreshCalls, 1)
  assert.equal(clearedEvents, 1)
  assert.equal(getSession(), null)
  assert.ok(results.every((result) => result.status === 'rejected'))
})
