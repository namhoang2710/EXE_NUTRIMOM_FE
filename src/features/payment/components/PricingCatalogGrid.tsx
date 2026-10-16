import type { PlanTier } from '../model/payment-types'
import { pricingPlans, type PaidPlanTier, type PricingContext } from '../model/pricing-catalog'
import { PricingCatalogCard } from './PricingCatalogCard'

interface PricingCatalogGridProps {
  context: PricingContext
  isAuthenticated?: boolean
  currentPlanTier?: PlanTier
  onSelectPlan?: (tier: PaidPlanTier) => void
}

export function PricingCatalogGrid({
  context,
  isAuthenticated = false,
  currentPlanTier,
  onSelectPlan,
}: PricingCatalogGridProps) {
  return (
    <div className="publicPricing__grid">
      {pricingPlans.map((plan, index) => (
        <PricingCatalogCard
          key={plan.tier}
          context={context}
          plan={plan}
          index={index}
          isAuthenticated={isAuthenticated}
          isCurrentPlan={context === 'member' ? plan.tier === 'FREE' : currentPlanTier === plan.tier}
          onSelectPlan={onSelectPlan}
        />
      ))}
    </div>
  )
}
