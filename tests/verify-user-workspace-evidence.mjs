// Verify CUA observations against independently recorded synthetic HTTP traffic.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
const output = 'qa-artifacts/user-workspace-audit-2026-10-24'
const read = async name => JSON.parse(await readFile(`${output}/${name}.json`, 'utf8'))
const evidence = await read('request-evidence')
const snapshot = label => { const value = evidence.findLast(item => item.label === label); assert.ok(value, `Missing ${label}`); return value }
const count = (label, path, method = 'GET') => snapshot(label).calls.filter(call => call.path === path && call.method === method).length
const passed = []
function check(name, run) { run(); passed.push(name) }
const matrix = await read('responsive-matrix')
check('36 USER routes × 6 viewport sizes × 2 themes, with content and no escaped controls', () => {
  assert.equal(matrix.results.length, 432)
  assert.equal(new Set(matrix.results.map(row => JSON.stringify([row.url, row.width, row.theme]))).size, 432)
  assert.equal(matrix.results.filter(row => row.theme === 'light').length, 216)
  assert.equal(matrix.results.filter(row => row.theme === 'dark').length, 216)
  assert.deepEqual(matrix.errors, [])
  for (const row of matrix.results) { assert.ok(row.bodyLength > 30); assert.ok(row.heading); assert.ok(row.scroll <= row.width + 1); assert.deepEqual(row.escaped, []) }
})
check('recipe pagination is horizontally centered at all six viewport widths', () => {
  assert.equal(matrix.centerChecks.length, 6)
  for (const row of matrix.centerChecks) assert.ok(row.delta !== null && row.delta < 0.5)
})
const overlays = await read('overlay-checks')
check('navigation and representative dialogs fit portrait, tablet and short landscape viewports', () => {
  const finalChecks = overlays.checks.filter(row => row.label !== 'assistant-widget')
  assert.ok(finalChecks.length >= 27)
  for (const row of finalChecks) { assert.ok(row.geometry.length); for (const box of row.geometry) assert.equal(box.fits, true) }
})
check('assistant fix keeps its frame and all essential controls visible in five viewport sizes', () => {
  assert.equal(overlays.assistantFinal.length, 5)
  for (const row of overlays.assistantFinal) { assert.equal(row.panelFits, true); assert.ok(row.controls.length >= 5); assert.ok(row.controls.every(control => control.inside)) }
})
const login = await read('login-checks')
check('login controls fit six widths in both themes and appearance synchronizes between local tabs', () => {
  assert.equal(login.loginGeometry.length, 12)
  for (const row of login.loginGeometry) { assert.ok(row.scroll <= row.width + 1); assert.ok(row.fields.every(field => field.inside)) }
  assert.equal(login.syncedThemes.login, login.syncedThemes.workspace)
})
check('session restore 429 stays at one GET until manual retry and never posts a new login', () => {
  assert.equal(count('restore-429-before-retry', '/auth/me'), 1)
  assert.equal(count('restore-429-after-retry', '/auth/me'), 2)
  assert.equal(count('restore-429-after-retry', '/auth/login', 'POST'), 0)
})
check('three expert detail openings use one list read and one detail read', () => {
  assert.equal(count('expert-three-reopens', '/experts'), 1)
  assert.equal(count('expert-three-reopens', '/experts/22222222-2222-4222-8222-222222222222'), 1)
})
check('three SPA returns to knowledge reuse each distinct article query', () => {
  const calls = snapshot('knowledge-three-returns').calls.filter(call => call.path === '/knowledge/articles')
  assert.equal(calls.length, 3)
  assert.equal(new Set(calls.map(call => call.query)).size, 3)
})
check('catalog pagination 429 does not auto-retry; an explicit retry adds exactly one GET', () => {
  assert.equal(count('catalog-429-before-retry', '/recipes'), 1)
  assert.equal(count('catalog-429-after-retry', '/recipes'), 2)
})
check('login 429 does not auto-submit; explicit retry adds exactly one POST', () => {
  assert.equal(count('login-429-before-retry', '/auth/login', 'POST'), 1)
  assert.equal(count('login-429-after-retry', '/auth/login', 'POST'), 2)
})
check('resizing the recipe page does not request new data', () => {
  assert.equal(snapshot('resize-after').calls.length, snapshot('resize-before').calls.length)
})
await writeFile(`${output}/verified-checks.json`, JSON.stringify({ passed: passed.length, checks: passed }, null, 2))
console.log(JSON.stringify({ passed: passed.length, checks: passed }, null, 2))
