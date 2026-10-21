import assert from 'node:assert/strict'
import test from 'node:test'
import { createNutritionResources } from '../src/features/nutrition/model/nutrition-resources.ts'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { StaleResourceError } from '../src/core/api/resource-cache.ts'
import {
  displayDate,
  noMatchExplanation,
  presentReasons,
} from '../src/features/nutrition/model/nutrition-presentation.ts'

const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
test('nutrition snapshots are synchronous, scoped, expire without extending TTL and respect invalidation', async () => {
  let time = 1000
  const resources = createNutritionResources(() => time)
  const value = { plan_version: 2 }
  assert.equal(resources.peek('a|plan:1', 15000), undefined)
  resources.seed('a|plan:1', value, 15000)
  assert.equal(resources.peek('a|plan:1', 15000), value)
  assert.equal(resources.peek('b|plan:1', 15000), undefined)
  time += 14999
  assert.equal(resources.peek('a|plan:1', 15000), value)
  time++
  assert.equal(resources.peek('a|plan:1', 15000), undefined)
  resources.seed('a|plan:1', value, 15000)
  resources.invalidate('a|plan:')
  assert.equal(resources.peek('a|plan:1', 15000), undefined)
  const pending = deferred<number>()
  const read = resources.read(
    'a|plan:1',
    () => pending.promise,
    15000,
    'personal',
  )
  await tick()
  assert.equal(resources.peek('a|plan:1', 15000), undefined)
  pending.resolve(3)
  await read
  assert.equal(resources.peek('a|plan:1', 15000), 3)
  resources.clear()
  assert.equal(resources.peek('a|plan:1', 15000), undefined)
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { resolve, promise }
}
test('nutrition reads share in-flight work, expire by resource TTL and support explicit refresh', async () => {
  let now = 1000,
    calls = 0
  const resources = createNutritionResources(() => now)
  const pending = deferred<number>()
  const load = () => {
    calls++
    return pending.promise
  }
  const first = resources.read('account|plan:a', load, 15000, 'personal')
  const second = resources.read('account|plan:a', load, 15000, 'personal')
  await tick()
  assert.equal(calls, 1)
  pending.resolve(7)
  assert.deepEqual(await Promise.all([first, second]), [7, 7])
  assert.equal(
    await resources.read('account|plan:a', load, 15000, 'personal'),
    7,
  )
  assert.equal(calls, 1)
  now += 15001
  await resources.read('account|plan:a', load, 15000, 'personal')
  assert.equal(calls, 2)
  await resources.read(
    'account|plan:a',
    load,
    15000,
    'personal',
    undefined,
    true,
  )
  assert.equal(calls, 3)
})
test('nutrition diary checks never exceed three simultaneous network reads', async () => {
  const resources = createNutritionResources()
  const gates = Array.from({ length: 7 }, () => deferred<number>())
  let active = 0,
    maximum = 0,
    started = 0
  const results = gates.map((gate, index) =>
    resources.read(
      `diary:${index}`,
      async () => {
        active++
        started++
        maximum = Math.max(maximum, active)
        try {
          return await gate.promise
        } finally {
          active--
        }
      },
      15000,
      'personal',
    ),
  )
  await tick()
  assert.equal(started, 3)
  gates.slice(0, 3).forEach((gate, i) => gate.resolve(i))
  await tick()
  assert.equal(started, 6)
  gates.slice(3).forEach((gate, i) => gate.resolve(i + 3))
  assert.deepEqual(await Promise.all(results), [0, 1, 2, 3, 4, 5, 6])
  assert.equal(maximum, 3)
})
test('429 stops queued personal reads and writes, honors Retry-After and leaves public catalog available', async () => {
  let now = 1000,
    calls = 0
  const resources = createNutritionResources(() => now)
  const error = new ApiClientError(
    429,
    { code: 'RATE_LIMITED', message: 'Chờ' },
    12000,
  )
  const failing = resources.read(
    'personal:failed',
    async () => {
      calls++
      throw error
    },
    1,
    'personal',
  )
  await assert.rejects(failing, error)
  assert.equal(resources.retryAt('personal'), 13000)
  await assert.rejects(
    resources.read(
      'personal:new',
      async () => {
        calls++
        return 1
      },
      1,
      'personal',
    ),
    error,
  )
  await assert.rejects(
    resources.write(async () => {
      calls++
      return 1
    }),
    error,
  )
  assert.equal(calls, 1)
  assert.equal(
    await resources.read(
      'catalog:recipes',
      async () => 'available',
      1,
      'catalog',
    ),
    'available',
  )
  now = 13001
  assert.equal(
    await resources.write(async () => {
      calls++
      return 'manual retry'
    }),
    'manual retry',
  )
  assert.equal(calls, 2)
})
test('obsolete queued filters are cancelled before reaching the network', async () => {
  const resources = createNutritionResources()
  const gate = deferred<number>()
  const occupying = [0, 1, 2].map((i) =>
    resources.read(`busy:${i}`, () => gate.promise, 100, 'catalog'),
  )
  await tick()
  let calls = 0
  const controller = new AbortController()
  const queued = resources.read(
    'old-filter',
    async () => {
      calls++
      return 1
    },
    100,
    'catalog',
    controller.signal,
  )
  controller.abort()
  await assert.rejects(queued, { name: 'AbortError' })
  gate.resolve(1)
  await Promise.all(occupying)
  await tick()
  assert.equal(calls, 0)
})
test('429 without Retry-After uses a 30 second cooldown and does not retry a mutation', async () => {
  const resources = createNutritionResources(() => 500)
  let calls = 0
  const error = new ApiClientError(429, {
    code: 'RATE_LIMITED',
    message: 'Chờ',
  })
  await assert.rejects(
    resources.write(async () => {
      calls++
      throw error
    }),
    error,
  )
  assert.equal(resources.retryAt('personal'), 30500)
  await tick()
  assert.equal(calls, 1)
})
test('a cancelled consumer cannot cancel another consumer and late reads cannot replace seeded mutation responses', async () => {
  const resources = createNutritionResources()
  const gate = deferred<number>()
  const controller = new AbortController()
  const cancelled = resources.read(
    'user-a|plan',
    () => gate.promise,
    15000,
    'personal',
    controller.signal,
  )
  const remaining = resources.read(
    'user-a|plan',
    () => gate.promise,
    15000,
    'personal',
  )
  controller.abort()
  await assert.rejects(cancelled, { name: 'AbortError' })
  await tick()
  resources.seed('user-a|plan', 20, 15000)
  gate.resolve(1)
  await assert.rejects(remaining, StaleResourceError)
  assert.equal(
    await resources.read('user-a|plan', async () => 99, 15000, 'personal'),
    20,
  )
  assert.equal(
    await resources.read('user-b|plan', async () => 30, 15000, 'personal'),
    30,
  )
})
test('prefix invalidation and clearing discard personal data and cooldowns', async () => {
  const resources = createNutritionResources()
  resources.seed('a|diary:one', 1, 15000)
  resources.seed('a|diary:two', 2, 15000)
  resources.seed('a|recipe:public', 9, 300000)
  resources.invalidate('a|diary:')
  assert.equal(
    await resources.read('a|diary:two', async () => 3, 15000, 'personal'),
    3,
  )
  assert.equal(
    await resources.read('a|recipe:public', async () => 0, 300000, 'catalog'),
    9,
  )
  resources.clear()
  assert.equal(
    await resources.read('a|recipe:public', async () => 4, 300000, 'catalog'),
    4,
  )
  assert.equal(resources.retryAt('personal'), 0)
})
test('nutrition explanations hide raw identifiers, deduplicate and retain useful human messages', () => {
  const messages = presentReasons([
    {
      code: 'ROLE_NO_CANDIDATE',
      message: 'MAIN_DISH LUNCH STRICT_BUDGET_WITHOUT_PRICE',
    },
    { code: 'ROLE_NO_CANDIDATE', message: 'MAIN_DISH DINNER' },
    { code: 'UNKNOWN', message: 'ing.fish rec.rice profile_version' },
    { code: 'HUMAN', message: 'Kiểm tra nhãn thành phần trước khi mua.' },
  ])
  assert.equal(messages.length, 3)
  assert.ok(
    messages.every(
      ({ text }) => !/MAIN_DISH|LUNCH|ing\.|rec\.|profile_version/.test(text),
    ),
  )
  assert.ok(messages.some(({ text }) => text.includes('Kiểm tra nhãn')))
  assert.equal(
    noMatchExplanation([{ code: 'STRICT_BUDGET_WITHOUT_PRICE', message: '' }])
      .budget,
    true,
  )
  assert.equal(
    noMatchExplanation([{ code: 'SEARCH_LIMIT', message: '' }]).budget,
    false,
  )
  assert.equal(displayDate('2026-10-19'), '19/10/2026')
})
test('revalidation explains specific ingredients, eaten-meal preservation and technical conflict fallback', () => {
  const notes = presentReasons([
    {
      code: 'ALLERGEN_MATCH',
      message: 'Món có tôm, xung đột với dị ứng đã khai.',
    },
    {
      code: 'ALLERGEN_VIA_COMPONENT',
      message: 'ing.sauce contains alg.shrimp ALLERGEN_VIA_COMPONENT',
    },
    { code: 'HARD_EXCLUSION', message: 'HARD_EXCLUSION ing.fish' },
    { code: 'DIET_PATTERN_CONFLICT', message: 'DIET_PATTERN_CONFLICT' },
    { code: 'PLAN_KEPT_EATEN_MEAL', message: 'PLAN_KEPT_EATEN_MEAL LUNCH' },
  ])
  assert.equal(notes[0].text, 'Món có tôm, xung đột với dị ứng đã khai.')
  assert.ok(notes.every(({ text }) => !/ing\.|alg\.|[A-Z]{4,}_/.test(text)))
  assert.ok(notes.at(-1)!.text.includes('giữ nguyên'))
})
