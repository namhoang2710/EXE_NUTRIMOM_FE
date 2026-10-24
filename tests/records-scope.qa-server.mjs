// Test-only HTTP fixtures for manual browser QA. Never imported by production code.
// Run: node --experimental-strip-types tests/records-scope.qa-server.mjs
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'

const user = { id: 'records-qa-mom', phone: '0905552486', display_name: 'Mẹ kiểm thử', roles: ['USER'], role: 'MOM', status: 'ACTIVE', onboarding_status: 'COMPLETED', created_at: '2026-10-01T00:00:00Z', version: 1 }
const previous = { id: 'pregnancy-previous', status: 'COMPLETED', estimated_due_date: '2026-10-20', calculation_source: 'MANUAL', version: 1, created_at: '2026-01-01T00:00:00Z' }
const current = { ...previous, id: 'pregnancy-current', status: 'ACTIVE', estimated_due_date: '2027-03-01', gestational_week: 21, gestational_day: 0, trimester: 2, days_until_due: 128, created_at: '2026-10-21T00:00:00Z' }
const makeRecord = (id, pregnancy_id, title, day) => ({ id, pregnancy_id, title, category: 'ULTRASOUND', occurred_at: `2026-10-${day}T17:00:00Z`, facility_name: 'Cơ sở khám kiểm thử', summary: 'Dữ liệu tổng hợp dành riêng cho kiểm tra giao diện.', attachment_count: 0, attachments: [], version: 0 })
let state
function reset(scenario = 'normal') {
  const old = makeRecord('record-previous', previous.id, 'Siêu âm thai kỳ trước', '19')
  const ongoing = makeRecord('record-current', current.id, 'Khám thai hiện tại', '22')
  state = { scenario, calls: [], files: new Map(), pregnancies: structuredClone(scenario === 'history' ? [previous] : scenario === 'empty' ? [] : [current, previous]), records: scenario === 'empty' ? [] : scenario === 'history' ? [old] : scenario === 'many' ? [ongoing, ...Array.from({ length: 25 }, (_, index) => makeRecord(`record-old-${index}`, previous.id, `Tài liệu cũ ${index + 1}`, '19'))] : [ongoing, old], limited: false, expired: false, conflicted: false }
}
reset()
const server = await createServer({
  server: { host: '127.0.0.1', port: 5198, strictPort: true, open: false, watch: { ignored: ['**/qa-artifacts/**'] } },
  plugins: [{ name: 'records-scope-qa-only', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://127.0.0.1:5198')
      const send = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
      const ok = (data) => send({ data })
      const fail = (status, code, message) => send({ error: { code, message, retryable: status >= 500 || status === 429 } }, status)
      if (url.pathname === '/__qa/reset' && req.method === 'POST') { reset(url.searchParams.get('scenario') ?? 'normal'); return ok({ scenario: state.scenario }) }
      if (url.pathname === '/__qa/state') return ok({ scenario: state.scenario, calls: state.calls, records: state.records.map(({ id, pregnancy_id, title, version, attachment_count }) => ({ id, pregnancy_id, title, version, attachment_count })) })
      if (url.pathname === '/__qa/screenshot') {
        const name = url.searchParams.get('name') ?? ''
        if (!/^[a-z0-9-]+\.jpg$/.test(name)) return fail(400, 'INVALID_NAME', 'Use a simple JPG filename')
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          return res.end(`<form method="post"><label>Screenshot JPEG base64<textarea name="image" aria-label="Screenshot JPEG base64"></textarea></label><button type="submit">Lưu ảnh kiểm thử</button></form>`)
        }
        const parts = []; for await (const part of req) parts.push(part)
        const form = new URLSearchParams(Buffer.concat(parts).toString())
        const image = Buffer.from(form.get('image') ?? '', 'base64')
        if (image.length > 2_000_000 || image[0] !== 0xff || image[1] !== 0xd8) return fail(400, 'INVALID_IMAGE', 'Expected a small JPEG screenshot')
        await mkdir('qa-artifacts/medical-record-scope', { recursive: true })
        await writeFile(`qa-artifacts/medical-record-scope/${name}`, image)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.end(`Đã lưu ${name}`)
      }
      if (!url.pathname.startsWith('/api/v1/')) return next()
      const path = url.pathname.slice('/api/v1'.length), method = req.method
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      const bytes = Buffer.concat(chunks)
      const body = req.headers['content-type']?.includes('application/json') && bytes.length ? JSON.parse(bytes.toString()) : {}
      state.calls.push({ path, query: url.search, method, ...(path.startsWith('/medical-records') && method !== 'GET' ? { body } : {}) })
      const rateLimit = () => { state.limited = true; res.setHeader('Retry-After', '3'); return fail(429, 'RATE_LIMITED', 'Bạn đang thao tác quá nhanh. Vui lòng chờ rồi thử lại.') }
      if (path === '/auth/login' || path === '/auth/refresh') return ok({ access_token: 'synthetic-qa-access', refresh_token: 'synthetic-qa-refresh', token_type: 'Bearer', expires_in: 3600, refresh_expires_in: 86400, user })
      if (path === '/auth/logout') return ok({})
      if (path === '/auth/me' || path === '/users/me') return ok(user)
      if (path === '/subscription-plans') return ok(planDtos)
      if (path === '/subscriptions/me') return ok(entitlementsFor('PLAN_399K'))
      if (path === '/payments/my-subscription') return ok({ plan_tier: 'PLAN_399K', plan_name: 'Gói Toàn diện 399K', status: 'ACTIVE', active: true, days_remaining: 100 })
      if (path === '/users/me/preferences') return ok({ timezone: 'Asia/Ho_Chi_Minh', version: 1 })
      if (path === '/pregnancies') {
        if (state.scenario === 'metadata-error') return fail(503, 'SERVICE_UNAVAILABLE', 'Chưa tải được thông tin thai kỳ kiểm thử.')
        return ok(state.pregnancies)
      }
      if (path === '/pregnancies/current') { const active = state.pregnancies.find((item) => item.status === 'ACTIVE'); return active ? ok(active) : fail(404, 'RESOURCE_NOT_FOUND', 'Không có thai kỳ hiện tại.') }
      if (path === '/medical-records' && method === 'GET') {
        if (state.scenario === 'list429' && !state.limited) return rateLimit()
        const filtered = state.records.filter((record) => {
          const day = new Date(new Date(record.occurred_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10)
          return (!url.searchParams.get('pregnancy_id') || record.pregnancy_id === url.searchParams.get('pregnancy_id')) && (!url.searchParams.get('category') || record.category === url.searchParams.get('category')) && (!url.searchParams.get('from') || day >= url.searchParams.get('from')) && (!url.searchParams.get('to') || day <= url.searchParams.get('to'))
        })
        const offset = Number(Buffer.from(url.searchParams.get('cursor') || 'MA==', 'base64').toString()), limit = Number(url.searchParams.get('limit') || 20)
        return ok({ items: filtered.slice(offset, offset + limit).map((record) => ({ ...record, attachments: [] })), has_more: offset + limit < filtered.length, next_cursor: offset + limit < filtered.length ? Buffer.from(String(offset + limit)).toString('base64') : null })
      }
      if (path === '/medical-records' && method === 'POST') {
        if (state.scenario === 'create429' && !state.limited) return rateLimit()
        if (state.scenario === 'create-expired' && !state.expired) {
          state.expired = true
          state.pregnancies = [{ ...current, id: 'pregnancy-new', created_at: '2026-10-24T00:00:00Z' }, { ...previous, id: current.id }, previous]
          return fail(409, 'PREGNANCY_NOT_ACTIVE', 'Thai kỳ đã kết thúc.')
        }
        if (!state.pregnancies.some((item) => item.id === body.pregnancy_id && item.status === 'ACTIVE')) return fail(409, 'PREGNANCY_NOT_ACTIVE', 'Thai kỳ đã kết thúc.')
        const record = { ...makeRecord(`record-created-${state.records.length}`, body.pregnancy_id, body.title, '23'), ...body, attachments: (body.attachment_ids ?? []).map((id) => state.files.get(id)?.metadata).filter(Boolean), attachment_count: body.attachment_ids?.length ?? 0 }
        state.records.unshift(record); return ok(record)
      }
      if (path.startsWith('/medical-records/')) {
        const id = path.split('/')[2], record = state.records.find((item) => item.id === id)
        if (!record) return fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy hồ sơ.')
        if (path.endsWith('/reminders')) return ok({ id: 'reminder-created', title: body.title, type: body.type, starts_at: body.starts_at, date: new Date(new Date(body.starts_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10), timezone: 'Asia/Ho_Chi_Minh', pregnancy_id: record.pregnancy_id, status: 'SCHEDULED', version: 0 })
        if (method === 'PATCH') {
          if (state.scenario === 'update-conflict' && !state.conflicted) { state.conflicted = true; record.version += 1; return fail(409, 'VERSION_CONFLICT', 'Hồ sơ đã thay đổi.') }
          if (body.version !== record.version) return fail(409, 'VERSION_CONFLICT', 'Hồ sơ đã thay đổi.')
          Object.assign(record, body, { version: record.version + 1 }); return ok(record)
        }
        if (method === 'DELETE') {
          if (state.scenario === 'delete429' && !state.limited) return rateLimit()
          state.records = state.records.filter((item) => item.id !== id); res.statusCode = 204; return res.end()
        }
        return ok(record)
      }
      if (path === '/files/upload-sessions') {
        const id = `file-${state.files.size + 1}`
        state.files.set(id, { metadata: { id, file_name: body.file_name, mime_type: body.mime_type, size_bytes: body.size_bytes, status: 'UPLOADING' }, bytes: Buffer.alloc(0) })
        return ok({ file_id: id, upload_url: `/api/v1/files/${id}/content`, headers: { 'Content-Type': body.mime_type, 'X-File-Id': id }, expires_at: '2099-01-01T00:00:00Z' })
      }
      if (path.startsWith('/files/')) {
        const id = path.split('/')[2], file = state.files.get(id)
        if (!file) return fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tệp kiểm thử.')
        if (method === 'PUT') { file.bytes = bytes; res.statusCode = 204; return res.end() }
        if (path.endsWith('/complete')) { file.metadata.status = 'READY'; return ok(file.metadata) }
        if (path.endsWith('/download-url')) return ok({ download_url: `/api/v1/files/${id}/content?token=synthetic-qa` })
        res.setHeader('Content-Type', file.metadata.mime_type); return res.end(file.bytes)
      }
      if (path === '/notifications/unread-count') return ok({ count: 0 })
      if (path === '/notifications') return ok({ items: [], has_more: false })
      if (path === '/family-groups') return ok([])
      if (path === '/assistant/status') return ok({ enabled: false })
      if (path === '/dashboard/mom') return ok({ profile_summary: { display_name: user.display_name, role: 'MOM' }, pregnancy_summary: state.pregnancies.find((item) => item.status === 'ACTIVE') ?? null, upcoming_reminders: [], unread_notification_count: 0 })
      if (path === '/calendar/month') return ok([])
      if (path === '/calendar/events') return ok([])
      if (path === '/calendar/reminders') return ok({ items: [] })
      return ok([])
    })
  } }],
})
await server.listen()
console.log('Synthetic records QA only: http://127.0.0.1:5198/login')
