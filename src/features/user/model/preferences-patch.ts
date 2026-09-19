import type { PreferencesPatch, UserPreferences } from './user-types'

export function buildPreferencesPatch(saved: UserPreferences, draft: UserPreferences): PreferencesPatch {
  const patch: PreferencesPatch = { version: saved.version }
  for (const key of ['language', 'timezone', 'notification_enabled', 'push_enabled', 'email_enabled', 'sms_enabled', 'preferred_reminder_time'] as const) {
    if (draft[key] !== saved[key] && !(key === 'preferred_reminder_time' && draft[key] === null)) Object.assign(patch, { [key]: draft[key] })
  }
  return patch
}
