import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicPricingLink, pricingPlans } from '../src/features/payment/model/pricing-catalog.ts'

test('keeps the three public tiers in the required visual and reading order', () => {
  assert.deepEqual(
    pricingPlans.map((plan) => plan.tier),
    ['FREE', 'PLAN_399K', 'PLAN_99K'],
  )
  assert.deepEqual(
    pricingPlans.map((plan) => plan.name),
    ['Miễn phí', 'Toàn diện', 'Cơ bản'],
  )
})

test('features only the comprehensive plan in the center', () => {
  const featuredPlans = pricingPlans.filter((plan) => plan.featured)
  assert.equal(featuredPlans.length, 1)
  assert.equal(featuredPlans[0]?.tier, 'PLAN_399K')
  assert.equal(pricingPlans[1]?.tier, 'PLAN_399K')
})

test('provides exactly ten contracted benefit rows for every plan', () => {
  for (const plan of pricingPlans) {
    assert.equal(plan.features.length, 10, plan.tier)
  }
})

test('keeps the plan-specific benefits and cadence from the public contract', () => {
  const free = pricingPlans.find((plan) => plan.tier === 'FREE')!
  const basic = pricingPlans.find((plan) => plan.tier === 'PLAN_99K')!
  const comprehensive = pricingPlans.find((plan) => plan.tier === 'PLAN_399K')!

  assert.equal(free.features.find((feature) => feature.label === 'AI Scan Vision')?.detail, '2 lượt trải nghiệm tổng cộng')
  assert.equal(basic.features.find((feature) => feature.label === 'Lịch nhắc nhở')?.included, true)
  assert.equal(basic.features.find((feature) => feature.label === 'Gợi ý cá nhân toàn diện')?.included, true)
  assert.equal(comprehensive.features.find((feature) => feature.label === 'Liên kết gia đình')?.included, true)
  assert.equal(comprehensive.cadence, 'Trọn 9 tháng')
})

test('sends every anonymous plan CTA through login while preserving its destination', () => {
  for (const plan of pricingPlans) {
    const link = getPublicPricingLink(plan, false)
    assert.equal(link.to, '/login', plan.tier)
    assert.deepEqual(link.state, { from: plan.publicDestination }, plan.tier)
    assert.notEqual(link.to, '/register', plan.tier)
  }
})

test('sends authenticated users directly to each plan destination', () => {
  for (const plan of pricingPlans) {
    assert.deepEqual(getPublicPricingLink(plan, true), { to: plan.publicDestination })
  }
  assert.equal(pricingPlans[0]?.publicDestination, '/app')
  assert.equal(pricingPlans[1]?.publicDestination, '/app/pricing?plan=PLAN_399K&step=review#pricing')
  assert.equal(pricingPlans[2]?.publicDestination, '/app/pricing?plan=PLAN_99K&step=review#pricing')
})
