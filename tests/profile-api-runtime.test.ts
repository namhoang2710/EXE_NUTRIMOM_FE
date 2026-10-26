import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBinaryUrl } from '../src/core/api/binary-url.ts'
import type { AuthResponseDto } from '../src/features/auth/model/auth-dto.ts'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
const events = new EventTarget()
Object.assign(globalThis, {
  window: {
    location: { origin: 'http://localhost:5173' },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events), setTimeout, clearTimeout,
  },
  localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage(),
})
const { apiClient, setRefreshHandler } = await import('../src/core/api/api-client.ts')
const { clearSession, saveApiSession, getSessionScope } = await import('../src/core/auth/token-store.ts')
const { profileRead, invalidateProfileResources } = await import('../src/core/api/profile-requests.ts')
const { env } = await import('../src/core/config/env.ts')
const { userApi } = await import('../src/features/user/api/user-api.ts')
const { authApi } = await import('../src/features/auth/api/auth-api.ts')
const { filesApi, recordsApi, pregnancyApi, sha256, uploadContent } = await import('../src/features/maternity/api/domain-api.ts')
const { clearDiagnosticEvents, getDiagnosticEvents } = await import('../src/core/diagnostics/logger.ts')

function response(user = 'u1', access = 'secret-jwt'): AuthResponseDto {
  return {
    access_token: access, refresh_token: 'refresh', expires_in: 900, refresh_expires_in: 3600, token_type: 'Bearer',
    user: { id: user, phone: '0900000000', display_name: 'Synthetic', roles: ['USER'], status: 'ACTIVE', created_at: '2026-10-12T00:00:00Z' },
  } as AuthResponseDto
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(status < 400 ? { data } : { error: data }), { status, headers: { 'Content-Type': 'application/json' } })
}
function reset() {
  clearSession(); saveApiSession(response()); setRefreshHandler(null)
  Object.assign(env, { apiBaseUrl: '/api/v1' })
  clearDiagnosticEvents()
}

test('binary URLs preserve signed query and avoid duplicating API paths with proxy or another API origin', () => {
  const query = '/api/v1/files/f/content?token=a%2Fb%2Bz&x=1'
  assert.equal(resolveBinaryUrl(query, '/api/v1', 'http://localhost:5173'), `http://localhost:5173${query}`)
  assert.equal(resolveBinaryUrl(query, 'https://api.example.test/api/v1', 'http://localhost:5173'), `https://api.example.test${query}`)
  assert.equal(resolveBinaryUrl('https://api.example.test/api/v1/files/f/content?token=abc', 'https://api.example.test/api/v1', 'http://localhost:5173'), 'https://api.example.test/api/v1/files/f/content?token=abc')
})

test('PUT raw bytes accepts 204 and keeps required BE headers and API auth in both deployments', async () => {
  for (const base of ['/api/v1', 'https://api.example.test/api/v1']) {
    reset(); Object.assign(env, { apiBaseUrl: base })
    const file = new File(['synthetic'], 'synthetic.png', { type: 'image/png' })
    let seen = 0
    globalThis.fetch = (async (url: RequestInfo | URL, options?: RequestInit) => {
      seen += 1
      assert.equal(String(url), `${base.startsWith('https') ? 'https://api.example.test' : 'http://localhost:5173'}/api/v1/files/f/content`)
      const headers = new Headers(options?.headers)
      assert.equal(headers.get('Authorization'), 'Bearer secret-jwt')
      assert.equal(headers.get('Content-Type'), 'image/png')
      assert.equal(headers.get('X-File-Id'), 'f')
      assert.equal(options?.body, file)
      return new Response(null, { status: 204 })
    }) as typeof fetch
    await uploadContent({ file_id: 'f', upload_url: '/api/v1/files/f/content', headers: { 'Content-Type': 'image/png', 'X-File-Id': 'f' }, expires_at: '2099-01-01' }, file)
    assert.equal(seen, 1)
  }
})

test('absolute same API origin gets auth; external storage is rejected before any JWT/header/cookie transmission', async () => {
  reset(); Object.assign(env, { apiBaseUrl: 'https://api.example.test/api/v1' })
  let calls = 0
  globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
    calls += 1; assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer secret-jwt')
    return new Response('synthetic', { headers: { 'Content-Type': 'application/pdf' } })
  }) as typeof fetch
  assert.equal(await (await apiClient.binary('https://api.example.test/api/v1/files/f/content')).text(), 'synthetic')
  await assert.rejects(apiClient.binary('https://storage.example.test/object?signature=private'), /không thuộc/)
  assert.equal(calls, 1)
})

test('binary 401 uses shared refresh once and retry keeps raw response mode', async () => {
  reset()
  let refreshes = 0, attempts = 0
  setRefreshHandler(async () => { refreshes += 1; saveApiSession(response('u1', 'fresh'), true) })
  globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
    attempts += 1
    if (new Headers(options?.headers).get('Authorization') !== 'Bearer fresh') return json({ code: 'UNAUTHORIZED', message: 'expired' }, 401)
    return new Response('bytes', { headers: { 'Content-Type': 'application/pdf' } })
  }) as typeof fetch
  assert.equal(await (await apiClient.binary('/api/v1/files/f/content')).text(), 'bytes')
  assert.equal(refreshes, 1); assert.equal(attempts, 2)
})

test('binary timeout and cancellation abort requests', async () => {
  reset()
  globalThis.fetch = ((_url: RequestInfo | URL, options?: RequestInit) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })) as typeof fetch
  await assert.rejects(apiClient.binary('/api/v1/files/f/content', { timeoutMs: 5 }), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'REQUEST_TIMEOUT')
  const controller = new AbortController()
  const pending = apiClient.binary('/api/v1/files/f/content', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, (error: unknown) => error instanceof Error && 'code' in error && error.code === 'REQUEST_ABORTED')
})

test('profile mutation makes one PATCH, primes the read cache and preserves conflict errors', async () => {
  reset()
  const methods: string[] = []
  globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
    methods.push(options?.method ?? 'GET')
    return json({ id: 'u1', display_name: 'Updated', version: 2 })
  }) as typeof fetch
  const updated = await userApi.updateProfile({ display_name: 'Updated', version: 1 })
  assert.equal((await userApi.profile()).version, updated.version)
  assert.deepEqual(methods, ['PATCH'])
  globalThis.fetch = (async () => json({ code: 'VERSION_CONFLICT', message: 'conflict' }, 409)) as typeof fetch
  await assert.rejects(userApi.updateProfile({ display_name: 'Retry', version: 1 }), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'VERSION_CONFLICT')
})

test('two restore consumers call auth/me and users/me once each; a fresh remount adds no GET', async () => {
  reset()
  const calls: string[] = []
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    calls.push(String(url))
    return json(String(url).endsWith('/auth/me') ? response().user : { id: 'u1', display_name: 'Synthetic', version: 1 })
  }) as typeof fetch
  await Promise.all([authApi.me(), authApi.me(), userApi.profile(), userApi.profile()])
  assert.deepEqual(calls.sort(), ['/api/v1/auth/me', '/api/v1/users/me'])
  await Promise.all([authApi.me(), userApi.profile()])
  assert.equal(calls.length, 2)
})

test('account replacement while binary fetch is in flight cannot publish previous user bytes', async () => {
  reset()
  let resolve!: (response: Response) => void
  globalThis.fetch = (async () => new Promise<Response>((yes) => { resolve = yes })) as typeof fetch
  const old = apiClient.binary('/api/v1/files/old/content')
  saveApiSession(response('u2'))
  resolve(new Response('private old bytes'))
  await assert.rejects(old, (error: unknown) => error instanceof Error && 'code' in error && error.code === 'REQUEST_ABORTED')
})

test('session rotation retains fresh reads; account replacement and logout discard pending old data', async () => {
  reset()
  let calls = 0
  const read = () => profileRead('user:test', async () => ++calls)
  const scope = getSessionScope()
  assert.equal(await read(), 1)
  saveApiSession(response('u1', 'rotated'), true)
  assert.equal(getSessionScope(), scope)
  assert.equal(await read(), 1)
  let resolve!: (value: number) => void
  const stale = profileRead('user:pending', () => new Promise<number>((yes) => { resolve = yes }))
  await Promise.resolve()
  saveApiSession(response('u2'))
  resolve(99)
  await assert.rejects(stale, /Dữ liệu đã thay đổi/)
  assert.equal(await read(), 2)
  clearSession(); assert.equal(await read(), 3)
})

test('same-user new login is a new scope; targeted invalidation leaves other resources fresh', async () => {
  reset(); const before = getSessionScope()
  saveApiSession(response())
  assert.notEqual(getSessionScope(), before)
  let a = 0, b = 0
  await profileRead('care:items', async () => ++a)
  await profileRead('records:list:p:first', async () => ++b)
  invalidateProfileResources('records:')
  assert.equal(await profileRead('care:items', async () => ++a), 1)
  assert.equal(await profileRead('records:list:p:first', async () => ++b), 2)
})

test('detail consumers share GET and reopening uses TTL; list filters/cursors stay separate', async () => {
  reset(); const calls: string[] = []
  globalThis.fetch = (async (url: RequestInfo | URL) => { calls.push(String(url)); return json({ id: 'r1', items: [] }) }) as typeof fetch
  await Promise.all([recordsApi.get('r1'), recordsApi.get('r1')])
  await recordsApi.get('r1')
  assert.equal(calls.length, 1)
  await Promise.all([recordsApi.list('?pregnancy_id=p&category=ULTRASOUND'), recordsApi.list('?category=ULTRASOUND&pregnancy_id=p')])
  await recordsApi.list('?pregnancy_id=p&cursor=c2')
  assert.equal(calls.length, 3)
})

test('download coalesces link and binary, renews an expired link once, and keeps signed query out of diagnostics', async () => {
  reset(); let links = 0, bytes = 0
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    if (String(url).endsWith('download-url')) { links += 1; return json({ download_url: `/api/v1/files/f/content?token=secret-signature-${links}` }) }
    bytes += 1
    if (bytes === 1) return json({ code: 'FORBIDDEN', message: 'expired' }, 403)
    return new Response('synthetic', { headers: { 'Content-Type': 'application/pdf' } })
  }) as typeof fetch
  const [a, b] = await Promise.all([filesApi.downloadBlob('f'), filesApi.downloadBlob('f')])
  assert.equal(await a.text(), 'synthetic'); assert.equal(await b.text(), 'synthetic')
  assert.equal(links, 2); assert.equal(bytes, 2)
  assert.equal(JSON.stringify(getDiagnosticEvents()).includes('secret-signature'), false)
  await filesApi.downloadBlob('f'); assert.equal(links, 3)
})

test('foreign-user and storage errors are surfaced', async () => {
  reset(); let calls = 0
  globalThis.fetch = (async () => { calls += 1; return json({ code: 'FORBIDDEN', message: 'foreign' }, 403) }) as typeof fetch
  await assert.rejects(filesApi.downloadBlob('foreign'), /foreign/)
  assert.equal(calls, 1)
  globalThis.fetch = (async () => json({ code: 'FILE_STORAGE_UNAVAILABLE', message: 'storage offline', retryable: true }, 502)) as typeof fetch
  await assert.rejects(filesApi.createSession({ purpose: 'MEDICAL_RECORD', file_name: 'synthetic.pdf', mime_type: 'application/pdf', size_bytes: 5, sha256: 'hash' }), /storage offline/)
})

test('SHA-256 uses actual bytes rather than metadata', async () => {
  assert.equal(await sha256(new File(['abc'], 'synthetic.pdf', { type: 'application/pdf' })), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('pregnancy history coalesces reads, is cached by status and is isolated across accounts', async () => {
  reset(); const calls: string[] = []
  globalThis.fetch = (async (url: RequestInfo | URL) => { calls.push(String(url)); return json([{ id: 'closed', status: 'COMPLETED' }]) }) as typeof fetch
  const [first, second] = await Promise.all([pregnancyApi.list(), pregnancyApi.list()])
  assert.deepEqual(first, second)
  await pregnancyApi.list()
  assert.equal(calls.length, 1)
  assert.ok(calls[0].endsWith('/pregnancies'))
  await pregnancyApi.list('COMPLETED')
  assert.ok(calls[1].endsWith('/pregnancies?status=COMPLETED'))
  saveApiSession(response('another-mom'))
  await pregnancyApi.list()
  assert.equal(calls.length, 3)
})

test('closing a pregnancy invalidates history and never seeds it as current', async () => {
  reset(); let historyReads = 0, currentReads = 0
  globalThis.fetch = (async (url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'PATCH') return json({ id: 'old', status: 'COMPLETED', version: 1 })
    if (String(url).endsWith('/current')) { currentReads += 1; return json({ code: 'RESOURCE_NOT_FOUND', message: 'No active pregnancy' }, 404) }
    historyReads += 1; return json([{ id: 'old', status: 'ACTIVE' }])
  }) as typeof fetch
  await pregnancyApi.list()
  await pregnancyApi.update('old', { status: 'COMPLETED', version: 0 })
  await pregnancyApi.list()
  await assert.rejects(pregnancyApi.current(), /No active pregnancy/)
  assert.equal(historyReads, 2); assert.equal(currentReads, 1)
})

test('historical record mutations invalidate all-pregnancy and that pregnancy lists', async () => {
  reset(); const reads: string[] = []
  globalThis.fetch = (async (url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'DELETE') return new Response(null, { status: 204 })
    if (options?.method === 'PATCH') return json({ id: 'historical-record', pregnancy_id: 'old', version: 1 })
    reads.push(String(url)); return json({ items: [], has_more: false })
  }) as typeof fetch
  const load = () => Promise.all([recordsApi.list('?limit=12'), recordsApi.list('?pregnancy_id=old'), recordsApi.list('?pregnancy_id=current')])
  await load(); assert.equal(reads.length, 3)
  await recordsApi.update('historical-record', { version: 0 })
  await load(); assert.equal(reads.length, 5)
  await recordsApi.remove('historical-record', 'old')
  await load(); assert.equal(reads.length, 7)
  assert.equal(reads.filter((path) => path.endsWith('pregnancy_id=current')).length, 1)
})

test('records 429 respects Retry-After across filters without an automatic retry', async () => {
  reset(); let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return calls === 1 ? new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Chờ rồi thử lại' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '1' } }) : json({ items: [] })
    }) as typeof fetch
    await assert.rejects(recordsApi.list('?limit=12'), (reason: unknown) => reason instanceof Error && 'retryAfterMs' in reason && reason.retryAfterMs === 1000)
    await assert.rejects(recordsApi.list('?pregnancy_id=old'), (reason: unknown) => reason instanceof Error && 'status' in reason && reason.status === 429)
    assert.equal(calls, 1)
    await new Promise((resolve) => setTimeout(resolve, 1100))
    assert.equal(calls, 1)
    await recordsApi.list('?pregnancy_id=old')
    assert.equal(calls, 2)
})
