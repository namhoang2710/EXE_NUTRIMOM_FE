import type { PreferencesPatch, UserPreferences } from './user-types'

export function buildPreferencesPatch(saved: UserPreferences, draft: UserPreferences): PreferencesPatch {
  const patch: PreferencesPatch = { version: saved.version }
  for (const key of ['language', 'locale', 'timezone', 'theme', 'weight_unit', 'length_unit', 'glucose_unit', 'backup_enabled', 'notification_enabled', 'push_enabled', 'email_enabled', 'sms_enabled', 'preferred_reminder_time', 'quiet_hours'] as const) {
    if (draft[key] !== saved[key] && !(key === 'preferred_reminder_time' && draft[key] === null)) Object.assign(patch, { [key]: draft[key] })
  }
  return patch
}
