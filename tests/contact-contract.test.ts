import assert from 'node:assert/strict'
import test from 'node:test'
import { ErrorCodes } from '../src/core/api/error-code.ts'
import { contactEndpoints } from '../src/features/contact/model/contact-endpoints.ts'
import {
  ADMIN_STATUS_ALL,
  buildContactQueryString,
  clampContactPage,
  hasAdminContactFilters,
  readAdminContactQuery,
  readUserContactQuery,
  toAdminListQuery,
} from '../src/features/contact/model/contact-query.ts'
import {
  contactGenderLabel,
  contactStatusLabel,
  contactStatusTone,
  contactTopicLabel,
} from '../src/features/contact/model/contact-labels.ts'
import { formatPlainDate, formatVietnamDateTime } from '../src/features/contact/model/contact-format.ts'
import { CONTACT_MESSAGE_MAX, validateContactForm } from '../src/features/contact/model/contact-validation.ts'

test('uses paths relative to the shared /api/v1 client base', () => {
  assert.equal(contactEndpoints.requests, '/contact-requests')
  assert.equal(contactEndpoints.request('5d0c'), '/contact-requests/5d0c')
  assert.equal(contactEndpoints.cancel('5d0c'), '/contact-requests/5d0c/cancel')
  assert.equal(contactEndpoints.adminRequests, '/admin/contact-requests')
  assert.equal(contactEndpoints.adminRequest('a/b'), '/admin/contact-requests/a%2Fb')
  assert.equal(contactEndpoints.complete('a b'), '/admin/contact-requests/a%20b/complete')
})

test('keeps query parameters camelCase even though response bodies are snake_case', () => {
  assert.equal(buildContactQueryString({ page: 2, pageSize: 20 }), '?page=2&pageSize=20')
  assert.equal(
    buildContactQueryString({ status: 'PENDING', topic: 'POLICY', q: undefined, page: 1, pageSize: 20 }),
    '?status=PENDING&topic=POLICY&page=1&pageSize=20',
  )
  assert.equal(buildContactQueryString({ q: '', page: 1 }), '?page=1')
  assert.equal(buildContactQueryString({ q: 'Nguyễn Lan' }), '?q=Nguy%E1%BB%85n+Lan')
})

test('user history always asks for page 1 unless the URL says otherwise', () => {
  assert.deepEqual(readUserContactQuery(''), { page: 1, pageSize: 5 })
  assert.deepEqual(readUserContactQuery('?page=3'), { page: 3, pageSize: 5 })
  for (const search of ['?page=0', '?page=-1', '?page=abc', '?page=2.5', '?page=1e21']) {
    assert.equal(readUserContactQuery(search).page, 1, search)
  }
})

test('admin inbox shows every status by default and omits the parameter entirely', () => {
  const fallback = readAdminContactQuery('')
  assert.deepEqual(fallback, { page: 1, pageSize: 20, statusFilter: ADMIN_STATUS_ALL, topic: undefined, q: undefined })
  assert.equal(toAdminListQuery(fallback).status, undefined)
  assert.equal(buildContactQueryString(toAdminListQuery(fallback)), '?page=1&pageSize=20')

  const pending = readAdminContactQuery('?status=PENDING')
  assert.equal(pending.statusFilter, 'PENDING')
  assert.equal(toAdminListQuery(pending).status, 'PENDING')

  const filtered = readAdminContactQuery('?status=COMPLETED&topic=POLICY&q=%20%20Lan%20%20&page=2')
  assert.deepEqual(toAdminListQuery(filtered), { page: 2, pageSize: 20, status: 'COMPLETED', topic: 'POLICY', q: 'Lan' })
})

test('accepts only the offered page sizes so the backend never sees an out-of-range one', () => {
  assert.equal(readAdminContactQuery('').pageSize, 20)
  for (const size of [10, 20, 50, 100]) {
    assert.equal(readAdminContactQuery(`?pageSize=${size}`).pageSize, size, String(size))
  }
  // 200 vượt trần 100 của backend, 7 không có trong danh sách, 'abc' không phải số.
  for (const search of ['?pageSize=200', '?pageSize=7', '?pageSize=abc', '?pageSize=0', '?pageSize=']) {
    assert.equal(readAdminContactQuery(search).pageSize, 20, search)
  }
})

test('rejects hand-edited enum values so the backend never sees an invalid parameter', () => {
  const hacked = readAdminContactQuery('?status=DROP_TABLE&topic=hack&q=')
  assert.equal(hacked.statusFilter, ADMIN_STATUS_ALL)
  assert.equal(hacked.topic, undefined)
  assert.equal(hacked.q, undefined)
  assert.equal(buildContactQueryString(toAdminListQuery(hacked)), '?page=1&pageSize=20')
})

test('knows when the filter bar differs from its defaults', () => {
  assert.equal(hasAdminContactFilters(readAdminContactQuery('')), false)
  assert.equal(hasAdminContactFilters(readAdminContactQuery('?page=4')), false)
  assert.equal(hasAdminContactFilters(readAdminContactQuery('?pageSize=50')), false)
  assert.equal(hasAdminContactFilters(readAdminContactQuery('?status=PENDING')), true)
  assert.equal(hasAdminContactFilters(readAdminContactQuery('?topic=OTHER')), true)
  assert.equal(hasAdminContactFilters(readAdminContactQuery('?q=Lan')), true)
})

test('falls back to the last populated page because the server echoes the requested page', () => {
  assert.equal(clampContactPage({ items: [], page: 5, page_size: 20, total_items: 24, total_pages: 2 }), 2)
  assert.equal(clampContactPage({ items: [], page: 1, page_size: 20, total_items: 0, total_pages: 0 }), 1)
  assert.equal(clampContactPage({ items: [], page: 3, page_size: 20, total_items: 0, total_pages: 0 }), 1)
  assert.equal(clampContactPage({ items: [{}], page: 3, page_size: 20, total_items: 70, total_pages: 4 }), 3)
})

test('labels every status and topic in Vietnamese', () => {
  assert.equal(contactTopicLabel('POLICY'), 'Chính sách')
  assert.equal(contactTopicLabel('APP_USAGE'), 'Cách sử dụng')
  assert.equal(contactTopicLabel('ACCOUNT'), 'Tài khoản')
  assert.equal(contactTopicLabel('OTHER'), 'Khác')
  assert.equal(contactStatusLabel('PENDING'), 'Đang chờ')
  assert.equal(contactStatusLabel('COMPLETED'), 'Đã hoàn tất')
  assert.equal(contactStatusLabel('CANCELLED'), 'Đã hủy')
  assert.equal(contactStatusLabel('SOMETHING_NEW'), 'SOMETHING_NEW')
  assert.equal(contactStatusTone('COMPLETED'), 'positive')
  assert.equal(contactStatusTone('CANCELLED'), 'negative')
  assert.equal(contactStatusTone('PENDING'), 'warning')
  assert.equal(contactGenderLabel('FEMALE'), 'Nữ')
  assert.equal(contactGenderLabel(null), '—')
})

test('renders timestamps in Vietnam time regardless of the host timezone', () => {
  assert.equal(formatVietnamDateTime('2026-09-25T03:40:00Z'), '25/09/2026 10:40')
  // Vietnamese midnight is 17:00 UTC the previous day; h23 must render "00", never "24".
  assert.equal(formatVietnamDateTime('2026-09-24T17:00:00Z'), '25/09/2026 00:00')
  assert.equal(formatVietnamDateTime('2026-09-25T16:59:00Z'), '25/09/2026 23:59')
  assert.equal(formatVietnamDateTime('2026-09-25T10:40:00+07:00'), '25/09/2026 10:40')
  assert.equal(formatVietnamDateTime(null), '—')
  assert.equal(formatVietnamDateTime('not-a-date'), '—')
})

test('formats a zone-less date without shifting it', () => {
  assert.equal(formatPlainDate('1995-04-12'), '12/04/1995')
  assert.equal(formatPlainDate('1995-01-01'), '01/01/1995')
  assert.equal(formatPlainDate(null), '—')
})

test('mirrors the server validation rules, including its leading trim', () => {
  const maxMessage = 'a'.repeat(CONTACT_MESSAGE_MAX)
  assert.deepEqual(validateContactForm('POLICY', 'Chính sách hoàn tiền thế nào?'), {})
  assert.equal(validateContactForm('', 'x').topic, 'Vui lòng chọn chủ đề thắc mắc.')
  assert.equal(validateContactForm('POLICY', '   ').message, 'Vui lòng nhập nội dung thắc mắc.')
  assert.deepEqual(validateContactForm('POLICY', maxMessage), {})
  assert.deepEqual(validateContactForm('POLICY', '  ' + maxMessage + '  '), {})
  assert.ok(validateContactForm('POLICY', 'a'.repeat(CONTACT_MESSAGE_MAX + 1)).message)
  // Java @Size and JS String.length both count UTF-16 code units, so an emoji costs 2 on both sides.
  assert.ok(validateContactForm('POLICY', '😀'.repeat(CONTACT_MESSAGE_MAX / 2 + 1)).message)
})

test('pins the contact error codes that only ever appear as runtime strings', () => {
  assert.equal(ErrorCodes.contactRequestLimitReached, 'CONTACT_REQUEST_LIMIT_REACHED')
  assert.equal(ErrorCodes.invalidContactRequestState, 'INVALID_CONTACT_REQUEST_STATE')
})
