import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fixtureResponse, qaUser } from './admin-workspace-fixtures.mjs'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const streams = new Map()
let streamSequence = 0
function communityStream(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Accept-Language, X-Device-Id, X-Request-Id')
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
  const entry = streams.get(new URL(request.url, 'http://qa.local').searchParams.get('id'))
  if (!entry) { response.writeHead(404); response.end(); return }
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
  const payload = () => ({ protocol_version: 1, admin_user_id: entry.account.id, dashboard_revision: '0', notifications_revision: '0', unread_count: 2, community_pending_count: entry.state.posts.filter((post) => post.status === 'PENDING' && !post.deleted_at).length })
  const send = () => response.write(`event: update\ndata: ${JSON.stringify(payload())}\n\n`)
  entry.clients.add(send); response.write(`event: ready\ndata: ${JSON.stringify(payload())}\n\n`)
  const heartbeat = setInterval(() => response.write('event: heartbeat\ndata: {"protocol_version":1}\n\n'), 15000)
  response.on('close', () => { clearInterval(heartbeat); entry.clients.delete(send) })
}
const server = await (await import('vite')).createServer({
  plugins: [{ name: 'community-sse-fixture', configureServer(app) { app.middlewares.use('/__qa-community-stream', communityStream) } }],
  server: { host: '127.0.0.1', port: 5197, strictPort: true, open: false },
})
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const output = process.env.COMMUNITY_QA_OUTPUT || 'qa-artifacts/community-admin'
await mkdir(output, { recursive: true })
const stamp = '2026-10-21T11:20:00Z'
const adminId = qaUser.id
const member = { id: '22222222-2222-4222-8222-222222222222', display_name: 'Nguyễn Minh Anh', phone: '0901112233', roles: ['USER'], status: 'ACTIVE', onboarding_status: 'COMPLETED', created_at: stamp }
const id = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const basePost = (n, extra = {}) => ({ id: id(n), author: { id: member.id, display_name: member.display_name, avatar_key: null }, content: 'Các mẹ có món ăn nhẹ nào dễ chuẩn bị cho tuần thai thứ 24 không? Mình muốn đổi bữa để vừa đủ dinh dưỡng, vừa thấy ngon miệng hơn.', topic: 'NUTRITION', images: [], like_count: 8, comment_count: 2, liked_by_me: false, saved_by_me: false, pinned: false, status: 'APPROVED', can_edit: false, can_delete: false, version: 1, published_at: stamp, created_at: stamp, edited_at: null, official: false, ...extra })
const seeds = [basePost(1, { author: { id: adminId, display_name: 'Ban quản trị NutriMom', avatar_key: null }, content: 'Một không gian để mẹ được lắng nghe.\n\nCùng chia sẻ kinh nghiệm, đặt câu hỏi và động viên nhau trong hành trình chăm sóc mẹ và bé. Ban quản trị luôn ở đây để giữ những cuộc trò chuyện an toàn, gần gũi và hữu ích.', pinned: true, official: true }), basePost(2, { images: [{ id: id(21), url: '/hero-showcase/blog.jpg', width: 1200, height: 800 }] }), basePost(3, { status: 'PENDING', content: 'Mẹ bầu ngủ không ngon vào tam cá nguyệt thứ ba, các mẹ chia sẻ kinh nghiệm giúp mình nhé.', published_at: null }), basePost(4, { status: 'REJECTED', reject_reason: 'Nội dung có quảng cáo sản phẩm.' })]
const comment = { id: id(31), post_id: id(2), author: { id: member.id, display_name: 'Trần Bảo Ngọc', avatar_key: null }, content: 'Mình thường chuẩn bị sữa chua và một ít trái cây theo mùa, mẹ thử nhé.', can_delete: false, created_at: stamp }
const envelope = (post) => ({ post, open_report_count: post.id === id(2) ? 1 : 0, moderated_by: adminId, moderated_at: stamp, deleted_at: post.deleted_at })
const results = [], errors = [], coverage = new Set()
let lastFixture
async function fixture(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: options.motion ? 'no-preference' : 'reduce', ...(options.touch ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) })
  const state = { posts: structuredClone(seeds), comments: [structuredClone(comment)], calls: [], list429: false, pinFail: false, createPinFail: false, readAll: false, ...options }
  if (options.pendingPinned) state.posts[2].pinned = true
  if (options.ownDeleted) state.posts[0].deleted_at = stamp
  const account = options.member ? member : qaUser
  const streamId = String(++streamSequence), clients = new Set()
  streams.set(streamId, { account, state, clients })
  state.pushRealtime = () => clients.forEach((send) => send())
  state.activeStreams = () => clients.size
  context.on('close', () => streams.delete(streamId))
  await context.addInitScript(({ account, theme }) => {
    localStorage.setItem('nutrimom.theme', theme)
    sessionStorage.setItem('nutrimom.auth-session', JSON.stringify({ accessToken: 'qa-community', refreshToken: 'qa-refresh', tokenType: 'Bearer', accessExpiresAt: Date.now() + 3600_000, refreshExpiresAt: Date.now() + 86400_000, user: { ...account, displayName: account.display_name, onboardingStatus: account.onboarding_status } }))
  }, { account, theme: options.theme || 'light' })
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', ''), method = request.method()
    const body = request.headers()['content-type']?.includes('application/json') && request.postData() ? request.postDataJSON() : {}
    state.calls.push({ path, query: url.search, method, body })
    if (path.includes('/community')) coverage.add(`${method} ${path.replace(/30000000-0000-4000-8000-\d{12}/g, '{id}')}`)
    const ok = (data, status = 200) => route.fulfill({ status, json: { data } })
    const fail = (status, code, message, headers = {}) => route.fulfill({ status, headers, json: { error: { code, message } } })
    const getPost = () => state.posts.find((post) => post.id === path.split('/')[3])
    if (path === '/admin/realtime/stream') return options.liveQueue ? route.continue({ url: `http://127.0.0.1:5197/__qa-community-stream?id=${streamId}` }) : fail(404, 'RESOURCE_NOT_FOUND', 'Realtime test fallback')
    if (path === '/admin/community/posts/pending-count') {
      if (state.count429) return fail(429, 'RATE_LIMITED', 'Vui lòng chờ.', { 'Retry-After': '2' })
      return ok({ pending_count: state.posts.filter((post) => post.status === 'PENDING' && !post.deleted_at).length })
    }
    if (path === '/auth/me') return ok(account)
    if (path === '/community/media') { if (state.uploadDelay) await new Promise((resolve) => setTimeout(resolve, state.uploadDelay)); if (state.upload429) return fail(429, 'RATE_LIMITED', 'Vui lòng chờ.', { 'Retry-After': '2' }); if (state.uploadStatus) return fail(state.uploadStatus, 'R2_UPLOAD_FAILED', 'Kho ảnh đang bận.'); return ok({ id: id(50), url: '/hero-showcase/blog.jpg', width: 1200, height: 800 }, 201) }
    if (path === '/community/posts' && method === 'POST') {
      const post = basePost(99, { ...body, author: { id: member.id, display_name: member.display_name, avatar_key: null }, status: 'PENDING', official: false, can_edit: true, can_delete: true, published_at: null })
      state.posts.push(post); return ok(post, 201)
    }
    if (path === '/community/posts' && method === 'GET') {
      if (state.feed429) return fail(429, 'RATE_LIMITED', 'Chờ một chút.', { 'Retry-After': '2' })
      let posts = state.posts.filter((post) => post.status === 'APPROVED' && !post.deleted_at && (!url.searchParams.get('topic') || post.topic === url.searchParams.get('topic')) && (!url.searchParams.has('hasImages') || post.images.length) && (!url.searchParams.has('saved') || post.saved_by_me))
      if (state.delayTopics && url.searchParams.get('topic') === 'PREGNANCY') await new Promise((resolve) => setTimeout(resolve, 650))
      const second = url.searchParams.has('cursor')
      return ok({ items: state.cursor && second ? [posts.at(-1), basePost(9, { content: 'Bài ở trang tiếp theo' })].filter(Boolean) : posts.filter((post) => !post.pinned), pinned: second ? undefined : posts.filter((post) => post.pinned), next_cursor: state.cursor && !second ? 'opaque-next' : null, has_more: !!state.cursor && !second })
    }
    if (path === '/community/me/posts') return ok({ items: state.posts.filter((post) => post.author.id === account.id && !post.deleted_at).map((post) => ({ ...post, can_edit: true, can_delete: true })), has_more: false })
    if (path === '/admin/community/posts' && method === 'POST') {
      if (state.createStatus) return fail(state.createStatus, 'VALIDATION_ERROR', 'Nội dung chưa hợp lệ.')
      if (body.pinned && state.createPinFail) return fail(409, 'COMMUNITY_PIN_LIMIT_REACHED', 'Đã đủ 3 bài ghim.')
      if (state.create429) return fail(429, 'RATE_LIMITED', 'Vui lòng chờ.', { 'Retry-After': '2' })
      const post = basePost(state.posts.length + 10, { ...body, author: { id: adminId, display_name: 'Quản trị QA', avatar_key: null }, official: true, pinned: !!body.pinned, images: (body.image_ids || []).map((value) => ({ id: value, url: '/hero-showcase/blog.jpg', width: 1200, height: 800 })), can_edit: false, can_delete: false })
      state.posts.unshift(post); return ok(envelope(post), 201)
    }
    if (path === '/admin/community/posts') {
      if (state.listStatus) return fail(state.listStatus, state.listStatus === 403 ? 'FORBIDDEN' : state.listStatus === 401 ? 'UNAUTHORIZED' : 'RESOURCE_NOT_FOUND', 'Không thể tải nội dung.')
      if (state.list429) return fail(429, 'RATE_LIMITED', 'Vui lòng chờ.', { 'Retry-After': '2' })
      if (state.windowPages) {
        const index = Number((url.searchParams.get('cursor') || 'page-0').split('-')[1])
        const more = index + 1 < state.windowPages
        return ok({ items: Array.from({ length: 20 }, (_, offset) => envelope(basePost(100 + index * 20 + offset, { content: `Bài phân trang ${index * 20 + offset + 1}` }))), next_cursor: more ? `page-${index + 1}` : null, has_more: more })
      }
      const selected = state.posts.filter((post) => (!url.searchParams.get('status') || post.status === url.searchParams.get('status')) && (!url.searchParams.has('pinned') || post.pinned))
      return ok({ items: selected.map(envelope), has_more: false })
    }
    if (/^\/admin\/community\/posts\//.test(path)) {
      if (method === 'GET' && state.detailStatus) return fail(state.detailStatus, 'RESOURCE_NOT_FOUND', 'Bài viết không còn tồn tại.')
      const post = state.posts.find((item) => item.id === path.split('/')[4])
      if (!post) return fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy bài viết.')
      if (path.endsWith('/approve')) post.status = 'APPROVED'
      else if (path.endsWith('/reject')) { post.status = 'REJECTED'; post.reject_reason = body.reason }
      else if (path.endsWith('/pin')) {
        if (method === 'PUT' && state.pinFail) return fail(409, 'COMMUNITY_PIN_LIMIT_REACHED', 'Đã đủ chỗ ghim.')
        post.pinned = method === 'PUT'
      } else if (method === 'DELETE') { post.status = 'REMOVED'; post.deleted_at = stamp }
      await ok(envelope(post)); state.pushRealtime(); return
    }
    if (/^\/community\/posts\/[^/]+\/comments$/.test(path)) {
      if (method === 'POST') { const next = { ...comment, id: id(32), content: body.content, can_delete: true }; state.comments.push(next); return ok(next, 201) }
      return ok({ items: state.comments, has_more: false })
    }
    if (/^\/(admin\/)?community\/comments\//.test(path)) { state.comments = state.comments.filter((item) => item.id !== path.split('/').at(-1)); return ok(true) }
    if (/^\/community\/posts\/[^/]+\/(like|save)$/.test(path)) {
      const post = getPost()
      if (state.reactionDelay) await new Promise((resolve) => setTimeout(resolve, state.reactionDelay));
      if (state.reaction429) return fail(429, 'RATE_LIMITED', 'Vui lòng chờ trước khi tương tác.', { 'Retry-After': '2' });
      if (path.endsWith('/like')) { post.liked_by_me = method === 'PUT'; post.like_count += method === 'PUT' ? 1 : -1; return ok({ liked: post.liked_by_me, like_count: post.like_count }) }
      post.saved_by_me = method === 'PUT'; return ok({ saved: post.saved_by_me })
    }
    if (/^\/community\/posts\//.test(path)) {
      const post = getPost()
      if (!post) return fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy bài viết.')
      if (method === 'PATCH') { if (state.versionConflict) return fail(409, 'VERSION_CONFLICT', 'Đã đổi ở nơi khác.'); Object.assign(post, body, { version: post.version + 1, edited_at: stamp }) }
      if (method === 'DELETE') { post.deleted_at = stamp; return ok(true) }
      return ok({ ...post, can_edit: post.author.id === account.id, can_delete: post.author.id === account.id })
    }
    if (path === '/admin/community/reports') return ok({ items: [{ id: id(40), post_id: id(2), reporter: { id: member.id, display_name: member.display_name }, post_author: { id: member.id, display_name: member.display_name }, post_excerpt: seeds[1].content, reason: 'MISINFORMATION', status: state.resolution || 'OPEN', post_deleted: false, open_report_count: 1, created_at: stamp, note: 'Mong quản trị viên kiểm tra thông tin này.' }].filter((report) => !url.searchParams.get('status') || report.status === url.searchParams.get('status')), has_more: false })
    if (/^\/admin\/community\/reports\/.+\/resolve$/.test(path)) { state.resolution = body.action === 'DISMISS' ? 'DISMISSED' : 'ACTION_TAKEN'; return ok({ status: state.resolution }) }
    if (path === '/community/notifications/unread-count') return ok({ unread_count: state.readAll ? 0 : 2 })
    if (path === '/community/notifications') return ok({ items: [{ id: id(60), type: 'POST_LIKED', post_id: id(1), message: 'Minh Anh đã thả tim bài viết của bạn.', read: state.readAll, created_at: stamp }], has_more: false })
    if (path === '/community/notifications/read-all') { state.readAll = true; return ok({ updated: 2 }) }
    if (/^\/community\/notifications\/.+\/read$/.test(path)) return ok(true)
    if (path.includes('/community')) { errors.push(`Unexpected community API: ${method} ${path}`); return fail(404, 'RESOURCE_NOT_FOUND', path) }
    if (path === '/users/me') return ok({ ...member, version: 1 })
    if (path === '/subscription-plans') return ok(planDtos)
    if (path === '/subscriptions/me') return ok(entitlementsFor('PLAN_399K'))
    if (path === '/users/me/preferences') return ok({ timezone: 'Asia/Ho_Chi_Minh', version: 1 })
    if (path === '/pregnancies/current') return ok(null)
    if (path === '/family-groups') return ok([])
    return ok(fixtureResponse(path, url.searchParams, method, request.postData()) ?? {})
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  lastFixture = { context, page, state, goto: (query = '') => page.goto(`http://127.0.0.1:5197/${options.member ? 'app' : 'admin'}/community${query}`) }
  return lastFixture
}

export { browser, server, output, stamp, adminId, member, id, basePost, seeds, comment, errors, coverage, results, fixture };
export const getLastFixture = () => lastFixture;
