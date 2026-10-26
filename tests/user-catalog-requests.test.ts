import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
const events = new EventTarget()
Object.assign(globalThis, { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage(), window: {
  location: { origin: 'http://localhost:5173' }, addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events), setTimeout, clearTimeout,
} })
const tokens = await import('../src/core/auth/token-store.ts')
async function moduleFrom(file: string, imports: Record<string, string>) {
  let source = await readFile(new URL(file, import.meta.url), 'utf8')
  for (const [alias, path] of Object.entries(imports)) source = source.replaceAll(`'${alias}'`, `'${path.startsWith('data:') ? path : new URL(path, import.meta.url).href}'`)
  return import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
}
const shared = {
  '@/core/api/api-client': '../src/core/api/api-client.ts',
  '@/core/api/profile-requests': '../src/core/api/profile-requests.ts',
  '@/core/auth/token-store': '../src/core/auth/token-store.ts',
}
const { expertsApi } = await moduleFrom('../src/features/experts/api/experts-api.ts', {
  ...shared, '../model/expert-mappers': '../src/features/experts/model/expert-mappers.ts',
})
// These tests exercise public/user requests only; Admin has its own runtime suite.
const adminStub = 'data:text/javascript,' + encodeURIComponent('export const adminRead = () => { throw Error("Unexpected Admin read") }; export const adminMutation = () => { throw Error("Unexpected Admin mutation") }')
const { knowledgeApi } = await moduleFrom('../src/features/knowledge/api/knowledge-api.ts', {
  ...shared, '../model/knowledge-query': '../src/features/knowledge/model/knowledge-query.ts',
  '../model/knowledge-endpoints': '../src/features/knowledge/model/knowledge-endpoints.ts', '@/features/admin/api/admin-read': adminStub,
})
function login(id = 'user-a') {
  tokens.clearSession()
  tokens.saveApiSession({ access_token: 'synthetic', refresh_token: 'synthetic-refresh', expires_in: 900, refresh_expires_in: 3600, token_type: 'Bearer', user: { id, phone: '0900000000', display_name: 'QA', roles: ['USER'], status: 'ACTIVE', created_at: '2026-10-24T00:00:00Z' } })
}
const json = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } })
const expert = { user_id: 'expert-a', full_name: 'Chuyên gia QA', specialty: 'HEALTH', years_of_experience: 5, rating_count: 2, average_rating: 4.5 }

test('expert reads share transport, survive one cancelled consumer, cache and invalidate after an expert change', async () => {
  login(); let calls = 0
  globalThis.fetch = (async () => { calls++; return json([expert]) }) as typeof fetch
  const controller = new AbortController()
  const cancelled = expertsApi.list(null, controller.signal)
  const active = expertsApi.list(null)
  controller.abort()
  await assert.rejects(cancelled, { name: 'AbortError' })
  assert.equal((await active)[0].userId, 'expert-a')
  await expertsApi.list(null); assert.equal(calls, 1)
  expertsApi.invalidate(); await expertsApi.list(null); assert.equal(calls, 2)
})

test('expert cache cannot supply the previous account after a session change', async () => {
  login(); let calls = 0
  globalThis.fetch = (async () => { calls++; return json([expert]) }) as typeof fetch
  await expertsApi.list('HEALTH'); login('user-b'); await expertsApi.list('HEALTH')
  assert.equal(calls, 2)
})

test('knowledge list and article each coalesce concurrent readers and reuse recent responses', async () => {
  login(); const paths: string[] = []
  globalThis.fetch = (async (url) => { paths.push(String(url)); return json(String(url).includes('/article-a') ? { slug: 'article-a' } : { items: [], totalPages: 0 }) }) as typeof fetch
  await Promise.all([knowledgeApi.listArticles({ page: 1 }), knowledgeApi.listArticles({ page: 1 }), knowledgeApi.getArticle('article-a'), knowledgeApi.getArticle('article-a')])
  await knowledgeApi.listArticles({ page: 1 }); await knowledgeApi.getArticle('article-a')
  assert.equal(paths.length, 2)
})

test('bookmark changes expire saved results and article reads without replaying the mutation', async () => {
  login(); const requests: string[] = []
  globalThis.fetch = (async (_url, options) => { requests.push(options?.method || 'GET'); return json(options?.method === 'PUT' ? true : { items: [], totalPages: 0 }) }) as typeof fetch
  await knowledgeApi.listArticles({ savedOnly: true }); await knowledgeApi.getArticle('article-a')
  await knowledgeApi.saveBookmark('article-a')
  await knowledgeApi.listArticles({ savedOnly: true }); await knowledgeApi.getArticle('article-a')
  assert.deepEqual(requests, ['GET', 'GET', 'PUT', 'GET', 'GET'])
})

test('late bookmark completion from the previous account cannot invalidate the new account cache', async () => {
  login(); let resolveWrite!: (value: Response) => void; let signalWriteStarted!: () => void
  const started = new Promise<void>(resolve => { signalWriteStarted = resolve })
  let reads = 0
  globalThis.fetch = (async (_url, options) => {
    if (options?.method === 'PUT') { signalWriteStarted(); return new Promise<Response>(resolve => { resolveWrite = resolve }) }
    reads++; return json({ slug: 'article-a' })
  }) as typeof fetch
  const oldWrite = knowledgeApi.saveBookmark('article-a')
  await started; login('user-b'); await knowledgeApi.getArticle('article-a')
  resolveWrite(json(true)); await assert.rejects(oldWrite)
  await knowledgeApi.getArticle('article-a'); assert.equal(reads, 1)
})

test('knowledge 429 blocks a changed filter before transport and never schedules an automatic retry', async () => {
  login(); let calls = 0
  globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'QA' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }) }) as typeof fetch
  await assert.rejects(knowledgeApi.listArticles({ page: 1 }))
  await assert.rejects(knowledgeApi.listArticles({ page: 2, category: 'nutrition' }))
  assert.equal(calls, 1)
})
