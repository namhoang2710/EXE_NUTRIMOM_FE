import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPreferencesPatch } from '../src/features/user/model/preferences-patch.ts'
import type { UserPreferences } from '../src/features/user/model/user-types.ts'

const saved: UserPreferences = {
  language: 'vi', locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', theme: 'light',
  weight_unit: 'kg', length_unit: 'cm', glucose_unit: 'mmol/L', backup_enabled: false,
  notification_enabled: true, push_enabled: true, email_enabled: false, sms_enabled: false,
  preferred_reminder_time: '07:30:00', quiet_hours: null, version: 3,
}

test('keeps false toggles and a separate preferences version in PATCH', () => {
  const patch = buildPreferencesPatch(saved, { ...saved, push_enabled: false, email_enabled: true })
  assert.deepEqual(patch, { version: 3, push_enabled: false, email_enabled: true })
})

test('does not pretend null clears a stored reminder time', () => {
  assert.deepEqual(buildPreferencesPatch(saved, { ...saved, preferred_reminder_time: null }), { version: 3 })
})
