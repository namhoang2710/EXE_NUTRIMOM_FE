import type { PlanTier } from './payment-types'

export type PaidPlanTier = Exclude<PlanTier, 'FREE'>
export type PricingContext = 'public' | 'member'

export interface PricingFeature {
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

export const pricingPlans: PricingPlan[] = [
  {
    tier: 'FREE',
    name: 'Miễn phí',
    price: '0đ',
    amount: 0,
    cadence: 'Mãi mãi',
    description: 'Khởi đầu nhẹ nhàng với những công cụ thiết yếu cho hành trình của mẹ.',
    featured: false,
    publicDestination: '/app',
    features: [
      { label: 'Liên kết gia đình', included: false },
      { label: 'Tính ngày thụ thai', included: false },
      { label: 'Lưu hồ sơ sức khỏe', included: true },
      { label: 'AI Scan Vision', included: true, detail: '2 lượt trải nghiệm tổng cộng' },
      { label: 'Lịch nhắc nhở', included: false },
      { label: 'Gợi ý cá nhân toàn diện', included: false },
      { label: 'Chatbot đồng hành', included: true },
      { label: 'Tư vấn', included: true },
      { label: 'Đặt lịch bác sĩ', included: true },
      { label: 'Luôn nhận hỗ trợ', included: true },
    ],
  },
  {
    tier: 'PLAN_399K',
    name: 'Toàn diện',
    price: '399.000đ',
    amount: 399000,
    cadence: 'Trọn 9 tháng',
    description: 'Đầy đủ công cụ chăm sóc, theo dõi và kết nối gia đình trong suốt thai kỳ.',
    featured: true,
    publicDestination: '/app/pricing?plan=PLAN_399K&step=review#pricing',
    features: [
      { label: 'Liên kết gia đình', included: true },
      { label: 'Tính ngày thụ thai', included: true },
      { label: 'Lưu hồ sơ sức khỏe', included: true },
      { label: 'AI Scan Vision', included: true, detail: 'Không giới hạn' },
      { label: 'Lịch nhắc nhở', included: true },
      { label: 'Gợi ý cá nhân toàn diện', included: true },
      { label: 'Chatbot đồng hành', included: true },
      { label: 'Tư vấn', included: true },
      { label: 'Đặt lịch bác sĩ', included: true },
      { label: 'Luôn nhận hỗ trợ', included: true },
    ],
  },
  {
    tier: 'PLAN_99K',
    name: 'Cơ bản',
    price: '99.000đ',
    amount: 99000,
    cadence: '30 ngày',
    description: 'Thêm công cụ theo dõi chủ động và gợi ý phù hợp với từng giai đoạn.',
    featured: false,
    publicDestination: '/app/pricing?plan=PLAN_99K&step=review#pricing',
    features: [
      { label: 'Liên kết gia đình', included: false },
      { label: 'Tính ngày thụ thai', included: true },
      { label: 'Lưu hồ sơ sức khỏe', included: true },
      { label: 'AI Scan Vision', included: true, detail: '2 lượt mỗi ngày' },
      { label: 'Lịch nhắc nhở', included: true },
      { label: 'Gợi ý cá nhân toàn diện', included: true },
      { label: 'Chatbot đồng hành', included: true },
      { label: 'Tư vấn', included: true },
      { label: 'Đặt lịch bác sĩ', included: true },
      { label: 'Luôn nhận hỗ trợ', included: true },
    ],
  },
]

export function getPricingPlan(tier: PlanTier): PricingPlan {
  return pricingPlans.find((plan) => plan.tier === tier)!
}

export function isPaidPlanTier(value: string | null): value is PaidPlanTier {
  return value === 'PLAN_99K' || value === 'PLAN_399K'
}

export function getPublicPricingLink(plan: PricingPlan, isAuthenticated: boolean): PricingLink {
  if (isAuthenticated) return { to: plan.publicDestination }
  return { to: '/login', state: { from: plan.publicDestination } }
}

export function getPricingComparisonRows(): PricingComparisonRow[] {
  const labels = pricingPlans[0]?.features.map((feature) => feature.label) ?? []
  return labels.map((label, featureIndex) => ({
    label,
    cells: pricingPlans.map((plan) => ({
      tier: plan.tier,
      ...plan.features[featureIndex]!,
    })),
  }))
}
