import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { actionDialogReducer, initialActionDialogState, performDialogAction, type ActionDialogEvent } from '../src/shared/model/action-dialog-state.ts'
import { createAsyncActionGate, runAsyncAction } from '../src/shared/model/async-action.ts'

test('stateful action preserves rejection and never reports success for a failed promise', async () => {
  const failure = new Error('request failed')
  await assert.rejects(runAsyncAction({ action: async () => { throw failure }, minimumMs: 2000, wait: async () => undefined }), failure)
})

test('cancel request and delete record dialogs only enter success after API resolution', async () => {
  for (const flow of ['cancel request', 'delete record']) {
    const events: ActionDialogEvent[] = []
    let resolveRequest!: () => void
    const pending = performDialogAction(() => new Promise<void>((resolve) => { resolveRequest = resolve }), (event) => events.push(event), () => `${flow} failed`)
    await Promise.resolve()
    assert.deepEqual(events, [{ type: 'START' }])
    resolveRequest()
    assert.equal(await pending, true)
    assert.deepEqual(events, [{ type: 'START' }, { type: 'SUCCEED' }])
  }
})

test('failed dialog action returns to confirmation with the real error', async () => {
  let state = initialActionDialogState
  const completed = await performDialogAction(async () => { throw new Error('API unavailable') }, (event) => { state = actionDialogReducer(state, event) }, (error) => (error as Error).message)
  assert.equal(completed, false)
  assert.deepEqual(state, { stage: 'confirm', error: 'API unavailable' })
})

test('shared async gate prevents double submit and unlocks after completion', async () => {
  const gate = createAsyncActionGate()
  let calls = 0
  let release!: () => void
  const first = gate.run(async () => { calls += 1; await new Promise<void>((resolve) => { release = resolve }) })
  const second = await gate.run(async () => { calls += 1 })
  assert.equal(second, false)
  assert.equal(calls, 1)
  release()
  assert.equal(await first, true)
  assert.equal(await gate.run(async () => { calls += 1 }), true)
  assert.equal(calls, 2)
})

test('confirm, busy and success states share the same stable dialog footprint', async () => {
  const css = await readFile(new URL('../src/shared/styles/product-ui.css', import.meta.url), 'utf8')
  const support = await readFile(new URL('../src/features/contact/pages/SupportRequestsPage.tsx', import.meta.url), 'utf8')
  const records = await readFile(new URL('../src/pages/RecordsPage.tsx', import.meta.url), 'utf8')
  assert.match(css, /\.nm-dialog-panel-stable\s*\{[^}]*min-height:/s)
  assert.match(support, /<ActionStateDialog/)
  assert.match(records, /<ActionStateDialog/)
})

test('pregnancy setup keeps the loader for five seconds, scrolls to the journey, and omits the baby summary card', async () => {
  const dialog = await readFile(new URL('../src/features/maternity/components/PregnancySaveDialog.tsx', import.meta.url), 'utf8')
  const health = await readFile(new URL('../src/pages/HealthPage.tsx', import.meta.url), 'utf8')
  assert.match(dialog, /minimumMs:\s*5000/)
  assert.match(health, /journeyRef\.current\?\.scrollIntoView/)
  assert.doesNotMatch(health, /pregnancy-baby-card|Thông tin bé/)
})

test('health, care, and records use the shared left-aligned account heading', async () => {
  for (const page of ['HealthPage.tsx', 'CarePage.tsx', 'RecordsPage.tsx']) {
    const source = await readFile(new URL(`../src/pages/${page}`, import.meta.url), 'utf8')
    assert.match(source, /nm-account-workspace-heading/)
    assert.doesNotMatch(source, /className="page-heading/)
  }
})
