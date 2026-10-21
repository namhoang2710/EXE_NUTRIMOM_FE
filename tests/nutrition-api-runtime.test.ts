import assert from 'node:assert/strict'
import test from 'node:test'
class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
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
const { nutritionApi } =
  await import('../src/features/nutrition/api/nutrition-api.ts')
const { saveApiSession } = await import('../src/core/auth/token-store.ts')
saveApiSession({
  access_token: 'nutrition-token',
  expires_in: 900,
  refresh_token: 'refresh',
  refresh_expires_in: 10000,
  token_type: 'Bearer',
  user: {
    id: 'nutrition-user',
    phone: '0901111111',
    display_name: 'QA',
    roles: ['USER'],
    status: 'ACTIVE',
    created_at: '2026-10-01T00:00:00Z',
  },
})
const requests: {
  url: string
  init: RequestInit | undefined
  body: Record<string, unknown> | undefined
}[] = []
globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
  requests.push({
    url: String(url),
    init,
    body: init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : undefined,
  })
  const path = String(url).split('?')[0]
  const plan = { plan_id: 'runtime-plan', days: [] }
  const data = path.includes('/shopping')
    ? {
        plan_id: 'runtime-plan',
        start_date: '2026-10-19',
        end_date: '2026-10-19',
        groups: [],
      }
    : path.endsWith('/meal-plans')
      ? plan
      : path.includes('/meal-plans/')
        ? { plan }
        : path.includes('/diary')
          ? { local_date: '2026-10-19' }
          : { profile: { profile_version: 3 } }
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch
test('public catalog is unauthenticated, while personal APIs attach the current token', async () => {
  await nutritionApi.recipes({ mealType: 'LUNCH', maxMinutes: 25 })
  assert.equal(
    new Headers(requests.at(-1)!.init?.headers).has('Authorization'),
    false,
  )
  assert.equal(
    requests.at(-1)!.url,
    '/api/v1/recipes?mealType=LUNCH&maxMinutes=25',
  )
  await nutritionApi.profile()
  assert.equal(
    new Headers(requests.at(-1)!.init?.headers).get('Authorization'),
    'Bearer nutrition-token',
  )
})
test('diary CRUD and feedback use the domain base once and retain confirmation payloads', async () => {
  await nutritionApi.diary('2026-10-19')
  assert.equal(requests.at(-1)!.url, '/api/v1/diary?date=2026-10-19')
  const body = {
    request_id: 'same-retry',
    local_date: '2026-10-19',
    meal_type: 'DINNER' as const,
    servings: 0.875,
    source_plan_item_id: 'item-a',
  }
  await nutritionApi.createDiary(body)
  assert.deepEqual(requests.at(-1)!.body, body)
  assert.equal(requests.at(-1)!.url, '/api/v1/diary-entries')
  await nutritionApi.patchDiary('entry/a', {
    servings: 1,
    local_date: '2026-10-20',
  })
  assert.equal(requests.at(-1)!.url, '/api/v1/diary-entries/entry%2Fa')
  assert.deepEqual(requests.at(-1)!.body, {
    servings: 1,
    local_date: '2026-10-20',
  })
  await nutritionApi.deleteDiary('entry/a')
  assert.equal(requests.at(-1)!.init!.method, 'DELETE')
  await nutritionApi.feedback('recipe-a', 'HARD_NOW')
  assert.equal(requests.at(-1)!.url, '/api/v1/meal-feedback')
  assert.deepEqual(requests.at(-1)!.body, {
    recipe_id: 'recipe-a',
    type: 'HARD_NOW',
  })
})
test('incremental onboarding never sends omitted lists, but keeps explicit empty clears', async () => {
  await nutritionApi.saveProfile({
    allergy_status: 'KNOWN_NONE',
    allergen_ids: [],
  })
  assert.deepEqual(requests.at(-1)!.body, {
    allergy_status: 'KNOWN_NONE',
    allergen_ids: [],
  })
  await nutritionApi.saveProfile({
    meal_types: ['LUNCH'],
    height_cm: undefined,
  })
  assert.deepEqual(requests.at(-1)!.body, { meal_types: ['LUNCH'] })
})
test('save sends only the preview identifier and edits include both expected versions', async () => {
  await nutritionApi.savePlan('preview-one')
  assert.deepEqual(requests.at(-1)!.body, { preview_id: 'preview-one' })
  await nutritionApi.patchItem('plan/a', 'item/b', {
    expected_plan_version: 2,
    expected_profile_version: 7,
    servings: 1.25,
  })
  assert.equal(
    requests.at(-1)!.url,
    '/api/v1/meal-plans/plan%2Fa/items/item%2Fb',
  )
  assert.deepEqual(requests.at(-1)!.body, {
    expected_plan_version: 2,
    expected_profile_version: 7,
    servings: 1.25,
  })
  await nutritionApi.undo('plan', {
    expected_plan_version: 3,
    expected_profile_version: 7,
  })
  assert.equal(requests.at(-1)!.init?.method, 'POST')
})
test('shopping CRUD uses existing base once, correct verbs and no plan-version fabrication', async () => {
  await nutritionApi.addShopping(
    'plan',
    { exclude_item_ids: [], start_date: '2026-10-18' },
    { text: 'Giấy ăn', quantity: 2, unit: 'gói' },
  )
  assert.equal(
    requests.at(-1)!.url,
    '/api/v1/meal-plans/plan/shopping-list/items?start_date=2026-10-18',
  )
  assert.equal(requests.at(-1)!.init?.method, 'POST')
  await nutritionApi.patchShopping('row', {
    state: 'HAVE',
    have_quantity: 0.5,
    unit: 'kg',
  })
  assert.deepEqual(requests.at(-1)!.body, {
    state: 'HAVE',
    have_quantity: 0.5,
    unit: 'kg',
  })
  await nutritionApi.deleteShopping('row')
  assert.equal(requests.at(-1)!.init?.method, 'DELETE')
})
test('409 propagates once without replaying a write', async () => {
  let count = 0
  globalThis.fetch = (async () => {
    count++
    return new Response(
      JSON.stringify({
        error: { code: 'VERSION_CONFLICT', message: 'Changed' },
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch
  await assert.rejects(
    nutritionApi.patchItem('p', 'i', {
      expected_plan_version: 1,
      expected_profile_version: 1,
      locked: true,
    }),
    (error: unknown) =>
      error instanceof Error && 'status' in error && error.status === 409,
  )
  assert.equal(count, 1)
})
test('profile save keeps revalidation ids across plans and seeds complete profile without a GET', async () => {
  const { nutritionResources } =
    await import('../src/features/nutrition/api/nutrition-requests.ts')
  nutritionResources.clear()
  const calls: string[] = []
  const result = {
    profile_version: 9,
    profile: {
      profile_id: 'current',
      profile_version: 9,
      daily_budget_vnd: 150000,
    },
    items_to_revalidate: ['current-item', 'other-plan-item'],
  }
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    calls.push(String(url))
    return new Response(JSON.stringify({ data: result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  assert.deepEqual(
    await nutritionApi.saveProfile({ daily_budget_vnd: 150000 }),
    result,
  )
  assert.deepEqual(await nutritionApi.profile(), result.profile)
  assert.deepEqual(calls, ['/api/v1/me/nutrition-profile'])
})
test('idempotency conflict preserves its distinct code and field without replay or read recovery', async () => {
  const calls: string[] = []
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    calls.push(String(url))
    return new Response(
      JSON.stringify({
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Different payload',
          fields: { request_id: 'stable' },
        },
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch
  await assert.rejects(
    nutritionApi.createDiary({
      request_id: 'stable',
      local_date: '2026-10-20',
      meal_type: 'LUNCH',
      custom_text: 'Cháo',
    }),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'IDEMPOTENCY_CONFLICT' &&
      'fields' in error &&
      (error.fields as Record<string, string>).request_id === 'stable',
  )
  assert.deepEqual(calls, ['/api/v1/diary-entries'])
})
test('plan mutation resolving after profile save cannot replace the freshly revalidated cache', async () => {
  const { nutritionResources } =
    await import('../src/features/nutrition/api/nutrition-requests.ts')
  nutritionResources.clear()
  let release!: (response: Response) => void
  let started!: () => void
  const pending = new Promise<Response>((resolve) => {
    release = resolve
  })
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  const currentPlan = {
    plan_id: 'late',
    plan_version: 2,
    days: [],
    lifecycle_state: 'NEEDS_UPDATE',
  }
  const response = (data: unknown) =>
    new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  let planReads = 0
  let shoppingReads = 0
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      started()
      return pending
    }
    if (String(url).endsWith('/me/nutrition-profile'))
      return response({
        profile: { profile_version: 10 },
        profile_version: 10,
        items_to_revalidate: ['held'],
      })
    if (String(url).includes('/shopping-list'))
      return response({
        plan_id: 'late',
        shopping_list_version: ++shoppingReads,
      })
    planReads++
    return response(currentPlan)
  }) as typeof fetch
  await nutritionApi.shopping('late', { exclude_item_ids: [] })
  const mutation = nutritionApi.patchItem('late', 'held', {
    expected_plan_version: 1,
    expected_profile_version: 9,
    locked: true,
  })
  await requested
  await nutritionApi.saveProfile({
    allergy_status: 'KNOWN_LIST',
    allergen_ids: ['shrimp'],
  })
  assert.deepEqual(await nutritionApi.plan('late'), currentPlan)
  release(
    response({
      plan: { ...currentPlan, lifecycle_state: 'SAVED', plan_version: 1 },
    }),
  )
  await mutation
  assert.deepEqual(await nutritionApi.plan('late'), currentPlan)
  assert.equal(planReads, 1)
  assert.equal(
    (await nutritionApi.shopping('late', { exclude_item_ids: [] }))
      .shopping_list_version,
    2,
  )
})

test('synchronous nutrition snapshots publish confirmed data and invalidate a plan after profile changes', async () => {
  const { nutritionResources } =
    await import('../src/features/nutrition/api/nutrition-requests.ts')
  nutritionResources.clear()
  let calls = 0
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls++
    const data = String(url).includes('/me/nutrition-profile')
      ? init?.method === 'PUT'
        ? {
            profile: { profile_version: 4 },
            profile_version: 4,
            items_to_revalidate: [],
          }
        : { profile_version: 3 }
      : String(url).includes('/diary?')
        ? { local_date: '2026-10-20', entries: [] }
        : { plan_id: 'cached-plan', plan_version: 2 }
    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  assert.equal(nutritionApi.cached.profile(), undefined)
  await Promise.all([
    nutritionApi.profile(),
    nutritionApi.plan('cached-plan'),
    nutritionApi.diary('2026-10-20'),
  ])
  assert.equal(nutritionApi.cached.profile()?.profile_version, 3)
  assert.equal(nutritionApi.cached.plan('cached-plan')?.plan_version, 2)
  assert.equal(
    nutritionApi.cached.diary('2026-10-20')?.local_date,
    '2026-10-20',
  )
  assert.equal(calls, 3)
  await nutritionApi.saveProfile({ daily_budget_vnd: 100000 })
  assert.equal(nutritionApi.cached.profile()?.profile_version, 4)
  assert.equal(nutritionApi.cached.plan('cached-plan'), undefined)
  assert.equal(calls, 4)
  nutritionResources.clear()
})
