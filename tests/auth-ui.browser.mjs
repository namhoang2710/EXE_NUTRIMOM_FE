import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Run with Playwright installed locally, or point PLAYWRIGHT_MODULE at its package directory.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const baseUrl = process.env.AUTH_QA_URL || 'http://127.0.0.1:5184'
const server = process.env.AUTH_QA_URL ? null : await (await import('vite')).createServer({ server: { host: '127.0.0.1', port: 5184, strictPort: true, open: false } })
await server?.listen()
const output = new URL('../qa-artifacts/auth-ui/', import.meta.url)
await mkdir(output, { recursive: true })
const failures = []
const results = []
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', error => failures.push(error.message))

async function settled(path) {
  await page.goto(`${baseUrl}${path}`)
  await page.locator('.form-frame').waitFor()
  await page.waitForTimeout(1000)
  assert.equal(await page.locator('.auth-floating-paths').count(), 0)
  // Once the entrance ends, layers must return to normal document rendering.
  const resting = await page.evaluate(() => [...document.querySelectorAll('.brand-panel, .form-panel, .brand-panel-content, .form-panel-toolbar, .form-frame')].filter(element => element.getClientRects().length > 0).every(element => {
    const style = getComputedStyle(element)
    return style.transform === 'none' && style.opacity === '1'
  }))
  assert.equal(resting, true, 'auth retained a hidden or transformed layer after opening')
  const originalLayout = await page.evaluate(() => {
    const page = document.querySelector('.auth-page').getBoundingClientRect()
    const panel = getComputedStyle(document.querySelector('.form-panel'))
    return page.left === 0 && page.top === 0 && page.width === innerWidth && page.height === innerHeight && panel.borderRadius === '0px' && panel.boxShadow === 'none'
  })
  assert.equal(originalLayout, true, 'auth no longer uses the original full-width split layout')
}

async function layout() {
  return page.evaluate(() => {
    const button = document.querySelector('button[type="submit"]')
    const rect = button.getBoundingClientRect()
    const panel = document.querySelector('.form-panel').getBoundingClientRect()
    const footer = document.querySelector('.form-footer').getBoundingClientRect()
    return { viewport: [innerWidth, innerHeight], scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], button: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, panel: { top: panel.top, bottom: panel.bottom }, footer: footer.bottom, clickable: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('button') === button,
      children: [...document.querySelectorAll('.form-panel-toolbar, .form-heading, .auth-form > *, .form-footer')].map(element => ({ class: element.className, height: element.getBoundingClientRect().height, top: element.getBoundingClientRect().top, style: getComputedStyle(element).gridTemplateRows })) }
  })
}

async function assertFieldFeedback() {
  const issues = await page.evaluate(() => [...document.querySelectorAll('.auth-form--register .field-group')].flatMap(group => {
    const shell = group.querySelector('.input-shell')
    const input = shell.querySelector('input')
    const feedback = group.querySelector('.field-hint, .field-error')
    const shellRect = shell.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()
    const labelRect = group.querySelector('label').getBoundingClientRect()
    const feedbackRect = feedback?.getBoundingClientRect()
    const problems = []
    if (inputRect.top < shellRect.top - 1 || inputRect.bottom > shellRect.bottom + 1) problems.push('input spills outside its border')
    if (shellRect.top < labelRect.bottom - 1) problems.push('input border overlaps its label')
    if (feedbackRect && feedbackRect.top < Math.max(shellRect.bottom, inputRect.bottom) + 1) problems.push('feedback overlaps input border')
    if (feedbackRect && feedbackRect.bottom > group.getBoundingClientRect().bottom + 1) problems.push('feedback spills outside reserved space')
    return problems.map(problem => `${input.name}: ${problem} (input height ${inputRect.height}, border height ${shellRect.height}, min-height ${getComputedStyle(shell).minHeight})`)
  }))
  assert.deepEqual(issues, [], 'field label, border, input and feedback must not overlap')
}

try {
  // Navigation must finish with the right form and repeat the two-panel sequence.
  await settled('/login')
  await page.screenshot({ path: fileURLToPath(new URL('login-light.png', output)) })
  await page.getByRole('link', { name: 'Tạo tài khoản', exact: true }).click()
  await page.waitForTimeout(210)
  assert.equal(await page.locator('.auth-scene[inert] .auth-page--login').count(), 1)
  const closing = await page.evaluate(() => {
    const x = selector => new DOMMatrix(getComputedStyle(document.querySelector(selector)).transform).m41
    return [x('.brand-panel'), x('.form-panel')]
  })
  assert.ok(closing[0] < 0 && closing[1] > 0, `panels did not close in opposite directions: ${closing}`)
  await page.locator('input[name="confirmPassword"]').waitFor()
  await page.waitForTimeout(900)
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click()
  await page.locator('input[name="identifier"]').waitFor()
  await page.waitForTimeout(900)
  results.push('outgoing panels close in opposite directions before the next route opens')
  for (let i = 0; i < 3; i++) {
    await page.getByRole('link', { name: 'Tạo tài khoản', exact: true }).click()
    await page.locator('input[name="confirmPassword"]').waitFor()
    await page.waitForTimeout(900)
    assert.match(page.url(), /\/register$/)
    await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click()
    await page.locator('input[name="identifier"]').waitFor()
    await page.waitForTimeout(900)
    assert.match(page.url(), /\/login$/)
  }
  results.push('login/register navigation: 3 round trips')

  // Every validation message must fit without moving the submit action offscreen.
  for (const [width, height] of [[2768, 1568], [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 600], [768, 1024], [390, 844], [375, 667], [320, 640], [844, 390]]) {
    await page.setViewportSize({ width, height })
    await settled('/register')
    await assertFieldFeedback()
    const before = await layout()
    await page.locator('input[name="displayName"]').fill('')
    await page.locator('input[name="email"]').fill('invalid')
    await page.locator('input[name="phone"]').fill('abc')
    await page.locator('input[name="password"]').fill('a')
    await page.locator('input[name="confirmPassword"]').fill('b')
    await page.locator('input[name="confirmPassword"]').blur()
    await page.locator('form').evaluate(form => form.requestSubmit())
    const after = await layout()
    await assertFieldFeedback()
    if (after.scroll[0] > width || after.scroll[1] > height) failures.push(`unexpected scroll ${width}x${height}`)
    if (!after.clickable || after.button.bottom > after.panel.bottom || after.footer > after.panel.bottom) failures.push(`clipped action ${width}x${height}`)
    if (after.button.top !== before.button.top) failures.push(`validation moved action ${width}x${height}`)
    assert.equal(await page.locator('input[aria-invalid="true"]').count(), 6)
    const overlap = await page.evaluate(() => [...document.querySelectorAll('.field-group')].some(group => {
      const message = group.querySelector('.field-error')
      return message && message.getBoundingClientRect().bottom > group.getBoundingClientRect().bottom + 1
    }))
    if (overlap) failures.push(`field feedback overflow at ${width}x${height}`)
    await page.waitForTimeout(400)
    await page.screenshot({ path: fileURLToPath(new URL(`register-errors-${width}x${height}.png`, output)) })
    results.push({ viewport: `${width}x${height}`, layout: after })
    await writeFile(new URL('results.json', output), JSON.stringify({ results, failures }, null, 2))
    console.log(`${width}x${height}: button ${after.button.bottom}, footer ${after.footer}, panel ${after.panel.bottom}`)
  }

  await page.setViewportSize({ width: 1366, height: 768 })
  await settled('/register')
  // Validate on blur, then keep the message current while the user corrects the field.
  await page.locator('[name="phone"]').fill('abc')
  await page.locator('[name="phone"]').blur()
  assert.match(await page.locator('#phone-error').textContent(), /chữ cái/)
  await page.locator('[name="phone"]').fill('0901234567')
  assert.equal(await page.locator('[name="phone"]').getAttribute('aria-invalid'), 'false')
  await page.locator('[name="displayName"]').fill('Nguyễn An')
  await page.locator('[name="email"]').fill('an@example.com')
  await page.locator('[name="password"]').fill('Abcd123!')
  await page.locator('[name="confirmPassword"]').fill('Abcd123!')
  await page.locator('[name="accepted"]').check()
  let registerMode = 'fields'
  let registerPayload
  await page.route('**/auth/register', async route => {
    registerPayload = route.request().postDataJSON()
    const response = registerMode === 'fields'
      ? { status: 422, body: { error: { code: 'VALIDATION_ERROR', message: 'Kiểm tra thông tin đăng ký.', fields: { display_name: 'Tên đã bị từ chối từ BE.', accepted_terms: 'Cần đồng ý điều khoản mới.' } } } }
      : registerMode === 'duplicate'
        ? { status: 409, body: { error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email này đã được đăng ký.' } } }
        : { status: 201, body: { data: { access_token: null, user: { id: 'qa-user', status: 'PENDING_ACTIVATION' } } } }
    await route.fulfill({ status: response.status, json: response.body })
  })
  const submit = page.getByRole('button', { name: 'Tạo tài khoản', exact: true })
  await submit.click()
  await page.locator('#displayName-error').waitFor()
  assert.equal(await page.locator('#displayName-error').textContent(), 'Tên đã bị từ chối từ BE.')
  assert.equal(await page.locator('#accepted-error').textContent(), 'Cần đồng ý điều khoản mới.')
  assert.equal(registerPayload.display_name, 'Nguyễn An')
  assert.equal(registerPayload.accepted_terms, true)
  assert.equal(registerPayload.phone, '0901234567')
  assert.equal(registerPayload.password, 'Abcd123!')
  assert.ok(registerPayload.device_id)
  registerMode = 'duplicate'
  await submit.click()
  await page.locator('#email-error').waitFor()
  assert.equal(await page.locator('#email-error').textContent(), 'Email này đã được đăng ký.')
  registerMode = 'success'
  await submit.click()
  await page.getByRole('heading', { name: 'Kích hoạt tài khoản', exact: true }).waitFor()
  await page.waitForTimeout(900)
  assert.match(page.url(), /\/register$/)
  results.push('registration payload, BE field errors, duplicate email, pending activation')

  const activationPayloads = []
  await page.route('**/auth/activate', async route => {
    activationPayloads.push(route.request().postDataJSON())
    await route.fulfill({ status: 400, json: { error: { code: 'INVALID_ACTIVATION_TOKEN', message: 'Mã xác thực kích hoạt không chính xác.' } } })
  })
  const code = page.locator('input[autocomplete="one-time-code"]')
  const slots = page.locator('[data-pin-slot]')
  assert.equal(await code.count(), 1)
  await code.pressSequentially('1')
  assert.deepEqual(await slots.allTextContents(), ['1', '', '', '', '', ''])
  await code.pressSequentially('4')
  assert.deepEqual(await slots.allTextContents(), ['1', '4', '', '', '', ''])
  await code.press('Backspace')
  assert.equal(await code.inputValue(), '1')
  await code.pressSequentially('a')
  assert.equal(await code.inputValue(), '1')
  await code.fill('12345')
  await code.press('Home')
  await page.waitForFunction(() => {
    const input = document.querySelector('input[autocomplete="one-time-code"]')
    return input.selectionStart === 0 && input.selectionEnd === 1
  })
  await code.pressSequentially('9')
  assert.equal(await code.inputValue(), '92345')
  await code.fill('')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl })
  await page.evaluate(() => navigator.clipboard.writeText('654321'))
  await code.focus()
  await code.press('Control+V')
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await slots.allTextContents(), ['6', '5', '4', '3', '2', '1'])
  assert.equal(activationPayloads.length, 1)
  assert.equal(activationPayloads[0].token, '654321')
  assert.equal(activationPayloads[0].email, 'an@example.com')
  assert.ok(activationPayloads[0].device_id)
  results.push('OTP: single input, no duplicated digit, backspace, digit filter, replacement, native paste, one activation request')
  await page.screenshot({ path: fileURLToPath(new URL('otp-invalid.png', output)) })

  await settled('/login')
  await page.locator('[name="identifier"]').fill('an@example.com')
  await page.locator('[name="password"]').fill('oldpassword')
  let loginPayload
  await page.route('**/auth/login', async route => {
    loginPayload = route.request().postDataJSON()
    await route.fulfill({ status: 403, json: { error: { code: 'ACCOUNT_PENDING_ACTIVATION', message: 'Tài khoản chưa kích hoạt.' } } })
  })
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('link', { name: /nhập mã kích hoạt/ }).waitFor()
  assert.equal(loginPayload.phone, 'an@example.com')
  assert.equal(loginPayload.password, 'oldpassword')
  assert.ok(loginPayload.device_id)
  results.push('login payload, legacy password, pending activation recovery')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('link', { name: 'Tạo tài khoản', exact: true }).click()
  await page.locator('[name="confirmPassword"]').waitFor()
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: fileURLToPath(new URL('register-dark.png', output)) })
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  results.push('reduced motion navigation and dark theme')
  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await settled('/register')
  await page.screenshot({ path: fileURLToPath(new URL('register-light.png', output)) })
} catch (error) {
  failures.push(error.stack || error.message)
  throw error
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ results, failures }, null, 2))
  await browser.close()
  await server?.close()
}
assert.deepEqual(failures, [])
console.log(JSON.stringify({ checks: results.length, failures }, null, 2))
