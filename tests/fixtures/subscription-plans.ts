import type { MyEntitlementsDto, SubscriptionPlanDto } from '../../src/features/payment/model/entitlement-types.ts'
import { toPricingPlan } from '../../src/features/payment/model/pricing-catalog.ts'

const features = [
  ['FAMILY_SHARING', 'Liên kết gia đình'], ['CONCEPTION_CALCULATOR', 'Tính ngày thụ thai'],
  ['MEDICAL_RECORDS', 'Lưu hồ sơ sức khỏe'], ['AI_SCAN', 'AI Scan Vision'],
  ['CALENDAR_REMINDERS', 'Lịch nhắc nhở'], ['PERSONALISED_GUIDANCE', 'Gợi ý cá nhân toàn diện'],
  ['CHATBOT', 'Chatbot đồng hành'], ['CONSULTATION', 'Tư vấn'],
  ['DOCTOR_BOOKING', 'Đặt lịch bác sĩ'], ['SUPPORT', 'Luôn nhận hỗ trợ'],
]
function plan(id: SubscriptionPlanDto['id'], name: string, price: number, excluded: string[], scan_quota: SubscriptionPlanDto['scan_quota']): SubscriptionPlanDto {
  return { id, name, price, description: id === 'FREE' ? 'Khởi đầu nhẹ nhàng với những công cụ thiết yếu cho hành trình của mẹ.' : id === 'PLAN_399K' ? 'Đầy đủ công cụ chăm sóc, theo dõi và kết nối gia đình trong suốt thai kỳ.' : 'Thêm công cụ theo dõi chủ động và gợi ý phù hợp với từng giai đoạn.', currency: 'VND', duration_days: id === 'FREE' ? 0 : 30, featured: id === 'PLAN_399K', features: features.map(([code, label]) => ({ code: code!, label: label!, included: !excluded.includes(code!) })), scan_quota }
}
export const planDtos = [
  plan('FREE', 'Gói Miễn phí', 0, ['FAMILY_SHARING', 'CONCEPTION_CALCULATOR', 'CALENDAR_REMINDERS', 'PERSONALISED_GUIDANCE'], { limit: 2, period: 'LIFETIME', unlimited: false }),
  plan('PLAN_399K', 'Gói Toàn diện 399K', 399000, [], { limit: 0, period: 'UNLIMITED', unlimited: true }),
  plan('PLAN_99K', 'Gói Cơ bản 99K', 99000, ['FAMILY_SHARING'], { limit: 2, period: 'DAILY', unlimited: false }),
]
export const pricingPlans = planDtos.map(toPricingPlan)
export function entitlementsFor(tier: SubscriptionPlanDto['id']): MyEntitlementsDto {
  const selected = planDtos.find((item) => item.id === tier)!
  return { plan_id: tier, plan_name: selected.name, paid: tier !== 'FREE', start_date: null, end_date: tier === 'FREE' ? null : '2027-01-01T00:00:00Z', days_remaining: tier === 'FREE' ? 0 : 30, features: selected.features, scan_quota: selected.scan_quota }
}
