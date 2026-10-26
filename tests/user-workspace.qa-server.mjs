// Loopback-only synthetic HTTP backend for CUA USER UI and request audits.
// Run: node --experimental-strip-types tests/user-workspace.qa-server.mjs
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { user, baseProfile, summaries, planFor } from './user-workspace-fixtures.mjs'
import { expert, qaExpertId } from './admin-workspace-fixtures.mjs'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

const output = 'qa-artifacts/user-workspace-audit-2026-10-24'
const account = { ...user, email: 'qa@example.test', gender: 'FEMALE', date_of_birth: '1994-06-12', version: 1 }
const pregnancy = { ...baseProfile.pregnancy, id: 'pregnancy-qa', status: 'ACTIVE', days_until_due: 132, version: 1, created_at: '2026-10-01T00:00:00Z' }
const article = { id: 'article-qa', slug: 'cham-soc-thai-ky', title: 'Chăm sóc mẹ và bé trong thai kỳ mỗi ngày', excerpt: 'Những điều nhỏ giúp mẹ chuẩn bị cho hành trình cùng bé.', category: 'nutrition', stage: 'trimester-2', topics: [], author: { id: 'author-qa', name: 'Chuyên gia NutriMom' }, publishedAt: '2026-10-20T00:00:00Z', status: 'published', sections: [{ id: 'intro', heading: 'Chuẩn bị bữa ăn', paragraphs: ['Lựa chọn món ăn phù hợp và sắp xếp thời gian chuẩn bị mỗi ngày.'], bullets: [], sortOrder: 0 }], createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z' }
const group = { id: 'group-qa', pregnancy_id: pregnancy.id, owner_user_id: account.id, status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z' }
const page = { items: [], page: 1, page_size: 20, total_items: 0, total_pages: 0 }
const cursor = { items: [], next_cursor: null, has_more: false }
const order = { id: 'order-qa', order_code: 123456, plan_tier: 'PLAN_399K', plan_name: 'Gói Toàn diện 399K', amount: 399000, currency: 'VND', status: 'PAID', source: 'DEMO', description: 'Đơn tổng hợp dùng để kiểm tra giao diện lịch sử thanh toán.', paid_at: '2026-10-23T08:00:00Z', created_at: '2026-10-23T08:00:00Z', updated_at: '2026-10-23T08:00:00Z' }
const post = { id: 'post-qa', author: { id: 'author-qa', display_name: 'Thành viên kiểm thử', avatar_key: null }, content: 'Cùng gia đình chuẩn bị bữa ăn và lịch khám trong tuần. Dữ liệu tổng hợp dành cho kiểm thử giao diện.', topic: 'SHARING', images: [], like_count: 2, comment_count: 0, liked_by_me: false, saved_by_me: false, pinned: false, status: 'APPROVED', can_edit: false, can_delete: false, version: 1, published_at: '2026-10-23T08:00:00Z', created_at: '2026-10-23T08:00:00Z', edited_at: null }
let calls = [], missing = new Set(), limit = null, saved = false
const server = await createServer({
  server: { host: '127.0.0.1', port: 5199, strictPort: true, open: false, watch: { ignored: ['**/qa-artifacts/**'] } },
  plugins: [{ name: 'user-workspace-qa-only', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://127.0.0.1:5199')
      const send = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
      const ok = data => send({ data })
      const fail = (status, code, message) => send({ error: { code, message, retryable: status >= 500 || status === 429 } }, status)
      if (url.pathname === '/__qa/state') return ok({ calls, missing: [...missing], limit, saved })
      if (url.pathname === '/__qa/reset' && req.method === 'POST') { calls = []; missing.clear(); limit = url.searchParams.get('path') ? { path: url.searchParams.get('path'), method: url.searchParams.get('method') || 'GET', used: false, status: Number(url.searchParams.get('status') || 429) } : null; return ok({ reset: true }) }
      if (url.pathname === '/__qa/save') {
        const name = url.searchParams.get('name') || ''
        if (!/^[a-z0-9-]+\.(jpg|json)$/.test(name)) return fail(400, 'INVALID_NAME', 'Expected a simple artifact filename')
        if (req.method === 'GET') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end('<form method="post"><label>Evidence<textarea name="value" aria-label="Evidence"></textarea></label><button>Lưu bằng chứng</button></form>') }
        const parts = []; for await (const part of req) parts.push(part)
        const value = new URLSearchParams(Buffer.concat(parts).toString()).get('value') || ''
        if (value.length > 3_000_000) return fail(400, 'INVALID_SIZE', 'Too large')
        const data = name.endsWith('.jpg') ? Buffer.from(value, 'base64') : JSON.stringify(JSON.parse(value), null, 2)
        await mkdir(output, { recursive: true }); await writeFile(`${output}/${name}`, data)
        return ok({ saved: name })
      }
      if (!url.pathname.startsWith('/api/v1/')) return next()
      const path = url.pathname.slice(7), method = req.method
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      calls.push({ path, query: url.search, method, at: Date.now() })
      if (limit && !limit.used && path === limit.path && method === limit.method) { limit.used = true; res.setHeader('Retry-After', '5'); return fail(limit.status, 'RATE_LIMITED', 'Máy chủ kiểm thử yêu cầu chờ trước khi thử lại.') }
      if (path === '/auth/login' || path === '/auth/refresh') return ok({ access_token: 'synthetic-user-audit', refresh_token: 'synthetic-user-audit-refresh', token_type: 'Bearer', expires_in: 3600, refresh_expires_in: 86400, user: account })
      if (path === '/auth/logout') return ok({})
      if (path === '/auth/me' || path === '/users/me') return ok(account)
      if (path === '/users/me/preferences') return ok({ timezone: 'Asia/Ho_Chi_Minh', version: 1 })
      if (path === '/subscription-plans') return ok(planDtos)
      if (path === '/subscriptions/me') return ok(entitlementsFor('PLAN_399K'))
      if (path === '/payments/my-subscription') return ok({ plan_tier: 'PLAN_399K', plan_name: 'Gói Toàn diện 399K', status: 'ACTIVE', active: true, days_remaining: 100 })
      if (path === '/payments/orders') return ok({ ...page, items: [order], total_items: 1, total_pages: 1 })
      if (path === '/payments/orders/123456') return ok(order)
      if (path === '/pregnancies') return ok([pregnancy])
      if (path === '/pregnancies/current') return ok(pregnancy)
      if (path === '/dashboard/mom') return ok({ profile_summary: account, pregnancy_summary: pregnancy, upcoming_reminders: [], active_alerts: [], recommended_articles: [article], unread_notification_count: 1 })
      if (path === '/notifications/unread-count' || path === '/community/notifications/unread-count') return ok({ count: 1 })
      if (path === '/notifications') return ok({ has_more: false, items: [{ id: 'notice-qa', type: 'SYSTEM', audience: 'USER', category: 'GENERAL', title: 'Lịch hẹn và thông tin chăm sóc của mẹ', body: 'Thông tin tổng hợp dùng để kiểm thử giao diện.', created_at: '2026-10-23T00:00:00Z', deep_link: 'nutrimom://nutrition' }] })
      if (path.startsWith('/calendar/')) return ok([])
      if (path === '/knowledge/articles') return ok({ items: url.searchParams.get('savedOnly') && !saved ? [] : [article], currentPage: 1, pageSize: Number(url.searchParams.get('pageSize') || 12), totalItems: url.searchParams.get('savedOnly') && !saved ? 0 : 1, totalPages: 1 })
      if (path.endsWith('/bookmark')) { saved = method === 'PUT'; return ok(true) }
      if (path === `/knowledge/articles/${article.slug}`) return ok(article)
      if (path === '/experts') return ok([{ ...expert, user_id: qaExpertId }])
      if (path === `/experts/${qaExpertId}`) return ok({ ...expert, reviews: [] })
      if (path.includes('/availability')) return ok([])
      if (path === '/family-groups') return ok([group])
      if (/^\/family-invitations\/(?:invitation-qa\/)?preview$/.test(path)) return ok({ inviter_display_name: 'Gia đình kiểm thử', relationship: 'SPOUSE', relationship_label: 'Vợ/chồng', scopes: ['TASKS', 'ACTIVITY_FEED'], scope_labels: ['Việc gia đình', 'Hoạt động gia đình'], target_type: 'EMAIL', masked_target: 'q***@example.test', expires_at: '2027-01-01T00:00:00Z', status: 'PENDING' })
      if (['/family-members', '/family-invitations/received', '/family-invitations', '/family/tasks'].includes(path)) return ok([])
      if (path === '/activity-feed') return ok({ ...cursor, items: [{ id: 'activity-qa', type: 'FAMILY_TASK_COMPLETED', title: 'Gia đình đã cùng chuẩn bị bữa ăn cho mẹ', created_at: '2026-10-21T00:00:00Z' }] })
      if (path === '/assistant/status') return ok({ ai_ready: false, provider: 'GUIDE', remaining_ai_messages: 0, daily_ai_limit: 0, retention_days: 30 })
      if (path === '/assistant/preferences') return ok({ cloud_consent: false, use_profile: true, use_pregnancy: true, use_medical_records: false, version: 1 })
      if (path === '/assistant/conversations') return ok([])
      if (path === '/assistant/context') return ok({ display_name: account.display_name, headline: 'Đồng hành cùng mẹ', items: [], suggestions: [], context_version: 1 })
      if (path === '/consultation-requests' || path === '/contact-requests') return ok(page)
      if (path === '/consultation-requests/call-qa/video') return ok({ request_id: 'call-qa', user_name: account.display_name, expert_name: 'Chuyên gia kiểm thử', specialty: 'HEALTH', note: 'Buổi tư vấn tổng hợp dành cho kiểm thử.', expert: false, consultation_status: 'COMPLETED', state: 'ENDED', can_join: false, configured: false, opens_at: '2026-10-23T08:00:00Z', closes_at: '2026-10-23T08:30:00Z', server_time: '2026-10-24T08:00:00Z' })
      if (path === '/medical-records') return ok({ ...cursor, items: [{ id: 'record-qa', title: 'Kết quả khám thai định kỳ của mẹ', category: 'CHECKUP', occurred_at: '2026-10-20T02:00:00Z', summary: 'Theo dõi và chuẩn bị cho buổi khám tiếp theo.', pregnancy_id: pregnancy.id, attachment_count: 0, attachments: [], version: 1 }] })
      if (path === '/verified-guidance') return ok(cursor)
      if (path === '/preparation-items' || path === '/health-alerts') return ok([])
      if (path === '/care-plans/current') return ok({ pregnancy_id: pregnancy.id, week: 20, milestones: [{ id: 'milestone-qa', week: 20, title: 'Chuẩn bị cho buổi khám định kỳ', description: 'Trao đổi các câu hỏi với nhân viên y tế.', status: 'UPCOMING' }], progress: { completed: 0, total: 1 } })
      if (path === '/birth-plans/current') return ok({ id: 'birth-plan-qa', pregnancy_id: pregnancy.id, version: 1 })
      if (path === '/community/posts') return ok({ ...cursor, items: [post], pinned: [] })
      if (path === '/community/me/posts' || path === '/community/notifications') return ok(cursor)
      if (path === '/me/saved-items') return ok({ ...cursor, items: saved ? [{ type: 'KNOWLEDGE', id: article.id, slug: article.slug, title: article.title, excerpt: article.excerpt, saved_at: '2026-10-24T00:00:00Z' }] : [] })
      if (path === '/me/nutrition-profile') return ok(baseProfile)
      if (path === '/allergens') return ok([{ id: 'alg.shrimp', name: 'Tôm' }])
      if (path === '/diary') return ok({ local_date: url.searchParams.get('date'), entries: [], planned_nutrition: {}, planned_coverage: 'PARTIAL', logged_nutrition: {}, logged_coverage: 'PARTIAL', remaining: { energy_target_kcal: null, by_nutrient: {}, notes: [] }, method_notes: [], notes: [] })
      if (path === '/recommendations') return ok({ profile_version: baseProfile.profile_version, allergy_checked: true, notes: [], meals: [{ meal_type: 'LUNCH', status: 'READY', notes: [], items: summaries.map(item => ({ recipe_id: item.id, name: item.name, minutes: item.minutes, role: item.role, nutrition_status: 'PARTIAL', reasons: [] })) }] })
      if (path === '/recipes') return ok({ items: url.searchParams.has('cursor') ? [{ ...summaries[0], id: 'rec.extra', name: 'Món kiểm thử bổ sung' }] : summaries, has_more: !url.searchParams.has('cursor'), next_cursor: url.searchParams.has('cursor') ? null : 'page-2' })
      if (path.startsWith('/recipes/')) return ok({ summary: summaries.find(item => item.id === decodeURIComponent(path.split('/').at(-1))) || summaries[0], steps: 'Rửa sạch nguyên liệu. Nấu chín hoàn toàn.', safety_notes: 'Nấu chín trước khi dùng.', ingredients: [{ ingredient_id: 'ing.rice', canonical_name: 'Gạo tẻ', quantity_gram: 300, preparation_state: 'RAW', food_group: 'GRAIN', allergen_status: 'KNOWN', allergen_ids: [] }], data_state: { nutrient_codes_missing_data: ['IODINE'], ingredients_with_unknown_allergen: [], price_known_for_all_ingredients: false } })
      if (path === '/meal-plans/plan-qa') return ok(planFor())
      if (path === '/meal-plans/plan-qa/shopping-list') return ok({ list_id: 'shopping-qa', plan_id: 'plan-qa', shopping_list_version: 1, start_date: '2026-10-24', end_date: '2026-10-24', groups: [], cost_coverage: 'PARTIAL', notes: [] })
      if (path === '/meal-feedback' || path === '/ingredients') return ok([])
      missing.add(`${method} ${path}`)
      return fail(404, 'QA_UNHANDLED', `Chưa có fixture: ${path}`)
    })
  } }],
})
await server.listen()
console.log('USER audit fixtures: http://127.0.0.1:5199')
