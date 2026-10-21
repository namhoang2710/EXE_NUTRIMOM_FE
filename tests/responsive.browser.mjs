import { fixture, browser, server, output, pageErrors, unexpected, writeFile, date } from './helpers/nutrition-browser.mjs'
import { fixtureResponse, expert, qaExpertId } from './admin-workspace-fixtures.mjs'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const results = [], screenshots = [], missing = new Set(), interactions = []
const pregnancy = { id: 'pregnancy-qa', status: 'ACTIVE', local_date: '2026-10-21', timezone: 'Asia/Ho_Chi_Minh', gestational_week: 26, gestational_day: 6, trimester: 2, estimated_due_date: '2027-01-21', days_until_due: 92, version: 1, auto_plan_paused: false }
const profile = { id: 'nutrition-account-a', phone: '0901112233', display_name: 'Nguyễn Minh Anh', role: 'MOM', roles: ['USER'], onboarding_status: 'COMPLETED', status: 'ACTIVE', email: 'qa@example.test', gender: 'FEMALE', date_of_birth: '1994-06-12', version: 1 }
const article = { id: 'article-qa', slug: 'cham-soc-thai-ky', title: 'Chăm sóc mẹ và bé trong thai kỳ mỗi ngày', excerpt: 'Những điều nhỏ giúp mẹ chuẩn bị cho hành trình cùng bé.', category: 'nutrition', stage: 'trimester-2', topics: [], author: { id: 'author-qa', name: 'Chuyên gia NutriMom' }, publishedAt: '2026-10-20T00:00:00Z', status: 'published', sections: [{ id: 'intro', heading: 'Chuẩn bị bữa ăn', paragraphs: ['Lựa chọn món ăn phù hợp và sắp xếp thời gian chuẩn bị mỗi ngày.'], bullets: [], sortOrder: 0 }], createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z' }
const group = { id: 'group-qa', pregnancy_id: pregnancy.id, owner_user_id: profile.id, status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z' }
const emptyPage = { items: [], page: 1, page_size: 20, total_items: 0, total_pages: 0 }
const routes = {
  guest: ['/', '/about', '/services', '/services/pregnancy-tracking', '/blog', '/blog/cham-soc-thai-ky', '/experts', '/contact', '/login', '/register'],
  USER: ['/app', '/app/nutrition', '/app/family', '/app/family?tab=tasks', '/app/family?tab=activity', '/app/knowledge', '/app/knowledge/cham-soc-thai-ky', '/app/pricing', '/app/community', '/app/contact', '/app/settings', '/app/experts', '/app/consultations', '/app/chat', '/app/assistant', '/app/profile', '/app/profile/health', '/app/profile/care', '/app/profile/records', '/app/profile/saved', '/app/profile/support', '/app/profile/account/password', '/app/profile/account/disable', '/app/consultations/history', '/app/appointment-questions'],
  ADMIN: ['/admin', '/admin/users', '/admin/experts', '/admin/appointments', '/admin/consultations', '/admin/support', '/admin/health', '/admin/nutrition', '/admin/knowledge', '/admin/reports', '/admin/revenue', '/admin/notifications', '/admin/settings'],
  EXPERT: ['/expert', '/expert?section=schedule', '/expert?section=requests', '/expert?section=slots', '/expert?section=reviews'],
}

async function session(role, touch = false) {
  const f = await fixture({ known: true, ...(touch ? { contextOptions: { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } } : {}) })
  f.reads = []
  f.page.on('request', request => {
    if (request.method() === 'GET' && new URL(request.url()).pathname.startsWith('/api/v1/')) f.reads.push(new URL(request.url()).pathname)
  })
  f.page.on('requestfailed', request => {
    if (!new URL(request.url()).pathname.startsWith('/api/') && request.failure()?.errorText !== 'net::ERR_ABORTED') console.log('ASSET_FAILURE ' + JSON.stringify({ role, url: request.url(), error: request.failure()?.errorText }))
  })
  f.page.on('response', response => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/api/')) console.log('ASSET_RESPONSE ' + JSON.stringify({ role, url: response.url(), status: response.status() }))
  })
  await f.context.addInitScript(({ role }) => {
    if (role === 'guest') sessionStorage.removeItem('nutrimom.auth-session')
    else {
      const session = JSON.parse(sessionStorage.getItem('nutrimom.auth-session'))
      session.user.roles = [role]
      session.user.role = role === 'USER' ? 'MOM' : role
      sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(session))
    }
  }, { role })
  await f.context.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '')
    const ok = data => route.fulfill({ json: { data, meta: { request_id: 'responsive-qa' } } })
    let data
    if (path === '/auth/me' || path === '/users/me') data = { ...profile, roles: [role], role: role === 'USER' ? 'MOM' : role }
    else if (path === '/notifications/unread-count') data = { count: 1 }
    else if (path === '/notifications') data = { items: [{ id: 'notice-qa', type: 'SYSTEM', audience: role === 'ADMIN' ? 'ADMIN' : 'USER', category: 'GENERAL', title: 'Lịch hẹn và thông tin chăm sóc của mẹ', body: 'Mở để xem những cập nhật mới nhất trong hành trình chăm sóc mẹ và bé.', created_at: '2026-10-21T00:00:00Z', deep_link: 'nutrimom://nutrition' }], has_more: false }
    else if (path === '/subscriptions/me') data = entitlementsFor('PLAN_399K')
    else if (path === '/subscription-plans') data = planDtos
    else if (path === '/pregnancies/current') data = pregnancy
    else if (path === '/dashboard/mom') data = { profile_summary: profile, pregnancy_summary: pregnancy, upcoming_reminders: [], active_alerts: [], recommended_articles: [article], unread_notification_count: 0 }
    else if (path.startsWith('/calendar/')) data = []
    else if (path === '/knowledge/articles') data = { items: [article], currentPage: 1, pageSize: 12, totalItems: 1, totalPages: 1 }
    else if (path === '/knowledge/articles/' + article.slug) data = article
    else if (path === '/experts') data = [{ ...expert, user_id: qaExpertId }]
    else if (path === '/experts/' + qaExpertId) data = { ...expert, reviews: [] }
    else if (path === '/family-groups') data = [group]
    else if (['/family-members', '/family-invitations/received', '/family-invitations', '/family/tasks'].includes(path)) data = []
    else if (path === '/activity-feed') data = { items: [{ id: 'activity-qa', type: 'FAMILY_TASK_COMPLETED', title: 'Gia đình đã cùng chuẩn bị bữa ăn cho mẹ', created_at: '2026-10-21T00:00:00Z' }], has_more: false }
    else if (path === '/assistant/status') data = { ai_ready: false, provider: 'GUIDE', remaining_ai_messages: 0, daily_ai_limit: 0, retention_days: 30 }
    else if (path === '/assistant/preferences') data = { cloud_consent: false, use_profile: true, use_pregnancy: true, use_medical_records: false, version: 1 }
    else if (path === '/assistant/conversations') data = []
    else if (path === '/assistant/context') data = { display_name: profile.display_name, headline: 'Đồng hành cùng mẹ', items: [], suggestions: [], context_version: 1 }
    else if (path === '/consultation-requests' || path === '/expert/consultation-requests' || path === '/expert/reviews') data = emptyPage
    else if (path === '/expert/me') data = expert
    else if (path === '/expert/schedule/summary') data = []
    else if (path === '/expert/schedule') data = { date: url.searchParams.get('date'), day_off: false, has_bookings: false, slots: [] }
    else if (path === '/admin/experts/performance') data = expertPerformanceFixture(url.searchParams)
    else if (path === '/reference-data/specialties') data = [{ code: 'HEALTH', display_name: 'Sức khỏe', sort_order: 0 }, { code: 'NUTRITION', display_name: 'Dinh dưỡng', sort_order: 1 }, { code: 'PSYCHOLOGY', display_name: 'Tâm lý', sort_order: 2 }]
    else if (path.startsWith('/admin/')) {
      data = fixtureResponse(path, url.searchParams, request.method(), request.postData())
      if (path === '/admin/dashboard') data = enrichDashboard(data, 'up')
    }
    else if (path === '/contact-requests') data = emptyPage
    else if (path === '/medical-records') data = { items: [{ id: 'record-qa', title: 'Kết quả khám thai định kỳ của mẹ', category: 'CHECKUP', occurred_at: '2026-10-20T02:00:00Z', summary: 'Theo dõi và chuẩn bị cho buổi khám tiếp theo.', pregnancy_id: pregnancy.id, attachment_count: 0, attachments: [], version: 1 }], next_cursor: null, has_more: false }
    else if (path === '/verified-guidance') data = { items: [], next_cursor: null, has_more: false }
    else if (path === '/preparation-items' || path === '/health-alerts') data = []
    else if (path === '/care-plans/current' || path === '/birth-plans/current') {
      return route.fulfill({ status: 404, json: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Chưa có dữ liệu.' } } })
    }
    if (data !== undefined) return ok(data)
    if (!/^\/(auth|users|notifications|me\/nutrition-profile|allergens|diary|diary-entries|meal-feedback|ingredients|recommendations|recipes|meal-plans)(\/|$)/.test(path)) missing.add(path)
    return route.fallback()
  })
  // Optional deterministic transport for hosts that emit ERR_NETWORK_CHANGED
  // even for loopback assets. Serve the unmodified production files, not UI mocks.
  if (process.env.RESPONSIVE_QA_LOCAL_ASSETS === '1') {
    const assetRoot = resolve(process.env.NUTRITION_QA_DIST || 'dist')
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' }
    await f.context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/')) return route.fallback()
      const file = resolve(assetRoot, '.' + decodeURIComponent(url.pathname))
      if (!file.startsWith(assetRoot + sep) && file !== assetRoot) throw new Error('Asset escaped the production snapshot')
      const extension = extname(file)
      try {
        return await route.fulfill({ status: 200, contentType: types[extension] || 'text/html', body: await readFile(extension ? file : resolve(assetRoot, 'index.html')) })
      } catch (error) {
        if (error.code === 'ENOENT') return route.fallback()
        throw error
      }
    })
  }
  return f
}

async function measure(page, role, route, size) {
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(() => {
    const visible = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0 }
    const escaped = [...document.querySelectorAll('main button, main input, main select, main textarea, main h1, main h2, [role="dialog"] button')].filter(visible).filter(e => {
      const r = e.getBoundingClientRect()
      if (r.left >= -1 && r.right <= innerWidth + 1) return false
      for (let parent = e.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const s = getComputedStyle(parent)
        if (['auto', 'scroll'].includes(s.overflowX) && parent.scrollWidth > parent.clientWidth) return false
        if (s.visibility === 'hidden' || Number(s.opacity) === 0) return false
      }
      return true
    }).slice(0, 8).map(e => ({ tag: e.tagName, class: String(e.className).slice(0, 120), text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 90), left: Math.round(e.getBoundingClientRect().left), right: Math.round(e.getBoundingClientRect().right) }))
    return { actual: location.pathname + location.search, width: innerWidth, scroll: document.documentElement.scrollWidth, heading: document.querySelector('h1, h2')?.textContent, escaped, bodyLength: document.body.innerText.length }
  })
  const record = { role, route, size, ...result, overflow: result.scroll > result.width + 1 }
  results.push(record)
  if (record.overflow || result.escaped.length || result.bodyLength < 30) console.log('LAYOUT ' + JSON.stringify(record))
  const key = route.replace(/[^a-zA-Z0-9]/g, '-') || 'home'
  if (([390, 768, 1440].includes(size.width) && ['/', '/login', '/app', '/app/nutrition', '/app/family', '/app/pricing', '/app/profile/health', '/admin', '/expert'].includes(route)) || record.overflow) {
    const file = `${role}-${key}-${size.width}x${size.height}.png`
    await page.screenshot({ path: `${output}/${file}`, fullPage: true })
    await page.screenshot({ path: `${output}/${file.replace('.png', '-viewport.png')}` })
    screenshots.push(file)
  }
  return record
}

async function ready(f, route) {
  await f.page.goto(`http://127.0.0.1:${process.env.NUTRITION_QA_PORT || 5195}${route}`, { waitUntil: 'domcontentloaded' })
  await f.page.waitForFunction(() => document.body.innerText.trim().length > 40 && Boolean(document.querySelector('h1, h2')))
  await f.page.waitForLoadState('load')
  if (route.startsWith('/app/family')) {
    await f.page.locator('.family-content-ready').first().waitFor()
    if (route.includes('tab=activity')) await f.page.getByText('Gia đình đã cùng chuẩn bị bữa ăn cho mẹ', { exact: true }).waitFor()
  }
  await f.page.waitForTimeout(650)
}

async function overlay(f, label, role, route, size) {
  await f.page.waitForTimeout(250)
  const geometry = await f.page.locator('[role="dialog"], .nm-app-links.is-open, .nm-account-sidebar.is-open, .expert-sidebar.is-open, .admin-sidebar.is-open').evaluateAll(elements => elements.filter(e => e.getClientRects().length).map(e => {
    const r = e.getBoundingClientRect()
    return { class: String(e.className), left: r.left, right: r.right, top: r.top, bottom: r.bottom, viewportHeight: innerHeight, fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 }
  }))
  interactions.push({ role, label, size, geometry })
  if (geometry.some(g => !g.fits)) console.log('OVERLAY ' + JSON.stringify(interactions.at(-1)))
  await measure(f.page, role, `${route}#${label}`, size)
  await f.page.screenshot({ path: `${output}/interaction-${role}-${label}-${size.width}x${size.height}.png` })
}

async function interactiveChecks() {
  const sizes = process.env.RESPONSIVE_QA_SIZES
    ? process.env.RESPONSIVE_QA_SIZES.split(',').map(s => { const [width, height] = s.split('x').map(Number); return { width, height } })
    : [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 720, height: 500 }]
  for (const size of sizes) {
    const f = await session('USER', true)
    await f.page.setViewportSize(size)
    await ready(f, '/app/nutrition')
    await f.page.getByRole('button', { name: 'Mở menu', exact: true }).tap()
    await overlay(f, 'navigation', 'USER', '/app/nutrition', size)
    await f.page.getByRole('button', { name: 'Cá nhân', exact: true }).click()
    await overlay(f, 'navigation-personal', 'USER', '/app/nutrition', size)
    await f.page.getByRole('button', { name: 'Hướng dẫn khách hàng', exact: true }).click()
    await f.page.locator('#nm-guide-dropdown a').last().scrollIntoViewIfNeeded()
    await overlay(f, 'navigation-guide', 'USER', '/app/nutrition', size)
    await f.page.getByRole('button', { name: 'Đóng menu', exact: true }).click()
    await f.page.getByRole('button', { name: 'Thông báo', exact: true }).click()
    await f.page.getByRole('heading', { name: 'Thông báo', exact: true }).click()
    await overlay(f, 'notifications', 'USER', '/app/nutrition', size)
    if (!(await f.page.getByRole('dialog', { name: 'Hộp thông báo' }).isVisible())) throw new Error('Pointer events inside notification portal must not dismiss it')
    await f.page.keyboard.press('Escape')
    if (!(await f.page.getByRole('button', { name: 'Thông báo', exact: true }).evaluate(e => document.activeElement === e))) throw new Error('Escape must restore focus to the bell')
    await f.page.getByRole('button', { name: 'Hướng dẫn sử dụng', exact: true }).click()
    await f.page.getByRole('dialog', { name: 'Hướng dẫn dinh dưỡng', exact: true }).waitFor()
    await overlay(f, 'nutrition-guide', 'USER', '/app/nutrition', size)
    await f.page.getByRole('button', { name: 'Trang sau', exact: true }).click()
    await overlay(f, 'nutrition-guide-page1', 'USER', '/app/nutrition', size)
    await f.page.keyboard.press('Escape')
    await f.page.locator('.nutrition-profile-menu > summary').click()
    await overlay(f, 'nutrition-profile-menu', 'USER', '/app/nutrition', size)
    await f.page.getByRole('button', { name: 'Năng lượng', exact: true }).click()
    await f.page.getByRole('dialog').waitFor()
    await overlay(f, 'nutrition-profile', 'USER', '/app/nutrition', size)
    await f.page.keyboard.press('Escape')
    for (const tab of ['Thực đơn', 'Khám phá', 'Nhật ký']) {
      await f.page.getByRole('navigation', { name: 'Điều hướng dinh dưỡng' }).getByRole('link', { name: tab, exact: true }).click()
      await f.page.waitForTimeout(350)
      await overlay(f, `nutrition-tab-${tab === 'Thực đơn' ? 'plan' : tab === 'Khám phá' ? 'discover' : 'diary'}`, 'USER', '/app/nutrition', size)
    }
    await ready(f, `/app/nutrition?tab=plan&date=${date}&plan=plan-qa`)
    await f.page.getByRole('button', { name: 'Đổi món / khẩu phần' }).first().click()
    await f.page.getByRole('dialog').waitFor()
    await overlay(f, 'nutrition-edit', 'USER', '/app/nutrition', size)
    await f.page.keyboard.press('Escape')
    await ready(f, '/app/family')
    await f.page.getByRole('button', { name: 'Mời thành viên', exact: true }).click()
    await f.page.getByRole('dialog').waitFor()
    await overlay(f, 'family-invite', 'USER', '/app/family', size)
    await f.page.keyboard.press('Escape')
    await ready(f, '/app/profile/records')
    await f.page.getByRole('button', { name: 'Thêm hồ sơ', exact: true }).click()
    await f.page.getByRole('dialog').waitFor()
    await overlay(f, 'medical-record', 'USER', '/app/profile/records', size)
    await f.page.keyboard.press('Escape')
    const menu = f.page.getByRole('button', { name: 'Danh mục tài khoản', exact: true })
    if (await menu.isVisible()) {
      await menu.click()
      await overlay(f, 'account-menu', 'USER', '/app/profile/records', size)
      await f.page.keyboard.press('Escape')
    }
    await f.page.evaluate(() => { localStorage.setItem('nutrimom.theme', 'dark') })
    for (const route of ['/app', '/app/nutrition', '/app/pricing', '/app/profile/health']) {
      await ready(f, route)
      await f.page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
      await overlay(f, 'dark-' + route.split('/').at(-1), 'USER', route, size)
    }
    await f.context.close()
    for (const role of ['ADMIN', 'EXPERT']) {
      const panel = await session(role, true)
      await panel.page.setViewportSize(size)
      const route = role === 'ADMIN' ? '/admin' : '/expert'
      await ready(panel, route)
      await panel.page.getByRole('button', { name: 'Thông báo', exact: true }).click()
      await overlay(panel, 'notifications', role, route, size)
      await panel.page.keyboard.press('Escape')
      const toggle = panel.page.getByRole('button', { name: /Mở menu|Mở điều hướng/ }).first()
      await toggle.click()
      await overlay(panel, 'sidebar', role, route, size)
      await panel.context.close()
    }
    console.log(`INTERACTIONS ${size.width}x${size.height}`)
  }
}

async function resizeChecks() {
  for (const [role, route] of [['USER', '/app/nutrition'], ['USER', '/app'], ['ADMIN', '/admin'], ['EXPERT', '/expert']]) {
    const f = await session(role)
    await ready(f, route)
    await f.page.getByRole('button', { name: 'Thông báo', exact: true }).click()
    await f.page.getByText('Lịch hẹn và thông tin chăm sóc của mẹ', { exact: true }).waitFor()
    await f.page.waitForTimeout(1000)
    const before = f.reads.length
    for (const size of [{ width: 1440, height: 1000 }, { width: 320, height: 740 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1920, height: 1080 }]) {
      await f.page.setViewportSize(size)
      await overlay(f, 'resize-' + route.split('/').at(-1), role, route, size)
    }
    const additionalReads = f.reads.slice(before)
    interactions.push({ role, label: 'resize-request-count', route, additionalReads, geometry: [] })
    if (additionalReads.length) throw new Error('Viewport resize must not trigger extra API reads: ' + JSON.stringify(additionalReads))
    await f.page.keyboard.press('Escape')
    if (!(await f.page.getByRole('button', { name: 'Thông báo', exact: true }).evaluate(e => document.activeElement === e))) throw new Error('Resize must preserve notification focus restoration')
    await f.context.close()
    console.log(`RESIZE ${role} ${route}: zero extra API reads`)
  }
}

try {
  if (process.env.RESPONSIVE_QA_RESIZE === '1') await resizeChecks()
  else if (process.env.RESPONSIVE_QA_INTERACTIONS === '1') await interactiveChecks()
  else {
  const widths = (process.env.RESPONSIVE_QA_WIDTHS || '320,360,390,768,1024,1440,1920').split(',').map(Number)
  for (const [role, paths] of Object.entries(routes)) {
    if (process.env.RESPONSIVE_QA_ROLE && role !== process.env.RESPONSIVE_QA_ROLE) continue
    const f = await session(role)
    for (const width of widths) {
      const size = { width, height: width <= 390 ? 844 : 1000 }
      await f.page.setViewportSize(size)
      for (const route of paths) {
        if (process.env.RESPONSIVE_QA_ROUTE && !route.includes(process.env.RESPONSIVE_QA_ROUTE)) continue
        await ready(f, route)
        await measure(f.page, role, route, size)
      }
      console.log(`CHECKED ${role} ${width}px`)
    }
    await f.context.close()
  }
  }
} finally {
  const failures = {
    overflow: results.filter(r => r.overflow),
    escaped: results.filter(r => r.escaped.length),
    blank: results.filter(r => r.bodyLength < 40),
    overlays: interactions.filter(i => i.geometry.some(g => !g.fits)),
  }
  const report = { generatedAt: new Date().toISOString(), browser: browser.version(), scope: 'Headless Chrome, API fixtures; touch emulation for interaction checks; no live backend writes or physical device testing.', localAssetTransport: process.env.RESPONSIVE_QA_LOCAL_ASSETS === '1', failures, results, screenshots, interactions, pageErrors, unexpected, missing: [...missing] }
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ checks: results.length, overflow: results.filter(r => r.overflow).length, escaped: results.filter(r => r.escaped.length).length, pageErrors, missing: [...missing], unexpected }))
  await browser.close()
  await server.close()
  if (Object.values(failures).some(items => items.length) || pageErrors.length || unexpected.length || missing.size) process.exitCode = 1
}
