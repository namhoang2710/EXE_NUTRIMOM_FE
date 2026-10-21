import assert from 'node:assert/strict'
import test from 'node:test'
import {
  catalogPath,
  deltaText,
  indexKey,
  localDate,
  moneyText,
  numberText,
  optionalNumber,
  planNeedsReview,
  conflictingItems,
  PreviewAttempt,
  readPlanIndex,
  rememberPlan,
  servingBounds,
  shoppingPath,
  validDate,
  versions,
} from '../src/features/nutrition/model/nutrition-helpers.ts'
import type {
  MealPlan,
  NutritionProfile,
  PreviewRequest,
} from '../src/features/nutrition/model/nutrition-types.ts'

const profile = { profile_version: 4 } as NutritionProfile
const plan = {
  plan_id: 'plan-one',
  profile_version: 4,
  plan_version: 8,
  lifecycle_state: 'SAVED',
  generation_status: 'READY',
  start_date: '2026-10-18',
  end_date: '2026-10-18',
  nutrition_coverage: 'PARTIAL',
  notes: [],
  days: [{ local_date: '2026-10-18', slots: [], nutrition: {}, method_notes: [] }],
} as MealPlan
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
test('catalog keeps real camelCase query parameters, including cursors', () => {
  const url = new URL(
    catalogPath({
      mealType: 'LUNCH',
      role: 'PROTEIN',
      maxMinutes: 30,
      limit: 12,
      cursor: 'rec.a/b',
    }),
    'https://fixture.test',
  )
  assert.equal(url.searchParams.get('mealType'), 'LUNCH')
  assert.equal(url.searchParams.get('maxMinutes'), '30')
  assert.equal(url.searchParams.get('cursor'), 'rec.a/b')
  assert.equal(url.searchParams.has('meal_type'), false)
  assert.equal(url.searchParams.has('max_minutes'), false)
})
test('shopping scope encodes repeated exclusions and preserves date range without duplicate prefix', () => {
  const scope = {
    start_date: '2026-10-18',
    end_date: '2026-10-18',
    exclude_item_ids: ['a/b', 'second'],
  }
  const path = shoppingPath('plan/a', scope)
  assert.ok(path.startsWith('/meal-plans/plan%2Fa/shopping-list?'))
  assert.deepEqual(
    new URL(path, 'https://fixture.test').searchParams.getAll(
      'exclude_item_ids',
    ),
    ['a/b', 'second'],
  )
  assert.ok(shoppingPath('p', scope, true).includes('/shopping-list/items?'))
  assert.equal(
    shoppingPath('p', scope, true).includes('exclude_item_ids'),
    false,
  )
})
test('missing numeric data remains unknown while actual zero remains visible', () => {
  assert.equal(moneyText(null), 'Chưa có giá')
  assert.equal(moneyText(undefined), 'Chưa có giá')
  assert.equal(numberText(undefined), 'Chưa đủ dữ liệu')
  assert.equal(numberText(null), 'Chưa đủ dữ liệu')
  assert.equal(numberText(0, 'g'), '0 g')
  assert.equal(deltaText(null, '₫'), 'Chưa có dữ liệu chênh lệch')
  assert.equal(optionalNumber(''), undefined)
  assert.equal(optionalNumber('0'), 0)
})
test('write versions use the latest profile; a version difference alone never marks a saved plan conflicted', () => {
  assert.deepEqual(versions(plan, profile), {
    expected_plan_version: 8,
    expected_profile_version: 4,
  })
  assert.equal(planNeedsReview(plan), false)
  assert.equal(planNeedsReview({ ...plan, profile_version: 3 }), false)
  assert.equal(versions(plan, { ...profile, profile_version: 5 }).expected_profile_version, 5)
  assert.equal(
    planNeedsReview({ ...plan, lifecycle_state: 'NEEDS_UPDATE' }),
    true,
  )
})
test('conflict count belongs to the displayed plan and includes locked items from every day', () => {
  const conflicted = { ...plan, days: [{ local_date: '2026-10-18', slots: [{ items: [
    { item_id: 'held', locked: true, conflict: true },
    { item_id: 'clean', locked: false, conflict: false },
  ] }] }, { local_date: '2026-10-19', slots: [{ items: [{ item_id: 'next', conflict: true }] }] }] } as MealPlan
  assert.deepEqual(conflictingItems(conflicted).map((item) => item.item_id), ['held', 'next'])
  assert.equal(planNeedsReview(conflicted), true)
  assert.equal(planNeedsReview({ ...conflicted, days: plan.days }), false)
})
test('preview retry freezes every input and request id despite later mutations', () => {
  const attempt = new PreviewAttempt()
  const body: PreviewRequest = {
    request_id: 'stable',
    profile_version: 4,
    start_date: '2026-10-18',
    day_count: 1,
    meal_types: ['LUNCH'],
    snack_count: 1,
    seed: 132,
    constraints: { strict_budget: false, strict_time: false },
  }
  const initial = attempt.begin(body)
  body.meal_types.push('DINNER')
  body.seed = 12
  initial.constraints.strict_time = true
  assert.deepEqual(attempt.retry(), {
    ...body,
    meal_types: ['LUNCH'],
    seed: 132,
    constraints: { strict_budget: false, strict_time: false },
  })
  const next = attempt.retry()!
  next.meal_types.push('SNACK')
  assert.deepEqual(attempt.retry()!.meal_types, ['LUNCH'])
  attempt.clear()
  assert.equal(attempt.retry(), null)
})
test('plan index stores only identifiers and isolates accounts', () => {
  const memory = storage()
  assert.equal(rememberPlan(memory, 'account/a', plan), true)
  assert.deepEqual(readPlanIndex(memory, 'account/a'), {
    '2026-10-18': 'plan-one',
  })
  assert.deepEqual(readPlanIndex(memory, 'account/b'), {})
  assert.equal(
    memory.getItem(indexKey('account/a'))!.includes('nutrition'),
    false,
  )
  memory.setItem(
    indexKey('bad'),
    JSON.stringify({
      '2026-99-99': 'x',
      '2026-10-18': { secret: 'not an identifier' },
    }),
  )
  assert.deepEqual(readPlanIndex(memory, 'bad'), {})
  memory.setItem(indexKey('bad'), '{bad')
  assert.deepEqual(readPlanIndex(memory, 'bad'), {})
  assert.equal(
    rememberPlan(
      {
        ...memory,
        setItem: () => {
          throw new Error('blocked')
        },
      },
      'a',
      plan,
    ),
    false,
  )
})
test('local dates use pregnancy timezone and reject impossible deep-link dates', () => {
  assert.equal(
    localDate('Asia/Ho_Chi_Minh', new Date('2026-10-17T18:00:00Z')),
    '2026-10-18',
  )
  assert.equal(validDate('2026-02-30'), false)
  assert.equal(validDate('2026-10-18'), true)
  assert.equal(validDate(null), false)
})
test('portion bounds come from backend options rather than assumed defaults', () => {
  assert.deepEqual(servingBounds([0.75, 1.25, 1.75]), { min: 0.75, max: 1.75 })
  assert.equal(servingBounds([]), null)
  assert.equal(servingBounds([0, -1, NaN]), null)
})
