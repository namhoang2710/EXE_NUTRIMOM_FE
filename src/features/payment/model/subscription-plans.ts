import type { PlanTier } from './payment-types'

export interface SubscriptionPlan {
  tier: PlanTier
  name: string
  amount: number
  description: string
  benefits: string[]
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    tier: 'FREE', name: 'Miễn phí', amount: 0,
    description: 'Bắt đầu lưu lại hành trình chăm sóc của mẹ.',
    benefits: ['Lưu hồ sơ sức khỏe cơ bản', 'AI scan món ăn'],
  },
  {
    tier: 'PLAN_99K', name: 'Cơ bản', amount: 99000,
    description: 'Thêm công cụ chủ động cho hành trình thai kỳ.',
    benefits: ['Tính ngày thụ thai', 'AI scan món ăn 2 lần / ngày'],
  },
  {
    tier: 'PLAN_399K', name: 'Toàn diện', amount: 399000,
    description: 'Kết nối chăm sóc cho mẹ và cả gia đình.',
    benefits: ['Liên kết gia đình', 'Tính ngày thụ thai', 'Lưu hồ sơ trọn đời', 'AI scan không giới hạn', 'Gợi ý cá nhân hóa toàn diện'],
  },
]

export function getSubscriptionPlan(value: string | null) {
  return subscriptionPlans.find((plan) => plan.tier === value) ?? subscriptionPlans[1]!
}

export function formatPaymentAmount(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`
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
