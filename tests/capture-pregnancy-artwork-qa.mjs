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

function command(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

function jsonResponse(data) {
  return {
    responseCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
    body: Buffer.from(JSON.stringify({ data })).toString('base64'),
  }
}

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  if (payload.method === 'Runtime.exceptionThrown') browserErrors.push(payload.params.exceptionDetails?.text ?? 'Runtime exception')
  if (payload.method === 'Log.entryAdded' && payload.params.entry.level === 'error') browserErrors.push(payload.params.entry.text)
  if (payload.method === 'Fetch.requestPaused') {
    const { requestId, request } = payload.params
    const pathname = new URL(request.url).pathname
    const data = pathname.endsWith('/pregnancies/current') ? {
      id: 'qa-pregnancy-week-29', status: 'ACTIVE', last_menstrual_period: '2026-03-06', conception_date: null,
      estimated_due_date: '2026-12-11', is_first_pregnancy: true, multiple_pregnancy: false,
      timezone: 'Asia/Ho_Chi_Minh', gestational_week: 29, gestational_day: 3, trimester: 3,
      days_until_due: 77, calculation_source: 'MANUAL', care_facility_name: null, care_provider_name: null, version: 1,
    } : {
      week: 29, title: 'Phát triển tuần 29', summary: 'Nội dung QA.', baby_development: 'Nội dung QA.',
      mother_changes: 'Nội dung QA.', care_tips: 'Nội dung QA.', warning_signs: 'Nội dung QA.',
      sources: 'Nguồn QA.', disclaimer: 'Thông tin chỉ mang tính tham khảo.',
    }
    void command('Fetch.fulfillRequest', { requestId, ...jsonResponse(data) }).catch((error) => browserErrors.push(error.message))
  }
  if (!payload.id) return
  const handler = pending.get(payload.id)
  if (!handler) return
  pending.delete(payload.id)
  if (payload.error) handler.reject(new Error(`${handler.method}: ${payload.error.message}`))
  else handler.resolve(payload.result)
})

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result?.value
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

await command('Runtime.enable')
await command('Log.enable')
await command('Page.enable')
await command('Fetch.enable', { patterns: [
  { urlPattern: '*api/v1/pregnancies/current*', requestStage: 'Request' },
  { urlPattern: '*api/v1/pregnancy-content/weeks/29*', requestStage: 'Request' },
] })

await evaluate(`(async () => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ${JSON.stringify(phone)}, password: ${JSON.stringify(password)}, device_id: 'codex-pregnancy-artwork-qa' }),
  })
  if (!response.ok) throw new Error('QA login failed: ' + response.status)
  const envelope = await response.json()
  const value = envelope.data
  const now = Date.now()
  const user = value.user
  sessionStorage.setItem('nutrimom.auth-session', JSON.stringify({
    accessToken: value.access_token, refreshToken: value.refresh_token,
    accessExpiresAt: now + value.expires_in * 1000, refreshExpiresAt: now + value.refresh_expires_in * 1000,
    tokenType: value.token_type,
    user: { id: user.id, phone: user.phone, displayName: user.display_name, role: user.role ?? user.roles?.[0] ?? 'USER', roles: user.roles ?? [], onboardingStatus: user.onboarding_status, status: user.status, createdAt: user.created_at },
  }))
})()`)

async function configureViewport(width, height, theme, reducedMotion = false) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 620 })
  await command('Emulation.setEmulatedMedia', { media: 'screen', features: [
    { name: 'prefers-color-scheme', value: theme },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
  ] })
  await evaluate(`localStorage.setItem('nutrimom.theme', ${JSON.stringify(theme)}); document.documentElement.dataset.theme = ${JSON.stringify(theme)}`)
}

async function navigateToArtwork() {
  await command('Page.navigate', { url: 'http://127.0.0.1:5173/app/profile/health' })
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const ready = await evaluate(`Boolean(document.querySelector('.pregnancy-stage-artwork img')?.complete && document.querySelector('.pregnancy-stage-artwork img')?.naturalWidth)`)
    if (ready) return
    await pause(150)
  }
  throw new Error('Pregnancy artwork did not render in time')
}

async function capture(name) {
  await pause(700)
  const shot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'))
  return evaluate(`(() => {
    const image = document.querySelector('.pregnancy-stage-artwork img')
    const banner = document.querySelector('.pregnancy-journey-hero')
    const imageRect = image?.getBoundingClientRect()
    const bannerRect = banner?.getBoundingClientRect()
    return {
      src: image?.getAttribute('src'), alt: image?.getAttribute('alt'), naturalWidth: image?.naturalWidth,
      imageWidth: imageRect?.width, imageHeight: imageRect?.height, bannerWidth: bannerRect?.width,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })()`)
}

const cases = [
  { name: 'pregnancy-artwork-week29-desktop', width: 1440, height: 900, theme: 'light', reducedMotion: false },
  { name: 'pregnancy-artwork-week29-tablet', width: 768, height: 900, theme: 'dark', reducedMotion: false },
  { name: 'pregnancy-artwork-week29-mobile', width: 375, height: 812, theme: 'dark', reducedMotion: false },
  { name: 'pregnancy-artwork-week29-reduced-motion', width: 1024, height: 800, theme: 'light', reducedMotion: true },
]
const results = []
for (const item of cases) {
  await configureViewport(item.width, item.height, item.theme, item.reducedMotion)
  await navigateToArtwork()
  results.push({ ...item, ...(await capture(item.name)) })
}

await writeFile(path.join(outputDirectory, 'pregnancy-artwork-qa-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, browserErrors }, null, 2))
socket.close()
console.log(JSON.stringify({ results, browserErrors }, null, 2))
