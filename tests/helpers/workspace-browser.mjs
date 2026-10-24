import { fixture } from './nutrition-browser.mjs'
import { fixtureResponse, expert, qaExpertId } from '../admin-workspace-fixtures.mjs'
import { enrichDashboard } from '../admin-dashboard-redesign-fixtures.mjs'
import { expertPerformanceFixture } from '../admin-expert-performance-fixtures.mjs'
import { planDtos, entitlementsFor } from '../fixtures/subscription-plans.ts'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const missing = new Set()
const pregnancy = { id: 'pregnancy-qa', status: 'ACTIVE', local_date: '2026-10-21', timezone: 'Asia/Ho_Chi_Minh', gestational_week: 26, gestational_day: 6, trimester: 2, estimated_due_date: '2027-01-21', days_until_due: 92, version: 1, auto_plan_paused: false }
const profile = { id: 'nutrition-account-a', phone: '0901112233', display_name: 'Nguyễn Minh Anh', role: 'MOM', roles: ['USER'], onboarding_status: 'COMPLETED', status: 'ACTIVE', email: 'qa@example.test', gender: 'FEMALE', date_of_birth: '1994-06-12', version: 1 }
const article = { id: 'article-qa', slug: 'cham-soc-thai-ky', title: 'Chăm sóc mẹ và bé trong thai kỳ mỗi ngày', excerpt: 'Những điều nhỏ giúp mẹ chuẩn bị cho hành trình cùng bé.', category: 'nutrition', stage: 'trimester-2', topics: [], author: { id: 'author-qa', name: 'Chuyên gia NutriMom' }, publishedAt: '2026-10-20T00:00:00Z', status: 'published', sections: [{ id: 'intro', heading: 'Chuẩn bị bữa ăn', paragraphs: ['Lựa chọn món ăn phù hợp và sắp xếp thời gian chuẩn bị mỗi ngày.'], bullets: [], sortOrder: 0 }], createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z' }
const group = { id: 'group-qa', pregnancy_id: pregnancy.id, owner_user_id: profile.id, status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z' }
const emptyPage = { items: [], page: 1, page_size: 20, total_items: 0, total_pages: 0 }
const routes = {
  guest: ['/', '/about', '/services', '/services/pregnancy-tracking', '/services/personal-health-records', '/services/expert-connection', '/services/care-knowledge', '/services/food-scan-ai', '/services/personalized-guidance', '/blog', '/blog/cham-soc-thai-ky', '/experts', '/contact', '/community', '/login', '/register', '/otp', '/auth/activate', '/auth/verify', '/unknown-page'],
  USER: ['/app', '/app/nutrition', '/app/family', '/app/family?tab=tasks', '/app/family?tab=activity', '/app/knowledge', '/app/knowledge/cham-soc-thai-ky', '/app/pricing', '/app/community', '/app/contact', '/app/settings', '/app/experts', '/app/consultations', '/app/chat', '/app/assistant', '/app/profile', '/app/profile/health', '/app/profile/care', '/app/profile/records', '/app/profile/saved', '/app/profile/support', '/app/profile/account/password', '/app/profile/account/disable', '/app/consultations/history', '/app/appointment-questions', '/app/payment-history', '/payment/success', '/payment/cancel', '/family/invite', '/app/consultations/request-qa/call'],
  ADMIN: ['/admin', '/admin/users', '/admin/experts', '/admin/appointments', '/admin/consultations', '/admin/support', '/admin/health', '/admin/nutrition', '/admin/knowledge', '/admin/community', '/admin/reports', '/admin/revenue', '/admin/notifications', '/admin/settings'],
  DOCTOR: ['/expert', '/expert?section=schedule', '/expert?section=requests', '/expert?section=slots', '/expert?section=reviews', '/expert/consultations/request-qa/call'],
  EXPERT: ['/expert', '/expert?section=schedule', '/expert?section=requests', '/expert?section=slots', '/expert?section=reviews', '/expert/consultations/request-qa/call'],
}

async function session(role, touch = false, options = {}) {
  const authRole = ['PARTNER', 'FAMILY_MEMBER'].includes(role) ? 'USER' : role
  const persona = authRole === 'USER' ? role === 'USER' ? 'MOM' : role : role
  const f = await fixture({ known: true, theme: process.env.RESPONSIVE_QA_THEME || 'light', ...options, ...(touch ? { contextOptions: { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } } : {}) })
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
  await f.context.addInitScript(({ role, persona }) => {
    if (role === 'guest') sessionStorage.removeItem('nutrimom.auth-session')
    else {
      const session = JSON.parse(sessionStorage.getItem('nutrimom.auth-session'))
      session.user.roles = [role]
      session.user.role = persona
      sessionStorage.setItem('nutrimom.auth-session', JSON.stringify(session))
    }
  }, { role: authRole, persona })
  await f.context.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '')
    const ok = data => route.fulfill({ json: { data, meta: { request_id: 'responsive-qa' } } })
    let data
    if (path === '/auth/me' || path === '/users/me') data = { ...profile, roles: [authRole], role: persona }
    else if (path === '/notifications/unread-count') data = { count: 1 }
    else if (path === '/notifications') data = { realtime_revision: '0', items: [{ id: 'notice-qa', type: 'SYSTEM', audience: role === 'ADMIN' ? 'ADMIN' : 'USER', category: 'GENERAL', title: 'Lịch hẹn và thông tin chăm sóc của mẹ', body: 'Mở để xem những cập nhật mới nhất trong hành trình chăm sóc mẹ và bé.', created_at: '2026-10-21T00:00:00Z', deep_link: 'nutrimom://nutrition' }], has_more: false }
    else if (path === '/subscriptions/me') data = entitlementsFor('PLAN_399K')
    else if (path === '/subscription-plans') data = planDtos
    else if (path === '/pregnancies/current') data = pregnancy
    else if (path === '/dashboard/mom') data = { profile_summary: profile, pregnancy_summary: pregnancy, upcoming_reminders: [], active_alerts: [], recommended_articles: [article], unread_notification_count: 0 }
    else if (path === '/dashboard/partner') data = { membership_role: persona, pregnancy_overview: pregnancy, assigned_tasks: [], shared_calendar: [], activity_feed: [] }
    else if (path.startsWith('/family/shared-calendar/')) data = { family_group_id: group.id, owner_display_name: 'Mẹ QA', allowed_sources: ['REMINDER','CONSULTATION'], days: [], events: [] }
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
    else if (path === '/payments/orders') data = { items: [], page: 1, page_size: 10, total_items: 0, total_pages: 0 }
    else if (/^\/consultation-requests\/[^/]+\/video$/.test(path)) data = { request_id: 'request-qa', user_name: profile.display_name, expert_name: 'Chuyên gia NutriMom', specialty: 'HEALTH', note: 'Lịch tư vấn của gia đình', expert: authRole !== 'USER', consultation_status: 'COMPLETED', state: 'ENDED', can_join: false, configured: true, opens_at: null, closes_at: null, server_time: new Date().toISOString() }
    else if (path === '/pregnancies') data = [pregnancy]
    else if (path === '/me/saved-items') data = { items: [], has_more: false, next_cursor: null }
    else if (path === '/community/notifications/unread-count') data = { unread_count: 0 }
    else if (path === '/community/posts') data = { items: [], pinned: [], has_more: false, next_cursor: null }
    else if (path === '/admin/community/posts/pending-count') data = { pending_count: 0 }
    else if (path === '/admin/community/posts') data = { items: [], has_more: false, next_cursor: null }
    else if (path === '/admin/realtime/stream') return route.continue({ url: `http://127.0.0.1:${process.env.NUTRITION_QA_PORT || 5195}/__qa/admin-realtime` })
    else if (path.startsWith('/admin/')) {
      data = fixtureResponse(path, url.searchParams, request.method(), request.postData())
      if (path === '/admin/dashboard') data = { ...enrichDashboard(data, 'up'), realtime_revision: '0' }
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


export { session, routes, article, profile, pregnancy, group, missing }
