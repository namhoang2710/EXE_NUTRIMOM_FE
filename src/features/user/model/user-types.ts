export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type OnboardingStatus = 'PROFILE_REQUIRED' | 'CONTEXT_REQUIRED' | 'COMPLETED'

export interface UserProfile {
  id: string
  phone: string
  email: string | null
  display_name: string
  salutation: string | null
  role: string
  gender: Gender | null
  date_of_birth: string | null
  avatar_key: string | null
  avatar_url: string | null
  onboarding_status: OnboardingStatus
  created_at: string
  version: number
}

export type ProfilePatch = Partial<Pick<UserProfile, 'display_name' | 'email' | 'date_of_birth' | 'gender' | 'avatar_key'>> & { version: number }

export interface UserPreferences {
  language: string
  locale: string
  timezone: string
  theme: string
  weight_unit: string
  length_unit: string
  glucose_unit: string
  backup_enabled: boolean
  notification_enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  preferred_reminder_time: string | null
  quiet_hours: Record<string, string> | null
  version: number
}

export type PreferencesPatch = Partial<Omit<UserPreferences, 'version'>> & { version: number }
