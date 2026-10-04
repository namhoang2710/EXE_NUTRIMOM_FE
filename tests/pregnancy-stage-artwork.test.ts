import assert from 'node:assert/strict'
import test from 'node:test'
import { access, readFile } from 'node:fs/promises'
import { getPregnancyStageImageUrl } from '../src/features/maternity/model/pregnancy-stage-artwork.ts'

test('maps early pregnancy weeks to the shared stage artwork', () => {
  for (const week of [0, 1, 2, 3]) assert.equal(getPregnancyStageImageUrl(week), '/pregnancy-weeks/T1-3.png')
})

test('maps exact, fractional, and upper-bound weeks to safe artwork URLs', () => {
  assert.equal(getPregnancyStageImageUrl(4), '/pregnancy-weeks/T4.png')
  assert.equal(getPregnancyStageImageUrl(6 + 3 / 7), '/pregnancy-weeks/T6.png')
  assert.equal(getPregnancyStageImageUrl(29), '/pregnancy-weeks/T29.png')
  assert.equal(getPregnancyStageImageUrl(29.99), '/pregnancy-weeks/T29.png')
  assert.equal(getPregnancyStageImageUrl(41), '/pregnancy-weeks/T41.png')
  assert.equal(getPregnancyStageImageUrl(42), '/pregnancy-weeks/T41.png')
  assert.equal(getPregnancyStageImageUrl(900), '/pregnancy-weeks/T41.png')
})

test('uses fallback state for non-finite week values', () => {
  assert.equal(getPregnancyStageImageUrl(Number.NaN), null)
  assert.equal(getPregnancyStageImageUrl(Number.POSITIVE_INFINITY), null)
  assert.equal(getPregnancyStageImageUrl(Number.NEGATIVE_INFINITY), null)
})

test('referenced boundary artwork assets exist', async () => {
  await Promise.all(['T1-3.png', 'T4.png', 'T29.png', 'T41.png'].map((name) => access(new URL(`../public/pregnancy-weeks/${name}`, import.meta.url))))
})

test('artwork component retries on week changes, falls back on image errors, and respects reduced motion', async () => {
  const component = await readFile(new URL('../src/features/maternity/components/PregnancyStageArtwork.tsx', import.meta.url), 'utf8')
  assert.match(component, /setFailedImageKey\(null\)/)
  assert.match(component, /\}, \[imageKey\]\)/)
  assert.match(component, /onError=\{\(\) => setFailedImageKey\(imageKey\)\}/)
  assert.match(component, /key=\{imageKey\}/)
  assert.match(component, /onLoad=\{\(\) => setLoadedImageKey\(imageKey\)\}/)
  assert.match(component, /useReducedMotion\(\)/)
  assert.match(component, /repeat: Infinity/)
  assert.match(component, /draggable=\{false\}/)
  assert.equal((component.match(/<motion\.img/g) ?? []).length, 1)
})
