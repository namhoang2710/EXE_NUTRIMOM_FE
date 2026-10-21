import type { PlanTier } from './payment-types'
import type { ScanQuotaDto, SubscriptionPlanDto } from './entitlement-types.ts'

export type PaidPlanTier = Exclude<PlanTier, 'FREE'>
export type PricingContext = 'public' | 'member'

export interface PricingFeature {
  code: string
  label: string
  included: boolean
  detail?: string
}

export interface PricingPlan {
  tier: PlanTier
  name: string
  price: string
  amount: number
  cadence: string
  durationDays: number
  description: string
  featured: boolean
  features: PricingFeature[]
  publicDestination: string
}

export interface PricingLink {
  to: string
  state?: { from: string }
}

export interface PricingComparisonCell extends PricingFeature {
  tier: PlanTier
}

export interface PricingComparisonRow {
  label: string
  cells: PricingComparisonCell[]
}

export function scanDetail(quota: ScanQuotaDto): string {
  if (quota.unlimited || quota.period === 'UNLIMITED') return 'Không giới hạn'
  return quota.period === 'DAILY' ? `${quota.limit} lượt mỗi ngày` : `${quota.limit} lượt trải nghiệm tổng cộng`
}

export function toPricingPlan(dto: SubscriptionPlanDto): PricingPlan {
  return {
    tier: dto.id,
    name: dto.name,
    price: `${dto.price.toLocaleString('vi-VN')}đ`,
    amount: dto.price,
    cadence: dto.id === 'FREE' ? 'Mãi mãi' : `${dto.duration_days} ngày`,
    durationDays: dto.duration_days,
    description: dto.description,
    featured: dto.featured,
    publicDestination: dto.id === 'FREE' ? '/app' : `/app/pricing?plan=${dto.id}&step=review#pricing`,
    features: dto.features.map((feature) => ({
      ...feature,
      detail: feature.code === 'AI_SCAN' ? scanDetail(dto.scan_quota) : undefined,
    })),
  }
}

export function getPricingPlan(tier: PlanTier, plans: PricingPlan[]): PricingPlan | undefined {
  return plans.find((plan) => plan.tier === tier)
}

/** Purchase policy is UI only; the backend remains authoritative for entitlements. */
export function canPurchasePlan(current: PlanTier, target: PlanTier): boolean {
  if (target === 'FREE') return false
  return !(current === 'PLAN_399K' && target === 'PLAN_99K')
}

export function isPaidPlanTier(value: string | null): value is PaidPlanTier {
  return value === 'PLAN_99K' || value === 'PLAN_399K'
}

export function getPublicPricingLink(plan: PricingPlan, isAuthenticated: boolean): PricingLink {
  if (isAuthenticated) return { to: plan.publicDestination }
  return { to: '/login', state: { from: plan.publicDestination } }
}

export function getPricingComparisonRows(pricingPlans: PricingPlan[]): PricingComparisonRow[] {
  const labels = pricingPlans[0]?.features.map((feature) => feature.label) ?? []
  return labels.map((label, featureIndex) => ({
    label,
    cells: pricingPlans.map((plan) => ({
      tier: plan.tier,
      ...plan.features[featureIndex]!,
    })),
  }))
}
