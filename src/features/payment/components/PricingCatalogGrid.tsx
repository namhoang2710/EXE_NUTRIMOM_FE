import type { PlanTier } from '../model/payment-types'
import { type PricingPlan, type PaidPlanTier, type PricingContext } from '../model/pricing-catalog'
import { PricingCatalogCard } from './PricingCatalogCard'

interface PricingCatalogGridProps {
  plans: PricingPlan[]
  context: PricingContext
  isAuthenticated?: boolean
  currentPlanTier?: PlanTier
  onSelectPlan?: (tier: PaidPlanTier) => void
}

export function PricingCatalogGrid({
  plans,
  context,
  isAuthenticated = false,
  currentPlanTier,
  onSelectPlan,
}: PricingCatalogGridProps) {
  return (
    <div className="publicPricing__grid">
      {plans.map((plan, index) => (
        <PricingCatalogCard
          key={plan.tier}
          context={context}
          plan={plan}
          index={index}
          isAuthenticated={isAuthenticated}
          isCurrentPlan={currentPlanTier === plan.tier}
          currentPlanTier={currentPlanTier}
          onSelectPlan={onSelectPlan}
        />
      ))}
    </div>
  )
}
