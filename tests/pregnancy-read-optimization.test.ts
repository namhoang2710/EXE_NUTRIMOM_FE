import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createSingleFlight } from '../src/core/api/single-flight.ts'

test('single-flight shares one concurrent request and permits a fresh request after settlement', async () => {
  const coordinator = createSingleFlight()
  let calls = 0
  let resolveFirst!: (value: string) => void
  const request = () => {
    calls += 1
    return new Promise<string>((resolve) => { resolveFirst = resolve })
  }

  const first = coordinator.run('pregnancy:current', request)
  const duplicate = coordinator.run('pregnancy:current', request)

  assert.equal(first, duplicate)
  assert.equal(calls, 0)
  await Promise.resolve()
  assert.equal(calls, 1)

  resolveFirst('week-24')
  assert.deepEqual(await Promise.all([first, duplicate]), ['week-24', 'week-24'])
  assert.equal(await coordinator.run('pregnancy:current', async () => { calls += 1; return 'fresh' }), 'fresh')
  assert.equal(calls, 2)
})

test('single-flight isolates keys and releases failed requests for retry', async () => {
  const coordinator = createSingleFlight()
  let calls = 0
  const failure = new Error('not reviewed')

  const failed = coordinator.run('pregnancy:week:24', async () => { calls += 1; throw failure })
  const sameFailure = coordinator.run('pregnancy:week:24', async () => { calls += 1; return 'must-not-run' })
  const anotherWeek = coordinator.run('pregnancy:week:25', async () => { calls += 1; return 'week-25' })

  assert.equal(failed, sameFailure)
  await assert.rejects(failed, failure)
  await assert.rejects(sameFailure, failure)
  assert.equal(await anotherWeek, 'week-25')
  assert.equal(await coordinator.run('pregnancy:week:24', async () => { calls += 1; return 'retried' }), 'retried')
  assert.equal(calls, 3)
})

test('pregnancy page ignores stale loads and charts start with valid dimensions', async () => {
  const health = await readFile(new URL('../src/pages/HealthPage.tsx', import.meta.url), 'utf8')
  const weekChart = await readFile(new URL('../src/features/maternity/components/PregnancyWeekChart.tsx', import.meta.url), 'utf8')
  const radialChart = await readFile(new URL('../src/features/maternity/components/DueDateRadialChart.tsx', import.meta.url), 'utf8')
  const api = await readFile(new URL('../src/features/maternity/api/domain-api.ts', import.meta.url), 'utf8')

  assert.match(health, /loadGenerationRef/)
  assert.match(health, /generation !== loadGenerationRef\.current/)
  assert.match(api, /pregnancyReads\.run\(pregnancyReadKey\('current'\)/)
  assert.match(api, /pregnancyReads\.run\(pregnancyReadKey\(`week:\$\{week\}`\)/)
  assert.match(weekChart, /initialDimension=\{initialWeekChartSize\}/)
  assert.match(radialChart, /initialDimension=\{initialRadialChartSize\}/)
})
