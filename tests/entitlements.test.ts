import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { createSubscriptionResource } from '../src/features/payment/model/subscription-resource.ts'
import { featureUpgradeHint, upgradeHintFromError, upgradeDestination } from '../src/features/payment/model/upgrade-hint.ts'
import { canPurchasePlan, toPricingPlan } from '../src/features/payment/model/pricing-catalog.ts'
import { entitlementsFor, planDtos } from './fixtures/subscription-plans.ts'
import { familyErrorMessage, isFamilyRateLimitError } from '../src/features/family/model/family-errors.ts'

test('enforces precisely the backend feature matrix and cheapest capable plan', () => {
  for (const tier of ['FREE', 'PLAN_99K', 'PLAN_399K'] as const) {
    const current = entitlementsFor(tier)
    assert.equal(featureUpgradeHint('FAMILY_SHARING', current, planDtos)?.requiredPlan ?? null, tier === 'PLAN_399K' ? null : 'PLAN_399K')
    assert.equal(featureUpgradeHint('CALENDAR_REMINDERS', current, planDtos)?.requiredPlan ?? null, tier === 'FREE' ? 'PLAN_99K' : null)
  }
  assert.equal(featureUpgradeHint('FAMILY_SHARING', null, planDtos), null)
})

test('only upgrade errors invite purchase; invalid required plan falls back to catalog', () => {
  for (const [status, code] of [[403, 'FORBIDDEN'], [429, 'QUOTA_EXCEEDED'], [429, 'RATE_LIMITED'], [400, 'VALIDATION_ERROR']] as const) {
    assert.equal(upgradeHintFromError(new ApiClientError(status, { code, message: code })), null)
  }
  const hint = upgradeHintFromError(new ApiClientError(403, { code: 'PLAN_UPGRADE_REQUIRED', message: 'Thông báo từ BE', fields: { required_plan: 'PLAN_399K', feature: 'FAMILY_SHARING' } }))!
  assert.equal(hint.message, 'Thông báo từ BE')
  assert.equal(upgradeDestination(hint), '/app/pricing?plan=PLAN_399K&step=review#pricing')
  const invalid = upgradeHintFromError(new ApiClientError(403, { code: 'PLAN_UPGRADE_REQUIRED', message: 'Nâng cấp', fields: { required_plan: 'bad' } }))!
  assert.equal(upgradeDestination(invalid), '/app/pricing#pricing')
})

test('family quota exhaustion retains its message while throttling follows Retry-After', () => {
  const quota = new ApiClientError(429, { code: 'QUOTA_EXCEEDED', message: 'Bạn đã dùng hết hạn mức.' })
  assert.equal(familyErrorMessage(quota), 'Bạn đã dùng hết hạn mức.')
  assert.equal(isFamilyRateLimitError(quota), false)
  const throttled = new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Chờ' }, 60_000)
  assert.match(familyErrorMessage(throttled), /60 giây/)
  assert.equal(isFamilyRateLimitError(throttled), true)
})

test('permits renewal and upgrade, prevents buying a lower tier and FREE checkout', () => {
  for (const current of ['FREE', 'PLAN_99K', 'PLAN_399K'] as const) assert.equal(canPurchasePlan(current, 'FREE'), false)
  assert.equal(canPurchasePlan('FREE', 'PLAN_99K'), true)
  assert.equal(canPurchasePlan('FREE', 'PLAN_399K'), true)
  assert.equal(canPurchasePlan('PLAN_99K', 'PLAN_99K'), true)
  assert.equal(canPurchasePlan('PLAN_99K', 'PLAN_399K'), true)
  assert.equal(canPurchasePlan('PLAN_399K', 'PLAN_399K'), true)
  assert.equal(canPurchasePlan('PLAN_399K', 'PLAN_99K'), false)
})

test('catalog maps actual prices, durations and quotas without inventing usage', () => {
  const dto = { ...planDtos[1]!, price: 421000, duration_days: 45 }
  const mapped = toPricingPlan(dto)
  assert.equal(mapped.amount, 421000)
  assert.equal(mapped.price, '421.000đ')
  assert.equal(mapped.cadence, '45 ngày')
  assert.deepEqual(mapped.features.map((item) => item.code), dto.features.map((item) => item.code))
  assert.equal(mapped.features.find((item) => item.code === 'AI_SCAN')?.detail, 'Không giới hạn')
  assert.equal('remaining' in mapped, false)
})

test('shared reads deduplicate simultaneous and forced requests, respect TTL', async () => {
  let now = 1000, calls = 0
  const resource = createSubscriptionResource<number>(15000, () => now)
  const load = async () => { calls++; return calls }
  assert.deepEqual(await Promise.all([resource.load('user', load), resource.load('user', load, true)]), [1, 1])
  assert.equal(await resource.load('user', load), 1)
  now += 15001
  assert.equal(await resource.load('user', load), 2)
  assert.equal(calls, 2)
})

test('429 blocks retry storms for Retry-After and never automatically retries', async () => {
  let now = 1000, calls = 0
  const resource = createSubscriptionResource<number>(15000, () => now)
  const load = async () => { calls++; throw new ApiClientError(429, { code: 'RATE_LIMITED', message: 'Chờ' }, 60000) }
  await assert.rejects(resource.load('user', load))
  for (let i = 0; i < 10; i++) await assert.rejects(resource.load('user', load, true))
  assert.equal(calls, 1)
  assert.equal(resource.snapshot('user').data, null)
  now += 60001
  await assert.rejects(resource.load('user', load, true))
  assert.equal(calls, 2)
})

test('session clear prevents old pending data from publishing to another account', async () => {
  let resolve!: (value: number) => void
  const resource = createSubscriptionResource<number>(15000)
  const old = resource.load('old', () => new Promise<number>((done) => { resolve = done }))
  await Promise.resolve()
  resource.clear()
  await resource.load('new', async () => 399)
  resolve(99)
  await old
  assert.equal(resource.snapshot('new').data, 399)
  assert.equal(resource.snapshot('old').data, null)
})

test('post-payment invalidation discards a pending pre-payment response', async () => {
  let resolve!: (value: string) => void
  const resource = createSubscriptionResource<string>(15000)
  const old = resource.load('user', () => new Promise<string>((done) => { resolve = done }))
  await Promise.resolve()
  resource.invalidate('user')
  await resource.load('user', async () => 'PLAN_399K', true)
  resolve('FREE')
  await old
  assert.equal(resource.snapshot('user').data, 'PLAN_399K')
})
