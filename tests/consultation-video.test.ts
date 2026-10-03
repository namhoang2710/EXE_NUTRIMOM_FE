import assert from 'node:assert/strict'
import test from 'node:test'
import { remainingLabel, roomPath } from '../src/features/consultation-video/model/video-room.ts'

test('remaining time uses the server adjusted clock and never shows negative time', () => {
  const end = '2026-10-03T02:35:00Z'
  assert.equal(remainingLabel(end, Date.parse('2026-10-03T02:30:01Z')), '04:59')
  assert.equal(remainingLabel(end, Date.parse(end)), '00:00')
  assert.equal(remainingLabel(end, Date.parse('2026-10-03T03:00:00Z')), '00:00')
})
test('entry points return to the correct workspace without placing credentials in the URL', () => {
  assert.equal(roomPath('booking-123'), '/app/consultations/booking-123/call')
  assert.equal(roomPath('booking-123', true), '/expert/consultations/booking-123/call')
  assert.equal(roomPath('a/b?'), '/app/consultations/a%2Fb%3F/call')
})
