import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDirectory = process.argv[2] ?? 'qa-artifacts'
const debugPort = Number(process.env.NUTRIMOM_QA_DEBUG_PORT ?? 9223)
const phone = process.env.NUTRIMOM_QA_PHONE
const password = process.env.NUTRIMOM_QA_PASSWORD
if (!phone || !password) throw new Error('Set NUTRIMOM_QA_PHONE and NUTRIMOM_QA_PASSWORD')
await mkdir(outputDirectory, { recursive: true })

const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json())
const page = targets.find((target) => target.type === 'page')
if (!page) throw new Error('No browser page target found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let sequence = 0
const pending = new Map()
const browserErrors = []
const expectedApiMisses = []
socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  if (payload.method === 'Runtime.exceptionThrown') browserErrors.push(payload.params.exceptionDetails?.text ?? 'Runtime exception')
  if (payload.method === 'Log.entryAdded' && payload.params.entry.level === 'error') {
    const entry = payload.params.entry
    const message = `${entry.text}${entry.url ? ` (${entry.url})` : ''}`
    if (entry.url?.includes('/api/v1/pregnancies/current') && entry.text.includes('404')) expectedApiMisses.push(message)
    else browserErrors.push(message)
  }
  if (!payload.id) return
  const handler = pending.get(payload.id)
  if (!handler) return
  pending.delete(payload.id)
  if (payload.error) handler.reject(new Error(`${handler.method}: ${payload.error.message}`))
  else handler.resolve(payload.result)
})

function command(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result?.value
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

await command('Runtime.enable')
await command('Log.enable')
await command('Page.enable')
await pause(800)
console.log('QA stage: login')
await evaluate(`(async () => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ${JSON.stringify(phone)}, password: ${JSON.stringify(password)}, device_id: 'codex-user-ui-qa' }),
  })
  if (!response.ok) throw new Error('QA login failed: ' + response.status)
  const envelope = await response.json()
  const value = envelope.data
  const now = Date.now()
  const user = value.user
  const session = {
    accessToken: value.access_token, refreshToken: value.refresh_token,
    accessExpiresAt: now + value.expires_in * 1000,
    refreshExpiresAt: now + value.refresh_expires_in * 1000,
    tokenType: value.token_type,
    user: { id: user.id, phone: user.phone, displayName: user.display_name, role: user.role ?? user.roles?.[0] ?? 'USER', roles: user.roles ?? [], onboardingStatus: user.onboarding_status, status: user.status, createdAt: user.created_at },
  }
  sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(session))
})()`)

async function configureViewport(width, height, theme, reducedMotion = false) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 620 })
  await command('Emulation.setEmulatedMedia', { media: 'screen', features: [
    { name: 'prefers-color-scheme', value: theme },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
  ] })
  await evaluate(`localStorage.setItem('nutrimom.theme', ${JSON.stringify(theme)}); document.documentElement.dataset.theme = ${JSON.stringify(theme)}`)
}

async function navigate(url) {
  await command('Page.navigate', { url: `http://127.0.0.1:5173${url}` })
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const ready = await evaluate(`document.readyState === 'complete' && document.body.innerText.trim().length > 40 && Boolean(document.querySelector('h1, h2'))`)
    if (ready) return
    await pause(150)
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    html: document.documentElement.outerHTML.slice(0, 2000),
    text: document.body.innerText.slice(0, 500),
    resources: performance.getEntriesByType('resource').map((item) => item.name).slice(-12),
  })`)
  throw new Error(`Page did not render in time: ${url}\n${JSON.stringify(diagnostics, null, 2)}\n${browserErrors.join('\n')}`)
}

async function screenshot(name) {
  await pause(1_800)
  const shot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'))
}

const routes = ['/app', '/app/dashboard', '/app/profile', '/app/profile/health', '/app/profile/care', '/app/profile/records', '/app/profile/saved', '/app/profile/support', '/app/profile/account/password', '/app/profile/account/disable', '/app/appointment-questions', '/app/calendar', '/app/nutrition', '/app/knowledge', '/app/community', '/app/settings', '/app/experts', '/app/consultations', '/app/chat', '/app/assistant']
const widths = [320, 375, 768, 1024, 1440]
const overflowChecks = []

for (const width of widths) {
  console.log(`QA stage: overflow ${width}px`)
  await configureViewport(width, width <= 375 ? 780 : 900, 'light')
  for (const route of routes) {
    await navigate(route)
    const result = await evaluate(`({ route: location.pathname, width: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, title: document.querySelector('h1, h2')?.textContent?.trim() ?? '', bodyTextLength: document.body.innerText.trim().length })`)
    overflowChecks.push({ requestedRoute: route, ...result, overflow: result.scrollWidth > result.clientWidth + 1 })
  }
}

await configureViewport(1440, 1000, 'light')
console.log('QA stage: screenshots')
await navigate('/app/profile/health')
await screenshot('health-desktop-light')

await configureViewport(375, 812, 'dark')
await navigate('/app/profile/health')
await screenshot('health-mobile-dark')

await configureViewport(1440, 1000, 'dark')
await navigate('/app/profile/support')
await screenshot('support-desktop-dark')

await configureViewport(375, 812, 'light')
await navigate('/app/profile/records')
await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Thêm hồ sơ'))?.click()`)
await pause(350)
await screenshot('records-editor-mobile-light')

await configureViewport(1024, 800, 'dark', true)
await navigate('/app/profile/health')
const reducedMotion = await evaluate(`({ media: matchMedia('(prefers-reduced-motion: reduce)').matches, markerAnimation: getComputedStyle(document.querySelector('.pregnancy-marker-pulse') ?? document.body).animationName, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 })`)
await screenshot('health-tablet-dark-reduced-motion')

const report = {
  generatedAt: new Date().toISOString(),
  routeCount: routes.length,
  viewportCount: widths.length,
  overflowFailures: overflowChecks.filter((item) => item.overflow),
  overflowChecks,
  reducedMotion,
  browserErrors,
  expectedApiMisses,
}
await writeFile(path.join(outputDirectory, 'user-ui-qa-report.json'), JSON.stringify(report, null, 2))
socket.close()
console.log(JSON.stringify({ screenshots: 5, overflowFailures: report.overflowFailures.length, browserErrors: browserErrors.length, reducedMotion }, null, 2))
