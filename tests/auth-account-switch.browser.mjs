import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { fixtureResponse, qaUser, user, expert } from './admin-workspace-fixtures.mjs'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5198, strictPort: true, open: false } })
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const base = 'http://127.0.0.1:5198'
const output = 'qa-artifacts/auth-account-switch'
await mkdir(output, { recursive: true })
const results = [], errors = []
const accountA = { ...qaUser, display_name: 'Tài khoản A', roles: ['USER'], onboarding_status: 'COMPLETED' }
const accountB = { ...accountA, id: '99999999-9999-4999-8999-999999999999', display_name: 'Tài khoản B' }

async function scenario(path, { role = 'USER', nextRole = 'USER', width = 1440, logoutFailure = false, delay = 0, onboarding = 'COMPLETED', reloadLogin = false, expired = false, guest = false, sameAccount = false, freshPath, disableAccount = false } = {}) {
  const label = `${path}: ${role} → ${nextRole}${logoutFailure ? ' (logout 503)' : ''}${delay ? ' (slow logout)' : ''}${reloadLogin ? ' (reload login)' : ''}${expired ? ' (expired)' : ''}${guest ? ' (guest deep link)' : ''}${width === 390 ? ' (mobile)' : ''}${onboarding === 'PROFILE_REQUIRED' ? ' (onboarding)' : ''}${sameAccount ? ' (same account)' : ''}${freshPath ? ' (fresh request)' : ''}${disableAccount ? ' (disable account)' : ''}`
  if (process.env.AUTH_SWITCH_FILTER && !new RegExp(process.env.AUTH_SWITCH_FILTER).test(label)) return
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const firstAccount = { ...accountA, roles: [role] }
  let activeAccount = firstAccount, logoutCalls = 0
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`))
  await context.addInitScript(({ account, guest }) => {
    if (guest || sessionStorage.getItem('qa:initialized')) return
    sessionStorage.setItem('qa:initialized', 'true')
    sessionStorage.setItem('nutrimom.auth-session', JSON.stringify({ accessToken: 'account-a', refreshToken: 'refresh-a', accessExpiresAt: Date.now() + 3600000, refreshExpiresAt: Date.now() + 7200000, tokenType: 'Bearer', user: { ...account, displayName: account.display_name, onboardingStatus: account.onboarding_status } }))
  }, { account: firstAccount, guest })
  await context.route('**/api/v1/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), apiPath = url.pathname.replace(/^\/api\/v1/, '')
    let data
    if (apiPath === '/auth/login') {
      activeAccount = { ...(sameAccount ? accountA : accountB), roles: [nextRole], onboarding_status: onboarding }
      data = { access_token: 'account-b', refresh_token: 'refresh-b', expires_in: 3600, refresh_expires_in: 7200, token_type: 'Bearer', user: activeAccount }
    } else if (apiPath === '/auth/logout') {
      logoutCalls++
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      if (logoutFailure) return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Logout unavailable' } } })
      data = { logged_out: true }
    } else if (apiPath === '/auth/me') data = activeAccount
    else if (apiPath === '/users/me') data = { ...user, ...activeAccount, version: 1 }
    else if (apiPath === '/expert/me') data = expert
    else if (apiPath === '/expert/consultation-requests') data = { items: [], page: 1, page_size: 10, total_items: 0, total_pages: 0 }
    else if (apiPath === '/subscription-plans') data = planDtos
    else if (apiPath === '/subscriptions/me') data = entitlementsFor('PLAN_399K')
    else if (apiPath === '/pregnancies/current') data = null
    else if (apiPath === '/users/me/preferences') data = { timezone: 'Asia/Ho_Chi_Minh', version: 1 }
    else if (apiPath === '/family-groups') data = []
    else if (apiPath.startsWith('/nutrition/') || apiPath === '/me/nutrition-profile') return route.fulfill({ status: 404, json: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Chưa có dữ liệu dinh dưỡng.' } } })
    else if (apiPath === '/community/notifications/unread-count') data = { unread_count: 0 }
    else if (apiPath === '/community/notifications') data = { items: [], has_more: false }
    else if (/\/community\/posts\/pending-count$/.test(apiPath)) data = { pending_count: 0 }
    else if (apiPath.includes('/community/')) data = { items: [], has_more: false }
    else data = fixtureResponse(apiPath, url.searchParams, req.method(), req.postData()) ?? {}
    await route.fulfill({ status: 200, json: { data } })
  })
  try {
    await page.goto(`${base}${path}`)
    if (!guest) {
      await page.locator(role === 'ADMIN' ? '.admin-shell' : ['EXPERT', 'DOCTOR'].includes(role) ? '.expert-shell' : path.startsWith('/onboarding') ? '.nm-account-page' : path.startsWith('/app/profile') ? '.nm-account-workspace' : '.nm-floating-nav').waitFor()
      if (expired) {
        await page.evaluate(async () => { const tokens = await import('/src/core/auth/token-store.ts'); tokens.clearSession() })
      } else {
        // Stale activation return targets must also be cleared at explicit logout.
        await page.evaluate(() => localStorage.setItem('nutrimom:auth-return', JSON.stringify({ path: '/app/community?topic=NUTRITION', at: Date.now() })))
        if (disableAccount) {
          await page.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }).click()
          await page.getByLabel('Lý do').fill('Kiểm thử vô hiệu hóa tài khoản')
          await page.getByLabel('Mật khẩu', { exact: true }).fill('Abcd123!')
          await page.getByRole('button', { name: 'Xác nhận vô hiệu hóa', exact: true }).click()
          await page.waitForURL(`${base}/`)
          await page.getByRole('link', { name: 'Đăng nhập', exact: true }).first().click()
        } else {
        if (role === 'ADMIN') await page.locator('.admin-profile-button').click()
        else if (role === 'USER' && !path.startsWith('/app/profile') && !path.startsWith('/onboarding')) {
          await page.locator('.nm-avatar-button').click()
        }
        await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
        }
      }
    }
    await page.waitForURL((url) => url.pathname === '/login')
    await page.locator('[name="identifier"]').waitFor()
    const loginState = await page.evaluate(() => history.state?.usr)
    if (!expired && !guest) {
      assert.equal(loginState?.from, undefined, `Previous account route leaked into login: ${JSON.stringify(loginState)}`)
      assert.equal(await page.evaluate(() => sessionStorage.getItem('nutrimom.auth-session')), null)
      assert.equal(await page.evaluate(() => localStorage.getItem('nutrimom:auth-return')), null)
      assert.equal(logoutCalls, 1)
    } else assert.equal(loginState?.from, path)
    if (reloadLogin) await page.reload()
    if (freshPath) {
      // A new protected-route request after logout is a new user intent. Keep it,
      // even in the same SPA/provider lifetime that just suppressed the old entry.
      await page.evaluate((target) => { history.pushState({ usr: null, key: 'fresh-request', idx: history.state.idx + 1 }, '', target); dispatchEvent(new PopStateEvent('popstate')) }, freshPath)
      await page.waitForURL((url) => url.pathname === '/login')
      assert.equal(await page.evaluate(() => history.state.usr?.from), freshPath)
    }
    await page.locator('[name="identifier"]').fill('account-b@example.com')
    await page.locator('[name="password"]').fill('Abcd123!')
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    const expected = nextRole === 'ADMIN' ? '/admin' : ['EXPERT', 'DOCTOR'].includes(nextRole) ? '/expert' : onboarding === 'PROFILE_REQUIRED' ? '/onboarding/profile' : freshPath || (expired || guest ? path : '/app')
    const expectedId = sameAccount ? accountA.id : accountB.id
    await page.waitForURL(`${base}${expected}`)
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('nutrimom.auth-session')).user.id), expectedId)
    // A late logout response must never clear or navigate the newly accepted session.
    if (delay) await page.waitForTimeout(delay + 100)
    assert.equal(page.url(), `${base}${expected}`)
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('nutrimom.auth-session')).user.id), expectedId)
    results.push(label); console.log('PASS', label)
  } catch (error) {
    await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
    console.error('FAIL', label, page.url(), await page.evaluate(() => history.state))
    throw error
  } finally { await context.close() }
}

try {
  await scenario('/app/community?tab=saved&topic=NUTRITION')
  await scenario('/app/nutrition')
  await scenario('/app/knowledge')
  await scenario('/app/settings')
  await scenario('/app/profile/health')
  await scenario('/app/profile/account/password')
  await scenario('/app/pricing')
  await scenario('/app/community', { logoutFailure: true })
  await scenario('/app/profile/health', { logoutFailure: true })
  await scenario('/admin/users', { role: 'ADMIN', logoutFailure: true })
  await scenario('/expert', { role: 'EXPERT', logoutFailure: true })
  await scenario('/app/community', { delay: 1500 })
  await scenario('/app/community', { reloadLogin: true })
  await scenario('/app/community', { width: 390 })
  await scenario('/app/community', { nextRole: 'ADMIN' })
  await scenario('/admin/community', { role: 'ADMIN' })
  await scenario('/expert', { role: 'DOCTOR' })
  await scenario('/app/profile/health', { nextRole: 'EXPERT' })
  await scenario('/app/community', { onboarding: 'PROFILE_REQUIRED' })
  await scenario('/app/community?topic=NUTRITION', { expired: true })
  await scenario('/app/profile/health', { guest: true })
  await scenario('/payment/success?orderCode=123', { guest: true })
  await scenario('/family/invite?token=qa-invitation', { guest: true })
  await scenario('/app/community', { sameAccount: true })
  await scenario('/app/community', { freshPath: '/app/profile/health' })
  await scenario('/app/community', { delay: 1500, logoutFailure: true })
  await scenario('/app/profile/account/disable', { disableAccount: true, delay: 1500, logoutFailure: true })
  assert.deepEqual(errors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2))
  await browser.close(); await server.close()
}
