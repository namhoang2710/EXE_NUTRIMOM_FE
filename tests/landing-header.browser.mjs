import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5187, strictPort: true, open: false } })
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const output = new URL('../qa-artifacts/home-header/', import.meta.url)
await mkdir(output, { recursive: true })
const results = []
const errors = []
const page = await browser.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', error => errors.push(error.message))
const header = page.locator('.landing-header')
const nav = page.getByRole('navigation', { name: 'Điều hướng chính' })

async function noOverlap() {
  const problems = await header.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const elements = [...element.querySelectorAll('.landing-brand, .landing-header-nav a, .landing-header-actions > *')].filter(node => node.checkVisibility())
    const bounds = elements.map(node => ({ name: node.getAttribute('aria-label') || node.textContent.trim(), rect: node.getBoundingClientRect() }))
    const problems = []
    for (const { name, rect: box } of bounds) {
      if (box.left < 0 || box.right > innerWidth || box.top < rect.top || box.bottom > rect.bottom) problems.push(`${name} outside header`)
    }
    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i].rect, b = bounds[j].rect
        if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1) problems.push(`${bounds[i].name} overlaps ${bounds[j].name}`)
      }
    }
    return problems
  })
  assert.deepEqual(problems, [])
}

async function indicatorMatchesActiveLink() {
  await page.waitForFunction(() => {
    const nav = document.querySelector('.landing-header-nav')
    const active = nav?.querySelector('[aria-current="page"]')
    const indicator = nav?.querySelector('.vercel-tabs-indicator')
    if (!active || !indicator || !nav.checkVisibility()) return false
    const target = active.getBoundingClientRect()
    const line = indicator.getBoundingClientRect()
    return getComputedStyle(indicator).opacity === '1' && Math.abs(line.left - target.left) < 1 && Math.abs(line.width - target.width) < 1 && Math.abs(line.top - target.bottom - 4) < 1
  })
}

try {
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [961, 768], [960, 768], [820, 1180], [768, 1024], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:5187/')
    await header.waitFor()
    await page.waitForTimeout(350)
    assert.equal(await header.locator('input, form[role="search"]').count(), 0)
    assert.equal(await header.locator('.landing-header-nav a').count(), 6)
    const style = await header.evaluate(element => ({ height: element.offsetHeight, blur: getComputedStyle(element).backdropFilter }))
    assert.match(style.blur, /blur\(24px\)/)
    await noOverlap()
    if (width > 960) {
      assert.equal(style.height, 80)
      assert.equal(await nav.isVisible(), true)
      await indicatorMatchesActiveLink()
      const centers = await header.locator('.landing-brand, .landing-header-nav, .landing-header-actions').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect()
        return box.y + box.height / 2
      }))
      assert.ok(Math.max(...centers) - Math.min(...centers) < 1)
    } else {
      assert.equal(style.height, 72)
      assert.equal(await nav.isVisible(), false)
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click()
      assert.equal(await nav.isVisible(), true)
      await indicatorMatchesActiveLink()
      await noOverlap()
      await header.screenshot({ path: fileURLToPath(new URL(`header-menu-${width}.png`, output)) })
      await page.keyboard.press('Escape')
      assert.equal(await nav.isVisible(), false)
      assert.equal(await page.getByRole('button', { name: 'Mở menu', exact: true }).evaluate(element => element === document.activeElement), true)
    }
    await header.screenshot({ path: fileURLToPath(new URL(`header-${width}.png`, output)) })
    results.push(`${width}x${height}: six links, no search, glass, aligned and clickable controls`)
    console.log(results.at(-1))
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click()
  await nav.getByRole('link', { name: 'About', exact: true }).click()
  await page.waitForURL('**/about')
  await header.waitFor()
  assert.equal(await nav.isVisible(), false)
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click()
  assert.equal(await nav.getByRole('link', { name: 'About', exact: true }).getAttribute('aria-current'), 'page')
  await indicatorMatchesActiveLink()
  assert.equal(await nav.locator('[aria-current="page"]').count(), 1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(150)
  await indicatorMatchesActiveLink()
  await noOverlap()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.getByRole('button', { name: 'Mở menu', exact: true }).getAttribute('aria-expanded'), 'false')
  results.push('mobile navigation closes on click; active route and resizing preserve menu state')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5187/')
  await header.waitFor()
  await page.waitForTimeout(900)
  await indicatorMatchesActiveLink()
  await nav.getByRole('link', { name: 'Services', exact: true }).hover()
  await page.waitForFunction(() => {
    const target = document.querySelector('.landing-header-nav a[href="/services"]').getBoundingClientRect()
    const hover = document.querySelector('.vercel-tabs-hover')
    const rect = hover.getBoundingClientRect()
    return getComputedStyle(hover).opacity === '1' && Math.abs(rect.left - target.left) < 1 && Math.abs(rect.width - target.width) < 1
  })
  assert.equal(await nav.getByRole('link', { name: 'Home', exact: true }).getAttribute('aria-current'), 'page')
  await header.screenshot({ path: fileURLToPath(new URL('header-hover-1440.png', output)) })
  await page.mouse.move(20, 200)
  await page.waitForTimeout(350)
  await page.screenshot({ path: fileURLToPath(new URL('homepage-header.png', output)) })
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 600) })
  await page.waitForFunction(() => document.querySelector('.landing-header').classList.contains('is-hidden'))
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, 200))
  await page.waitForFunction(() => !document.querySelector('.landing-header').classList.contains('is-hidden'))
  await page.waitForTimeout(400)
  await header.screenshot({ path: fileURLToPath(new URL('header-glass-scrolled.png', output)) })
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối', exact: true }).click()
  await page.waitForTimeout(350)
  await header.screenshot({ path: fileURLToPath(new URL('header-dark.png', output)) })
  results.push('scroll hide/reveal and dark theme')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('http://127.0.0.1:5187/experts')
    await page.locator('.consultation-banner').waitFor()
    if (width > 960) await indicatorMatchesActiveLink()
    const boundary = await page.evaluate(() => {
      const header = document.querySelector('.landing-header')
      const banner = document.querySelector('.consultation-banner')
      return { gap: banner.getBoundingClientRect().top - header.getBoundingClientRect().bottom, border: getComputedStyle(header).borderBottomWidth, bannerBorder: getComputedStyle(banner).borderTopWidth }
    })
    assert.equal(boundary.border, '0px')
    assert.equal(boundary.bannerBorder, '0px')
    assert.equal(boundary.gap, 0)
    await page.screenshot({ path: fileURLToPath(new URL(`expert-header-${width}.png`, output)), clip: { x: 0, y: 0, width, height: 180 } })
  }
  results.push('Expert banner joins header without a divider or gap on desktop and mobile')
  await page.setViewportSize({ width: 1440, height: 900 })
  await indicatorMatchesActiveLink()
  assert.equal(await nav.getByRole('link', { name: 'Expert', exact: true }).getAttribute('aria-current'), 'page')
  await nav.getByRole('link', { name: 'Home', exact: true }).click()
  await page.waitForURL('http://127.0.0.1:5187/')
  await indicatorMatchesActiveLink()
  await page.goBack()
  await page.waitForURL('**/experts')
  await indicatorMatchesActiveLink()
  assert.equal(await nav.getByRole('link', { name: 'Expert', exact: true }).getAttribute('aria-current'), 'page')
  await header.getByRole('link', { name: 'NutriMom, về trang chủ', exact: true }).focus()
  await page.keyboard.press('Tab')
  assert.equal(await nav.getByRole('link', { name: 'Home', exact: true }).evaluate(element => element === document.activeElement), true)
  await page.keyboard.press('Enter')
  await page.waitForURL('http://127.0.0.1:5187/')
  await indicatorMatchesActiveLink()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedDurations = await nav.locator('.vercel-tabs-indicator').evaluate(element => getComputedStyle(element).transitionDuration)
  assert.ok(reducedDurations.split(',').every(duration => Number.parseFloat(duration) <= 0.0001))
  results.push('Vercel hover follows pointer; underline stays on selected route, follows Back and resize; keyboard links work')
  assert.deepEqual(errors, [])
} catch (error) {
  errors.push(error.stack || error.message)
  throw error
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ results, errors }, null, 2))
  await browser.close()
  await server.close()
}
console.log(JSON.stringify({ checks: results.length, errors }))
