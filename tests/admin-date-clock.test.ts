import assert from 'node:assert/strict'
import test from 'node:test'
import { formatAdminClock } from '../src/features/admin/model/admin-clock.ts'
import { adminCalendarDate, adminCalendarLabel } from '../src/features/admin/model/admin-calendar-date.ts'
import { vietnamToday } from '../src/features/admin/model/admin-workspace-query.ts'

test('Admin live clock follows Vietnam across UTC midnight and keeps the requested short format', () => {
  assert.equal(formatAdminClock(new Date('2026-10-12T17:57:00Z')), 'Hôm nay 13/10/26 | 00:57')
  assert.equal(formatAdminClock(new Date('2026-10-12T16:59:59Z')), 'Hôm nay 12/10/26 | 23:59')
})
test('Calendar date strings keep the Vietnam day instead of serializing UTC as the selected date', () => {
  const date = adminCalendarDate('2026-10-13')!
  assert.equal(date.toISOString(), '2026-10-12T17:00:00.000Z')
  assert.equal(vietnamToday(date), '2026-10-13')
  assert.equal(adminCalendarLabel('2026-10-13'), '13/10/2026')
  assert.equal(adminCalendarDate('2026-02-30'), undefined)
  assert.equal(adminCalendarDate(''), undefined)
})
