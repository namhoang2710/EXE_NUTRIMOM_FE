import assert from 'node:assert/strict'
import { browser, server, output, pageErrors, writeFile } from './helpers/nutrition-browser.mjs'
import { session } from './helpers/workspace-browser.mjs'

const base = `http://127.0.0.1:${process.env.NUTRITION_QA_PORT || 5195}`
const summary = { average: 4.5, total: 2, by_rating: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 } }
const publicReview = { id: '96a80ace-5c5d-46b0-bae4-6c454564ec44', rating: 5, content: 'NutriMom giúp gia đình theo dõi hành trình mỗi ngày.', author: { display_name: 'M*** A**' }, created_at: '2026-10-24T18:00:00Z' }
const secondReview = { ...publicReview, id:'d8988238-d434-416b-a82e-e9a9f50caf9f',rating:4,content:'Mình mong có thêm lựa chọn thực đơn cho gia đình.',author:{display_name:'N*** H**'} }
const result = [], counts = {}, writes = []
let mine = null, conflict = false, publicLimited = false, resetReject = false, adminReply, adminVersion=3, adminDeleted=false, replyConflict=false
const contexts = []
async function setup(role) {
  const f = await session(role, true)
  contexts.push(f.context)
  await f.page.setViewportSize({ width: 390, height: 844 })
  await f.context.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '')
    if (!path.startsWith('/reviews') && !path.startsWith('/admin/reviews') && !path.startsWith('/auth/password')) return route.fallback()
    counts[`${req.method()}:${path}`] = (counts[`${req.method()}:${path}`] || 0) + 1
    const ok = data => route.fulfill({ json: { data } })
    const fail = (status, code, message, headers = {}) => route.fulfill({ status, headers, json: { error: { code, message } } })
    if (path === '/reviews/summary') return publicLimited ? fail(429, 'RATE_LIMITED', 'Vui lòng chờ.', { 'Retry-After': '20' }) : ok(summary)
    if (path === '/reviews') {
      if(publicLimited) return fail(429,'RATE_LIMITED','Vui lòng chờ.',{'Retry-After':'20'})
      const star=url.searchParams.get('rating')
      if(star) return ok({items:[publicReview,secondReview].filter(review=>String(review.rating)===star),has_more:false})
      if(url.searchParams.get('limit')==='2') return ok({items:[publicReview,secondReview],has_more:false})
      return ok(url.searchParams.has('cursor')?{items:[publicReview,secondReview],has_more:false}:{items:[publicReview],next_cursor:'next-page',has_more:true})
    }
    if (path === '/reviews/me') {
      if (req.method() === 'GET') return mine ? ok(mine) : fail(404, 'WEB_REVIEW_NOT_FOUND', 'Chưa có đánh giá')
      if (req.method() === 'DELETE') { mine = null; return route.fulfill({ status: 204 }) }
      const body = req.postDataJSON(); writes.push(body)
      if (conflict) { conflict = false; mine = { ...mine, version: 2 }; return fail(409, 'VERSION_CONFLICT', 'Đánh giá đã thay đổi.') }
      mine = { ...publicReview, ...body, version: (mine?.version || 0) + 1, status: 'PUBLISHED' }
      return ok(mine)
    }
    if (path === '/admin/reviews/pending-count') return ok({ count: 1 })
    const admin = { ...publicReview, author: { id: 'author-qa', display_name: 'Nguyễn Minh Anh', account_status: 'ACTIVE' }, status: adminDeleted ? 'DELETED' : 'PUBLISHED', version: adminVersion, edited_after_reply: false, ...(adminReply ? { reply: adminReply } : {}) }
    if (path === '/admin/reviews') return ok({ items: [admin], has_more: false })
    if (path.endsWith('/reply')) {
      if(req.method()==='DELETE'){adminReply=undefined;adminVersion++;return route.fulfill({status:204})}
      writes.push(req.postDataJSON())
      if(replyConflict){adminDeleted=true;adminVersion++;return fail(409,'WEB_REVIEW_DELETED','Đánh giá đã bị xóa.')}
      adminReply={ content: req.postDataJSON().content, replied_at: new Date().toISOString() };adminVersion++
      return ok({ ...admin, version: adminVersion, reply: adminReply })
    }
    if (path.startsWith('/admin/reviews/')) return ok(admin)
    if (path.endsWith('/forgot')) return ok({ accepted: true, message: 'Nếu email hợp lệ, NutriMom sẽ gửi hướng dẫn đặt lại mật khẩu.' })
    if (path.endsWith('/validate')) return req.postDataJSON().token==='expired' ? fail(410,'PASSWORD_RESET_TOKEN_EXPIRED','Liên kết đã hết hạn.') : ok({ valid: true, expires_at: new Date(Date.now() + 1800000).toISOString(), email_masked: 'm***@example.test' })
    if (path.endsWith('/reset')) return resetReject ? route.fulfill({status:422,json:{error:{code:'VALIDATION_ERROR',message:'Kiểm tra mật khẩu',fields:{new_password:'Mật khẩu chưa được chấp nhận.'}}}}) : ok({ reset: true, message: 'Đã đổi mật khẩu.' })
    return route.fulfill({ status: 204 })
  })
  return f
}
async function snap(page, name) { await page.screenshot({ path: `${output}/${name}.png` }) }
try {
  const user = await setup('USER'), p = user.page
  await p.goto(`${base}/app/reviews`)
  await p.getByRole('heading', { name: 'Đánh giá NutriMom', exact: true }).waitFor()
  await p.getByRole('radio', { name: '5 sao' }).click()
  await p.getByRole('textbox', { name: 'Nội dung đánh giá' }).fill('Mình thấy NutriMom rất dễ sử dụng trên điện thoại.')
  await p.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click()
  await p.getByText('Đã lưu đánh giá của bạn.', { exact: false }).waitFor()
  assert.equal(writes.length, 1)
  conflict = true
  const draft = 'Mình mong muốn giao diện điện thoại rõ ràng hơn nữa.'
  await p.getByRole('textbox', { name: 'Nội dung đánh giá' }).fill(draft)
  await p.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await p.getByRole('button', { name: 'Tải bản mới, giữ nội dung đang soạn' }).click()
  assert.equal(await p.getByRole('textbox', { name: 'Nội dung đánh giá' }).inputValue(), draft)
  await p.getByText('Đã tải bản mới.', { exact: false }).waitFor()
  await p.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await p.getByText('Đã lưu đánh giá của bạn.', { exact: false }).waitFor()
  assert.equal(writes.at(-1).version, 2)
  await snap(p, 'user-reviews-390')
  result.push('USER create/edit and explicit version recovery preserve draft on 409')
  conflict=true
  await p.getByRole('textbox',{name:'Nội dung đánh giá'}).fill('Bản nháp chưa lưu trước khi xóa đánh giá cũ.')
  await p.getByRole('button',{name:'Lưu thay đổi',exact:true}).click()
  await p.getByRole('button',{name:'Tải bản mới, giữ nội dung đang soạn'}).waitFor()
  await p.getByRole('button',{name:'Xóa đánh giá',exact:true}).click()
  await p.getByRole('button',{name:'Xác nhận xóa',exact:true}).click()
  await p.getByText('Đã xóa đánh giá.',{exact:false}).waitFor()
  await p.getByRole('radio',{name:'4 sao'}).click()
  await p.getByRole('textbox',{name:'Nội dung đánh giá'}).fill('Đánh giá mới sau khi xóa đánh giá trước.')
  await p.getByRole('button',{name:'Gửi đánh giá',exact:true}).click()
  await p.getByText('Đã lưu đánh giá của bạn.',{exact:false}).waitFor()
  assert.equal(Object.hasOwn(writes.at(-1),'version'),false)
  result.push('USER can delete after conflict and create again without a stale version')

  const guest = await setup('guest'), g = guest.page
  await g.clock.install()
  await g.addInitScript(() => localStorage.setItem('nutrimom.theme', 'dark'))
  await g.goto(base)
  assert.equal(await g.locator('html').getAttribute('data-theme'), 'light')
  await g.locator('.landing-footer').scrollIntoViewIfNeeded()
  await g.getByRole('button', { name: 'Xem tất cả đánh giá' }).click()
  const dialog = g.getByRole('dialog', { name: 'Đánh giá NutriMom' })
  await dialog.waitFor()
  await dialog.getByText(publicReview.author.display_name).waitFor()
  assert.equal(await dialog.locator('[role="radio"]').count(), 0)
  await dialog.getByRole('button',{name:'Tải thêm đánh giá',exact:true}).click()
  await dialog.getByText(secondReview.content,{exact:true}).waitFor()
  assert.equal(await dialog.locator('.nm-web-review-card').count(),2)
  await dialog.getByRole('combobox',{name:'Lọc số sao'}).selectOption('4')
  await dialog.getByText(secondReview.content,{exact:true}).waitFor()
  assert.equal(await dialog.locator('.nm-web-review-card').count(),1)
  await snap(g, 'public-reviews-390')
  publicLimited=true
  await dialog.getByRole('combobox',{name:'Lọc số sao'}).selectOption('1')
  await dialog.getByText(/Vui lòng thử lại sau/).first().waitFor()
  assert.equal(await dialog.getByRole('combobox',{name:'Lọc số sao'}).isDisabled(),true)
  const readsAfter429=(counts['GET:/reviews']||0)+(counts['GET:/reviews/summary']||0)
  await g.clock.fastForward(65_000);await g.waitForTimeout(100)
  assert.equal((counts['GET:/reviews']||0)+(counts['GET:/reviews/summary']||0),readsAfter429,'429 must pause all public automatic readers even after the countdown')
  publicLimited=false
  await dialog.getByRole('button',{name:'Thử lại',exact:true}).click()
  await dialog.getByText('Chưa có đánh giá với số sao này.').waitFor()
  result.push('Public pagination deduplicates IDs, star filter resets cursor, shared 429 pauses polling until explicit retry')
  await g.keyboard.press('Escape')
  await dialog.waitFor({state:'hidden'})
  assert.equal(await dialog.isVisible(), false)
  await g.goto(`${base}/forgot-password`)
  assert.equal(await g.locator('html').getAttribute('data-theme'), 'dark')
  await g.getByRole('textbox', { name: 'Email tài khoản' }).fill('mother@example.test')
  await g.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }).click()
  await g.getByText('Nếu email hợp lệ, NutriMom sẽ gửi hướng dẫn đặt lại mật khẩu.').waitFor()
  await snap(g, 'forgot-password-dark-390')
  result.push('Public review popup is readable without login; public light preserves saved auth dark')
  await g.goto(`${base}/reset-password?token=valid-private-token`)
  const newPassword=g.getByLabel('Mật khẩu mới',{exact:true}), confirmation=g.getByLabel('Nhập lại mật khẩu mới',{exact:true})
  await newPassword.fill('Example1!');await confirmation.fill('Example1!')
  resetReject=true
  await g.getByRole('button',{name:'Lưu mật khẩu mới',exact:true}).click()
  await g.getByText('Mật khẩu chưa được chấp nhận.').waitFor()
  assert.equal(await newPassword.inputValue(),'Example1!')
  resetReject=false
  await g.getByRole('button',{name:'Lưu mật khẩu mới',exact:true}).click()
  await g.waitForURL('**/login')
  await g.getByText('Mật khẩu đã được cập nhật.',{exact:false}).waitFor()
  await g.goto(`${base}/reset-password?token=expired`)
  await g.getByText('Liên kết đã hết hạn.',{exact:true}).waitFor()
  assert.equal(await g.getByRole('button',{name:'Lưu mật khẩu mới',exact:true}).count(),0)
  result.push('Reset password retains form after 422, returns to login after success, and rejects expired links')

  const admin = await setup('ADMIN'), a = admin.page
  await a.goto(`${base}/admin/reviews`)
  await a.getByRole('button', { name: 'Xem và trả lời' }).click()
  await a.getByRole('dialog').waitFor()
  await a.getByRole('textbox',{name:'Nội dung trả lời'}).fill('Cảm ơn mẹ đã đồng hành cùng NutriMom.')
  await a.getByRole('button',{name:'Lưu trả lời',exact:true}).click()
  await a.getByText('Đã lưu trả lời của NutriMom.',{exact:true}).waitFor()
  assert.equal(writes.at(-1).version,3)
  await a.getByRole('button',{name:'Gỡ trả lời',exact:true}).waitFor()
  await snap(a, 'admin-reply-390')
  await a.getByRole('button',{name:'Gỡ trả lời',exact:true}).click()
  await a.getByRole('button',{name:'Xác nhận gỡ trả lời',exact:true}).click()
  await a.getByText('Đã gỡ trả lời.',{exact:true}).waitFor()
  const replyDraft='Bản nháp trả lời cần giữ dù người dùng đã xóa đánh giá.'
  await a.getByRole('textbox',{name:'Nội dung trả lời'}).fill(replyDraft)
  replyConflict=true
  await a.getByRole('button',{name:'Lưu trả lời',exact:true}).click()
  await a.getByRole('button',{name:'Tải bản mới, giữ nội dung trả lời'}).click()
  await a.getByRole('textbox',{name:'Bản nháp trả lời được giữ'}).waitFor()
  assert.equal(await a.getByRole('textbox',{name:'Bản nháp trả lời được giữ'}).inputValue(),replyDraft)
  assert.equal(await a.getByRole('button',{name:'Lưu trả lời',exact:true}).count(),0)
  result.push('Admin can save/remove reply, then retain a copyable draft after a deleted-review conflict')
  assert.deepEqual(pageErrors, [])
} finally {
  await writeFile(`${output}/reviews-auth-results.json`, JSON.stringify({ result, counts, writes, pageErrors }, null, 2))
  for (const context of contexts) await context.close()
  await browser.close(); server.httpServer?.closeAllConnections(); await server.close()
}
console.log(JSON.stringify({ result, counts }))
