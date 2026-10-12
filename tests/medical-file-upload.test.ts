import assert from 'node:assert/strict'
import test from 'node:test'
import { createFileUpload, validateMedicalFile, type UploadStage } from '../src/features/maternity/model/file-upload.ts'
import type { UploadedFile, UploadSession } from '../src/types/domain.ts'

const session: UploadSession = { file_id: 'f1', upload_url: '/api/v1/files/f1/content', expires_at: '2099-01-01T00:00:00Z' }
const ready: UploadedFile = { id: 'f1', status: 'READY', file_name: 'synthetic.pdf' }
const file = new File(['%PDF-synthetic'], 'synthetic.pdf', { type: 'application/pdf' })
function fixture() {
  const calls = { digest: 0, create: 0, put: 0, complete: 0 }
  const stages: UploadStage[] = []
  const api = {
    digest: async () => { calls.digest += 1; return 'real-digest' },
    create: async () => { calls.create += 1; return session },
    put: async () => { calls.put += 1 },
    complete: async () => { calls.complete += 1; return ready },
  }
  return { api, calls, stages, make: () => createFileUpload(file, api, (stage) => stages.push(stage)) }
}

test('non-empty MIME and 25 MiB validation runs before any upload', () => {
  assert.throws(() => validateMedicalFile(new File([], 'empty.pdf', { type: 'application/pdf' })), /trống/)
  assert.throws(() => validateMedicalFile(new File(['text'], 'text.txt', { type: 'text/plain' })), /Chỉ hỗ trợ/)
  assert.throws(() => validateMedicalFile({ size: 25 * 1024 * 1024 + 1, type: 'image/png' } as File), /25 MiB/)
  for (const type of ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']) validateMedicalFile(new File(['bytes'], 'synthetic', { type }))
})

test('double upload shares the attempt and reports each phase before READY', async () => {
  const f = fixture(), upload = f.make()
  const a = upload.run(), b = upload.run()
  assert.equal(a, b)
  assert.deepEqual(await a, ready)
  assert.deepEqual(f.calls, { digest: 1, create: 1, put: 1, complete: 1 })
  assert.deepEqual(f.stages, ['creating', 'uploading', 'completing', 'ready'])
})

test('PUT failure never completes; retry reuses the same active session and checksum', async () => {
  const f = fixture()
  f.api.put = async () => { if (++f.calls.put === 1) throw new Error('PUT failed') }
  const upload = f.make()
  await assert.rejects(upload.run(), /PUT failed/)
  assert.equal(f.calls.complete, 0); assert.equal(f.stages.at(-1), 'error')
  assert.equal((await upload.run()).status, 'READY')
  assert.deepEqual(f.calls, { digest: 1, create: 1, put: 2, complete: 1 })
})

test('complete failure retains uploaded bytes and retry only repeats idempotent complete', async () => {
  const f = fixture()
  f.api.complete = async () => { if (++f.calls.complete === 1) throw new Error('storage unavailable'); return ready }
  const upload = f.make()
  await assert.rejects(upload.run(), /storage unavailable/)
  assert.equal(f.stages.at(-1), 'error')
  assert.equal((await upload.run()).id, 'f1')
  assert.deepEqual(f.calls, { digest: 1, create: 1, put: 1, complete: 2 })
})

test('non-READY completion or wrong ID never becomes a successful attachment', async () => {
  for (const response of [{ ...ready, status: 'QUARANTINED' }, { ...ready, id: 'foreign-file' }]) {
    const f = fixture(); f.api.complete = async () => response
    await assert.rejects(f.make().run(), /chưa sẵn sàng/)
    assert.equal(f.stages.at(-1), 'error')
    assert.equal(f.stages.includes('ready'), false)
  }
})

test('record save failure and save retry reuse READY ID without creating or uploading again', async () => {
  const f = fixture(), upload = f.make(), complete = await upload.run()
  let saves = 0
  const save = async (id: string) => { assert.equal(id, 'f1'); if (++saves === 1) throw new Error('version conflict') }
  await assert.rejects(save(complete.id), /version conflict/)
  await save((await upload.run()).id)
  assert.deepEqual(f.calls, { digest: 1, create: 1, put: 1, complete: 1 })
})

test('creating session failure retries safely before uploading', async () => {
  const f = fixture()
  f.api.create = async () => { if (++f.calls.create === 1) throw new Error('offline'); return session }
  const upload = f.make()
  await assert.rejects(upload.run(), /offline/)
  assert.equal(f.calls.put, 0)
  await upload.run()
  assert.deepEqual(f.calls, { digest: 1, create: 2, put: 1, complete: 1 })
})
