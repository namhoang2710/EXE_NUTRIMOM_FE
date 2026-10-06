import type { PlanTier } from './payment-types'
import { pricingPlans } from './pricing-catalog.ts'

const paymentAmountFormatter = new Intl.NumberFormat('vi-VN')

export interface SubscriptionPlan {
  tier: PlanTier
  name: string
  amount: number
  description: string
  benefits: string[]
}

export const subscriptionPlans: SubscriptionPlan[] = pricingPlans.map((plan) => ({
  tier: plan.tier,
  name: plan.name,
  amount: plan.amount,
  description: plan.description,
  benefits: plan.features
    .filter((feature) => feature.included)
    .map((feature) => feature.detail ? `${feature.label}: ${feature.detail}` : feature.label),
}))

export function formatPaymentAmount(amount: number) {
  return `${paymentAmountFormatter.format(amount)}đ`
}

export function parseOrderCode(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const code = Number(value)
  return Number.isSafeInteger(code) && code > 0 ? code : null
}

export function isDemoCheckout(url: string) {
  try {
    return new URL(url, 'http://localhost').searchParams.get('mock') === 'true'
  } catch {
    return false
  }
}
