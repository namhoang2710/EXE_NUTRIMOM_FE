import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDashboardCache,
  dashboardTtlMs,
} from '../src/core/api/dashboard-cache.ts'
import { createOverviewLoginEntry } from '../src/features/user/model/overview-login-entry.ts'
import { ApiClientError } from '../src/core/api/api-error.ts'

function setup() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
  let clock = Date.parse('2026-10-19T10:00:00Z')
  let identity = { account: 'mom-a', scope: '1:mom-a' }
  const freshCache = () =>
    createDashboardCache(
      storage,
      () => identity,
      () => clock,
    )
  return {
    storage,
    values,
    freshCache,
    advance: (ms: number) => {
      clock += ms
    },
    account: (account: string) => {
      identity = { account, scope: `2:${account}` }
    },
    cache: freshCache(),
  }
}
test('concurrent overview readers and route return share one request; refresh restores the snapshot', async () => {
  const f = setup()
  let calls = 0
  const load = async () => {
    calls++
    return { name: 'Minh Anh', week: 26 }
  }
  const [a, b] = await Promise.all([
    f.cache.read('mom', load),
    f.cache.read('mom', load),
  ])
  assert.deepEqual(a, b)
  await f.cache.read('mom', load)
  await f.freshCache().read('mom', load)
  assert.equal(calls, 1)
})
test('account and persona isolation prevent cached maternal data appearing for another user', async () => {
  const f = setup()
  await f.cache.read('mom', async () => ({ name: 'Minh Anh' }))
  assert.equal(f.cache.peek('partner'), null)
  f.account('partner-b')
  assert.equal(f.cache.peek('mom'), null)
  assert.equal(f.freshCache().peek('mom'), null)
})
test('dashboard expires after five minutes and at midnight in Vietnam', async () => {
  const f = setup()
  await f.cache.read('mom', async () => ({ week: 26 }))
  f.advance(dashboardTtlMs + 1)
  assert.equal(f.cache.peek('mom'), null)
  f.advance(
    Date.parse('2026-10-19T16:59:59Z') -
      Date.parse('2026-10-19T10:00:00Z') -
      dashboardTtlMs -
      1,
  )
  await f.cache.read('mom', async () => ({ week: 26 }))
  f.advance(2000)
  assert.equal(f.cache.peek('mom'), null)
})
test('failed and corrupt snapshots do not poison subsequent reads', async () => {
  const f = setup()
  await assert.rejects(
    f.cache.read('mom', async () => {
      throw new Error('429')
    }),
  )
  assert.equal(f.values.size, 0)
  await f.cache.read('mom', async () => ({ name: 'Minh Anh' }))
  const key = [...f.values.keys()][0]
  f.values.set(key, '{invalid json')
  assert.equal(f.freshCache().peek('mom'), null)
  assert.deepEqual(
    await f.freshCache().read('mom', async () => ({ name: 'New' })),
    { name: 'New' },
  )
})
test('profile and pregnancy invalidation rejects old in-flight writes and removes persisted greeting', async () => {
  const f = setup()
  let resolve!: (data: object) => void
  const pending = f.cache.read(
    'mom',
    () =>
      new Promise<object>((done) => {
        resolve = done
      }),
  )
  await Promise.resolve()
  f.cache.invalidate()
  resolve({ name: 'Old' })
  await assert.rejects(pending)
  await f.cache.read('mom', async () => ({ name: 'Updated' }))
  f.cache.invalidate()
  assert.equal(f.freshCache().peek('mom'), null)
})
test('a response from a previous login cannot be shown or persisted', async () => {
  const f = setup()
  let resolve!: (data: object) => void
  const pending = f.cache.read(
    'mom',
    () =>
      new Promise<object>((done) => {
        resolve = done
      }),
  )
  await Promise.resolve()
  f.account('other')
  resolve({ name: 'Old account' })
  await assert.rejects(pending)
  assert.equal(f.values.size, 0)
})
test('429 respects Retry-After and refresh cannot bypass its cooldown', async () => {
  const f = setup()
  let calls = 0
  const load = async () => {
    calls++
    throw new ApiClientError(
      429,
      { code: 'RATE_LIMITED', message: 'Thử lại sau.' },
      60_000,
    )
  }
  await assert.rejects(f.cache.read('mom', load))
  f.cache.invalidate()
  await assert.rejects(f.cache.read('mom', load))
  f.advance(59_999)
  await assert.rejects(f.cache.read('mom', load))
  assert.equal(calls, 1)
  await assert.rejects(f.freshCache().read('mom', load))
  assert.equal(calls, 1, 'reload keeps Retry-After protection')
  f.advance(2)
  await assert.rejects(f.cache.read('mom', load))
  assert.equal(calls, 2)
  f.cache.clear()
  await assert.rejects(f.cache.read('mom', load))
  assert.equal(calls, 3)
})
test('welcome token is one-use, scoped, short-lived and absent after a document reload', () => {
  let clock = 0
  const token = createOverviewLoginEntry(() => clock)
  assert.equal(token.consume('a'), false)
  token.arm('a')
  assert.equal(token.consume('a'), true)
  assert.equal(token.consume('a'), false)
  token.arm('a')
  assert.equal(token.consume('b'), false)
  token.arm('a')
  clock = 30_001
  assert.equal(token.consume('a'), false)
  token.arm('a')
  assert.equal(createOverviewLoginEntry(() => clock).consume('a'), false)
  token.clear()
  assert.equal(token.consume('a'), false)
})
test('login panel handoff survives a return route and cannot mark another session', () => {
  const entry = createOverviewLoginEntry()
  entry.arm('login-a')
  assert.equal(entry.panelsAlreadyOpened('login-a'), false)
  entry.markPanelsOpened('login-a')
  assert.equal(entry.panelsAlreadyOpened('login-a'), true)
  assert.equal(entry.panelsAlreadyOpened('login-b'), false)
  assert.equal(entry.consume('login-a'), true)
  assert.equal(entry.panelsAlreadyOpened('login-a'), false)
  entry.arm('login-b')
  entry.markPanelsOpened('login-a')
  assert.equal(entry.panelsAlreadyOpened('login-b'), false)
})
