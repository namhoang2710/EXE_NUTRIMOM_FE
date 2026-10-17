import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
console.log('QA: starting local server')
const server = await (await import('vite')).createServer({ optimizeDeps: { entries: ['index.html'] }, server: { host: '127.0.0.1', port: 5193, strictPort: true, open: false, watch: { ignored: ['**/qa-artifacts/**'] } } })
await server.listen()
console.log('QA: starting Chrome')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
console.log('QA: Chrome ready')
const output = 'qa-artifacts/entitlements'
await mkdir(output, { recursive: true })
const results = [], errors = []
const user = { id: 'entitlements-qa', phone: '0901112233', display_name: 'Minh Anh', role: 'MOM', roles: ['USER'], status: 'ACTIVE', onboarding_status: 'COMPLETED', created_at: '2026-10-01T00:00:00Z' }
const profile = { ...user, email: 'qa@example.test', version: 1, gender: 'FEMALE' }
const record = { id: 'record-qa', title: 'Kết quả khám định kỳ', category: 'CHECKUP', occurred_at: '2026-10-01T02:00:00Z', summary: '', pregnancy_id: 'pregnancy-qa', attachment_count: 0, attachments: [], version: 1 }
const future = new Date(Date.now() + 3600_000)
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(future)
const reminder = { id: 'reminder-qa', type: 'FOLLOW_UP', title: 'Lịch tái khám đã có', starts_at: future.toISOString(), date, status: 'SCHEDULED', timezone: 'Asia/Ho_Chi_Minh', version: 1, remind_minutes_before: 10 }
const group = { id: 'family-qa', pregnancy_id: 'pregnancy-qa', owner_user_id: user.id, status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z' }

async function fixture(tier = 'FREE', options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const state = { tier, counts: {}, posts: [], catalogAuth: [], ...options }
  await context.addInitScript(({ user, anonymous, theme }) => {
    localStorage.setItem('nutrimom.theme', theme)
    if (!anonymous) sessionStorage.setItem('nutrimom.auth-session', JSON.stringify({ accessToken: 'fixture-access', refreshToken: 'fixture-refresh', tokenType: 'Bearer', accessExpiresAt: Date.now() + 3600_000, refreshExpiresAt: Date.now() + 86400_000, user: { ...user, displayName: user.display_name, onboardingStatus: user.onboarding_status } }))
  }, { user, anonymous: options.anonymous, theme: options.theme || 'light' })
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', ''), method = request.method()
    const key = `${method} ${path}`
    state.counts[key] = (state.counts[key] || 0) + 1
    if (!['GET', 'OPTIONS'].includes(method)) state.posts.push({ path, method, body: request.postDataJSON() })
    const ok = (data, status = 200) => route.fulfill({ status, json: { data, meta: { request_id: 'qa', server_time: new Date().toISOString() } } })
    const fail = (status, code, fields = {}, message = 'Thông báo từ máy chủ', headers = {}) => route.fulfill({ status, headers, json: { error: { code, message, fields, retryable: false, request_id: 'qa' } } })
    if (path === '/auth/me') return ok(user)
    if (path === '/users/me') return ok(profile)
    if (path === '/subscription-plans') {
      state.catalogAuth.push(request.headers().authorization)
      if (state.catalog429) return fail(429, 'RATE_LIMITED', {}, 'Vui lòng chờ trước khi thử lại.', { 'Retry-After': '30' })
      return ok(planDtos)
    }
    if (path === '/subscriptions/me') {
      if (state.entitlementError) return fail(503, 'SERVICE_UNAVAILABLE')
      if (state.entitlement429) return fail(429, 'RATE_LIMITED', {}, 'Đang giới hạn yêu cầu.', { 'Retry-After': '30' })
      const current = entitlementsFor(state.tier)
      if (state.expiring && state.counts[key] === 1) current.end_date = new Date(Date.now() + 1800).toISOString()
      else if (state.expiring) state.tier = 'FREE'
      return ok(state.expiring && state.counts[key] > 1 ? entitlementsFor('FREE') : current)
    }
    if (path === '/payments/subscription-checkout') {
      if (state.checkout429) return fail(429, 'RATE_LIMITED', {}, 'Vui lòng chờ.', { 'Retry-After': '30' })
      state.selectedTier = request.postDataJSON().plan_tier
      return ok({ order_code: 73145, plan_tier: state.selectedTier, plan_name: entitlementsFor(state.selectedTier).plan_name, amount: 399000, currency: 'VND', status: 'PENDING', checkout_url: '/payment/success?orderCode=73145&mock=true' })
    }
    if (path.endsWith('/confirm-mock')) { state.tier = state.selectedTier; state.paid = true; return ok('Confirmed') }
    if (path === '/payments/orders/73145') return ok({ id: 'order-qa', order_code: 73145, plan_tier: state.selectedTier, plan_name: entitlementsFor(state.selectedTier).plan_name, amount: 399000, currency: 'VND', status: state.paid ? 'PAID' : 'PENDING', created_at: new Date().toISOString(), checkout_url: '/payment/success?orderCode=73145&mock=true' })
    if (path === '/payments/my-subscription') { const current = entitlementsFor(state.tier); return ok({ ...current, plan_tier: current.plan_id, status: 'ACTIVE', active: true }) }
    if (path === '/dashboard/mom') return ok({ profile_summary: profile, subscription: entitlementsFor(state.tier), upcoming_reminders: [], active_alerts: [], recommended_articles: [] })
    if (path === '/pregnancies/current') return ok({ id: 'pregnancy-qa', status: 'ACTIVE', estimated_due_date: '2027-02-01', gestational_week: 24 })
    if (path === '/users/me/preferences') return ok({ timezone: 'Asia/Ho_Chi_Minh', version: 1 })
    if (path === '/calendar/month') return ok(state.existingReminder ? [{ date, event_count: 1, types: ['REMINDER'] }] : [])
    if (path === '/calendar/events') return ok(state.existingReminder ? [{ source: 'REMINDER', source_id: reminder.id, title: reminder.title, date, starts_at: reminder.starts_at, status: 'SCHEDULED', recurring: false }] : [])
    if (path === '/calendar/reminders/reminder-qa') {
      if (method === 'PATCH') return ok({ ...reminder, ...request.postDataJSON(), next_suggestion: new Date(Date.now() + 86400_000).toISOString() })
      if (method === 'DELETE') return route.fulfill({ status: 204 })
      return ok(reminder)
    }
    if ((path === '/calendar/reminders' || path === '/medical-records/record-qa/reminders') && method === 'POST') {
      if (state.writeError) return fail(state.writeError.status, state.writeError.code, state.writeError.fields, state.writeError.message || 'Thông báo từ máy chủ', state.writeError.status === 429 ? { 'Retry-After': '30' } : {})
      return ok({ ...reminder, ...request.postDataJSON() }, 201)
    }
    if (path === '/medical-records/record-qa') return ok(record)
    if (path === '/medical-records') return ok({ items: [record], next_cursor: null, has_more: false })
    if (path === '/family-groups') {
      if (method === 'POST' && state.writeError) return fail(state.writeError.status, state.writeError.code, state.writeError.fields, state.writeError.message || 'Thông báo từ máy chủ')
      if (method === 'POST') return ok(group, 201)
      return ok(state.group ? [state.joined ? { ...group, owner_user_id: 'owner-qa' } : group] : [])
    }
    if (path === '/family-members') return ok(state.joined ? [{ id: 'member-qa', user_id: user.id, display_name: user.display_name, scopes: ['FAMILY_TASKS', 'ACTIVITY_FEED'], relationship: 'PARTNER', version: 1 }] : [])
    if (path === '/family-invitations/accept') { state.group = true; state.joined = true; return ok({ id: 'member-qa', user_id: user.id, scopes: [] }) }
    if (path === '/family-invitations' && method === 'POST') {
      if (state.writeError) return fail(state.writeError.status, state.writeError.code, state.writeError.fields, state.writeError.message || 'Thông báo từ máy chủ')
      return ok({ id: 'invitation-qa', family_group_id: group.id, invited_email: 'family@example.test', token: 'synthetic-token', invite_url: 'http://localhost/family/invite?token=synthetic-token', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'], status: 'PENDING', delivery_status: 'SENT', sent_at: new Date().toISOString(), expires_at: '2027-01-01T00:00:00Z', created_at: new Date().toISOString() }, 201)
    }
    if (path === '/notifications/unread-count') return ok({ unread_count: 0 })
    if (path === '/notifications') return ok({ items: [], next_cursor: null })
    if (path === '/assistant/status') return ok({ available: false })
    return ok([])
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  return { context, page, state, goto: (path) => page.goto(`http://127.0.0.1:5193${path}`) }
}

async function check(name, run) {
  if (process.env.ENTITLEMENTS_QA_FILTER && !name.includes(process.env.ENTITLEMENTS_QA_FILTER)) return
  await run()
  results.push(name)
  console.log(`PASS ${name}`)
}
async function screenshot(page, name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }) }
async function noOverflow(page) {
  const result = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, parents: ['html', 'body', '#root', '.nm-app-shell', '.nm-app-content', 'main', '.nm-payment-comparison', '.nm-payment-table-scroll'].map((selector) => { const e = document.querySelector(selector); const r = e?.getBoundingClientRect(); return {selector, left:r?.left, right:r?.right, width:r?.width, scroll:e?.scrollWidth, overflow:e ? getComputedStyle(e).overflowX : null} }), offenders: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(-12).map((element) => ({ class: element.className, width: element.getBoundingClientRect().width })) }))
  if (result.scroll > result.width + 1) await screenshot(page, 'overflow-debug')
  assert.equal(result.scroll <= result.width + 1, true, `viewport overflow: ${JSON.stringify(result)}`)
}

try {
  await check('anonymous catalog needs no token and preserves login destination', async () => {
    const f = await fixture('FREE', { anonymous: true })
    await f.goto('/services#pricing')
    await f.page.locator('.publicPricingCard').first().waitFor()
    assert.equal(await f.page.locator('.publicPricingCard').count(), 3)
    assert.equal(f.state.counts['GET /subscription-plans'], 1)
    assert.ok(f.state.catalogAuth.every((header) => header === undefined))
    assert.equal(f.state.counts['GET /subscriptions/me'] || 0, 0)
    await f.page.locator('.publicPricingCard').nth(1).getByRole('link').click()
    await f.page.waitForURL('**/login')
    assert.equal(await f.page.evaluate(() => history.state.usr.from), '/app/pricing?plan=PLAN_399K&step=review#pricing')
    await f.context.close()
  })
  for (const tier of ['FREE', 'PLAN_99K', 'PLAN_399K']) await check(`${tier}: current tier, purchase actions, responsive light/dark layouts`, async () => {
    const f = await fixture(tier)
    await f.goto('/app/pricing')
    await f.page.locator('.is-current-plan').waitFor()
    assert.equal(await f.page.locator('.is-current-plan').count(), 1)
    assert.ok((await f.page.locator('.is-current-plan h2').textContent()).includes(entitlementsFor(tier).plan_name))
    assert.equal(await f.page.getByText('Trọn 9 tháng').count(), 0)
    assert.equal(await f.page.locator('.nm-feature-soon').count(), 3)
    if (tier === 'PLAN_399K') assert.equal(await f.page.locator('.nm-pricing-unavailable').filter({ hasText: 'Có thể chọn' }).count(), 1)
    if (tier !== 'FREE') assert.equal(await f.page.getByRole('button', { name: 'Gia hạn gói', exact: true }).count(), 1)
    assert.equal(f.state.counts['GET /subscriptions/me'], 1)
    assert.equal(f.state.counts['POST /payments/subscription-checkout'] || 0, 0)
    for (const width of [1440, 768, 375]) {
      await f.page.setViewportSize({ width, height: 950 })
      await noOverflow(f.page)
      await screenshot(f.page, `catalog-${tier}-${width}-light`)
    }
    await f.page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    await screenshot(f.page, `catalog-${tier}-375-dark`)
    await f.context.close()
  })
  await check('downgrade deep link cannot create checkout', async () => {
    const f = await fixture('PLAN_399K')
    await f.goto('/app/pricing?plan=PLAN_99K&step=review')
    await f.page.getByRole('heading', { name: 'Gói này chưa thể mua lúc này' }).waitFor()
    assert.equal(f.state.counts['POST /payments/subscription-checkout'] || 0, 0)
    await f.context.close()
  })
  await check('explicit checkout deduplicates clicks and activates refreshed entitlements', async () => {
    const f = await fixture('PLAN_99K')
    await f.goto('/app/pricing?plan=PLAN_399K&step=review')
    const confirm = f.page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })
    await confirm.waitFor()
    await f.page.locator('.nm-subscription-status strong').waitFor()
    assert.equal(f.state.counts['POST /payments/subscription-checkout'] || 0, 0)
    await screenshot(f.page, 'review-upgrade-desktop')
    await confirm.evaluate((button) => { button.click(); button.click(); button.click() })
    await f.page.getByRole('button', { name: 'Xác nhận thử nghiệm', exact: true }).waitFor()
    assert.equal(f.state.counts['POST /payments/subscription-checkout'], 1)
    await f.page.getByRole('button', { name: 'Xác nhận thử nghiệm', exact: true }).click()
    await f.page.getByRole('heading', { name: 'Gói của mẹ đã sẵn sàng.' }).waitFor()
    await f.page.getByRole('link', { name: 'Vào không gian của bạn' }).click()
    await f.page.locator('.nm-subscription-status strong').filter({ hasText: '399K' }).waitFor()
    assert.equal(await f.page.getByRole('button', { name: 'Thêm lịch nhắc nhở', exact: true }).count(), 1)
    await f.context.close()
  })
  await check('checkout 429 respects Retry-After without replaying a purchase', async () => {
    const f = await fixture('FREE', { checkout429: true })
    await f.goto('/app/pricing?plan=PLAN_99K&step=review')
    const button = f.page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })
    await button.click()
    const waiting = f.page.getByRole('button', { name: /Thử lại sau/ })
    await waiting.waitFor()
    assert.equal(await waiting.isDisabled(), true)
    await waiting.evaluate((element) => { element.click(); element.click() })
    assert.equal(f.state.counts['POST /payments/subscription-checkout'], 1)
    await f.page.getByRole('button', { name: 'Quay lại chọn gói', exact: true }).click()
    await f.page.getByRole('button', { name: 'Tiếp tục xác nhận', exact: true }).click()
    assert.equal(await f.page.getByRole('button', { name: /Thử lại sau/ }).isDisabled(), true)
    assert.equal(f.state.counts['POST /payments/subscription-checkout'], 1)
    await f.context.close()
  })
  await check('failed subscription read remains unknown, never FREE', async () => {
    const f = await fixture('PLAN_399K', { entitlementError: true })
    await f.goto('/app/pricing')
    await f.page.getByText('Chưa tải được thông tin gói', { exact: true }).waitFor()
    assert.equal(await f.page.locator('.is-current-plan').count(), 0)
    assert.equal(f.state.counts['GET /subscriptions/me'], 1)
    await screenshot(f.page, 'subscription-error')
    await f.context.close()
  })
  await check('catalog 429 disables retries and avoids focus/remount request storms', async () => {
    const f = await fixture('FREE', { catalog429: true })
    await f.goto('/app/pricing')
    const retry = f.page.getByRole('button', { name: /Thử lại sau/ })
    await retry.waitFor()
    assert.equal(await retry.isDisabled(), true)
    await f.page.evaluate(() => { for (let i = 0; i < 15; i++) window.dispatchEvent(new Event('focus')) })
    assert.equal(f.state.counts['GET /subscription-plans'], 1)
    await f.context.close()
  })
  await check('FREE reminder creation shows a single accessible upgrade prompt', async () => {
    const f = await fixture('FREE')
    await f.goto('/app')
    await f.page.getByRole('button', { name: 'Mở quyền nhắc nhở', exact: true }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    assert.equal(await f.page.getByRole('dialog').count(), 1)
    assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).getAttribute('href'), '/app/pricing?plan=PLAN_99K&step=review#pricing')
    assert.equal(f.state.counts['POST /calendar/reminders'] || 0, 0)
    await f.page.setViewportSize({ width: 375, height: 812 })
    await screenshot(f.page, 'reminder-upgrade-mobile')
    await f.page.keyboard.press('Escape')
    assert.equal(await f.page.getByRole('dialog').count(), 0)
    await f.context.close()
  })
  await check('FREE medical records stay readable while reminder creation is locked', async () => {
    const f = await fixture('FREE')
    await f.goto('/app/profile/records')
    await f.page.getByRole('heading', { name: record.title }).waitFor()
    await f.page.getByRole('button', { name: `Thêm lịch nhắc từ ${record.title}` }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    assert.equal(f.state.counts['POST /medical-records/record-qa/reminders'] || 0, 0)
    await f.context.close()
  })
  for (const error of [
    { status: 403, code: 'PLAN_UPGRADE_REQUIRED', fields: { required_plan: 'PLAN_399K', feature: 'CALENDAR_REMINDERS', current_plan: 'FREE' }, message: 'Thông báo nâng cấp chính xác từ BE.' },
    { status: 403, code: 'FORBIDDEN', fields: {} },
    { status: 429, code: 'QUOTA_EXCEEDED', fields: {} },
  ]) await check(`reminder backend ${error.code} is handled distinctly`, async () => {
    const f = await fixture('PLAN_99K', { writeError: error })
    await f.goto('/app')
    await f.page.getByRole('button', { name: 'Thêm lịch nhắc nhở', exact: true }).click()
    await f.page.locator('#calendar-reminder-form input[maxlength="255"]').first().fill('Nhắc uống nước')
    await f.page.getByRole('button', { name: 'Tạo lịch nhắc', exact: true }).click()
    if (error.code === 'PLAN_UPGRADE_REQUIRED') {
      await f.page.getByText(error.message, { exact: true }).waitFor()
      assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).getAttribute('href'), '/app/pricing?plan=PLAN_399K&step=review#pricing')
      await f.page.getByRole('button', { name: 'Để sau', exact: true }).click()
      assert.equal(await f.page.locator('#calendar-reminder-form input[maxlength="255"]').first().inputValue(), 'Nhắc uống nước')
    } else {
      await f.page.locator('.nm-dialog-error').waitFor()
      assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).count(), 0)
    }
    assert.equal(f.state.counts['POST /calendar/reminders'], 1)
    await f.context.close()
  })
  await check('FREE family create is locked while token acceptance remains free', async () => {
    const f = await fixture('FREE')
    await f.goto('/app/family')
    await f.page.getByRole('button', { name: 'Mở quyền tạo nhóm', exact: true }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    assert.equal(f.state.counts['POST /family-groups'] || 0, 0)
    await f.page.getByRole('button', { name: 'Để sau', exact: true }).click()
    await f.page.getByRole('button', { name: 'Nhập token', exact: true }).click()
    await f.page.getByRole('textbox', { name: 'Token lời mời', exact: true }).fill('fixture-invitation-token')
    await f.page.getByRole('button', { name: 'Tham gia', exact: true }).click()
    await f.page.getByRole('heading', { name: 'Nhóm gia đình', exact: true }).waitFor()
    assert.equal(f.state.counts['POST /family-invitations/accept'], 1)
    await f.context.close()
  })
  await check('99K retains its existing family but new invitations require 399K', async () => {
    const f = await fixture('PLAN_99K', { group: true })
    await f.goto('/app/family')
    await f.page.getByRole('button', { name: 'Mở quyền mời thành viên', exact: true }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).getAttribute('href'), '/app/pricing?plan=PLAN_399K&step=review#pricing')
    assert.equal(f.state.counts['POST /family-invitations'] || 0, 0)
    await screenshot(f.page, 'family-upgrade-desktop')
    await f.context.close()
  })
  await check('FREE can edit an existing reminder; creating its next suggestion is locked', async () => {
    const f = await fixture('FREE', { existingReminder: true })
    await f.goto('/app?reminder=reminder-qa')
    await f.page.getByRole('button', { name: 'Đánh dấu đã làm', exact: true }).waitFor()
    await f.page.getByRole('button', { name: 'Sửa', exact: true }).click()
    await f.page.getByRole('heading', { name: 'Sửa lịch nhắc nhở' }).waitFor()
    assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).count(), 0)
    await f.page.keyboard.press('Escape')
    await f.goto('/app?reminder=reminder-qa')
    await f.page.getByRole('button', { name: 'Đánh dấu đã làm', exact: true }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    assert.equal(await f.page.getByRole('dialog').count(), 1)
    assert.equal(f.state.counts['POST /calendar/reminders'] || 0, 0)
    assert.equal(f.state.counts['PATCH /calendar/reminders/reminder-qa'], 1)
    await f.page.getByRole('button', { name: 'Để sau', exact: true }).click()
    await f.goto('/app?reminder=reminder-qa')
    await f.page.getByRole('button', { name: 'Xóa lịch', exact: true }).click()
    await f.page.getByRole('dialog').getByRole('button', { name: 'Xóa lịch', exact: true }).click()
    await f.page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(f.state.counts['DELETE /calendar/reminders/reminder-qa'], 1)
    await f.context.close()
  })
  await check('an open page refreshes paid entitlements when the subscription expires', async () => {
    const f = await fixture('PLAN_99K', { expiring: true })
    await f.goto('/app')
    await f.page.getByRole('button', { name: 'Mở quyền nhắc nhở', exact: true }).waitFor()
    assert.equal(f.state.counts['GET /subscriptions/me'], 2)
    await f.context.close()
  })
  await check('399K can create a family and send exactly one invitation', async () => {
    const f = await fixture('PLAN_399K')
    await f.goto('/app/family')
    const create = f.page.getByRole('button', { name: 'Tạo nhóm', exact: true })
    await create.evaluate((button) => { button.click(); button.click() })
    const invite = f.page.getByRole('button', { name: 'Mời thành viên', exact: true })
    await invite.waitFor()
    assert.equal(f.state.counts['POST /family-groups'], 1)
    await invite.click()
    await f.page.getByRole('textbox', { name: 'Email', exact: true }).fill('family@example.test')
    await f.page.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).evaluate((button) => { button.click(); button.click() })
    await f.page.getByRole('heading', { name: 'Lời mời đã sẵn sàng' }).waitFor()
    assert.equal(f.state.counts['POST /family-invitations'], 1)
    await f.context.close()
  })
  for (const target of ['group', 'invitation', 'medical']) await check(`${target}: stale paid UI catches backend upgrade metadata`, async () => {
    const error = { status: 403, code: 'PLAN_UPGRADE_REQUIRED', fields: { feature: target === 'medical' ? 'CALENDAR_REMINDERS' : 'FAMILY_SHARING', required_plan: target === 'medical' ? 'PLAN_99K' : 'PLAN_399K', current_plan: 'FREE' }, message: 'Quyền lợi đã thay đổi theo gói hiện tại.' }
    const f = await fixture('PLAN_399K', { group: target === 'invitation', writeError: error })
    if (target === 'medical') {
      await f.goto('/app/profile/records')
      await f.page.getByRole('button', { name: `Thêm lịch nhắc từ ${record.title}` }).click()
      await f.page.locator('#medical-record-reminder-form input[type="datetime-local"]').fill('2099-10-22T09:00')
      await f.page.getByRole('button', { name: 'Tạo lịch nhắc', exact: true }).click()
    } else {
      await f.goto('/app/family')
      if (target === 'group') await f.page.getByRole('button', { name: 'Tạo nhóm', exact: true }).click()
      else {
        await f.page.getByRole('button', { name: 'Mời thành viên', exact: true }).click()
        await f.page.getByRole('textbox', { name: 'Email', exact: true }).fill('family@example.test')
        await f.page.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).click()
      }
    }
    await f.page.getByText(error.message, { exact: true }).waitFor()
    assert.equal(await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).getAttribute('href'), `/app/pricing?plan=${error.fields.required_plan}&step=review#pricing`)
    assert.equal(await f.page.getByRole('dialog').count(), 1)
    await f.context.close()
  })
  await check('paid reminder submissions deduplicate rapid clicks', async () => {
    const f = await fixture('PLAN_99K')
    await f.goto('/app')
    await f.page.getByRole('button', { name: 'Thêm lịch nhắc nhở', exact: true }).click()
    await f.page.locator('#calendar-reminder-form input[maxlength="255"]').first().fill('Nhắc tái khám')
    await f.page.getByRole('button', { name: 'Tạo lịch nhắc', exact: true }).evaluate((button) => { button.click(); button.click(); button.click() })
    await f.page.getByRole('heading', { name: 'Thêm lịch nhắc nhở', exact: true }).waitFor({ state: 'hidden' })
    assert.equal(f.state.counts['POST /calendar/reminders'], 1)
    await f.context.close()
  })
  await check('normal motion settles; reduced motion and keyboard focus remain usable', async () => {
    const f = await fixture('FREE')
    await f.page.emulateMedia({ reducedMotion: 'no-preference' })
    await f.goto('/app/pricing?plan=PLAN_99K')
    await f.page.locator('.nm-plan-option').first().waitFor()
    await f.page.waitForTimeout(450)
    await f.page.setViewportSize({ width: 375, height: 812 })
    await f.page.waitForTimeout(500)
    await noOverflow(f.page)
    await screenshot(f.page, 'selection-mobile-motion')
    await f.page.emulateMedia({ reducedMotion: 'reduce' })
    await f.goto('/app')
    await f.page.getByRole('button', { name: 'Mở quyền nhắc nhở', exact: true }).click()
    await f.page.getByRole('link', { name: 'Xem gói phù hợp' }).waitFor()
    await f.page.keyboard.press('Tab')
    assert.equal(await f.page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true)
    await f.page.keyboard.press('Escape')
    assert.equal(await f.page.getByRole('dialog').count(), 0)
    assert.equal(await f.page.getByRole('button', { name: 'Mở quyền nhắc nhở', exact: true }).evaluate((button) => button === document.activeElement), true)
    await f.context.close()
  })
  assert.deepEqual(errors, [])
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ passed: results, errors }, null, 2))
  await browser.close()
  await server.close()
}
