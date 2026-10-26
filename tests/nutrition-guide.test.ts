import assert from 'node:assert/strict'
import test from 'node:test'
import {
  guideStorageKey,
  lastGuidePage,
  nutritionGuide,
  readGuidePage,
  rememberGuidePage,
} from '../src/features/nutrition/model/nutrition-guide.ts'

test('guide has a welcome page and ten complete, distinct instruction pages', () => {
  assert.equal(lastGuidePage, 10)
  assert.equal(nutritionGuide[0].id, 'welcome')
  assert.equal(new Set(nutritionGuide.map((page) => page.id)).size, 11)
  for (const page of nutritionGuide) {
    assert.ok(page.title && page.intro && page.expected)
    assert.ok(page.steps.length >= 2 && page.steps.length <= 4)
    assert.doesNotMatch(
      [page.title, page.intro, ...page.steps, page.expected].join(' '),
      /\b(API|mutation|preview|conflict|enum|profile_version|429)\b/i,
    )
  }
})
test('guide progress is isolated by account and stores only the last page', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  assert.equal(readGuidePage(storage, 'a'), 0)
  rememberGuidePage(storage, 'a', 7)
  assert.equal(readGuidePage(storage, 'a'), 7)
  assert.equal(readGuidePage(storage, 'b'), 0)
  assert.deepEqual([...values], [[guideStorageKey('a'), '7']])
  rememberGuidePage(storage, 'a', 10)
  assert.equal(readGuidePage(storage, 'a'), 10)
  rememberGuidePage(storage, 'a', 0)
  assert.equal(readGuidePage(storage, 'a'), 0)
})
test('bad guide progress cannot select a missing page', () => {
  for (const raw of [
    'bad-json',
    '-1',
    '11',
    '1.5',
    'null',
    'true',
    '{}',
    '[]',
    '"4"',
    '1000000',
  ])
    assert.equal(readGuidePage({ getItem: () => raw }, 'a'), 0, raw)
  let writes = 0
  for (const page of [-1, 11, 1.5, NaN, Infinity])
    rememberGuidePage(
      {
        setItem: () => {
          writes++
        },
      },
      'a',
      page,
    )
  assert.equal(writes, 0)
})
test('unavailable browser storage never prevents reading the guide', () => {
  const storage = {
    getItem: () => {
      throw new Error('Blocked')
    },
    setItem: () => {
      throw new Error('Quota exceeded')
    },
  }
  assert.equal(readGuidePage(storage, 'a'), 0)
  assert.doesNotThrow(() => rememberGuidePage(storage, 'a', 6))
})
