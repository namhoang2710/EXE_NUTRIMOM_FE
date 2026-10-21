import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DiaryAttempt,
  diaryPatch,
  halfServings,
} from '../src/features/nutrition/model/nutrition-helpers.ts'
import type {
  DiaryEntry,
} from '../src/features/nutrition/model/nutrition-types.ts'

const entry = {
  entry_id: 'e',
  recipe_id: 'old',
  recipe_version: 2,
  source_plan_item_id: 'a',
  local_date: '2026-10-19',
  meal_type: 'LUNCH',
  servings: 2,
  estimate_incomplete: false,
} as DiaryEntry
test('half uses planned servings and unchanged recipe is omitted to preserve historical snapshots', () => {
  assert.equal(halfServings(1.75), 0.875)
  assert.deepEqual(
    diaryPatch(entry, {
      local_date: '2026-10-20',
      meal_type: 'LUNCH',
      recipe_id: 'old',
      servings: 1,
      estimate_incomplete: false,
    }),
    { local_date: '2026-10-20', servings: 1 },
  )
  assert.deepEqual(
    diaryPatch(entry, {
      local_date: entry.local_date,
      meal_type: 'LUNCH',
      recipe_id: 'new',
      servings: 2,
      estimate_incomplete: true,
    }),
    { recipe_id: 'new', estimate_incomplete: true },
  )
})
test('custom amount can be cleared explicitly without inventing servings or nutrients', () => {
  const custom = {
    ...entry,
    recipe_id: null,
    custom_text: 'Cháo',
    amount_text: 'Một bát',
  } as DiaryEntry
  assert.deepEqual(
    diaryPatch(custom, {
      local_date: custom.local_date,
      meal_type: 'LUNCH',
      custom_text: 'Cháo',
      amount_text: '',
    }),
    { amount_text: '' },
  )
})
test('uncertain diary retry freezes the complete body and returns independent copies', () => {
  const attempt = new DiaryAttempt()
  const body = {
    request_id: 'stable',
    local_date: entry.local_date,
    meal_type: 'LUNCH' as const,
    source_plan_item_id: 'a',
    recipe_id: 'old',
    servings: 0.875,
    estimate_incomplete: true,
  }
  attempt.begin(body)
  body.servings = 7
  const retry = attempt.retry()!
  assert.equal(retry.servings, 0.875)
  retry.request_id = 'changed'
  assert.equal(attempt.retry()!.request_id, 'stable')
  attempt.clear()
  assert.equal(attempt.retry(), null)
})
// Regeneration and eaten-meal preservation now belong to BE. Browser regression
// covers the confirmed POST without diary preflight, including off-plan/custom meals.
