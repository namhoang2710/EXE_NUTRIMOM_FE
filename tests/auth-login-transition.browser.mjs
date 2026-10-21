import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { expert, fixtureResponse, qaUser, user } from './admin-workspace-fixtures.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5189, strictPort: true, open: false } })
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const output = new URL('../qa-artifacts/auth-login-transition/', import.meta.url)
await mkdir(output, { recursive: true })
const results = []
const errors = []

async function checkLogin(role, { width = 1440, reducedMotion = false, initialPath = '/login', onboarding = 'COMPLETED', retry = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(`${role}: ${error.message}`))
  let failLogin = retry
  let loginRequests = 0
  const account = { ...qaUser, roles: [role], onboarding_status: onboarding }
  await context.route('**/api/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api\/v1/, '')
    let data
    if (path === '/auth/login') {
      loginRequests++
      if (failLogin) {
        await route.fulfill({ status: 401, json: { error: { code: 'INVALID_CREDENTIALS', message: 'Mật khẩu chưa chính xác.' } } })
        return
      }
      data = { access_token: 'qa-login-transition', refresh_token: 'qa-refresh', expires_in: 3600, refresh_expires_in: 7200, token_type: 'Bearer', user: account }
    } else if (path === '/auth/me') data = account
    else if (path === '/users/me') data = { ...user, onboarding_status: onboarding }
    else if (path === '/expert/me') data = expert
    else if (path === '/expert/consultation-requests') data = { items: [], page: 1, page_size: 10, total_items: 0, total_pages: 0 }
    else data = fixtureResponse(path, url.searchParams, request.method(), request.postData())
    await route.fulfill(data === undefined
      ? { status: 404, json: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Không có dữ liệu kiểm thử.' } } }
      : { status: 200, json: { data } })
  })
  try {
    await page.goto(`http://127.0.0.1:5189${initialPath}`)
    await page.locator('[name="identifier"]').waitFor()
    await page.waitForTimeout(850)
    await page.locator('[name="identifier"]').fill('qa@example.com')
    await page.locator('[name="password"]').fill('Abcd123!')
    if (retry) {
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
      await page.getByText('Mật khẩu chưa chính xác.', { exact: true }).waitFor()
      assert.equal(await page.locator('.auth-login-transition').getAttribute('data-state'), 'open')
      assert.equal(await page.locator('.auth-login-transition').getAttribute('inert'), null)
      assert.match(page.url(), /\/login$/)
      failLogin = false
    }
    await page.evaluate(() => {
      window.transitionAudit = []
      document.addEventListener('animationstart', event => {
        if (event.animationName.startsWith('auth-') || event.animationName.startsWith('nm-curtain-')) window.transitionAudit.push({ name: event.animationName, at: performance.now(), entry: event.target.classList.contains('auth-workspace-entry') })
      })
    })
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    if (!reducedMotion) {
      await page.locator('.auth-login-transition[data-state="closing"]').waitFor()
      const closeStarted = await page.evaluate(() => performance.now())
      await page.waitForTimeout(160)
      assert.match(page.url(), /\/login$/, 'destination opened before panels finished closing')
      assert.equal(await page.locator('.auth-login-transition[inert]').count(), 1)
      assert.equal(await page.locator('[name="identifier"]').inputValue(), 'qa@example.com', 'form remounted during exit')
      const shifts = await page.locator('.auth-page').evaluate(element => ['.brand-panel', '.form-panel'].map(selector => new DOMMatrix(getComputedStyle(element.querySelector(selector)).transform).m41))
      assert.ok(shifts[1] > 0, `right panel did not close: ${shifts}`)
      if (width > 820) assert.ok(shifts[0] < 0, `left panel did not close: ${shifts}`)
      if (role === 'ADMIN') await page.screenshot({ path: fileURLToPath(new URL('login-closing.png', output)) })
      const destination = role === 'ADMIN' ? '/admin' : ['EXPERT', 'DOCTOR'].includes(role) ? '/expert' : onboarding === 'PROFILE_REQUIRED' ? '/onboarding/profile' : initialPath === '/login' ? '/app' : initialPath
      await page.waitForURL(url => url.pathname === destination)
      assert.ok(await page.evaluate(() => performance.now()) - closeStarted >= 300)
      if (!destination.startsWith('/app')) await page.locator('.auth-workspace-entry').waitFor()
      await page.waitForTimeout(450)
      const audit = await page.evaluate(() => window.transitionAudit)
      assert.ok(audit.some(event => event.name === 'auth-panel-close-right'))
      if (!destination.startsWith('/app')) {
        assert.ok(audit.some(event => event.entry && event.name === 'auth-content-reveal'), 'destination did not reveal')
        const style = await page.locator('.auth-workspace-entry').evaluate(element => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform }))
        assert.deepEqual(style, { opacity: '1', transform: 'none' })
      } else assert.equal(await page.locator('.auth-workspace-entry').count(), 0)
    } else {
      await page.waitForURL(url => url.pathname === '/expert')
      assert.equal(await page.locator('.auth-workspace-entry').count(), 0)
      assert.deepEqual(await page.evaluate(() => window.transitionAudit), [])
    }
    const shell = role === 'ADMIN' ? '.admin-shell' : ['EXPERT', 'DOCTOR'].includes(role) ? '.expert-shell' : onboarding === 'PROFILE_REQUIRED' ? '.nm-account-page' : initialPath !== '/login' ? '.nm-account-workspace' : '.nm-overview-page'
    await page.locator(shell).waitFor()
    assert.equal(loginRequests, retry ? 2 : 1)
    assert.equal(await page.locator('.auth-login-transition').count(), 0)
    if (role === 'ADMIN') await page.screenshot({ path: fileURLToPath(new URL('admin-open.png', output)) })
    if (role === 'USER' && initialPath.startsWith('/app/profile') && !reducedMotion) {
      if (width < 1000) await page.getByRole('button', { name: 'Danh mục tài khoản' }).click()
      await page.getByRole('link', { name: 'Về trang chủ', exact: true }).click()
      await page.locator('.nm-overview-page').waitFor()
      await page.waitForTimeout(700)
      assert.equal(await page.locator('.nm-overview-curtains').count(), 0)
      assert.equal(await page.evaluate(() => window.transitionAudit.filter(event => event.name.startsWith('nm-curtain-')).length), 0, 'return path replayed the panels')
    }
    // Reloading /login with an existing session must skip the interactive exit.
    await page.goto('http://127.0.0.1:5189/login')
    await page.waitForURL(url => url.pathname !== '/login')
    assert.equal(await page.locator('.auth-workspace-entry').count(), 0)
    if (onboarding === 'COMPLETED' && !reducedMotion && role !== 'DOCTOR') {
      const fromAccount = role === 'USER' && initialPath.startsWith('/app/profile')
      if (fromAccount) {
        await page.goto(`http://127.0.0.1:5189${initialPath}`)
        await page.locator('.nm-account-sidebar').waitFor({ state: 'attached' })
        if (width < 1000) await page.getByRole('button', { name: 'Danh mục tài khoản' }).click()
      } else if (role === 'ADMIN') await page.locator('.admin-profile-button').click()
      else if (role === 'USER') await page.locator('.nm-avatar-button').click()
      const exitPaths = []
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) exitPaths.push(new URL(frame.url()).pathname) })
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
      await page.waitForURL(url => url.pathname === '/login')
      assert.ok(!exitPaths.includes('/'), 'logout unexpectedly navigated to landing page')
      await page.locator('.auth-page--login').waitFor()
      assert.equal(await page.locator('.auth-login-transition').getAttribute('data-state'), 'open')
      assert.equal(await page.locator('.form-panel').evaluate(element => getComputedStyle(element).animationName), 'auth-panel-open-right')
      await page.waitForTimeout(850)
      assert.equal(await page.locator('.form-panel').evaluate(element => getComputedStyle(element).transform), 'none')
    }
    results.push(`${role}, ${width}px${reducedMotion ? ', reduced motion' : ''}${retry ? ', failed attempt then retry' : ''}${initialPath !== '/login' ? ', return path' : ''}${onboarding === 'PROFILE_REQUIRED' ? ', onboarding' : ''}`)
    console.log(`PASS ${results.at(-1)}`)
  } finally {
    await context.close()
  }
}

try {
  await checkLogin('ADMIN')
  await checkLogin('EXPERT')
  await checkLogin('DOCTOR')
  await checkLogin('USER', { retry: true })
  await checkLogin('USER', { width: 390 })
  await checkLogin('USER', { initialPath: '/app/profile/health' })
  await checkLogin('USER', { initialPath: '/app/profile/health', width: 390 })
  await checkLogin('USER', { onboarding: 'PROFILE_REQUIRED' })
  await checkLogin('EXPERT', { reducedMotion: true })
  assert.deepEqual(errors, [])
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ results, errors }, null, 2))
  await browser.close()
  await server.close()
}
console.log(`Passed ${results.length} login transition scenarios.`)
