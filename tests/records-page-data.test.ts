import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMedicalRecordPayload, createCurrentPregnancyLoader, loadCurrentPregnancy, loadMedicalRecords } from '../src/features/maternity/model/records-page-data.ts'
import type { CursorPage, MedicalRecord, Pregnancy } from '../src/types/domain.ts'

const pregnancy: Pregnancy = {
  id: 'pregnancy-1', status: 'ACTIVE', gestational_week: 24, gestational_day: 2,
  trimester: 2, days_until_due: 110, calculation_source: 'LMP', version: 1,
}

const emptyPage: CursorPage<MedicalRecord> = { items: [], next_cursor: null, has_more: false }
const noFilters = { category: '', from: '', to: '' }

test('initial Records data flow loads current Pregnancy and Medical Records once', async () => {
  let pregnancyCalls = 0
  let recordsCalls = 0
  const getCurrentPregnancy = createCurrentPregnancyLoader(async () => { pregnancyCalls += 1; return pregnancy })
  const [current] = await Promise.all([getCurrentPregnancy(), getCurrentPregnancy()])
  assert.equal(current?.id, pregnancy.id)
  await loadMedicalRecords(async (query) => {
    recordsCalls += 1
    assert.equal(query, '?limit=12&pregnancy_id=pregnancy-1')
    return emptyPage
  }, current!.id, noFilters)
  assert.equal(pregnancyCalls, 1)
  assert.equal(recordsCalls, 1)
})

test('filter reload requests Medical Records without reloading current Pregnancy', async () => {
  let pregnancyCalls = 0
  let recordsCalls = 0
  const current = await loadCurrentPregnancy(async () => { pregnancyCalls += 1; return pregnancy })
  await loadMedicalRecords(async () => { recordsCalls += 1; return emptyPage }, current!.id, noFilters)
  await loadMedicalRecords(async (query) => {
    recordsCalls += 1
    assert.equal(query, '?limit=12&pregnancy_id=pregnancy-1&category=ULTRASOUND&from=2026-08-01&to=2026-08-31')
    return emptyPage
  }, current!.id, { category: 'ULTRASOUND', from: '2026-08-01', to: '2026-08-31' })
  assert.equal(pregnancyCalls, 1)
  assert.equal(recordsCalls, 2)
})

test('only documented no-current-Pregnancy errors become the empty state', async () => {
  const noPregnancy = await loadCurrentPregnancy(async () => {
    throw Object.assign(new Error('Not found'), { code: 'RESOURCE_NOT_FOUND' })
  })
  assert.equal(noPregnancy, null)

  for (const error of [
    Object.assign(new Error('Server error'), { code: 'REQUEST_FAILED', status: 500 }),
    Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED', status: 401 }),
    Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 }),
    new Error('Network error'),
  ]) {
    await assert.rejects(loadCurrentPregnancy(async () => { throw error }), error)
  }
})

test('medical record create and update payloads normalize Vietnam local midnight to ISO UTC', () => {
  const payload = buildMedicalRecordPayload({
    category: 'ULTRASOUND', title: 'Siêu âm tuần 24', occurredAt: '2026-08-10',
    facilityName: '', clinicianName: '', summary: '', note: '', attachmentIds: ['file-1'],
  })
  assert.equal(payload.occurred_at, '2026-08-09T17:00:00.000Z')
  assert.equal(payload.occurred_at.endsWith('Z'), true)
  assert.equal({ ...payload, pregnancy_id: pregnancy.id }.occurred_at, '2026-08-09T17:00:00.000Z')
  assert.equal({ ...payload, version: 2 }.occurred_at, '2026-08-09T17:00:00.000Z')
})
