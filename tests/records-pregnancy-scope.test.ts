import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMedicalRecordsQuery, loadMedicalRecords } from '../src/features/maternity/model/records-page-data.ts'
import { groupMedicalRecords, pregnancyLabel, vietnamDateOnly, formatMedicalRecordDate } from '../src/features/maternity/model/records-pregnancy.ts'
import { hasRunningPregnancyAge } from '../src/features/maternity/model/pregnancy-context.ts'
import { dashboardGreeting } from '../src/features/user/model/dashboard-greeting.ts'
import type { MedicalRecord, Pregnancy } from '../src/types/domain.ts'

const filters = { category: '', from: '', to: '' }
const closed: Pregnancy = { id: 'closed-pregnancy', status: 'COMPLETED', estimated_due_date: '2026-10-20', calculation_source: 'MANUAL', version: 1, created_at: '2026-01-01T00:00:00Z' }
const active: Pregnancy = { ...closed, id: 'active-pregnancy', status: 'ACTIVE', gestational_week: 21, gestational_day: 0, trimester: 2, days_until_due: 133, created_at: '2026-10-22T00:00:00Z' }
function record(id: string, pregnancy_id: string): MedicalRecord { return { id, pregnancy_id, category: 'ULTRASOUND', title: id, occurred_at: '2026-10-22T17:00:00Z', attachment_count: 0, version: 0 } }

test('default list omits pregnancy_id, preserves an opaque cursor and supports a single explicit pregnancy', async () => {
  assert.equal(buildMedicalRecordsQuery(filters), '?limit=12')
  const query = new URLSearchParams(buildMedicalRecordsQuery({ ...filters, pregnancyId: closed.id, category: 'LAB_RESULT', from: '2026-10-23', to: '2026-10-23' }, 'opaque+/cursor='))
  assert.equal(query.get('pregnancy_id'), closed.id)
  assert.equal(query.get('cursor'), 'opaque+/cursor=')
  assert.equal(query.get('from'), query.get('to'))
  const history = record('previous-record', closed.id)
  const result = await loadMedicalRecords(async (path) => { assert.equal(path, '?limit=12'); return { items: [history] } }, filters)
  assert.equal(result.items[0], history)
})

test('groups place active first, retain BE record order, and never lose unknown pregnancy records', () => {
  const records = [record('previous-a', closed.id), record('active-a', active.id), record('previous-b', closed.id), record('unknown-a', 'unknown-pregnancy')]
  const groups = groupMedicalRecords(records, [closed, active])
  assert.equal(groups[0].id, active.id)
  assert.deepEqual(groups.find((item) => item.id === closed.id)?.records.map((item) => item.id), ['previous-a', 'previous-b'])
  assert.equal(groups.reduce((count, group) => count + group.records.length, 0), records.length)
  assert.equal(pregnancyLabel(undefined, 'unknown-pregnancy'), 'Thai kỳ unknown-')
  assert.match(pregnancyLabel(closed), /20\/10\/2026/)
  assert.doesNotMatch(pregnancyLabel(closed), /undefined|NaN|lần thứ/)
})

test('closed pregnancies and incomplete active summaries never render a running age', () => {
  assert.equal(hasRunningPregnancyAge(closed), false)
  assert.equal(hasRunningPregnancyAge(active), true)
  assert.equal(hasRunningPregnancyAge({ id: 'missing', status: 'ACTIVE' }), false)
  assert.equal(hasRunningPregnancyAge({ ...active, days_until_due: Number.NaN }), false)
  assert.doesNotMatch(dashboardGreeting({ pregnancy_summary: closed }).subtitle, /undefined|NaN|tuần/)
})

test('medical dates consistently follow Vietnam day boundaries', () => {
  for (const instant of ['2026-10-22T17:00:00Z', '2026-10-23T16:59:59Z']) {
    assert.equal(vietnamDateOnly(instant), '2026-10-23')
    assert.equal(formatMedicalRecordDate(instant), '23/10/2026')
  }
  assert.equal(vietnamDateOnly('2026-10-23T17:00:00Z'), '2026-10-24')
})
