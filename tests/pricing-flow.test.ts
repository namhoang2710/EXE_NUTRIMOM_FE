import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getPricingComparisonRows, getPublicPricingLink, pricingPlans } from '../src/features/payment/model/pricing-catalog.ts'
import { getPricingReviewUrl, getPricingSelectUrl, parsePricingFlow } from '../src/features/payment/model/pricing-flow.ts'

const pricingPageSource = readFileSync(new URL('../src/features/payment/pages/PricingPage.tsx', import.meta.url), 'utf8')
const catalogCardSource = readFileSync(new URL('../src/features/payment/components/PricingCatalogCard.tsx', import.meta.url), 'utf8')
const publicSectionSource = readFileSync(new URL('../src/features/landing/components/PublicPricingSection.tsx', import.meta.url), 'utf8')

test('catalog is the only valid pricing state without a query', () => {
  assert.deepEqual(parsePricingFlow(null, null), { screen: 'catalog' })
  assert.deepEqual(parsePricingFlow(null, 'review'), { screen: 'invalid' })
})

test('paid query opens selection and preselects the requested tier', () => {
  assert.deepEqual(parsePricingFlow('PLAN_399K', null), { screen: 'select', plan: 'PLAN_399K' })
  assert.deepEqual(parsePricingFlow('PLAN_99K', null), { screen: 'select', plan: 'PLAN_99K' })
  assert.equal(getPricingSelectUrl('PLAN_399K'), '/app/pricing?plan=PLAN_399K')
})

test('review is valid only for a paid tier', () => {
  assert.deepEqual(parsePricingFlow('PLAN_399K', 'review'), { screen: 'review', plan: 'PLAN_399K' })
  assert.deepEqual(parsePricingFlow('PLAN_99K', 'review'), { screen: 'review', plan: 'PLAN_99K' })
  assert.deepEqual(parsePricingFlow('FREE', 'review'), { screen: 'invalid' })
  assert.deepEqual(parsePricingFlow('UNKNOWN', 'review'), { screen: 'invalid' })
  assert.deepEqual(parsePricingFlow('PLAN_99K', 'unknown'), { screen: 'invalid' })
  assert.equal(getPricingReviewUrl('PLAN_99K'), '/app/pricing?plan=PLAN_99K&step=review')
})

test('comparison is derived from the shared catalog in visual order', () => {
  const rows = getPricingComparisonRows()
  assert.deepEqual(pricingPlans.map((plan) => plan.tier), ['FREE', 'PLAN_399K', 'PLAN_99K'])
  assert.equal(rows.length, pricingPlans[0]!.features.length)
  for (const [index, row] of rows.entries()) {
    assert.equal(row.label, pricingPlans[0]!.features[index]!.label)
    assert.deepEqual(row.cells.map((cell) => cell.tier), ['FREE', 'PLAN_399K', 'PLAN_99K'])
  }
})

test('member catalog keeps Free current and paid CTAs explicit without checkout', () => {
  assert.match(catalogCardSource, /Đang dùng/)
  assert.match(catalogCardSource, /Nhận gói 399K/)
  assert.match(catalogCardSource, /Nhận gói 99K/)
  assert.doesNotMatch(catalogCardSource, /createCheckout|getMySubscription|useSubscription/)
})

test('selection and review do not request subscription state', () => {
  assert.doesNotMatch(pricingPageSource, /useSubscription|getMySubscription/)
  assert.match(pricingPageSource, /screen !== 'review'/)
  assert.match(pricingPageSource, /submitting\.current/)
})

test('checkout is created only by the explicit review action', () => {
  assert.equal(pricingPageSource.match(/paymentApi\.createCheckout/g)?.length, 1)
  assert.match(pricingPageSource, /onStartPayment=\{\(\) => void startPayment\(\)\}/)
  assert.match(pricingPageSource, /createCheckoutIdempotencyKey/)
  assert.doesNotMatch(pricingPageSource, /onSelect=.*createCheckout/)
})

test('shared public section retains login routing through the common catalog', () => {
  assert.match(publicSectionSource, /PricingCatalogGrid/)
  assert.match(publicSectionSource, /context="public"/)
  for (const plan of pricingPlans) {
    assert.deepEqual(getPublicPricingLink(plan, false), {
      to: '/login',
      state: { from: plan.publicDestination },
    })
  }
})

test('included states use the semantic success class and FAQ is single-open accessible', () => {
  assert.match(pricingPageSource, /nm-payment-success-check/)
  assert.match(catalogCardSource, /nm-payment-success-check/)
  assert.match(pricingPageSource, /aria-expanded=\{open\}/)
  assert.match(pricingPageSource, /aria-controls=\{panelId\}/)
  assert.match(pricingPageSource, /setOpenIndex\(open \? null : index\)/)
})
