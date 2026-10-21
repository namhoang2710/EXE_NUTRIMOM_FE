import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildAdminConsultationsQueryString,
  getAdminConsultationSpecialtyLabel,
  readAdminConsultationsQuery,
  toAdminConsultationsSearchParams,
} from '../src/features/admin/model/admin-consultations.ts'
import { mapAdminConsultation, mapAdminConsultationsPage } from '../src/features/admin/model/admin-consultations-mappers.ts'
import type { AdminConsultationDto, AdminConsultationPageDto } from '../src/features/admin/model/admin-consultations-mappers.ts'
import { formatVietnamDate, formatVietnamDateTime, formatVietnamTime } from '../src/features/admin/model/admin-formatters.ts'

const consultationDto: AdminConsultationDto = {
  id: 'request-1',
  user_id: 'user-1',
  user_display_name: 'Nguyen An',
  expert_user_id: 'expert-1',
  expert_name: 'Dr. Tran Binh',
  specialty: 'PSYCHOLOGY',
  assignment_type: 'DIRECT',
  status: 'COMPLETED',
  slot: {
    id: 'slot-1',
    slot_date: '2026-09-30',
    start_time: '08:30:00',
    end_time: '09:15:00',
  },
  completed_at: '2026-09-30T02:30:00Z',
  created_at: '2026-09-20T01:15:00Z',
  review: {
    id: 'review-1',
    request_id: 'request-1',
    user_id: 'user-1',
    user_display_name: 'Nguyen An',
    expert_user_id: 'expert-1',
    rating: 5,
    comment: 'Very helpful',
    created_at: '2026-09-30T03:00:00Z',
  },
}

test('maps the complete snake_case consultation DTO to the camelCase domain model', () => {
  const consultation = mapAdminConsultation(consultationDto)
  assert.equal(consultation.userId, 'user-1')
  assert.equal(consultation.userDisplayName, 'Nguyen An')
  assert.equal(consultation.expertUserId, 'expert-1')
  assert.equal(consultation.assignmentType, 'DIRECT')
  assert.deepEqual(consultation.slot, {
    id: 'slot-1',
    slotDate: '2026-09-30',
    startTime: '08:30:00',
    endTime: '09:15:00',
  })
  assert.deepEqual(consultation.review, {
    id: 'review-1',
    requestId: 'request-1',
    userId: 'user-1',
    userDisplayName: 'Nguyen An',
    expertUserId: 'expert-1',
    rating: 5,
    comment: 'Very helpful',
    createdAt: '2026-09-30T03:00:00Z',
  })
})
test('maps nullable review, names, slot and completion time without throwing', () => {
  const consultation = mapAdminConsultation({
    ...consultationDto,
    user_display_name: null,
    expert_name: null,
    expert_user_id: null,
    slot: null,
    completed_at: null,
    review: null,
  })
  assert.equal(consultation.userDisplayName, null)
  assert.equal(consultation.expertName, null)
  assert.equal(consultation.slot, null)
  assert.equal(consultation.completedAt, null)
  assert.equal(consultation.review, null)
})
test('maps page metadata and excludes invalid status or rating records independently', () => {
  const dto: AdminConsultationPageDto = {
    items: [structuredClone(consultationDto), structuredClone(consultationDto), structuredClone(consultationDto)],
    page: 2,
    page_size: 20,
    total_items: 42,
    total_pages: 3,
  }
  Reflect.set(dto.items[1], 'status', 'PENDING')
  Reflect.set(dto.items[2].review ?? {}, 'rating', 8)
  const page = mapAdminConsultationsPage(dto)
  assert.equal(page.pageSize, 20)
  assert.equal(page.totalItems, 42)
  assert.equal(page.items.length, 1)
  assert.equal(page.invalidItems, 2)
  assert.equal(page.items[0].status, 'COMPLETED')
})

test('reads and safely normalizes one-based URL state', () => {
  assert.deepEqual(readAdminConsultationsQuery('?page=3&pageSize=75&q=%20nguyen%20'), { page: 3, pageSize: 75, q: 'nguyen' })
  assert.deepEqual(readAdminConsultationsQuery('?page=0&pageSize=101&q=%20%20'), { page: 1, pageSize: 20, q: undefined })
  assert.deepEqual(readAdminConsultationsQuery('?page=2.5&pageSize=-1'), { page: 1, pageSize: 20, q: undefined })
})

test('serializes the exact backend query with pageSize, encoding and no empty q or status', () => {
  const query = buildAdminConsultationsQueryString({ page: 2, pageSize: 50, q: 'Nguyen & Tran' })
  assert.equal(query, '?page=2&pageSize=50&q=Nguyen+%26+Tran')
  assert.equal(query.includes('page_size'), false)
  assert.equal(query.includes('status'), false)
  assert.equal(buildAdminConsultationsQueryString({ page: 1, pageSize: 20, q: '  ' }), '?page=1&pageSize=20')
  assert.equal(toAdminConsultationsSearchParams({ page: 1, pageSize: 20 }).get('q'), null)
})

test('provides contract labels and Vietnam-safe date/time formatting', () => {
  assert.equal(getAdminConsultationSpecialtyLabel('PSYCHOLOGY'), 'Tâm lý')
  assert.equal(getAdminConsultationSpecialtyLabel('OBSTETRICS'), 'Chuyên khoa')
  assert.equal(getAdminConsultationSpecialtyLabel('HEALTH'), 'Sức khỏe')
  assert.equal(formatVietnamDate('2026-09-30'), '30/09/2026')
  assert.equal(formatVietnamTime('08:30:00'), '08:30')
  assert.equal(formatVietnamDateTime('2026-09-30T05:55:00Z'), '12:55 30/09/2026')
  assert.equal(formatVietnamDate('2026-02-31'), null)
  assert.equal(formatVietnamDateTime('not-a-date'), null)
})

test('history uses the existing endpoint through the shared abortable Admin coordinator', async () => {
  const page = await readFile(new URL('../src/features/admin/pages/AdminConsultationsPage.tsx', import.meta.url), 'utf8')
  const hook = await readFile(new URL('../src/features/admin/hooks/useAdminResource.ts', import.meta.url), 'utf8')
  assert.match(page, /\/admin\/consultation-requests/)
  assert.match(page, /mapAdminConsultation\(item as AdminConsultationDto\)/)
  assert.match(hook, /controller.signal/)
  assert.match(hook, /controller.abort\(\)/)
  assert.doesNotMatch(page, /fromMock|\/app\/consultations/)
})

test('history shares validated filters, debounced search, resource states and independent detail', async () => {
  const page = await readFile(new URL('../src/features/admin/pages/AdminConsultationsPage.tsx', import.meta.url), 'utf8')
  const filters = await readFile(new URL('../src/features/admin/hooks/useAdminFilters.ts', import.meta.url), 'utf8')
  assert.match(page, /useAdminFilters\('consultations'\)/)
  assert.match(page, /f.valid \?/)
  assert.match(page, /reviewed/)
  assert.match(page, /PeriodFilter/)
  assert.match(page, /DataState/)
  assert.match(page, /WorkspacePagination/)
  assert.match(page, /AppointmentDrawer/)
  assert.match(page, /completedOnly/)
  assert.match(filters, /400/)
})

test('completed history retains reviews and responsive cards with read-only detail', async () => {
  const table = await readFile(new URL('../src/features/admin/components/AdminConsultationsTable.tsx', import.meta.url), 'utf8')
  assert.match(table, /Chưa đánh giá/)
  assert.match(table, /Không có nhận xét/)
  assert.match(table, /admin-consultation-cards/)
  assert.match(table, /onView\(consultation.id\)/)
  assert.doesNotMatch(table, /VideoRoomLink|medical.history|cancelConsultation|completeConsultation/i)
})

test('Swirling loader supports reduced motion', async () => {
  const loader = await readFile(new URL('../src/components/loading-ui/swirling.tsx', import.meta.url), 'utf8')
  assert.match(loader, /loading-ui-swirling-circle/)
  assert.match(loader, /prefers-reduced-motion: reduce/)
})

test('AdminOnly protects all workspace routes including the history deep link', async () => {
  const router = await readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8')
  assert.equal((router.match(/<Route path="consultations" element=\{<AdminConsultationsPage \/>\} \/>/g) ?? []).length, 1)
  assert.match(router, /<Route path="admin" element=\{<AdminOnly>/)
  for (const route of ['experts','revenue','notifications']) assert.ok(router.includes('<Route path="'+route+'" element={<Admin'))
})

