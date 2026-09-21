export interface ApiProfile {
  id: string
  phone: string
  email?: string | null
  display_name: string
  salutation?: string | null
  role: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  date_of_birth?: string | null
  avatar_key?: string | null
  avatar_url?: string | null
  onboarding_status: string
  created_at: string
  version: number
}

export interface ApiPreferences {
  language?: string | null
  locale?: string | null
  timezone?: string | null
  theme?: string | null
  weight_unit?: string | null
  length_unit?: string | null
  glucose_unit?: string | null
  backup_enabled: boolean
  notification_enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  preferred_reminder_time?: string | null
  quiet_hours?: Record<string, string> | null
  version: number
}

export interface Pregnancy {
  id: string
  status: string
  last_menstrual_period?: string | null
  conception_date?: string | null
  estimated_due_date?: string | null
  is_first_pregnancy?: boolean | null
  multiple_pregnancy?: boolean | null
  timezone?: string | null
  gestational_week: number
  gestational_day: number
  trimester: number
  days_until_due: number
  calculation_source: string
  care_facility_name?: string | null
  care_provider_name?: string | null
  version: number
}

export interface PregnancyCalculation {
  last_menstrual_period?: string | null
  conception_date?: string | null
  estimated_due_date: string
  gestational_week: number
  gestational_day: number
  trimester: number
  days_until_due: number
  calculation_source: string
}

export interface WeekContent {
  week: number
  title?: string | null
  summary?: string | null
  baby_development?: string | null
  mother_changes?: string | null
  care_tips?: string | null
  warning_signs?: string | null
  sources?: string | null
  disclaimer?: string | null
  development_summary?: string | null
  maternal_changes?: string[]
  care_topics?: string[]
  reviewed_by?: string | null
  reviewed_at?: string | null
  content_version?: number
  baby?: { length_cm_range?: number[] | null; weight_g_range?: number[] | null; comparison_label?: string | null } | null
}

export interface MomDashboard {
  profile_summary?: { display_name: string; salutation?: string | null; role: string } | null
  pregnancy_summary?: Pregnancy | null
  baby_summary?: { week: number; title?: string | null; summary?: string | null; baby_development?: string | null; disclaimer?: string | null } | null
  next_appointment?: unknown | null
  care_progress?: { completed: number; total: number } | null
  active_alerts?: unknown[]
  recommended_articles?: unknown[]
  upcoming_reminders?: unknown[]
  unread_notification_count?: number
}

export interface CarePlan {
  pregnancy_id: string
  week: number
  milestones: Array<{ id: string; week: number; title: string; description?: string | null; status: string; source_name?: string | null; source_url?: string | null }>
  progress: { completed: number; total: number }
}

export interface PreparationItem { id: string; group_code: string; title: string; completed: boolean; completed_at?: string | null; sort_order: number; version: number }
export interface BirthPlan { id: string; pregnancy_id: string; companion?: string | null; preferred_facility?: string | null; pain_management_note?: string | null; newborn_care_note?: string | null; free_text_note?: string | null; version: number }
export interface Guidance { id: string; week?: number | null; topic?: string | null; locale?: string | null; title: string; summary?: string | null; source?: string | null; source_url?: string | null; reviewer?: string | null; reviewed_at?: string | null; next_review_at?: string | null; evidence_level?: string | null; disclaimer?: string | null }

export interface CursorPage<T> { items: T[]; next_cursor?: string | null; has_more?: boolean }
export interface PartnerDashboard { membership_role: string; pregnancy_overview?: { id: string; status: string; gestational_week: number; gestational_day: number; trimester: number; estimated_due_date?: string | null; days_until_due: number; care_facility_name?: string | null } | null; assigned_tasks?: Array<{ id: string; title: string; description?: string | null; priority: string; due_at?: string | null; status: string }> }
export interface MedicalRecord {
  id: string; pregnancy_id: string; category: string; title: string; occurred_at: string; facility_name?: string | null; clinician_name?: string | null; summary?: string | null; note?: string | null; attachment_count: number; attachments?: Array<{ id: string; file_name: string; mime_type: string; size_bytes: number; status: string }>; version: number
}
export interface UploadSession { file_id: string; upload_url: string; headers?: Record<string, string>; expires_at: string }
export interface UploadedFile { id: string; status: string; file_name: string }
