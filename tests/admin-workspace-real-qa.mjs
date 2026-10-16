import assert from 'node:assert/strict'
import { mkdir, writeFile, readdir, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Read-only acceptance against the local backend. Never intercept or replace API responses.
const origin = process.env.NUTRIMOM_QA_ORIGIN || 'http://127.0.0.1:5174'
const controlsOnly = process.argv.includes('--controls-only')
const output = new URL(controlsOnly ? '../qa/admin-workspace/controls/' : '../qa/admin-workspace/real/', import.meta.url)
await mkdir(output, { recursive: true })
if (!controlsOnly) assert.ok(process.env.NUTRIMOM_ADMIN_PHONE && process.env.NUTRIMOM_ADMIN_PASSWORD, 'Provide test credentials through environment variables.')
const targets = await fetch('http://127.0.0.1:9223/json').then(r => r.json())
const target = targets.find(t => t.type === 'page')
assert.ok(target, 'Start isolated QA Chrome on port 9223.')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map(), requests = [], errors = [], results = [], requestIndex = new Map(), bodies = new Map()
socket.addEventListener('message', async event => {
  const message = JSON.parse(event.data)
  if (message.id) { const item = pending.get(message.id); if (item) { pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result) } return }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Network.requestWillBeSent') {
    const { requestId, request } = message.params, url = new URL(request.url)
    if (!url.pathname.startsWith('/api/v1/')) return
    const row = { path: url.pathname.replace('/api/v1', ''), query: url.search, method: request.method }
    requests.push(row); requestIndex.set(requestId, row)
  }
  if (message.method === 'Network.responseReceived') {
    const row = requestIndex.get(message.params.requestId)
    if (row) { row.status = message.params.response.status; row.mime = message.params.response.mimeType }
  }
  if (message.method === 'Network.loadingFinished') {
    const row = requestIndex.get(message.params.requestId)
    if (row?.status === 200 && row.method === 'GET' && row.mime?.includes('json')) {
      try { const response = await command('Network.getResponseBody', { requestId: message.params.requestId }); const value = JSON.parse(response.body); bodies.set(row.path, value.data ?? value) } catch { /* Binary downloads are checked from disk. */ }
    }
  }
})
function command(method, params = {}) { const id = ++sequence; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) }) }
async function evaluate(expression) { const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value }
const delay = ms => new Promise(r => setTimeout(r, ms))
async function until(expression, timeout = 15000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await evaluate(`(()=>{try{return Boolean(${expression})}catch{return false}})()`)) return; await delay(100) } throw new Error('Timed out: ' + expression) }
async function navigate(path) { await command('Page.navigate', { url: origin + path }); await until("document.readyState === 'complete'"); await delay(400) }
async function click(text, selector = 'button') { assert.equal(await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.textContent.includes(${JSON.stringify(text)}) || x.getAttribute('aria-label')?.includes(${JSON.stringify(text)}));if(!e)return false;e.click();return true})()`), true, 'Missing control ' + text); await delay(250) }
async function record(name, task) { const from = requests.length; await task(from); results.push({ name, status: 'passed', requests: requests.slice(from) }); console.log('PASS ' + name) }
async function loaded() {
  await until("!!document.querySelector('.admin-page-heading, .admin-dashboard-redesign') && !document.querySelector('.admin-loading, .admin-metric-skeleton')")
  await delay(400)
  const error = await evaluate("[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent).join(' | ')")
  assert.equal(error, '', 'Unexpected UI error: ' + error)
}
async function screenshot(name, width = 1440, height = 1000) {
  await until("!document.querySelector('.admin-shell')?.classList.contains('admin-login-enter')")
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }); await delay(700)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Horizontal overflow')
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true }); await writeFile(new URL(name + '.png', output), Buffer.from(result.data, 'base64'))
}
await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable'); await command('Fetch.disable')
await command('Page.bringToFront')
await command('Emulation.setEmulatedMedia', { features: [] })
await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: fileURLToPath(output), eventsEnabled: true })
try {
  if (controlsOnly) {
    for (const path of ['/admin/users', '/admin/experts', '/admin/appointments', '/admin/consultations', '/admin/support', '/admin/knowledge', '/admin/revenue', '/admin/revenue?tab=subscriptions', '/admin/reports']) {
      await record('Animated select and keyboard on ' + path, async () => {
        await navigate(path); await loaded()
        assert.equal(await evaluate("[...document.querySelectorAll('.admin-shell select')].filter(e=>e.offsetWidth && e.offsetHeight && e.getAttribute('aria-hidden')!=='true').length"),0)
        await evaluate("document.querySelector('.admin-dropdown-trigger:not(:disabled)').click()")
        await until("!!document.querySelector('.admin-select-popup [role=option]')"); await delay(300)
        assert.ok((await evaluate("getComputedStyle(document.querySelector('.admin-select-popup')).transitionDuration")).includes('0.24s'))
        await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'})
        await delay(30)
        assert.equal(await evaluate("!!document.querySelector('.admin-select-popup[data-ending-style]')"),true,'Closing animation must remain mounted')
        await until("[...document.querySelectorAll('.admin-select-popup')].every(e=>e.closest('[hidden]') || getComputedStyle(e).visibility==='hidden')")
        assert.equal(await evaluate("document.activeElement.classList.contains('admin-dropdown-trigger')"),true)
      })
    }
    await record('Calendar dark theme, reduced motion and invalid draft dates send no extra reads',async()=>{
      await navigate('/admin'); await loaded()
      const before=requests.length
      await evaluate("document.documentElement.dataset.theme='dark';document.querySelector('.admin-date-trigger').click()")
      await until("!!document.querySelector('.admin-calendar')");await screenshot('calendar-dark',390,844)
      await evaluate("[...document.querySelectorAll('.admin-calendar button[data-day]')].find(e=>e.textContent.trim()==='2' && !e.closest('.rdp-outside')).click()")
      await delay(300)
      await evaluate("document.querySelectorAll('.admin-date-trigger')[1].click()");await until("!!document.querySelector('.admin-calendar')")
      await evaluate("[...document.querySelectorAll('.admin-calendar button[data-day]')].find(e=>e.textContent.trim()==='1' && !e.closest('.rdp-outside')).click()")
      await delay(300);await click('Áp dụng','.admin-period-filter button')
      assert.equal(await evaluate("document.querySelector('.admin-query-error')?.textContent.includes('Ngày bắt đầu')"),true)
      assert.equal(requests.slice(before).filter(r=>r.path==='/admin/dashboard').length,0)
      assert.equal(await evaluate("document.activeElement.classList.contains('admin-date-trigger')"),true)
      await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
      await evaluate("document.querySelector('.admin-date-trigger').click()");await until("!!document.querySelector('.admin-date-popup')")
      assert.ok(await evaluate("getComputedStyle(document.querySelector('.admin-date-popup')).transitionDuration.split(',').every(v=>parseFloat(v)<=0.001)"))
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(100)
      await command('Emulation.setEmulatedMedia',{features:[]});await evaluate("document.documentElement.dataset.theme='light'")
    })
  } else {
  await navigate('/login'); await evaluate("sessionStorage.removeItem('nutrimom.auth-session')"); await navigate('/login')
  await until("!!document.querySelector('input[name=identifier]')")
  await record('Real credential login and dashboard request budget', async from => {
    for (const [name, value] of [['identifier', process.env.NUTRIMOM_ADMIN_PHONE], ['password', process.env.NUTRIMOM_ADMIN_PASSWORD]]) { await evaluate(`document.querySelector('input[name=${name}]').focus()`); await command('Input.insertText', { text: value }) }
    await click('Đăng nhập', 'button[type=submit]'); await until("!!document.querySelector('.admin-workspace-kpis')"); await loaded()
    for (const path of ['/admin/dashboard', '/notifications/unread-count']) assert.equal(requests.slice(from).filter(r => r.path === path && r.status === 200).length, 1)
    assert.equal(requests.slice(from).filter(r => r.path === '/notifications').length, 0)
    await screenshot('dashboard-desktop'); await screenshot('dashboard-mobile', 390, 844)
  })
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  for (const path of ['/admin/users', '/admin/experts', '/admin/appointments', '/admin/consultations', '/admin/support', '/admin/knowledge', '/admin/revenue', '/admin/revenue?tab=subscriptions', '/admin/notifications']) {
    await record('Real route ' + path, async () => { await navigate(path); await loaded(); assert.ok(requests.some(r => r.status === 200 && r.path.startsWith('/admin/'))); await screenshot(path.replace(/[^a-z]+/g, '-')) })
  }
  for (const [api, param, route, idField] of [['/admin/users','userId','users','id'], ['/admin/experts/page','expertId','experts','user_id'], ['/admin/appointments','requestId','appointments','id'], ['/admin/payment-orders','orderCode','revenue','order_code']]) {
    const row = bodies.get(api)?.items?.[0]
    if (!row) { results.push({ name: 'Real drawer ' + route, status: 'unavailable', reason: 'No row in current local data.' }); continue }
    // Experts use their established drawer control; its query state is local.
    await record('Real drawer ' + route, async () => {
      await navigate('/admin/' + route + (route === 'experts' ? '' : '?' + param + '=' + encodeURIComponent(row[idField])))
      if (route === 'experts') { await loaded(); await click('Xem chi tiết', '.admin-row-action') }
      await until("!!document.querySelector('[role=dialog]') && !document.querySelector('[role=dialog] .admin-loading')")
      await delay(400); assert.equal(await evaluate("!!document.querySelector('[role=dialog] [role=alert]')"), false); await screenshot('drawer-' + route)
    })
  }
  for (const type of ['OPERATIONS', 'USERS_SUBSCRIPTIONS', 'REVENUE']) {
    await record('Real report preview and CSV ' + type, async from => {
      await navigate('/admin/reports?type=' + type); await loaded(); await until("!!document.querySelector('.admin-report-summary')")
      const existing = new Map(await Promise.all((await readdir(output)).filter(name=>name.endsWith('.csv')).map(async name=>[name,(await stat(new URL(name,output))).mtimeMs]))); await click('Tải CSV', '.admin-heading-actions button')
      let files = []; for (let i = 0; i < 100; i++) { const candidates=(await readdir(output)).filter(name=>name.endsWith('.csv'));files=[];for(const name of candidates)if(!existing.has(name)||(await stat(new URL(name,output))).mtimeMs>existing.get(name))files.push(name);if (files.length) break; await delay(100) }
      assert.equal(files.length, 1, 'CSV download did not complete'); const bytes = await readFile(new URL(files[0], output)); assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]); assert.ok(bytes.length > 3)
      const exportRequest = requests.slice(from).find(r => r.path.endsWith('/export')); assert.ok(exportRequest); assert.equal(new URLSearchParams(exportRequest.query).has('page'), false)
      await screenshot('report-' + type.toLowerCase())
    })
  }
  }
  assert.equal(errors.length, 0)
} catch (error) {
  results.push({ name: 'Failure', status: 'failed', reason: error.message }); await screenshot('failure'); throw error
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ checkedAt: new Date().toISOString(), mode: 'Actual local BE via FE proxy; no fixtures or API interception; read-only except credential login and CSV export.', results, runtimeErrors: errors }, null, 2)); socket.close()
}
