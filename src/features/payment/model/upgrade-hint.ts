import { ApiClientError } from '../../../core/api/api-error.ts'
import type { GatedFeature, MyEntitlementsDto, SubscriptionPlanDto, UpgradeHint } from './entitlement-types.ts'
import { isPaidPlanTier } from './pricing-catalog.ts'

export function upgradeHintFromError(reason: unknown): UpgradeHint | null {
  if (!(reason instanceof ApiClientError) || reason.code !== 'PLAN_UPGRADE_REQUIRED') return null
  return {
    message: reason.message,
    requiredPlan: isPaidPlanTier(reason.fields.required_plan ?? null) ? reason.fields.required_plan as UpgradeHint['requiredPlan'] : undefined,
    feature: reason.fields.feature,
  }
}

export function featureUpgradeHint(feature: GatedFeature, current: MyEntitlementsDto | null, plans: SubscriptionPlanDto[]): UpgradeHint | null {
  // Unknown capabilities must be decided by the server, never guessed as FREE.
  const entitlement = current?.features.find((item) => item.code === feature)
  if (!entitlement || entitlement.included) return null
  const required = plans.filter((plan) => plan.features.some((item) => item.code === feature && item.included))
    .sort((a, b) => a.price - b.price)[0]
  if (!required || !isPaidPlanTier(required.id)) return null
  return { message: `${entitlement.label} có trong ${required.name}.`, requiredPlan: required.id, feature }
}

export function upgradeDestination(hint: UpgradeHint): string {
  return hint.requiredPlan ? `/app/pricing?plan=${hint.requiredPlan}&step=review#pricing` : '/app/pricing#pricing'
}
