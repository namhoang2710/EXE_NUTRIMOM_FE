import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDirectory = process.argv[2] ?? 'qa-artifacts/calendar-notifications'
const debugPort = Number(process.env.NUTRIMOM_QA_DEBUG_PORT ?? 9223)
const phone = process.env.NUTRIMOM_QA_PHONE
const password = process.env.NUTRIMOM_QA_PASSWORD
if (!phone || !password) throw new Error('NUTRIMOM_QA_PHONE and NUTRIMOM_QA_PASSWORD are required')
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
socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  if (payload.method === 'Runtime.exceptionThrown') browserErrors.push(payload.params.exceptionDetails?.text ?? 'Runtime exception')
  if (payload.method === 'Log.entryAdded' && payload.params.entry.level === 'error') {
    const entry = payload.params.entry
    if (!entry.url?.includes('/api/v1/pregnancies/current') || !entry.text.includes('404')) browserErrors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`)
  }
  if (!payload.id) return
  const handler = pending.get(payload.id)
  if (!handler) return
  pending.delete(payload.id)
  clearTimeout(handler.timer)
  if (payload.error) handler.reject(new Error(`${handler.method}: ${payload.error.message}`))
  else handler.resolve(payload.result)
})

function command(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method}: timed out`)) }, 30_000)
    pending.set(id, { resolve, reject, method, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
      return result.result?.value
    } catch (error) {
      if (!String(error).includes('Inspected target navigated or closed') || attempt === 2) throw error
      await pause(350)
    }
  }
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitFor(expression, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await pause(100)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

async function configureViewport(width, height, theme = 'light', reducedMotion = false) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 620 })
  await command('Emulation.setEmulatedMedia', { media: 'screen', features: [
    { name: 'prefers-color-scheme', value: theme },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
  ] })
  await evaluate(`localStorage.setItem('nutrimom.theme', ${JSON.stringify(theme)}); document.documentElement.dataset.theme = ${JSON.stringify(theme)}`)
}

async function navigate(route) {
  await command('Page.navigate', { url: `http://127.0.0.1:5173${route}` })
  try {
    await waitFor(`document.readyState === 'complete' && document.body.innerText.trim().length > 40 && Boolean(document.querySelector('h1, h2'))`, 30_000)
  } catch (error) {
    const diagnostics = await evaluate(`({ href: location.href, readyState: document.readyState, text: document.body.innerText.slice(0, 600), root: document.querySelector('#root')?.innerHTML.slice(0, 800), hasSession: Boolean(sessionStorage.getItem('nutrimom.auth-session')) })`)
    throw new Error(`Page did not render: ${JSON.stringify(diagnostics)}; browserErrors=${JSON.stringify(browserErrors)}`, { cause: error })
  }
  await pause(600)
}

async function screenshot(name) {
  const shot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'))
}

async function clickButton(text, selector = 'button') {
  const clicked = await evaluate(`(() => {
    const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((candidate) => candidate.textContent?.trim().includes(${JSON.stringify(text)}) || candidate.getAttribute('aria-label')?.includes(${JSON.stringify(text)}))
    if (!element) return false
    element.click()
    return true
  })()`)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

await command('Runtime.enable')
await command('Log.enable')
await command('Page.enable')
await pause(800)

await evaluate(`(async () => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ${JSON.stringify(phone)}, password: ${JSON.stringify(password)}, device_id: 'codex-calendar-notifications-qa' }),
  })
  if (!response.ok) throw new Error('QA login failed: ' + response.status)
  const value = (await response.json()).data
  const now = Date.now()
  const user = value.user
  sessionStorage.setItem('nutrimom.auth-session', JSON.stringify({
    accessToken: value.access_token, refreshToken: value.refresh_token,
    accessExpiresAt: now + value.expires_in * 1000,
    refreshExpiresAt: now + value.refresh_expires_in * 1000,
    tokenType: value.token_type,
    user: { id: user.id, phone: user.phone, displayName: user.display_name, role: user.role ?? user.roles?.[0] ?? 'USER', roles: user.roles ?? [], onboardingStatus: user.onboarding_status, status: user.status, createdAt: user.created_at },
  }))
})()`)

async function cleanupQaReminders() {
  await evaluate(`(async () => {
    const session = JSON.parse(sessionStorage.getItem('nutrimom.auth-session'))
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
    const response = await fetch('/api/v1/calendar/reminders?from=' + from + '&to=' + to, { headers: { Authorization: 'Bearer ' + session.accessToken } })
    if (!response.ok) return
    const reminders = (await response.json()).data
    for (const reminder of Array.isArray(reminders) ? reminders : []) {
      if (!reminder.title?.startsWith('QA Calendar ') && !reminder.title?.startsWith('QA Recurring ')) continue
      await fetch('/api/v1/calendar/reminders/' + encodeURIComponent(reminder.id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + session.accessToken } })
    }
  })()`)
}

await cleanupQaReminders()
console.log('QA stage: cleaned prior reminders')

await configureViewport(1440, 1000)
await navigate('/app')

const notificationBefore = await evaluate(`performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/api/v1/notifications?')).length`)
await clickButton('Thông báo', '.nm-notification-trigger')
console.log('QA stage: notifications verified')
await waitFor(`!document.querySelector('.nm-notification-skeleton')`)
const notificationFirst = await evaluate(`({
  requests: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/api/v1/notifications?')).length,
  items: document.querySelectorAll('.nm-notification-item').length,
  empty: document.querySelector('.nm-notification-state')?.textContent?.includes('Chưa có thông báo') ?? false,
  error: document.querySelector('.nm-notification-state')?.textContent?.includes('Thử lại') ?? false,
  panelText: document.querySelector('.nm-notification-panel')?.innerText.slice(0, 500) ?? '',
})`)
await clickButton('Thông báo', '.nm-notification-trigger')
await clickButton('Thông báo', '.nm-notification-trigger')
await waitFor(`!document.querySelector('.nm-notification-skeleton')`)
const notificationSecond = await evaluate(`performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/api/v1/notifications?')).length`)
await screenshot('notifications-desktop-light')
await clickButton('Thông báo', '.nm-notification-trigger')

const qaTitle = `QA Calendar ${Date.now()}`
await clickButton('Thêm lịch nhắc nhở')
await waitFor(`Boolean(document.querySelector('#calendar-reminder-form'))`)
await evaluate(`(() => {
  const input = document.querySelector('#calendar-reminder-form input[maxlength="255"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, ${JSON.stringify(qaTitle)})
  input.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
await clickButton('Tạo lịch nhắc')
await waitFor(`document.querySelector('.calendar-action-toast')?.textContent?.includes('Đã tạo lịch nhắc nhở')`)
const createToast = await evaluate(`({
  text: document.querySelector('.calendar-action-toast')?.textContent?.trim() ?? '',
  role: document.querySelector('.calendar-action-toast')?.getAttribute('role'),
  duration: getComputedStyle(document.querySelector('.calendar-action-toast-progress')).animationDuration,
  right: document.querySelector('.calendar-action-toast')?.getBoundingClientRect().right,
  viewport: innerWidth,
})`)
await screenshot('calendar-create-toast-desktop-light')
await pause(4_300)
const toastDismissed = await evaluate(`!document.querySelector('.calendar-action-toast')`)
console.log('QA stage: create toast verified')
await waitFor(`Array.from(document.querySelectorAll('.calendar-event-card')).some((card) => card.textContent?.includes(${JSON.stringify(qaTitle)}))`)
await evaluate(`Array.from(document.querySelectorAll('.calendar-event-card')).find((card) => card.textContent?.includes(${JSON.stringify(qaTitle)})).click()`)
await waitFor(`Boolean(document.querySelector('.calendar-event-dialog'))`)
await waitFor(`document.querySelectorAll('.calendar-management-actions .calendar-dialog-action').length === 2`)
const dialogLayout = await evaluate(`(() => {
  const buttons = Array.from(document.querySelectorAll('.calendar-management-actions .calendar-dialog-action'))
  return { labels: buttons.map((button) => button.textContent.trim()), heights: buttons.map((button) => button.getBoundingClientRect().height), scrollable: document.querySelector('.calendar-event-dialog').scrollHeight <= document.querySelector('.calendar-event-dialog').clientHeight || getComputedStyle(document.querySelector('.nm-dialog-body')).overflowY === 'auto' }
})()`)
await screenshot('calendar-detail-actions-desktop-light')
await clickButton('Xóa lịch', '.calendar-management-actions button')
await waitFor(`Array.from(document.querySelectorAll('[role="dialog"] h2')).some((heading) => heading.textContent?.includes('Xóa lịch nhắc nhở'))`)
await clickButton('Xóa lịch', '.nm-dialog-footer .danger-submit')
await waitFor(`document.querySelector('.calendar-action-toast')?.textContent?.includes('Đã xóa lịch nhắc nhở')`)
const deleteToast = await evaluate(`document.querySelector('.calendar-action-toast')?.textContent?.trim() ?? ''`)
console.log('QA stage: delete verified')

const recurringTitle = `QA Recurring ${Date.now()}`
const recurring = await evaluate(`(async () => {
  const session = JSON.parse(sessionStorage.getItem('nutrimom.auth-session'))
  const starts = new Date(Date.now() + 90 * 60 * 1000)
  const response = await fetch('/api/v1/calendar/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken },
    body: JSON.stringify({ type: 'CUSTOM', title: ${JSON.stringify(recurringTitle)}, starts_at: starts.toISOString(), repeat: { rule: 'DAILY' } }),
  })
  return { status: response.status, body: await response.json() }
})()`)
if (recurring.status < 200 || recurring.status >= 300) throw new Error(`Recurring reminder create failed: ${recurring.status}`)
const recurringId = recurring.body.data.id
console.log('QA stage: recurring reminder created')

await navigate('/app')
await waitFor(`Array.from(document.querySelectorAll('.calendar-event-card')).some((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)}) && !card.textContent?.includes('Đã làm') && !card.textContent?.includes('Đã bỏ qua'))`)
await evaluate(`Array.from(document.querySelectorAll('.calendar-event-card')).find((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)})).click()`)
await waitFor(`Array.from(document.querySelectorAll('.calendar-occurrence-actions button')).some((button) => button.textContent?.includes('Đánh dấu đã làm'))`)
await clickButton('Đánh dấu đã làm', '.calendar-occurrence-actions button')
await waitFor(`document.querySelector('.calendar-action-toast')?.textContent?.includes('Đã đánh dấu lần nhắc này là đã làm')`)
const doneToast = await evaluate(`document.querySelector('.calendar-action-toast')?.textContent?.trim() ?? ''`)
console.log('QA stage: DONE verified')

await waitFor(`Array.from(document.querySelectorAll('.calendar-event-card')).some((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)}) && card.textContent?.includes('Đã làm'))`)
await screenshot('calendar-done-state-desktop-light')
await evaluate(`Array.from(document.querySelectorAll('.calendar-event-card')).find((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)})).click()`)
await waitFor(`Array.from(document.querySelectorAll('.calendar-occurrence-actions button')).some((button) => button.textContent?.includes('Hoàn tác đánh dấu'))`)
const contextualDoneActions = await evaluate(`Array.from(document.querySelectorAll('.calendar-occurrence-actions button')).map((button) => button.textContent.trim())`)
await clickButton('Hoàn tác đánh dấu', '.calendar-occurrence-actions button')
await waitFor(`document.querySelector('.calendar-action-toast')?.textContent?.includes('Đã hoàn tác đánh dấu')`)
console.log('QA stage: undo verified')

await waitFor(`Array.from(document.querySelectorAll('.calendar-event-card')).some((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)}) && !card.textContent?.includes('Đã làm') && !card.textContent?.includes('Đã bỏ qua'))`)
await evaluate(`Array.from(document.querySelectorAll('.calendar-event-card')).find((card) => card.textContent?.includes(${JSON.stringify(recurringTitle)})).click()`)
await waitFor(`Array.from(document.querySelectorAll('.calendar-occurrence-actions button')).some((button) => button.textContent?.includes('Bỏ qua lần này'))`)
const contextualScheduledActions = await evaluate(`Array.from(document.querySelectorAll('.calendar-occurrence-actions button')).map((button) => button.textContent.trim())`)
await clickButton('Bỏ qua lần này', '.calendar-occurrence-actions button')
await waitFor(`document.querySelector('.calendar-action-toast')?.textContent?.includes('Đã bỏ qua lần nhắc này')`)
const skippedToast = await evaluate(`document.querySelector('.calendar-action-toast')?.textContent?.trim() ?? ''`)
console.log('QA stage: SKIPPED verified')

await evaluate(`(async () => {
  const session = JSON.parse(sessionStorage.getItem('nutrimom.auth-session'))
  await fetch('/api/v1/calendar/reminders/' + encodeURIComponent(${JSON.stringify(recurringId)}), { method: 'DELETE', headers: { Authorization: 'Bearer ' + session.accessToken } })
})()`)
await cleanupQaReminders()

const breakpoints = []
for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  console.log(`QA stage: viewport ${width}`)
  await configureViewport(width, width <= 375 ? 812 : 1000, width === 1024 ? 'dark' : 'light', width === 768)
  await navigate('/app')
  await evaluate(`localStorage.setItem('nutrimom.theme', ${JSON.stringify(width === 1024 ? 'dark' : 'light')}); document.documentElement.dataset.theme = ${JSON.stringify(width === 1024 ? 'dark' : 'light')}`)
  const layout = await evaluate(`(() => {
    const hero = document.querySelector('.nm-overview-hero-band').getBoundingClientRect()
    const calendarBand = document.querySelector('.nm-overview-calendar-band').getBoundingClientRect()
    const calendar = document.querySelector('.calendar-overview').getBoundingClientRect()
    return {
      width: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      heroLeft: hero.left,
      heroRight: hero.right,
      heroBottom: hero.bottom,
      calendarBandTop: calendarBand.top,
      calendarRadius: getComputedStyle(document.querySelector('.calendar-overview')).borderRadius,
      heroBackground: getComputedStyle(document.querySelector('.nm-overview-hero-band')).backgroundColor,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })()`)
  breakpoints.push(layout)
  await screenshot(`overview-${width}px-${width === 1024 ? 'dark' : 'light'}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  notifications: {
    firstOpenRequests: notificationFirst.requests - notificationBefore,
    reopenRequests: notificationSecond - notificationFirst.requests,
    items: notificationFirst.items,
    empty: notificationFirst.empty,
    error: notificationFirst.error,
    panelText: notificationFirst.panelText,
  },
  calendar: {
    createToast,
    toastDismissed,
    dialogLayout,
    deleteToast,
    doneToast,
    skippedToast,
    contextualDoneActions,
    contextualScheduledActions,
  },
  breakpoints,
  browserErrors,
}
await writeFile(path.join(outputDirectory, 'calendar-notifications-qa-report.json'), JSON.stringify(report, null, 2))
socket.close()
console.log(JSON.stringify({
  notificationRequests: { firstOpen: report.notifications.firstOpenRequests, reopen: report.notifications.reopenRequests },
  notificationState: report.notifications.error ? 'error' : report.notifications.empty ? 'empty' : `items:${report.notifications.items}`,
  toastDismissed,
  overflowFailures: breakpoints.filter((item) => item.overflow).map((item) => item.width),
  browserErrors: browserErrors.length,
  screenshots: breakpoints.length + 3,
}, null, 2))
