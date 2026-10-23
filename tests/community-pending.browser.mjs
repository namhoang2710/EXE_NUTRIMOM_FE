import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
process.env.COMMUNITY_QA_OUTPUT = 'qa-artifacts/community-pending'
const { browser, server, output, fixture, basePost, id, errors, getLastFixture } = await import('./community-browser-harness.mjs')
const results = []
const badge = (f) => f.page.locator('.nm-admin-community-pending-badge')
const nav = (f, value) => f.page.locator('.nm-admin-community-nav').getByRole('button', { name: new RegExp(value) })
const countCalls = (f) => f.state.calls.filter((call) => call.path === '/admin/community/posts/pending-count').length
async function eventually(fn) { const until = Date.now() + 8000; while (!await fn() && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 30)); assert(await fn()) }
async function shows(f, value) { await eventually(() => badge(f).textContent().then((text) => text === String(value))) }
async function ready(f) { await f.goto(); await f.page.locator('.nm-community-card:not(.is-skeleton)').first().waitFor(); await shows(f, 1); if (f.state.liveQueue) await eventually(() => f.state.activeStreams() === 1) }
async function check(name, run) { try { await run(); results.push(name); console.log('PASS', name) } catch (error) { const f = getLastFixture(); await f.page.screenshot({ path: `${output}/failure.png`, fullPage: true }); await writeFile(`${output}/failure.json`, JSON.stringify({ name, calls: f.state.calls, errors, text: await f.page.locator('body').innerText() }, null, 2)); throw error } }
try {
  await check('new submissions update badge and open pending list immediately through one shared SSE connection', async () => {
    const f = await fixture({ liveQueue: true }); await ready(f)
    await eventually(() => f.state.calls.filter((call) => call.path === '/admin/realtime/stream').length === 1)
    const reads = countCalls(f)
    f.state.posts.push(basePost(5, { status: 'PENDING', content: 'Bài mới thứ hai đang chờ duyệt.' })); f.state.pushRealtime(); await shows(f, 2)
    assert.equal(countCalls(f), reads)
    await nav(f, '^Chờ duyệt').click(); await f.page.locator(`#community-post-${id(5)}`).waitFor()
    f.state.posts.push(basePost(6, { status: 'PENDING', content: 'Bài mới thứ ba đang chờ duyệt.' })); f.state.pushRealtime(); await shows(f, 3)
    await f.page.locator(`#community-post-${id(6)}`).waitFor()
    await f.page.screenshot({ path: `${output}/pending-three.png`, fullPage: true, animations: 'disabled' }); await f.context.close()
  })
  await check('three pending posts minus two approvals stays one after leaving tab, leaving community and reloading', async () => {
    const f = await fixture({ liveQueue: true }); await ready(f)
    f.state.posts.push(basePost(5, { status: 'PENDING' }), basePost(6, { status: 'PENDING' })); f.state.pushRealtime(); await shows(f, 3)
    await nav(f, '^Chờ duyệt').click()
    for (const [post, remaining] of [[3, 2], [5, 1]]) {
      const card = f.page.locator(`#community-post-${id(post)}`); await card.getByRole('button', { name: 'Duyệt', exact: true }).click(); await shows(f, remaining)
    }
    await nav(f, '^Bảng tin').click(); await shows(f, 1)
    await f.page.locator('.admin-sidebar').getByRole('link', { name: 'Tổng quan', exact: true }).click(); await f.page.waitForURL('**/admin')
    await f.page.locator('.admin-sidebar').getByRole('link', { name: 'Cộng đồng', exact: true }).click(); await shows(f, 1)
    await f.page.reload(); await shows(f, 1); await f.page.screenshot({ path: `${output}/pending-one-after-reload.png`, fullPage: true, animations: 'disabled' })
    await f.context.close()
  })
  await check('failed rejection keeps count; successful rejection or deletion removes only outstanding work', async () => {
    const f = await fixture({ liveQueue: true }); await ready(f); await nav(f, '^Chờ duyệt').click()
    const card = f.page.locator(`#community-post-${id(3)}`); await card.getByRole('button', { name: 'Từ chối', exact: true }).click()
    const dialog = f.page.getByRole('dialog', { name: 'Từ chối bài viết' }); await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await shows(f, 1)
    await dialog.locator('textarea').fill('Nội dung chưa phù hợp.'); await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await badge(f).waitFor({ state: 'hidden' })
    f.state.posts.push(basePost(7, { status: 'PENDING' })); f.state.pushRealtime(); await shows(f, 1)
    f.state.posts.find((post) => post.id === id(7)).deleted_at = new Date().toISOString(); f.state.pushRealtime(); await badge(f).waitFor({ state: 'hidden' })
    await f.context.close()
  })
  await check('fallback count is loaded once in StrictMode and survives tab changes; 429 does not retry on navigation', async () => {
    const f = await fixture(); await ready(f); assert.equal(countCalls(f), 1)
    await nav(f, '^Chờ duyệt').click(); await shows(f, 1); await nav(f, '^Bảng tin').click(); await shows(f, 1); assert.equal(countCalls(f), 1); await f.context.close()
    const g = await fixture({ count429: true }); await g.goto(); await g.page.getByText('Chưa cập nhật được số bài chờ duyệt.', { exact: false }).waitFor(); assert.equal(countCalls(g), 1)
    await nav(g, '^Chờ duyệt').click(); await nav(g, '^Bảng tin').click(); assert.equal(countCalls(g), 1); assert.equal(await badge(g).count(), 0)
    await g.context.close()
  })
  await check('mobile selection shows live outstanding count', async () => {
    const f = await fixture({ liveQueue: true }); await ready(f); await f.page.setViewportSize({ width: 390, height: 844 })
    const select = f.page.getByRole('combobox', { name: /Không gian cộng đồng/ }); await select.click(); await f.page.getByRole('option', { name: 'Chờ duyệt (1)', exact: true }).click()
    f.state.posts.push(basePost(5, { status: 'PENDING' })); f.state.pushRealtime(); await eventually(() => select.innerText().then((text) => text.includes('(2)')))
    assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await f.context.close()
  })
  assert.deepEqual(errors, []); await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2)); console.log(`PASS ${results.length} pending counter browser scenarios`)
} finally { await browser.close(); await server.close() }
