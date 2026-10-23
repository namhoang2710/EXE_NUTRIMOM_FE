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
const { ApiClientError } = await import('../src/core/api/api-error.ts')
const { calendarApi } = await import('../src/features/calendar/api/calendar-api.ts')
const { clearSession, getSession, saveApiSession } = await import('../src/core/auth/token-store.ts')
const { clearDiagnosticEvents, getDiagnosticEvents } = await import('../src/core/diagnostics/logger.ts')
const { authApi } = await import('../src/features/auth/api/auth-api.ts')

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

test('an already cancelled consumer never dispatches fetch', async () => {
  resetSession()
  let calls = 0
  globalThis.fetch = (async () => { calls++; return jsonResponse([]) }) as typeof fetch
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(apiClient.request('/calendar/month', { signal: controller.signal }), (reason: unknown) => reason instanceof ApiClientError && reason.code === 'REQUEST_ABORTED')
  assert.equal(calls, 0)
})

test('429 blocks repeated query variants at the API boundary without retries or blocking unrelated endpoints', async () => {
  resetSession()
  let calls = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls++
    return String(input).includes('/calendar/month')
      ? new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Wait' } }), { status: 429, headers: { 'Retry-After': '12', 'Content-Type': 'application/json' } })
      : jsonResponse([])
  }) as typeof fetch
  const rateLimited = (error: unknown) => error instanceof ApiClientError && error.status === 429 && (error.retryAfterMs ?? 0) > 0
  await assert.rejects(apiClient.request('/calendar/month?month=10'), rateLimited)
  for (let i = 0; i < 5; i++) await assert.rejects(apiClient.request(`/calendar/month?month=${i + 1}`), rateLimited)
  assert.equal(calls, 1)
  await apiClient.request('/calendar/events?from=2026-10-19')
  assert.equal(calls, 2)
  resetSession()
  globalThis.fetch = (async () => { calls++; return jsonResponse([]) }) as typeof fetch
  await apiClient.request('/calendar/month?month=10')
  assert.equal(calls, 3, 'a new session does not inherit another account cooldown')
})

test('429 does not replay writes and a repeated click is blocked before a second POST', async () => {
  resetSession()
  let calls = 0
  globalThis.fetch = (async () => { calls++; return new Response('Too many', { status: 429 }) }) as typeof fetch
  for (let i = 0; i < 3; i++) {
    await assert.rejects(apiClient.request('/calendar/reminders', { method: 'POST', body: '{}' }), (reason: unknown) => reason instanceof ApiClientError && reason.status === 429)
  }
  assert.equal(calls, 1)
})

test('calendar StrictMode consumer replay and equivalent filters share one request and keep independent cancellation', async () => {
  resetSession()
  let calls = 0
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls++
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(init?.signal?.aborted, false)
    return jsonResponse([])
  }) as typeof fetch
  const controller = new AbortController()
  const abandoned = assert.rejects(calendarApi.month(2026, 10, controller.signal), { name: 'AbortError' })
  controller.abort()
  const live = calendarApi.month(2026, 10)
  await Promise.all([abandoned, live])
  await calendarApi.month(2026, 10)
  assert.equal(calls, 1)
  await calendarApi.events('2026-10-19', '2026-10-19', undefined, ['REMINDER', 'CONSULTATION'])
  await calendarApi.events('2026-10-19', '2026-10-19', undefined, ['CONSULTATION', 'REMINDER'])
  assert.equal(calls, 2)
})

test('successful calendar mutations and login changes invalidate cached calendar reads', async () => {
  resetSession()
  let reads = 0
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'DELETE') return new Response(null, { status: 204 })
    reads++
    return jsonResponse([])
  }) as typeof fetch
  await calendarApi.month(2026, 10)
  await calendarApi.month(2026, 10)
  assert.equal(reads, 1)
  await calendarApi.deleteReminder('fixture-reminder')
  await calendarApi.month(2026, 10)
  assert.equal(reads, 2)
  resetSession()
  await calendarApi.month(2026, 10)
  assert.equal(reads, 3)
})

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

test('CSV endpoint downloads keep the API base, Bearer auth and server filename metadata', async () => {
  resetSession(); saveApiSession(authResponse('csv-access','csv-refresh'))
  let url='',authorization=''
  globalThis.fetch = (async (input: RequestInfo | URL,init?:RequestInit) => {
    url=String(input); authorization=new Headers(init?.headers).get('Authorization') ?? ''
    return new Response('\ufeffid,title\n1,QA\n',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="report.csv"'}})
  }) as typeof fetch
  const result=await apiClient.download('/admin/reports/OPERATIONS/export?fromDate=2026-10-01&toDate=2026-10-12')
  assert.ok(url.startsWith('/api/v1/admin/reports/OPERATIONS/export?')); assert.equal(authorization,'Bearer csv-access'); assert.ok(result.blob.type.startsWith('text/csv')); assert.equal(result.contentDisposition,'attachment; filename="report.csv"')
})

test('CSV 422 and 429 failures throw once and preserve Retry-After without returning a fake blob',async()=>{
  for(const status of [422,429]) {
    resetSession(); saveApiSession(authResponse('csv-access','csv-refresh'));let calls=0
    globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({error:{code:'EXPORT_LIMIT',message:'Export failed',retryable:false}}),{status,headers:{'Content-Type':'application/json','Retry-After':'12'}})}) as typeof fetch
    await assert.rejects(apiClient.download('/admin/reports/REVENUE/export'),(reason:unknown)=>reason instanceof Error && 'status' in reason && reason.status===status && 'retryAfterMs' in reason && reason.retryAfterMs===12000)
    assert.equal(calls,1)
  }
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

test('logout clears local auth before revocation completes and cannot clear a newer login', async () => {
  resetSession()
  saveApiSession(authResponse('access-a', 'refresh-a'))
  let finish!: (response: Response) => void
  let requestBody: unknown
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body))
    return new Promise<Response>((resolve) => { finish = resolve })
  }) as typeof fetch
  const pending = authApi.logout()
  assert.equal(getSession(), null)
  assert.equal(sessionStorage.getItem('nutrimom.auth-session'), null)
  assert.deepEqual(requestBody, { refresh_token: 'refresh-a' })
  const next = authResponse('access-b', 'refresh-b')
  next.user.id = 'user-2'
  saveApiSession(next)
  finish(jsonResponse({ logged_out: true }))
  await pending
  assert.equal(getSession()?.user.id, 'user-2')
  assert.equal(getSession()?.accessToken, 'access-b')
})

test('failed logout revocation leaves local auth cleared', async () => {
  resetSession()
  saveApiSession(authResponse('access-a', 'refresh-a'))
  globalThis.fetch = (async () => jsonResponse({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } }, 503)) as typeof fetch
  const pending = authApi.logout()
  assert.equal(getSession(), null)
  await assert.rejects(pending)
  assert.equal(getSession(), null)
})
