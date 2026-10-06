import { isPaidPlanTier, type PaidPlanTier } from './pricing-catalog.ts'

export type PricingFlowState =
  | { screen: 'catalog' }
  | { screen: 'select'; plan: PaidPlanTier }
  | { screen: 'review'; plan: PaidPlanTier }
  | { screen: 'invalid' }

export function parsePricingFlow(planParam: string | null, stepParam: string | null): PricingFlowState {
  if (planParam === null && stepParam === null) return { screen: 'catalog' }
  if (!isPaidPlanTier(planParam)) return { screen: 'invalid' }
  if (stepParam === null) return { screen: 'select', plan: planParam }
  if (stepParam === 'review') return { screen: 'review', plan: planParam }
  return { screen: 'invalid' }
}

export function getPricingSelectUrl(plan: PaidPlanTier): string {
  return `/app/pricing?plan=${plan}`
}

export function getPricingReviewUrl(plan: PaidPlanTier): string {
  return `/app/pricing?plan=${plan}&step=review`
}
