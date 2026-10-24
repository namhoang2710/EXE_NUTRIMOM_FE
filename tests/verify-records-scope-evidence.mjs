// Independent assertions against requests recorded during manual browser QA.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
const path = 'qa-artifacts/medical-record-scope'
const evidence = JSON.parse(await readFile(`${path}/browser-evidence.json`, 'utf8'))
const scenario = (label) => { const entry = evidence.findLast((item) => item.label === label); assert.ok(entry, `Missing browser evidence: ${label}`); return entry }
const requests = (entry, method, endpoint) => entry.calls.filter((call) => call.method === method && call.path === endpoint)
const checks = []
function check(name, run) { run(); checks.push({ name, passed: true }) }
check('default-all-and-filter-retained-after-history-edit', () => {
  const entry = scenario('filtered-history-edit')
  assert.ok(requests(entry, 'GET', '/medical-records').some((call) => call.query === '?limit=12'))
  assert.ok(requests(entry, 'GET', '/medical-records').at(-1).query.includes('pregnancy_id=pregnancy-previous'))
  assert.equal(requests(entry, 'PATCH', '/medical-records/record-previous').length, 1)
})
check('history-without-active-supports-detail-reminder-and-single-delete', () => {
  const entry = scenario('history-deeplink-reminder-delete')
  assert.equal(requests(entry, 'GET', '/pregnancies').length, 1)
  assert.equal(requests(entry, 'GET', '/pregnancies/current').length, 0)
  assert.equal(requests(entry, 'GET', '/medical-records/record-previous').length, 1)
  assert.equal(requests(entry, 'POST', '/medical-records/record-previous/reminders').length, 1)
  assert.equal(requests(entry, 'DELETE', '/medical-records/record-previous').length, 1)
  assert.equal(entry.records.length, 0)
})
check('three-cursor-pages-reloaded-after-edit-without-eager-detail-reads', () => {
  const entry = scenario('pagination-26-and-reload-depth')
  const reads = requests(entry, 'GET', '/medical-records')
  assert.equal(reads.length, 6)
  assert.deepEqual(reads.slice(0, 3).map((call) => call.query), reads.slice(3).map((call) => call.query))
  assert.equal(entry.records.length, 26)
  assert.equal(requests(entry, 'GET', '/medical-records/record-current').length, 1)
  assert.equal(entry.calls.filter((call) => call.path.startsWith('/files/')).length, 0)
})
check('metadata-error-keeps-history-independent-and-retry-only-reads-metadata', () => {
  assert.equal(requests(scenario('metadata-error-preserves-history'), 'GET', '/medical-records').length, 1)
  assert.equal(requests(scenario('metadata-retry-and-responsive'), 'GET', '/medical-records').length, 0)
})
check('429-filter-changes-and-expiry-never-auto-retry', () => {
  assert.equal(requests(scenario('list429-filter-no-auto-retry'), 'GET', '/medical-records').length, 1)
  const reads = requests(scenario('list429-manual-retry'), 'GET', '/medical-records')
  assert.equal(reads.length, 2)
  assert.ok(reads[1].query.includes('pregnancy_id=pregnancy-previous'))
})
check('inactive-pregnancy-confirmation-preserves-form-and-upload-checkpoints', () => {
  const entry = scenario('create-expired-preserves-draft-and-file')
  const creates = requests(entry, 'POST', '/medical-records')
  assert.equal(creates.length, 2)
  assert.equal(creates[0].body.pregnancy_id, 'pregnancy-current')
  assert.equal(creates[1].body.pregnancy_id, 'pregnancy-new')
  for (const field of ['title', 'note', 'occurred_at', 'attachment_ids']) assert.deepEqual(creates[0].body[field], creates[1].body[field])
  assert.equal(requests(entry, 'POST', '/files/upload-sessions').length, 1)
  assert.equal(requests(entry, 'PUT', '/files/file-1/content').length, 1)
  assert.equal(requests(entry, 'POST', '/files/file-1/complete').length, 1)
  assert.equal(requests(entry, 'GET', '/files/file-1/download-url').length, 1)
  assert.equal(requests(entry, 'GET', '/files/file-1/content').length, 1)
  assert.equal(entry.records.find((record) => record.title === creates[1].body.title).attachment_count, 1)
})
check('version-conflict-requires-explicit-version-refresh-and-keeps-draft', () => {
  const writes = requests(scenario('version-conflict-preserves-draft'), 'PATCH', '/medical-records/record-previous')
  assert.equal(writes.length, 2)
  assert.equal(writes[0].body.version, 0)
  assert.equal(writes[1].body.version, 1)
  assert.equal(writes[0].body.title, writes[1].body.title)
})
check('delete-429-keeps-record-until-user-retries', () => {
  const blocked = scenario('delete429-no-auto-retry')
  assert.equal(requests(blocked, 'DELETE', '/medical-records/record-current').length, 1)
  assert.ok(blocked.records.some((record) => record.id === 'record-current'))
  const done = scenario('delete429-manual-retry')
  assert.equal(requests(done, 'DELETE', '/medical-records/record-current').length, 2)
  assert.ok(done.records.every((record) => record.id !== 'record-current'))
})
check('create-429-keeps-draft-and-never-auto-submits', () => {
  assert.equal(requests(scenario('create429-no-auto-retry'), 'POST', '/medical-records').length, 1)
  const writes = requests(scenario('create429-manual-retry'), 'POST', '/medical-records')
  assert.equal(writes.length, 2)
  assert.deepEqual(writes[0].body, writes[1].body)
})
check('no-weekly-content-requests-in-any-scenario', () => {
  assert.ok(evidence.every((entry) => entry.calls.every((call) => !call.path.includes('pregnancy-content'))))
})
await writeFile(`${path}/browser-request-checks.json`, JSON.stringify({ checks, passed: checks.length, failed: 0 }, null, 2))
console.log(`Browser request evidence: ${checks.length}/${checks.length} checks passed`)
