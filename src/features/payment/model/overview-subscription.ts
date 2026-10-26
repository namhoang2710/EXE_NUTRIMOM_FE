import type { MyEntitlementsDto } from './entitlement-types.ts'
import { getPricingSelectUrl } from './pricing-flow.ts'

export function overviewSubscriptionAction(
  subscription: Pick<MyEntitlementsDto, 'paid' | 'plan_id'>,
) {
  if (!subscription.paid || subscription.plan_id === 'FREE')
    return { label: 'Tham khảo các gói', to: '/app/pricing#pricing' }
  return {
    label:
      subscription.plan_id === 'PLAN_99K' ? 'Nâng cấp gói' : 'Gia hạn thêm gói',
    to: getPricingSelectUrl('PLAN_399K'),
  }
}
export function subscriptionExpiry(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return null
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value)
  const day = part('day'),
    month = part('month'),
    year = part('year')
  return { day, month, year, label: `${day} thg ${month}, ${year}` }
}
