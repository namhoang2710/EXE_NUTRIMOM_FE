import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePregnancyProgress, getPregnancyWeekWindow, hasValidDueDate } from '../src/features/maternity/model/pregnancy-charts.ts'

test('selects the correct pregnancy week window at every boundary', () => {
  const cases = [
    [0, 0, 8],
    [1, 1, 8],
    [8, 1, 8],
    [9, 9, 14],
    [14, 9, 14],
    [15, 15, 20],
    [38, 33, 38],
    [39, 39, 42],
    [42, 39, 42],
  ] as const

  for (const [week, start, end] of cases) {
    const window = getPregnancyWeekWindow(week)
    assert.deepEqual([window.start, window.end], [start, end])
    assert.equal(window.weeks[0], start)
    assert.equal(window.weeks.at(-1), end)
  }
})

test('calculates and clamps the 280-day radial pregnancy progress', () => {
  assert.deepEqual(calculatePregnancyProgress(320), { elapsedDays: 0, progressPercent: 0, remainingDays: 320 })
  assert.deepEqual(calculatePregnancyProgress(140), { elapsedDays: 140, progressPercent: 50, remainingDays: 140 })
  assert.deepEqual(calculatePregnancyProgress(0), { elapsedDays: 280, progressPercent: 100, remainingDays: 0 })
  assert.deepEqual(calculatePregnancyProgress(-9), { elapsedDays: 280, progressPercent: 100, remainingDays: 0 })
})

test('due date validation prevents Invalid Date empty states', () => {
  assert.equal(hasValidDueDate(undefined), false)
  assert.equal(hasValidDueDate('not-a-date'), false)
  assert.equal(hasValidDueDate('2026-12-10'), true)
})
