import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { browser, server, output, id, seeds, comment, results, errors, coverage, fixture, getLastFixture } from './community-browser-harness.mjs'
const count = (f, path, method = 'GET') => f.state.calls.filter((call) => call.path === path && call.method === method).length
const nav = (page, name) => page.locator('.nm-admin-community-nav').getByRole('button', { name: new RegExp(name) })
async function openComposer(page) { if (page.url().includes('/admin/') && !new URL(page.url()).searchParams.get('tab')?.includes('mine')) await nav(page, '^Bài của tôi').click(); const prompt = page.locator('.nm-community-prompt__input'); if (page.url().includes('/app/') && await prompt.isVisible()) await prompt.click(); else await page.getByRole('button', { name: 'Viết bài', exact: true }).first().click() }
let started = !process.env.COMMUNITY_QA_FROM
async function check(name, run) {
  if (!started && name.includes(process.env.COMMUNITY_QA_FROM)) started = true
  if (!started || process.env.COMMUNITY_QA_FILTER && !name.includes(process.env.COMMUNITY_QA_FILTER)) return
  try { await run(); results.push(name); console.log('PASS', name) }
  catch (error) {
    const lastFixture = getLastFixture();
    if (lastFixture && !lastFixture.page.isClosed()) {
      await shot(lastFixture.page, 'failure')
      await writeFile(`${output}/failure.json`, JSON.stringify({ name, calls: lastFixture.state.calls, errors, text: await lastFixture.page.locator('body').innerText() }, null, 2))
    }
    throw error
  }
}
async function shot(page, name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' }) }
const waitPosts = (page) => page.locator('.nm-admin-post-entry').first().waitFor()
async function eventually(predicate) { const end = Date.now() + 5000; while (!predicate() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 40)); assert(predicate()) }
async function confirm(page, note = '') { const dialog = page.getByRole('dialog').last(); if (note) await dialog.locator('textarea').fill(note); await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }) }
try {
  await check('full community feed in admin, scoped initial requests and desktop layout', async () => {
    const f = await fixture({ motion: true }); await f.goto(); await waitPosts(f.page)
    assert.equal(count(f, '/community/posts'), 1)
    assert.equal(count(f, '/admin/community/posts'), 0)
    assert.equal(count(f, '/admin/community/reports'), 0)
    assert.equal(count(f, '/community/notifications'), 0)
    assert.equal(await f.page.locator('.nm-admin-post-entry .nm-community-official').count(), 1)
    await shot(f.page, 'admin-desktop'); await f.context.close()
  })
  await check('all management tabs call only the selected API and pin/status filters', async () => {
    const f = await fixture(); await f.goto('?tab=pending'); await waitPosts(f.page)
    assert.equal(count(f, '/community/posts'), 0); assert.equal(count(f, '/admin/community/reports'), 0)
    await nav(f.page, '^Đã ghim').click(); await waitPosts(f.page)
    await eventually(() => f.state.calls.some((call) => call.path === '/admin/community/posts' && call.query.includes('pinned=true')))
    await nav(f.page, '^Tất cả bài').click(); await waitPosts(f.page)
    await f.page.getByRole('combobox', { name: /Trạng thái bài/ }).click(); await f.page.getByRole('option', { name: 'Bị từ chối', exact: true }).click()
    await f.page.getByText('Nội dung có quảng cáo sản phẩm.', { exact: false }).first().waitFor()
    await nav(f.page, '^Bài của tôi').click(); await waitPosts(f.page)
    await eventually(() => count(f, '/community/me/posts') === 1)
    await nav(f.page, '^Báo cáo').click(); await f.page.locator('.nm-admin-report').waitFor()
    assert.equal(count(f, '/admin/community/reports'), 1)
    await shot(f.page, 'admin-reports'); await f.context.close()
  })
  await check('admin creates an official post with a sequential image upload and pin', async () => {
    const f = await fixture(); await f.goto(); await waitPosts(f.page)
    await openComposer(f.page)
    const dialog = f.page.getByRole('dialog'); await dialog.locator('textarea').fill('Thông báo lịch tư vấn dinh dưỡng dành cho các mẹ.')
    await dialog.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
    await dialog.getByText('Xong', { exact: true }).waitFor()
    await dialog.getByRole('checkbox', { name: /Ghim bài này/ }).check()
    await dialog.getByRole('button', { name: 'Đăng ngay', exact: true }).click()
    await f.page.getByText('Bài viết của Ban quản trị đã được xuất bản.', { exact: true }).first().waitFor()
    assert.equal(count(f, '/community/media', 'POST'), 1); assert.equal(count(f, '/admin/community/posts', 'POST'), 1)
    const body = f.state.calls.find((call) => call.path === '/admin/community/posts' && call.method === 'POST').body
    assert.equal(body.pinned, true); assert.deepEqual(body.image_ids, [id(50)])
    await f.context.close()
  })
  await check('pin limit preserves composer and publishing without pin succeeds', async () => {
    const f = await fixture({ createPinFail: true }); await f.goto(); await waitPosts(f.page)
    await openComposer(f.page)
    const dialog = f.page.getByRole('dialog'); await dialog.locator('textarea').fill('Nội dung được giữ lại khi hết chỗ ghim.')
    await dialog.getByRole('checkbox', { name: /Ghim bài này/ }).check(); await dialog.getByRole('button', { name: 'Đăng ngay' }).click()
    await dialog.getByRole('alert').waitFor(); assert.equal(await dialog.locator('textarea').inputValue(), 'Nội dung được giữ lại khi hết chỗ ghim.')
    await dialog.getByRole('checkbox', { name: /Ghim bài này/ }).uncheck(); await dialog.getByRole('button', { name: 'Đăng ngay' }).click()
    await f.page.getByText('Bài viết của Ban quản trị đã được xuất bản.', { exact: true }).first().waitFor()
    assert.equal(count(f, '/admin/community/posts', 'POST'), 2); await f.context.close()
  })
  await check('approve and pin reports partial success and never repeats approval', async () => {
    const f = await fixture({ pinFail: true }); await f.goto('?tab=pending'); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Duyệt & ghim', exact: true }).click()
    await f.page.getByText(/Đã duyệt bài, chưa ghim được/).waitFor()
    assert.equal(count(f, `/admin/community/posts/${id(3)}/approve`, 'POST'), 1)
    assert.equal(count(f, `/admin/community/posts/${id(3)}/pin`, 'PUT'), 1)
    assert.equal(f.state.posts.find((post) => post.id === id(3)).status, 'APPROVED')
    await f.context.close()
  })
  await check('reject validates reason and calls the moderation endpoint', async () => {
    const f = await fixture(); await f.goto('?tab=pending'); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Từ chối', exact: true }).click()
    await f.page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await f.page.getByRole('dialog').getByRole('alert').waitFor()
    assert.equal(count(f, `/admin/community/posts/${id(3)}/reject`, 'POST'), 0)
    await confirm(f.page, 'Thông tin cần nguồn tham khảo đáng tin cậy.')
    assert.equal(count(f, `/admin/community/posts/${id(3)}/reject`, 'POST'), 1); await f.context.close()
  })
  await check('detail, editing own approved post and own deletion', async () => {
    const f = await fixture(); await f.goto('?tab=mine'); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Chi tiết', exact: true }).first().click()
    const detail = f.page.getByRole('dialog', { name: 'Chi tiết bài viết' }); await detail.getByRole('button', { name: 'Sửa bài của tôi' }).waitFor()
    assert.equal(count(f, `/admin/community/posts/${id(1)}`), 1)
    await detail.getByRole('button', { name: 'Sửa bài của tôi' }).click()
    const editor = f.page.getByRole('dialog', { name: 'Sửa bài viết' }); await editor.locator('textarea').fill('Thông báo đã cập nhật từ Ban quản trị.')
    await editor.getByRole('button', { name: 'Lưu thay đổi' }).click(); await f.page.getByText('Đã lưu thay đổi bài viết.', { exact: true }).first().waitFor()
    assert.equal(count(f, `/community/posts/${id(1)}`, 'PATCH'), 1); assert.equal(f.state.posts[0].status, 'APPROVED')
    await f.page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click()
    await f.page.getByRole('button', { name: 'Xóa bài của tôi', exact: true }).first().click(); await confirm(f.page)
    assert.equal(count(f, `/community/posts/${id(1)}`, 'DELETE'), 1); await f.context.close()
  })
  await check('pin, unpin and administrative removal use distinct operations', async () => {
    const f = await fixture(); await f.goto('?tab=pinned'); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Bỏ ghim', exact: true }).click(); await f.page.getByText('Chưa có bài nào được ghim').waitFor()
    assert.equal(count(f, `/admin/community/posts/${id(1)}/pin`, 'DELETE'), 1)
    await nav(f.page, '^Tất cả bài').click(); await waitPosts(f.page)
    await f.page.locator('.nm-admin-post-entry').first().getByRole('button', { name: 'Ghim', exact: true }).click()
    await f.page.getByText('Đã cập nhật bài viết.', { exact: true }).waitFor()
    await f.page.locator('.nm-admin-post-entry').first().getByRole('button', { name: 'Gỡ bài', exact: true }).click(); await confirm(f.page, 'Nội dung không còn phù hợp.')
    assert.equal(count(f, `/admin/community/posts/${id(1)}`, 'DELETE'), 1); await f.context.close()
  })
  await check('moderator comments load once in StrictMode and allow deleting another author comment', async () => {
    const f = await fixture(); await f.goto(); await waitPosts(f.page)
    const card = f.page.locator('.nm-admin-post-entry').nth(1)
    await card.getByRole('button', { name: /bình luận/ }).click(); await card.getByText(comment.content, { exact: true }).waitFor()
    assert.equal(count(f, `/community/posts/${id(2)}/comments`), 1)
    await card.getByRole('button', { name: 'Xoá bình luận' }).click(); await card.getByText(comment.content, { exact: true }).waitFor({ state: 'hidden' })
    assert.equal(count(f, `/admin/community/comments/${id(31)}`, 'DELETE'), 1)
    await card.locator('textarea').fill('Cảm ơn mẹ đã chia sẻ.'); await card.getByRole('button', { name: 'Gửi bình luận' }).dblclick()
    await card.getByText('Cảm ơn mẹ đã chia sẻ.', { exact: true }).waitFor(); assert.equal(count(f, `/community/posts/${id(2)}/comments`, 'POST'), 1)
    await f.context.close()
  })
  await check('likes, saves and personal community notifications are interactive', async () => {
    const f = await fixture(); await f.goto(); await waitPosts(f.page)
    const card = f.page.locator('.nm-admin-post-entry').nth(1)
    await card.getByRole('button', { name: /lượt thích/ }).click(); await card.getByRole('button', { name: 'Lưu', exact: true }).click()
    await nav(f.page, '^Đã lưu').click(); await waitPosts(f.page)
    await eventually(() => f.state.calls.some((call) => call.path === '/community/posts' && call.query.includes('saved=true')))
    const notify = f.page.locator('.nm-community-notify'); await notify.getByRole('button', { name: /Thông báo/ }).click()
    await notify.getByText('Minh Anh đã thả tim bài viết của bạn.', { exact: true }).waitFor()
    assert.equal(count(f, '/community/notifications'), 1)
    await notify.getByRole('button', { name: /Minh Anh đã thả tim/ }).click(); await f.page.getByRole('dialog', { name: 'Chi tiết bài viết' }).waitFor()
    await eventually(() => count(f, `/community/notifications/${id(60)}/read`, 'POST') === 1)
    await f.page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click()
    await notify.getByRole('button', { name: /Thông báo/ }).click(); await notify.getByRole('button', { name: 'Đã đọc tất cả' }).waitFor()
    await notify.getByRole('button', { name: 'Đã đọc tất cả' }).click()
    await eventually(() => count(f, '/community/notifications/read-all', 'POST') === 1)
    await f.context.close()
  })
  await check('report dismissal and removal update report statuses', async () => {
    for (const remove of [false, true]) {
      const f = await fixture(); await f.goto('?tab=reports'); await f.page.locator('.nm-admin-report').waitFor()
      await f.page.getByRole('button', { name: remove ? 'Gỡ bài & đóng báo cáo' : 'Bỏ qua báo cáo', exact: true }).click(); await confirm(f.page, 'Đã kiểm tra nội dung.')
      const call = f.state.calls.find((item) => item.path.endsWith('/resolve'))
      assert.equal(call.body.action, remove ? 'REMOVE_POST' : 'DISMISS')
      await f.context.close()
    }
  })
  await check('429 stops requests across admin filter changes until Retry-After', async () => {
    const f = await fixture({ list429: true }); await f.goto('?tab=pending'); await f.page.getByRole('button', { name: /Thử lại sau/ }).waitFor()
    await nav(f.page, '^Tất cả bài').click(); await f.page.waitForTimeout(400)
    assert.equal(count(f, '/admin/community/posts'), 1)
    f.state.list429 = false
    await f.page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); await f.page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await waitPosts(f.page)
    assert.equal(count(f, '/admin/community/posts'), 2); await f.context.close()
  })
  await check('cursor pages deduplicate posts and repeated clicks request each cursor once', async () => {
    const f = await fixture({ cursor: true }); await f.goto(); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Tải thêm bài viết' }).dblclick(); await f.page.getByText('Bài ở trang tiếp theo', { exact: true }).waitFor()
    assert.equal(count(f, '/community/posts'), 2); assert.equal(await f.page.locator('.nm-admin-post-entry').count(), 3)
    await f.context.close()
  })
  await check('select opens smoothly, supports keyboard and Escape without closing composer', async () => {
    const f = await fixture({ motion: true }); await f.goto(); await waitPosts(f.page)
    await openComposer(f.page)
    const trigger = f.page.getByRole('dialog').getByRole('combobox', { name: /Chủ đề/ }); await trigger.click()
    const popup = f.page.locator('.nm-community-select__popup'); await popup.waitFor()
    assert.notEqual(await popup.evaluate((el) => getComputedStyle(el).transitionDuration), '0s')
    await f.page.keyboard.press('Escape'); assert.equal(await f.page.getByRole('dialog').count(), 1)
    await trigger.click(); await f.page.getByRole('option', { name: 'Dinh dưỡng', exact: true }).click()
    assert.match(await trigger.innerText(), /Dinh dưỡng/)
    await f.page.getByRole('dialog').getByRole('button', { name: 'Huỷ', exact: true }).click(); await f.page.getByRole('button', { name: 'Bỏ thay đổi' }).click()
    await f.context.close()
  })
  await check('responsive and dark admin layouts have no horizontal overflow', async () => {
    const f = await fixture({ theme: 'dark' }); await f.goto(); await waitPosts(f.page)
    for (const [width, height] of [[1440, 1000], [1024, 1000], [390, 844]]) {
      await f.page.setViewportSize({ width, height }); await f.page.waitForTimeout(100)
      assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`)
      if (width === 1440) await writeFile(`${output}/sidebar-style.json`, JSON.stringify(await f.page.locator('.admin-sidebar').evaluate((el) => [...el.querySelectorAll('.admin-brand,.admin-brand img,.admin-nav,.admin-nav-link,.admin-nav-link span')].map((node) => { const s = getComputedStyle(node); return { text: node.textContent?.slice(0, 25), tag: node.tagName, class: node.className, opacity: s.opacity, visibility: s.visibility, animation: s.animation, color: s.color, contentVisibility: s.contentVisibility } })), null, 2))
      await shot(f.page, `admin-dark-${width}`)
    }
    await f.context.close()
  })
  await check('existing user community preserves feed and gets the same animated composer select', async () => {
    const f = await fixture({ member: true }); await f.goto(); await f.page.locator('.nm-community-card').first().waitFor()
    assert.equal(count(f, '/admin/community/posts'), 0)
    await openComposer(f.page)
    await f.page.getByRole('dialog').getByRole('combobox', { name: /Chủ đề/ }).click(); await f.page.getByRole('option', { name: 'Tâm sự', exact: true }).click()
    await shot(f.page, 'user-composer')
    await f.page.getByRole('dialog').locator('textarea').fill('Chia sẻ từ thành viên, vẫn qua kiểm duyệt như trước.')
    await f.page.getByRole('dialog').getByRole('button', { name: 'Đăng bài', exact: true }).click()
    await f.page.locator('.nm-community-notice').filter({ hasText: 'Bài viết đã được gửi và đang chờ quản trị viên duyệt.' }).waitFor()
    assert.equal(count(f, '/community/posts', 'POST'), 1); assert.equal(count(f, '/admin/community/posts', 'POST'), 0)
    await f.context.close()
  })
  await check('version conflict and validation errors preserve input and never retry writes automatically', async () => {
    const f = await fixture({ versionConflict: true }); await f.goto('?tab=mine'); await waitPosts(f.page)
    await f.page.getByRole('button', { name: 'Sửa bài của tôi', exact: true }).first().click()
    const dialog = f.page.getByRole('dialog', { name: 'Sửa bài viết' }); await dialog.locator('textarea').fill('Nội dung chưa bị mất khi xung đột phiên bản.')
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click(); await dialog.getByRole('alert').waitFor()
    assert.equal(await dialog.locator('textarea').inputValue(), 'Nội dung chưa bị mất khi xung đột phiên bản.')
    await f.page.waitForTimeout(400); assert.equal(count(f, `/community/posts/${id(1)}`, 'PATCH'), 1)
    await f.context.close()
    const g = await fixture({ createStatus: 422 }); await g.goto(); await waitPosts(g.page)
    await openComposer(g.page); const form = g.page.getByRole('dialog')
    await form.locator('textarea').fill('Bản viết được giữ lại khi lỗi xác thực dữ liệu.'); await form.getByRole('button', { name: 'Đăng ngay' }).click(); await form.getByRole('alert').waitFor()
    assert.equal(count(g, '/admin/community/posts', 'POST'), 1); assert.match(await form.locator('textarea').inputValue(), /được giữ lại/)
    await g.context.close()
  })
  await check('failed R2 upload blocks publishing and permits one explicit retry', async () => {
    const f = await fixture({ uploadStatus: 502 }); await f.goto(); await waitPosts(f.page)
    await openComposer(f.page); const form = f.page.getByRole('dialog')
    await form.locator('textarea').fill('Bài có ảnh cần tải thành công trước khi xuất bản.')
    await form.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
    await form.getByRole('button', { name: 'Tải lại ảnh' }).waitFor(); assert.equal(await form.getByRole('button', { name: 'Đăng ngay' }).isDisabled(), true)
    assert.equal(count(f, '/community/media', 'POST'), 1); assert.equal(count(f, '/admin/community/posts', 'POST'), 0)
    f.state.uploadStatus = 0; await form.getByRole('button', { name: 'Tải lại ảnh' }).click(); await form.getByText('Xong', { exact: true }).waitFor()
    assert.equal(count(f, '/community/media', 'POST'), 2); await f.context.close()
  })
  await check('missing detail, server errors and forbidden admin state render recoverable or denied UI', async () => {
    const f = await fixture({ detailStatus: 404 }); await f.goto(`?post=${id(1)}`); await f.page.getByRole('dialog').getByRole('alert').waitFor()
    assert.equal(count(f, `/admin/community/posts/${id(1)}`), 1); await f.context.close()
    const g = await fixture({ listStatus: 500 }); await g.goto('?tab=pending'); await g.page.getByRole('alert').waitFor()
    assert.equal(count(g, '/admin/community/posts'), 1); g.state.listStatus = 0
    await g.page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await waitPosts(g.page); assert.equal(count(g, '/admin/community/posts'), 2); await g.context.close()
    const h = await fixture({ listStatus: 403 }); await h.goto('?tab=pending'); await h.page.getByRole('heading', { name: 'Bạn không đủ quyền truy cập Admin' }).waitFor(); await h.context.close()
  })
  await check('late responses cannot replace a new topic and image filters use actual BE parameter names', async () => {
    const f = await fixture({ delayTopics: true }); await f.goto(); await waitPosts(f.page)
    const select = f.page.getByRole('combobox', { name: /Chủ đề/ }); await select.click(); await f.page.getByRole('option', { name: 'Mang thai', exact: true }).click()
    await eventually(() => f.state.calls.some((call) => call.query.includes('topic=PREGNANCY')))
    await select.click(); await f.page.getByRole('option', { name: 'Dinh dưỡng', exact: true }).click()
    await eventually(() => f.state.calls.some((call) => call.query.includes('topic=NUTRITION')))
    await f.page.waitForTimeout(750); await waitPosts(f.page)
    await f.page.getByRole('checkbox', { name: 'Chỉ bài có ảnh' }).click()
    await f.page.waitForFunction(() => document.querySelector('.nm-admin-community-filters input[type=checkbox]')?.checked)
    await eventually(() => f.state.calls.some((call) => call.query.includes('hasImages=true')))
    await f.page.waitForTimeout(150); assert.equal(await f.page.locator('.nm-admin-post-entry').count(), 1); await f.context.close()
  })
  await check('401 clears the failed admin session and redirects to login without a community retry loop', async () => {
    const f = await fixture({ listStatus: 401 }); await f.goto('?tab=pending')
    await f.page.waitForURL('**/login'); await f.page.waitForTimeout(300)
    assert(count(f, '/admin/community/posts') <= 2)
    assert.equal(await f.page.evaluate(() => sessionStorage.getItem('nutrimom.auth-session')), null)
    await f.context.close()
  })
  await check('bounded DOM still allows admin to reach records beyond the first 200', async () => {
    const f = await fixture({ windowPages: 12 }); await f.goto('?tab=all'); await waitPosts(f.page)
    for (let page = 1; page < 12; page++) {
      const response = f.page.waitForResponse((r) => r.url().includes('/admin/community/posts?') && new URL(r.url()).searchParams.get('cursor') === `page-${page}`)
      await f.page.getByRole('button', { name: 'Tải thêm bài viết', exact: true }).click(); await response
      await f.page.getByText(`Bài phân trang ${(page + 1) * 20}`, { exact: true }).waitFor()
    }
    assert.equal(await f.page.locator('.nm-admin-post-entry').count(), 200)
    assert.equal(count(f, '/admin/community/posts'), 12)
    await f.page.getByText('Bài phân trang 240', { exact: true }).waitFor(); await f.context.close()
  })
  await check('edge: pending posts retain the ability to unpin without approving', async () => {
    const f = await fixture({ pendingPinned: true }); await f.goto('?tab=pinned'); await waitPosts(f.page)
    const card = f.page.locator('.nm-admin-post-entry').filter({ hasText: seeds[2].content })
    await card.getByRole('button', { name: 'Bỏ ghim', exact: true }).click()
    await eventually(() => count(f, `/admin/community/posts/${id(3)}/pin`, 'DELETE') === 1)
    assert.equal(count(f, `/admin/community/posts/${id(3)}/approve`, 'POST'), 0); await f.context.close()
  })
  await check('edge: deleted own post in admin detail cannot be liked saved or commented on', async () => {
    const f = await fixture({ ownDeleted: true }); await f.goto(`?post=${id(1)}`)
    const dialog = f.page.getByRole('dialog', { name: 'Chi tiết bài viết' })
    const likes = dialog.getByRole('button', { name: /lượt thích/ }); await likes.waitFor()
    assert.equal(await likes.isDisabled(), true)
    assert.equal(await dialog.getByRole('button', { name: /bình luận/ }).isDisabled(), true)
    assert.equal(await dialog.getByRole('button', { name: 'Lưu', exact: true }).isDisabled(), true)
    await f.context.close()
  })
  assert.deepEqual(errors, [])
  await writeFile(`${output}/results${process.env.COMMUNITY_QA_RESULT_SUFFIX || ''}.json`, JSON.stringify({ results, coverage: [...coverage].sort(), errors }, null, 2))
  console.log(`PASS ${results.length} browser scenarios; ${coverage.size} endpoint operations observed`)
} finally { await browser.close(); await server.close() }
