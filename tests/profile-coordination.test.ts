import assert from 'node:assert/strict'
import test from 'node:test'
import { createResourceCache, forConsumer, StaleResourceError } from '../src/core/api/resource-cache.ts'
import { createConcurrencyPool } from '../src/core/api/concurrency-pool.ts'
import { createRequestSequence, createPageLoadGate, mergeUniqueRecords } from '../src/features/maternity/model/records-coordination.ts'
import { createObjectUrlLease } from '../src/features/maternity/model/object-url-lease.ts'
import { createCurrentPregnancyLoader } from '../src/features/maternity/model/records-page-data.ts'
import { resolveRecordAttachments, previewableAttachments } from '../src/features/maternity/model/record-attachments.ts'
import { buildProfilePatch, profileDraft, reconcileProfileDraft } from '../src/features/user/model/profile-patch.ts'
import type { UserProfile } from '../src/features/user/model/user-types.ts'
import type { MedicalRecord, Pregnancy } from '../src/types/domain.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

test('concurrent consumers and remounts share a result for 30 seconds; TTL loads afresh', async () => {
  let clock = 100
  const cache = createResourceCache(30_000, () => clock)
  const result = deferred<number>()
  let calls = 0
  const load = () => { calls += 1; return result.promise }
  const a = cache.run('session:user:current', load)
  const b = cache.run('session:user:current', load)
  assert.equal(a, b)
  await Promise.resolve(); assert.equal(calls, 1)
  result.resolve(1); await a
  clock += 29_999
  assert.equal(await cache.run('session:user:current', load), 1)
  assert.equal(calls, 1)
  clock += 1
  await cache.run('session:user:current', load)
  assert.equal(calls, 2)
})

test('different user, pregnancy, filter and cursor keys are isolated', async () => {
  const cache = createResourceCache()
  let calls = 0
  const keys = ['s1:u1:p1:all:first', 's1:u2:p1:all:first', 's1:u1:p2:all:first', 's1:u1:p1:pdf:first', 's1:u1:p1:all:second']
  await Promise.all(keys.map((key) => cache.run(key, async () => ++calls)))
  assert.equal(calls, keys.length)
})

test('failure releases the promise and simultaneous manual retries coalesce', async () => {
  const cache = createResourceCache()
  await assert.rejects(cache.run('detail:1', async () => { throw new Error('offline') }), /offline/)
  let calls = 0
  const load = async () => ++calls
  const a = cache.run('detail:1', load), b = cache.run('detail:1', load)
  assert.equal(a, b)
  assert.deepEqual(await Promise.all([a, b]), [1, 1])
})

test('mutation seed supersedes a pending read without poisoning the new value', async () => {
  const cache = createResourceCache()
  const result = deferred<number>()
  const read = cache.run('profile', () => result.promise)
  cache.set('profile', 2)
  result.resolve(1)
  await assert.rejects(read, StaleResourceError)
  assert.equal(await cache.run('profile', async () => 3), 2)
})

test('a session cleared before a queued load starts does not make a request with replacement credentials', async () => {
  const cache = createResourceCache()
  let calls = 0
  const old = cache.run('old-session:record', async () => ++calls)
  cache.clear()
  await assert.rejects(old, StaleResourceError)
  assert.equal(calls, 0)
})

test('targeted invalidation and clear discard late responses and preserve unrelated data', async () => {
  const cache = createResourceCache()
  cache.set('care:items', [1]); cache.set('records:list:1', [2])
  const result = deferred<number>()
  const stale = cache.run('records:detail:1', () => result.promise)
  cache.invalidate('records:')
  result.resolve(7)
  await assert.rejects(stale, StaleResourceError)
  assert.deepEqual(await cache.run('care:items', async () => [0]), [1])
  const pending = deferred<number>(), cleared = cache.run('care:pending', () => pending.promise)
  cache.clear(); pending.resolve(1)
  await assert.rejects(cleared, StaleResourceError)
})

test('consumer cancellation does not cancel the shared load or another consumer', async () => {
  const cache = createResourceCache(), pending = deferred<number>(), abort = new AbortController()
  const load = cache.run('detail', () => pending.promise)
  const leaving = forConsumer(load, abort.signal)
  const staying = forConsumer(load)
  abort.abort()
  await assert.rejects(leaving, { name: 'AbortError' })
  pending.resolve(9)
  assert.equal(await staying, 9)
  assert.equal(await cache.run('detail', async () => 0), 9)
})

test('explicit refresh expires a cached value but preserves a concurrent retry', async () => {
  const cache = createResourceCache()
  cache.set('profile', 1); cache.expire('profile')
  const pending = deferred<number>()
  const a = cache.run('profile', () => pending.promise)
  cache.expire('profile')
  assert.equal(cache.run('profile', async () => 5), a)
  pending.resolve(2); assert.equal(await a, 2)
})

test('current pregnancy loader permits retry after failure rather than retaining an error', async () => {
  let calls = 0
  const current = createCurrentPregnancyLoader(async () => {
    if (++calls === 1) throw new Error('offline')
    return { id: 'p1' } as Pregnancy
  })
  await assert.rejects(current(), /offline/)
  assert.equal((await current())?.id, 'p1')
  assert.equal(calls, 2)
})

test('rapid filters and mutation generations reject old pages; duplicate records are removed', async () => {
  const sequence = createRequestSequence(), slow = deferred<Array<{ id: string }>>()
  const first = sequence.begin()
  const old = slow.promise.then((items) => sequence.accepts(first) ? items : [])
  const second = sequence.begin()
  slow.resolve([{ id: 'old-filter' }])
  assert.deepEqual(await old, [])
  assert.equal(sequence.accepts(second), true)
  sequence.invalidate(); assert.equal(sequence.accepts(second), false)
  assert.deepEqual(mergeUniqueRecords([{ id: '1' }], [{ id: '1' }, { id: '2' }, { id: '2' }]), [{ id: '1' }, { id: '2' }])
})

test('repeated load-more is blocked synchronously and an old request cannot unlock a new filter', () => {
  const gate = createPageLoadGate()
  assert.equal(gate.start(1, 'cursor-1'), true)
  assert.equal(gate.start(1, 'cursor-1'), false)
  gate.clear()
  assert.equal(gate.start(2, 'cursor-2'), true)
  gate.finish(1, 'cursor-1')
  assert.equal(gate.start(2, 'cursor-2'), false)
  gate.finish(2, 'cursor-2')
  assert.equal(gate.start(2, 'cursor-3'), true)
})

test('preview consumers revoke their own URLs; late URLs are revoked after cleanup', async () => {
  const blob = new Blob(['synthetic-bytes'])
  const first = createObjectUrlLease(), second = createObjectUrlLease()
  const a = URL.createObjectURL(blob), b = URL.createObjectURL(blob)
  first.retain(a); second.retain(b)
  first.release()
  await assert.rejects(fetch(a))
  assert.equal(await (await fetch(b)).text(), 'synthetic-bytes')
  const late = URL.createObjectURL(blob)
  assert.equal(first.retain(late), false)
  await assert.rejects(fetch(late))
  second.release()
  await assert.rejects(fetch(b))
})

test('closed attachment rows do not load detail; incomplete list metadata uses detail on open', async () => {
  let calls = 0
  const image = { id: 'f1', file_name: 'synthetic.png', mime_type: 'image/png', size_bytes: 10, status: 'READY' }
  const detail = async () => { calls += 1; return { attachment_count: 1, attachments: [image] } as MedicalRecord }
  assert.deepEqual(await resolveRecordAttachments({ recordId: 'r1', count: 1, opened: false, provided: [] }, detail), [])
  assert.equal(calls, 0)
  assert.deepEqual(await resolveRecordAttachments({ recordId: 'r1', count: 1, opened: true, provided: [] }, detail), [image])
  assert.equal(calls, 1)
  await resolveRecordAttachments({ recordId: 'r1', count: 1, opened: true, provided: [image] }, detail)
  assert.equal(calls, 1)
})

test('only READY images are previewed; PDF and unfinished files stay out of the image pipeline', () => {
  const file = { id: 'f', file_name: 'synthetic', size_bytes: 10, status: 'READY' }
  const files = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].map((mime_type) => ({ ...file, mime_type }))
  assert.equal(previewableAttachments(files).length, 3)
  assert.deepEqual(previewableAttachments([{ ...files[0], status: 'UPLOADING' }]), [])
})

test('preview pool caps concurrency at three and frees a slot after rejection', async () => {
  const run = createConcurrencyPool(3)
  let active = 0, maximum = 0
  const tasks = Array.from({ length: 9 }, (_, index) => run(async () => {
    active += 1; maximum = Math.max(maximum, active)
    await new Promise((resolve) => setTimeout(resolve, 1))
    active -= 1
    if (index === 0) throw new Error('preview failed')
    return index
  }))
  const results = await Promise.allSettled(tasks)
  assert.equal(maximum, 3); assert.equal(active, 0)
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 8)
})

const profile = { id: 'u1', display_name: 'Test', email: null, gender: null, date_of_birth: null, version: 1 } as UserProfile
test('unchanged profile produces no PATCH; changed draft carries the BE version', () => {
  assert.equal(buildProfilePatch(profile, profileDraft(profile)), null)
  assert.deepEqual(buildProfilePatch(profile, { ...profileDraft(profile), display_name: ' Updated ' }), { version: 1, display_name: 'Updated' })
})
test('background profile response preserves dirty input; clean form follows the shared profile', () => {
  const dirty = { ...profileDraft(profile), display_name: 'Unsaved' }
  const latest = { ...profile, display_name: 'Elsewhere', version: 2 }
  assert.equal(reconcileProfileDraft(dirty, latest, true), dirty)
  assert.equal(reconcileProfileDraft(dirty, latest, false).display_name, 'Elsewhere')
})
