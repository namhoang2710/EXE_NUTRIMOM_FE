import { browser, server, output, pageErrors, unexpected, writeFile, date } from './helpers/nutrition-browser.mjs'
import { session, routes, missing } from './helpers/workspace-browser.mjs'
const results = [], screenshots = [], interactions = []

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
  const record = { theme: process.env.RESPONSIVE_QA_THEME || 'light', role, route, size, ...result, overflow: result.scroll > result.width + 1 }
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
