import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

process.env.COMMUNITY_QA_OUTPUT = 'qa-artifacts/community-refinements'
const { browser, server, output, id, fixture, errors, coverage, getLastFixture } = await import('./community-browser-harness.mjs')
const results = []
const picture = (name = 'anh-me-va-be.png') => ({ name, mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
const calls = (f, path, method = 'GET') => f.state.calls.filter((call) => call.path === path && call.method === method)
const nav = (page, name) => page.locator('.nm-admin-community-nav').getByRole('button', { name: new RegExp(name) })
async function ready(f, query = '') { await f.goto(query); await f.page.locator('.nm-community-card:not(.is-skeleton)').first().waitFor() }
async function eventually(predicate, message = 'Condition did not become true') { const until = Date.now() + 5000; while (!await predicate() && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 30)); assert(await predicate(), message) }
async function shot(page, name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' }) }
async function compose(f) { if (!f.page.url().includes('/app/')) await nav(f.page, '^Bài của tôi').click(); const prompt = f.page.locator('.nm-community-prompt__input'); if (f.page.url().includes('/app/') && await prompt.isVisible()) await prompt.click(); else await f.page.getByRole('button', { name: 'Viết bài', exact: true }).first().click(); return f.page.getByRole('dialog').first() }
async function check(name, run) {
  if (process.env.COMMUNITY_QA_FILTER && !name.includes(process.env.COMMUNITY_QA_FILTER)) return
  try { await run(); results.push(name); console.log('PASS', name) }
  catch (error) { const f = getLastFixture(); if (f && !f.page.isClosed()) { await shot(f.page, 'failure'); await writeFile(`${output}/failure.json`, JSON.stringify({ name, calls: f.state.calls, text: await f.page.locator('body').innerText(), errors }, null, 2)) } throw error }
}
try {
  await check('compact admin workspace puts notifications above posts and writing only in My posts', async () => {
    const f = await fixture({ motion: true }); await ready(f)
    assert.equal(await f.page.locator('.nm-admin-community-heading').count(), 0)
    assert.equal(await f.page.getByRole('button', { name: 'Viết bài', exact: true }).count(), 0)
    assert.equal(await f.page.locator('.nm-admin-community .nm-community-side.is-right').count(), 0)
    const notification = f.page.locator('.nm-admin-community-toolbar .nm-community-notify__trigger')
    const post = f.page.locator('.nm-community-card').first()
    assert((await notification.boundingBox()).y < (await post.boundingBox()).y)
    const rule = f.page.locator('.nm-admin-community-nav').getByRole('button', { name: 'Quy tắc cộng đồng' })
    assert.equal(await rule.getAttribute('aria-expanded'), 'false')
    const countBefore = f.state.calls.length; await rule.click(); await f.page.locator('.nm-admin-community-nav .nm-community-rules__list').waitFor()
    assert.equal(await rule.getAttribute('aria-expanded'), 'true'); assert.equal(f.state.calls.length, countBefore)
    await rule.click(); await shot(f.page, 'admin-feed-desktop')
    await nav(f.page, '^Bài của tôi').click(); await f.page.getByRole('button', { name: 'Viết bài', exact: true }).waitFor()
    assert.equal(await f.page.locator('.nm-community-prompt').count(), 1)
    await f.page.locator('.nm-admin-post-entry').first().waitFor(); await shot(f.page, 'admin-my-posts'); await f.context.close()
  })
  await check('admin sidebar has all six named groups and eleven correct destinations', async () => {
    const f = await fixture(); await ready(f)
    const groups = f.page.locator('.admin-nav-group')
    assert.deepEqual(await groups.locator('h2').allTextContents(), ['Vận hành', 'Chuyên gia & người dùng', 'Quản lý tư vấn', 'Hỗ trợ người dùng', 'Báo cáo tổng', 'Lịch sử thông báo'])
    assert.deepEqual(await groups.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))), ['/admin', '/admin/users', '/admin/experts', '/admin/appointments', '/admin/consultations', '/admin/support', '/admin/community', '/admin/knowledge', '/admin/revenue', '/admin/reports', '/admin/notifications'])
    const viewport = f.page.locator('.admin-sidebar-scroll [data-slot="scroll-area-viewport"]')
    await f.page.setViewportSize({ width: 1440, height: 620 }); await viewport.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await eventually(() => viewport.evaluate((el) => el.scrollTop > 0))
    await f.page.locator('.admin-sidebar').getByRole('link', { name: 'Thông báo', exact: true }).click(); await f.page.waitForURL('**/admin/notifications')
    await f.context.close()
  })
  await check('sidebar collapses manually, expands on hover or keyboard, resets after reload without data requests', async () => {
    const f = await fixture({ motion: true }); await ready(f)
    const sidebar = f.page.locator('.admin-sidebar'); assert.equal((await sidebar.boundingBox()).width, 220)
    const countBefore = f.state.calls.length
    await f.page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click(); await f.page.mouse.move(500, 80)
    const animation = await sidebar.evaluate((el) => el.getAnimations().find((entry) => entry instanceof CSSTransition && entry.transitionProperty === 'width')?.effect?.getTiming().duration)
    assert.equal(animation, 280)
    await eventually(async () => (await sidebar.boundingBox()).width === 72)
    assert(Math.abs(await f.page.locator('.admin-main').evaluate((el) => parseFloat(getComputedStyle(el).marginLeft)) - 72) < .1)
    const community = sidebar.getByRole('link', { name: 'Cộng đồng', exact: true })
    await community.hover(); await eventually(async () => (await sidebar.boundingBox()).width === 220)
    assert(Math.abs(await f.page.locator('.admin-main').evaluate((el) => parseFloat(getComputedStyle(el).marginLeft)) - 72) < .1)
    await shot(f.page, 'admin-sidebar-hover'); await f.page.mouse.move(500, 80)
    await eventually(async () => (await sidebar.boundingBox()).width === 72)
    assert.equal(f.state.calls.length, countBefore)
    await community.focus(); await eventually(async () => (await sidebar.boundingBox()).width === 220)
    await f.page.getByRole('button', { name: 'Mở rộng thanh điều hướng' }).click(); assert.equal(await sidebar.evaluate((el) => el.classList.contains('is-collapsed')), false)
    await f.page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click(); await f.page.reload(); await f.page.locator('.nm-community-card').first().waitFor()
    assert.equal((await sidebar.boundingBox()).width, 220); await f.context.close()
  })
  await check('mobile admin sidebar remains a keyboard accessible drawer and closes after selection', async () => {
    const f = await fixture(); await f.page.setViewportSize({ width: 390, height: 844 }); await ready(f)
    await f.page.getByRole('button', { name: 'Mở điều hướng' }).click()
    const drawer = f.page.getByRole('dialog', { name: 'Điều hướng quản trị' }); await drawer.waitFor()
    await f.page.keyboard.press('Tab'); assert(await drawer.evaluate((el) => el.contains(document.activeElement)))
    await f.page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' })
    await f.page.getByRole('button', { name: 'Mở điều hướng' }).click(); await f.page.locator('.admin-sidebar').getByRole('link', { name: 'Cộng đồng', exact: true }).click()
    assert.equal(await f.page.locator('.admin-sidebar').evaluate((el) => el.classList.contains('is-open')), false)
    await f.context.close()
  })
  await check('long admin composer never overlaps header or footer and upload uses real indeterminate progress', async () => {
    const f = await fixture({ uploadDelay: 600, motion: true }); await ready(f)
    const form = await compose(f); await form.locator('textarea').fill('Nội dung dài dành cho cộng đồng.\n'.repeat(100))
    await form.locator('input[type=file]').setInputFiles([picture('anh-1.png'), picture('anh-2.png'), picture('anh-3.png'), picture('anh-4.png')])
    await form.getByRole('progressbar').first().waitFor(); assert.equal(await form.getByRole('progressbar').first().getAttribute('aria-valuenow'), null)
    assert.equal(await form.getByRole('button', { name: 'Đang tải ảnh…', exact: true }).isDisabled(), true)
    // Measure all regions in the same frame while the parent is animating.
    const [header, body, footer] = await form.evaluate((el) => ['.nm-dialog-header', '.nm-dialog-body', '.nm-dialog-footer'].map((selector) => el.querySelector(selector).getBoundingClientRect().toJSON()))
    assert(header.y + header.height <= body.y + 1); assert(body.y + body.height <= footer.y + 1)
    assert(await form.locator('.nm-dialog-body').evaluate((el) => el.scrollHeight > el.clientHeight))
    await eventually(() => form.locator('[data-upload-state="completed"]').count().then((count) => count === 4))
    assert.equal(calls(f, '/community/media', 'POST').length, 4)
    await form.locator('.nm-dialog-body').evaluate((el) => { el.scrollTop = 0 }); await shot(f.page, 'admin-composer-top')
    const label = await form.locator('.nm-community-official').boundingBox(); assert(label.y >= header.y + header.height)
    await form.locator('.nm-dialog-body').evaluate((el) => { el.scrollTop = el.scrollHeight }); await shot(f.page, 'admin-composer-upload')
    await f.context.close()
  })
  await check('shared upload validates formats and four-image limit before sending', async () => {
    const f = await fixture({ member: true }); await ready(f); const form = await compose(f)
    await form.locator('input[type=file]').setInputFiles({ name: 'tai-lieu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not-an-image') })
    await form.getByText(/Chỉ hỗ trợ ảnh JPEG/).waitFor(); assert.equal(calls(f, '/community/media', 'POST').length, 0)
    await form.locator('input[type=file]').setInputFiles([picture('1.png'), picture('2.png'), picture('3.png'), picture('4.png'), picture('5.png')])
    await eventually(() => form.locator('[data-upload-state="completed"]').count().then((count) => count === 4))
    assert.equal(calls(f, '/community/media', 'POST').length, 4); assert.equal(await form.getByRole('button', { name: 'Chọn ảnh', exact: true }).isDisabled(), true)
    await form.getByRole('button', { name: 'Bỏ ảnh 1.png', exact: true }).click(); await eventually(() => form.getByRole('button', { name: 'Chọn ảnh', exact: true }).isEnabled())
    assert.equal(calls(f, '/community/media', 'POST').length, 4); await f.context.close()
  })
  await check('upload 429 stops queued files and waits for manual retry after cooldown', async () => {
    const f = await fixture({ upload429: true }); await ready(f); const form = await compose(f)
    await form.locator('textarea').fill('Bản nháp có ảnh đang chờ tải lại.'); await form.locator('input[type=file]').setInputFiles([picture('mot.png'), picture('hai.png')])
    await eventually(() => form.locator('[data-upload-state="error"]').count().then((count) => count === 2))
    assert.equal(calls(f, '/community/media', 'POST').length, 1)
    const retry = form.locator('.nm-file-upload__tools').first().getByRole('button', { name: /Thử lại|Thử sau/ })
    assert.equal(await retry.isDisabled(), true); f.state.upload429 = false
    await eventually(() => retry.isEnabled()); assert.equal(calls(f, '/community/media', 'POST').length, 1)
    await retry.click(); await form.locator('[data-upload-state="completed"]').first().waitFor()
    assert.equal(calls(f, '/community/media', 'POST').length, 2); assert.equal(await form.locator('textarea').inputValue(), 'Bản nháp có ảnh đang chờ tải lại.')
    await f.context.close()
  })
  await check('discard confirmation is separate, keeps draft on Escape, and removes it only on explicit discard', async () => {
    const f = await fixture({ motion: true }); await ready(f); const form = await compose(f)
    await form.locator('textarea').fill('Nội dung cần được giữ lại khi tiếp tục viết.'); await form.getByRole('button', { name: 'Huỷ', exact: true }).click()
    const confirmation = f.page.getByRole('dialog', { name: 'Bỏ bản nháp này?' }); await confirmation.waitFor(); await shot(f.page, 'discard-confirmation')
    await f.page.keyboard.press('Escape'); await confirmation.waitFor({ state: 'hidden' }); assert.equal(await form.locator('textarea').inputValue(), 'Nội dung cần được giữ lại khi tiếp tục viết.')
    await form.getByRole('button', { name: 'Huỷ', exact: true }).click(); await confirmation.getByRole('button', { name: 'Tiếp tục viết', exact: true }).click(); await confirmation.waitFor({ state: 'hidden' })
    await form.getByRole('button', { name: 'Huỷ', exact: true }).click(); await confirmation.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click(); await form.waitFor({ state: 'hidden' })
    assert.equal(calls(f, '/admin/community/posts', 'POST').length, 0); await f.context.close()
  })
  await check('user feed removes duplicate writing button and rules use four green checks', async () => {
    const f = await fixture({ member: true }); await ready(f)
    for (const width of [1600, 1100, 1024, 390]) {
      await f.page.setViewportSize({ width, height: 900 })
      assert.equal(await f.page.getByRole('button', { name: 'Viết bài', exact: true }).count(), 0)
      const entry = f.page.locator('.nm-community-prompt'); await entry.waitFor()
      const b = await entry.boundingBox(), card = await f.page.locator('.nm-community-feed .nm-community-card').first().boundingBox()
      assert(Math.abs(b.x + b.width / 2 - card.x - card.width / 2) <= 2, `Composer not aligned at ${width}`)
      assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `User overflow at ${width}`)
    }
    await f.page.setViewportSize({ width: 1600, height: 900 }); await f.page.locator('.nm-community-side .nm-community-rules__list').waitFor(); assert.equal(await f.page.locator('.nm-community-rules__list li').count(), 4)
    assert.equal(await f.page.locator('.nm-community-rules__list li svg').first().evaluate((el) => getComputedStyle(el).color), 'rgb(40, 124, 104)')
    await shot(f.page, 'user-feed-desktop'); await f.context.close()
  })
  await check('user sidebar uses REUI ScrollArea, scrolls independently and keeps the last filter reachable', async () => {
    const f = await fixture({ member: true }); await f.page.setViewportSize({ width: 1440, height: 620 }); await ready(f)
    const viewport = f.page.locator('.nm-community-sidebar-scroll [data-slot="scroll-area-viewport"]'); await viewport.waitFor()
    assert(await viewport.evaluate((el) => el.scrollHeight > el.clientHeight))
    await viewport.evaluate((el) => { el.scrollTop = el.scrollHeight }); await eventually(() => viewport.evaluate((el) => el.scrollTop > 0))
    const images = f.page.locator('.nm-community-menu__toggle input'); await images.click(); await eventually(() => images.isChecked()); await eventually(() => f.state.calls.some((call) => call.path === '/community/posts' && call.query.includes('hasImages=true')))
    await f.context.close()
  })
  await check('like produces a rising fading heart once, while rapid clicks produce one request', async () => {
    for (const member of [false, true]) {
      const f = await fixture({ member, motion: true, reactionDelay: 500 }); await ready(f)
      const post = f.page.locator(`#community-post-${id(2)}`), like = post.getByRole('button', { name: /lượt thích/ })
      assert.equal(await post.locator('.nm-community-heart-burst').count(), 0)
      await like.dblclick({ delay: 30 }); await post.locator('.nm-community-heart-burst').waitFor()
      assert.equal(calls(f, `/community/posts/${id(2)}/like`, 'PUT').length, 1)
      await eventually(() => post.locator('.nm-community-heart-burst').count().then((count) => count === 0)); assert.equal(await like.getAttribute('aria-pressed'), 'true')
      await like.click(); await eventually(() => calls(f, `/community/posts/${id(2)}/like`, 'DELETE').length === 1); assert.equal(await post.locator('.nm-community-heart-burst').count(), 0)
      await f.context.close()
    }
  })
  await check('reaction 429 rolls back like and blocks additional like/save requests in the cooldown', async () => {
    const f = await fixture({ reaction429: true }); await ready(f)
    const post = f.page.locator(`#community-post-${id(2)}`), like = post.getByRole('button', { name: /lượt thích/ })
    await like.click(); await f.page.getByRole('alert').filter({ hasText: /thử lại sau/ }).waitFor(); assert.equal(await like.getAttribute('aria-pressed'), 'false')
    await like.click(); await post.getByRole('button', { name: 'Lưu', exact: true }).click()
    assert.equal(calls(f, `/community/posts/${id(2)}/like`, 'PUT').length, 1); assert.equal(calls(f, `/community/posts/${id(2)}/save`, 'PUT').length, 0)
    await f.context.close()
  })
  await check('responsive admin toolbar keeps notifications on top, compact mobile rules and no horizontal overflow', async () => {
    const f = await fixture({ theme: 'dark' }); await ready(f)
    for (const width of [1600, 1440, 1024, 768, 390, 320]) {
      await f.page.setViewportSize({ width, height: 844 })
      assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin overflow at ${width}`)
      const notify = await f.page.locator('.nm-admin-community-toolbar .nm-community-notify__trigger').boundingBox(), post = await f.page.locator('.nm-community-card').first().boundingBox(); assert(notify.y < post.y)
      if (width === 1440 || width === 390) await shot(f.page, `admin-dark-${width}`)
    }
    const rules = f.page.locator('.nm-admin-community-mobile-rules').getByRole('button', { name: 'Quy tắc cộng đồng' }); await rules.click(); await f.page.locator('.nm-admin-community-mobile-rules .nm-community-rules__list').waitFor()
    await f.context.close()
  })
  await check('shared composer fits short mobile viewports with accessible discard controls and reduced motion', async () => {
    const f = await fixture({ member: true, theme: 'dark' }); await f.page.setViewportSize({ width: 320, height: 568 }); await ready(f); const form = await compose(f)
    await form.locator('textarea').fill('Nội dung chưa đăng ở màn hình nhỏ.'); const box = await form.boundingBox(); assert(box.x >= 0 && box.x + box.width <= 321 && box.y >= 0 && box.y + box.height <= 569)
    await form.locator('input[type=file]').setInputFiles(picture()); await form.getByText('Xong', { exact: true }).waitFor(); await form.locator('.nm-dialog-body').evaluate((el) => { el.scrollTop = el.scrollHeight }); await shot(f.page, 'user-mobile-upload')
    await form.getByRole('button', { name: 'Huỷ', exact: true }).click(); const confirm = f.page.getByRole('dialog', { name: 'Bỏ bản nháp này?' }); await confirm.waitFor()
    for (const label of ['Tiếp tục viết', 'Bỏ thay đổi']) { const button = await confirm.getByRole('button', { name: label, exact: true }).boundingBox(); assert(button.x >= 0 && button.x + button.width <= 321) }
    await f.context.close()
  })
  assert.deepEqual(errors, [])
  await writeFile(`${output}/results${process.env.COMMUNITY_QA_RESULT_SUFFIX || ''}.json`, JSON.stringify({ results, errors, coverage: [...coverage].sort() }, null, 2))
  console.log(`PASS ${results.length} refinement browser scenarios`)
} finally { await browser.close(); await server.close() }
