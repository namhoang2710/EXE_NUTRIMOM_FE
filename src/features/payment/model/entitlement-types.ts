import type { PlanTier } from './payment-types.ts'

export type GatedFeature = 'FAMILY_SHARING' | 'CALENDAR_REMINDERS' | 'CONCEPTION_CALCULATOR'

export interface PlanFeatureDto {
  code: string
  label: string
  included: boolean
}

export interface ScanQuotaDto {
  limit: number
  period: 'LIFETIME' | 'DAILY' | 'UNLIMITED'
  unlimited: boolean
}

export interface SubscriptionPlanDto {
  id: PlanTier
  name: string
  description: string
  price: number
  currency: string
  duration_days: number
  featured: boolean
  features: PlanFeatureDto[]
  scan_quota: ScanQuotaDto
}

export interface MyEntitlementsDto {
  plan_id: PlanTier
  plan_name: string
  paid: boolean
  start_date: string | null
  end_date: string | null
  days_remaining: number
  features: PlanFeatureDto[]
  scan_quota: ScanQuotaDto
}

export interface UpgradeHint {
  message: string
  requiredPlan?: Exclude<PlanTier, 'FREE'>
  feature?: string
}
