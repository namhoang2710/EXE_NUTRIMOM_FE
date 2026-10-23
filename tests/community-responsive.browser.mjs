import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

process.env.COMMUNITY_QA_OUTPUT = 'qa-artifacts/community-responsive'
const { browser, server, fixture, id, output, errors, getLastFixture } = await import('./community-browser-harness.mjs')
const results = []
const sizes = [[320, 568], [360, 800], [390, 844], [430, 932], [600, 800], [768, 1024], [820, 1180], [1024, 768], [1099, 800], [1100, 800], [1280, 800], [1440, 900], [1920, 1080], [844, 390]]
async function ready(f, query = '') { await f.goto(query); await f.page.locator('.nm-community-card:not(.is-skeleton)').first().waitFor() }
async function fits(locator, label) {
  const audit = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, right: r.right, width: innerWidth, scroll: el.scrollWidth, client: el.clientWidth }
  })
  assert(audit.x >= -1 && audit.right <= audit.width + 1 && audit.scroll <= audit.client + 1, `${label}: ${JSON.stringify(audit)}`)
  const body = locator.locator(':scope > .nm-dialog-body')
  if (await body.count()) await fits(body, `${label} body`)
}
async function noOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflows at ${JSON.stringify(page.viewportSize())}`)
  for (const element of await page.locator('.nm-community-card:visible, .nm-community-prompt:visible, .nm-community-filters:visible, .nm-admin-community-toolbar:visible').all()) await fits(element, 'Community block')
}
async function chooseAdmin(page, label) {
  const mobile = page.locator('.nm-admin-community-mobile-nav')
  if (await mobile.isVisible()) { await mobile.getByRole('combobox').click(); await page.getByRole('option', { name: new RegExp(`^${label}`) }).click() }
  else await page.locator('.nm-admin-community-nav').getByRole('button', { name: new RegExp(`^${label}`) }).click()
}
async function check(label, run) {
  if (process.env.COMMUNITY_QA_FILTER && !label.includes(process.env.COMMUNITY_QA_FILTER)) return
  try { await run(); results.push(label); console.log('PASS', label) }
  catch (error) { const f = getLastFixture(); if (f && !f.page.isClosed()) { await f.page.screenshot({ path: `${output}/failure.png`, fullPage: true }); await writeFile(`${output}/failure.txt`, await f.page.locator('body').innerText()) } throw error }
}
const picture = { name: 'anh-kiem-tra.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') }
try {
  await check('user resizing keeps one composer, no standalone writing CTA and no overflow', async () => {
    const f = await fixture({ member: true }); await ready(f)
    for (const [width, height] of sizes) {
      await f.page.setViewportSize({ width, height })
      await f.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await f.page.locator('.nm-community-prompt').waitFor()
      assert.equal(await f.page.getByRole('button', { name: 'Viết bài', exact: true }).count(), 0)
      assert.equal(await f.page.locator('.nm-community-prompt').count(), 1)
      await noOverflow(f.page)
      if (width === 390 || width === 768 || width === 1100) await f.page.screenshot({ path: `${output}/user-${width}.png`, fullPage: true })
      if ([320, 768, 1099].includes(width)) {
        const filters = f.page.locator('.nm-community-filters'); await filters.waitFor()
        const before = await filters.evaluate((el) => el.getBoundingClientRect().top + scrollY)
        await f.page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
        const after = await filters.evaluate((el) => ({ top: el.getBoundingClientRect().top, documentTop: el.getBoundingClientRect().top + scrollY, position: getComputedStyle(el).position }))
        assert.equal(after.position, 'static')
        assert(Math.abs(after.documentTop - before) <= 1 && after.top < 0, `Filters should scroll with the page at ${width}px`)
      }
    }
    await f.context.close()
  })
  await check('user filters, saved and own posts work on phone and tablet', async () => {
    for (const width of [320, 768, 1099]) {
      const f = await fixture({ member: true }); await f.page.setViewportSize({ width, height: 844 }); await ready(f)
      await f.page.getByRole('combobox', { name: /Chủ đề/ }).click()
      await fits(f.page.locator('.nm-community-select__popup'), 'Topic popup')
      await f.page.getByRole('option', { name: 'Mang thai', exact: true }).click()
      await f.page.waitForURL(/topic=PREGNANCY/)
      await f.page.getByRole('checkbox', { name: 'Có ảnh' }).click()
      await f.page.waitForURL(/images=1/)
      await f.page.locator('.nm-community-mobile-filters input:checked').waitFor()
      await f.page.getByRole('tab', { name: 'Đã lưu', exact: true }).click()
      await f.page.waitForURL(/tab=saved/)
      await f.page.locator('.nm-community-prompt').waitFor({ state: 'hidden' })
      assert.equal(await f.page.locator('.nm-community-prompt').count(), 0)
      f.state.posts = f.state.posts.filter((post) => post.official)
      await f.page.getByRole('tab', { name: 'Bài của tôi', exact: true }).click()
      await f.page.getByText('Bạn chưa có bài viết nào', { exact: true }).waitFor()
      assert.equal(await f.page.getByRole('button', { name: 'Viết bài', exact: true }).count(), 0)
      await f.page.locator('.nm-community-prompt__input').click()
      const form = f.page.getByRole('dialog').first(); await fits(form, 'User composer')
      await form.locator('textarea').fill(`Chia sẻ từ màn hình ${width}px.`)
      await form.getByRole('button', { name: 'Đăng bài', exact: true }).click()
      await form.waitFor({ state: 'hidden' })
      await f.page.getByText(`Chia sẻ từ màn hình ${width}px.`, { exact: true }).waitFor()
      await noOverflow(f.page)
      await f.context.close()
    }
  })
  await check('user notifications, comments, saved state, image and reporting fit narrow screens', async () => {
    for (const width of [320, 768, 1024]) {
      const f = await fixture({ member: true }); await f.page.setViewportSize({ width, height: 844 }); await ready(f)
      await f.page.locator('.nm-community-notify__trigger').click()
      const notification = f.page.locator('.nm-community-notify__panel'); await notification.waitFor(); await fits(notification, 'User notifications')
      await f.page.keyboard.press('Escape'); await notification.waitFor({ state: 'hidden' })
      const post = f.page.locator(`#community-post-${id(2)}`)
      await post.getByRole('button', { name: /bình luận/ }).click()
      await post.getByLabel('Viết bình luận', { exact: true }).fill('Bình luận trên màn hình nhỏ')
      await fits(post.locator('.nm-community-comment-form'), 'Comment form')
      await post.getByRole('button', { name: 'Gửi bình luận' }).click()
      await post.getByText('Bình luận trên màn hình nhỏ', { exact: true }).waitFor()
      await post.getByRole('button', { name: 'Lưu', exact: true }).click()
      await post.getByRole('button', { name: 'Đã lưu', exact: true }).waitFor(); await noOverflow(f.page)
      await post.locator('.nm-community-image').click(); await fits(f.page.getByRole('dialog'), 'Image viewer'); await f.page.keyboard.press('Escape')
      await post.getByRole('button', { name: 'Báo cáo bài viết' }).click(); await fits(f.page.getByRole('dialog'), 'Report dialog'); await f.page.keyboard.press('Escape')
      await f.context.close()
    }
  })
  await check('admin all seven tabs resize without overflowing in both themes', async () => {
    for (const theme of ['light', 'dark']) {
      const f = await fixture({ theme }); await ready(f)
      for (const [width, height] of sizes) {
        await f.page.setViewportSize({ width, height }); await noOverflow(f.page)
        await f.page.locator('.nm-admin-community-toolbar .nm-community-notify__trigger').click()
        await fits(f.page.locator('.nm-community-notify__panel'), 'Admin notifications')
        await f.page.keyboard.press('Escape')
      }
      for (const width of [320, 768, 1024, 1440]) {
        await f.page.setViewportSize({ width, height: 844 })
        for (const label of ['Chờ duyệt', 'Tất cả bài viết', 'Đã ghim', 'Bài của tôi', 'Đã lưu', 'Báo cáo', 'Bảng tin cộng đồng']) {
          await chooseAdmin(f.page, label)
          await f.page.locator('.nm-admin-community-toolbar h1').filter({ hasText: label }).waitFor()
          await f.page.locator('.nm-admin-community .nm-community-feed[aria-busy="true"]').waitFor({ state: 'hidden' })
          await noOverflow(f.page)
          assert.equal(await f.page.getByRole('button', { name: 'Viết bài', exact: true }).count(), label === 'Bài của tôi' ? 1 : 0)
        }
        if (width === 320 || width === 768) await f.page.screenshot({ path: `${output}/admin-${theme}-${width}.png`, fullPage: true })
      }
      await f.context.close()
    }
  })
  await check('admin mobile moderation, detail and reports remain usable', async () => {
    for (const width of [320, 768]) {
      const f = await fixture(); await f.page.setViewportSize({ width, height: 740 }); await ready(f, '?tab=pending')
      const post = f.page.locator('.nm-admin-post-entry').first(); await post.getByRole('button', { name: 'Chi tiết', exact: true }).click()
      await fits(f.page.getByRole('dialog').first(), 'Admin detail')
      await f.page.keyboard.press('Escape')
      await post.getByRole('button', { name: 'Từ chối', exact: true }).click()
      const reject = f.page.getByRole('dialog').last(); await fits(reject, 'Admin moderation')
      await reject.locator('textarea').fill('Nội dung cần bổ sung thông tin.')
      await reject.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await reject.waitFor({ state: 'hidden' })
      await chooseAdmin(f.page, 'Báo cáo'); await f.page.locator('.nm-admin-report').waitFor(); await noOverflow(f.page)
      await f.page.getByRole('button', { name: 'Bỏ qua báo cáo', exact: true }).click()
      const report = f.page.getByRole('dialog').last(); await fits(report, 'Resolve report'); await report.getByRole('button', { name: 'Xác nhận', exact: true }).click()
      await report.waitFor({ state: 'hidden' }); await f.context.close()
    }
  })
  await check('both composers keep draft and upload inside short mobile and landscape viewports', async () => {
    for (const member of [true, false]) {
      const f = await fixture({ member, theme: 'dark' }); await f.page.setViewportSize({ width: 320, height: 568 }); await ready(f, member ? '' : '?tab=mine')
      await f.page.locator('.nm-community-prompt__input').click()
      const form = f.page.getByRole('dialog').first(); await form.locator('textarea').fill('Bản nháp khi xoay và đổi kích thước màn hình.\n'.repeat(20))
      await form.locator('input[type=file]').setInputFiles(picture); await form.getByText('Xong', { exact: true }).waitFor()
      for (const [width, height] of [[320, 568], [390, 360], [568, 320], [844, 390], [768, 1024], [1440, 900]]) {
        await f.page.setViewportSize({ width, height }); await fits(form, 'Composer resize')
        const b = await form.boundingBox(); assert(b.y >= -1 && b.y + b.height <= height + 1, 'Composer outside viewport vertically')
        assert.match(await form.locator('textarea').inputValue(), /Bản nháp khi xoay/)
        await fits(form.locator('.nm-dialog-footer'), 'Composer footer')
      }
      await f.page.setViewportSize({ width: 320, height: 568 }); await form.getByRole('button', { name: 'Huỷ', exact: true }).click()
      const discard = f.page.getByRole('dialog', { name: 'Bỏ bản nháp này?' }); await fits(discard, 'Discard dialog')
      await discard.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click(); await f.context.close()
    }
  })
  await check('long author names, unbroken content and one to four images fit every layout', async () => {
    for (const member of [true, false]) {
      const f = await fixture({ member })
      const post = f.state.posts.find((post) => post.id === id(2))
      post.author.display_name = 'NguyễnThànhViênCóTênRấtDài'.repeat(12)
      post.content = 'ĐoạnVănKhôngCóDấuCách'.repeat(80)
      for (const count of [1, 2, 3, 4]) {
        post.images = Array.from({ length: count }, (_, index) => ({ id: id(80 + index), url: '/hero-showcase/blog.jpg', width: 1200, height: 800 }))
        await ready(f)
        for (const width of [320, 390, 768, 1024, 1100, 1440]) {
          await f.page.setViewportSize({ width, height: 844 })
          const imageCard = f.page.getByRole('article', { name: `Bài viết của ${post.author.display_name}`, exact: true })
          await imageCard.waitFor(); await fits(imageCard, 'Long image post'); await noOverflow(f.page)
          assert.equal(await imageCard.locator('.nm-community-image').count(), count)
        }
      }
      await f.context.close()
    }
  })
  assert.deepEqual(errors, [])
} finally {
  await writeFile(`${output}/results${process.env.COMMUNITY_QA_RESULT_SUFFIX || ''}.json`, JSON.stringify({ results, sizes, errors }, null, 2))
  await browser.close(); await server.close()
}
