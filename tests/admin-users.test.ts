import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  adminOnboardingStatuses,
  adminUserRoles,
  adminUserStatuses,
  buildAdminUsersChartGeometry,
  buildAdminUsersQueryString,
  formatAdminUserEnum,
  readAdminUsersQuery,
} from '../src/features/admin/model/admin-users.ts'
import type { AdminUsersMonthlyProgress } from '../src/features/admin/model/admin-users.ts'
import { mapAdminUserDetail, mapAdminUsersPage, mapAdminUsersSummary } from '../src/features/admin/model/admin-users-mappers.ts'

const months: AdminUsersMonthlyProgress[] = Array.from({ length: 12 }, (_, index) => ({
  month: index + 1,
  monthLabel: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
  newUsers: index < 9 ? index + 1 : 0,
  cumulativeUsers: index < 9 ? (index + 1) * 10 : 0,
  percentage: index < 9 ? (index + 1) * 10 : null,
  future: index >= 9,
}))

test('reads valid URL state and serializes the exact one-based backend query', () => {
  const query = readAdminUsersQuery('?page=2&pageSize=50&q=%20an%20&status=ACTIVE&role=CONTENT_EDITOR&onboardingStatus=COMPLETED&sortBy=updatedAt&sortDirection=asc')
  assert.deepEqual(query, {
    page: 2,
    pageSize: 50,
    q: 'an',
    status: 'ACTIVE',
    role: 'CONTENT_EDITOR',
    onboardingStatus: 'COMPLETED',
    sortBy: 'updatedAt',
    sortDirection: 'asc',
  })
  assert.equal(
    buildAdminUsersQueryString(query),
    '?page=2&pageSize=50&q=an&status=ACTIVE&role=CONTENT_EDITOR&onboardingStatus=COMPLETED&sortBy=updatedAt&sortDirection=asc',
  )
})

test('omits empty filters and safely falls back for invalid URL state', () => {
  const query = readAdminUsersQuery('?page=0&pageSize=999&q=%20%20&status=PENDING&role=DOCTOR&onboardingStatus=UNKNOWN&sortBy=lastActiveAt&sortDirection=sideways')
  assert.deepEqual(query, { page: 1, pageSize: 20, sortBy: 'createdAt', sortDirection: 'desc', q: undefined, status: undefined, role: undefined, onboardingStatus: undefined })
  assert.equal(buildAdminUsersQueryString(query), '?page=1&pageSize=20&sortBy=createdAt&sortDirection=desc')
  assert.deepEqual(adminUserStatuses, ['ACTIVE', 'LOCKED', 'DISABLED'])
  assert.deepEqual(adminOnboardingStatuses, ['PROFILE_REQUIRED', 'CONTEXT_REQUIRED', 'COMPLETED'])
  assert.deepEqual(adminUserRoles, ['USER', 'EXPERT', 'CONTENT_EDITOR', 'CONTENT_REVIEWER', 'CONTENT_PUBLISHER', 'ADMIN'])
})

test('formats backend enum labels without changing their API values', () => {
  assert.equal(formatAdminUserEnum('CONTENT_PUBLISHER'), 'Content publisher')
  assert.equal(formatAdminUserEnum('IN_PROGRESS'), 'In progress')
})

test('maps the backend snake_case envelope data while preserving role arrays', () => {
  const item = {
    id: 'user-1', display_name: 'An Nguyen', phone: '+84900000001', email: null, avatar_key: null,
    roles: ['USER', 'EXPERT'] as const, status: 'ACTIVE' as const, onboarding_status: 'COMPLETED' as const,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  }
  const page = mapAdminUsersPage({ items: [{ ...item, roles: [...item.roles] }], page: 1, page_size: 20, total_items: 1, total_pages: 1 })
  assert.equal(page.pageSize, 20)
  assert.equal(page.totalItems, 1)
  assert.equal(page.items[0].displayName, 'An Nguyen')
  assert.deepEqual(page.items[0].roles, ['USER', 'EXPERT'])

  const detail = mapAdminUserDetail({ ...item, roles: [...item.roles], gender: null, date_of_birth: null, terms_accepted_at: null, privacy_accepted_at: null, version: 4 })
  assert.equal(detail.dateOfBirth, null)
  assert.equal(detail.termsAcceptedAt, null)
  assert.equal(detail.version, 4)

  const summary = mapAdminUsersSummary({
    total_users: 10, active_users: 8, new_users_this_month: 2,
    current_period: { month: 9, year: 2026, label: '9/2026', timezone: 'Asia/Ho_Chi_Minh' },
    monthly_progress: [{ month: 9, month_label: 'Sep', new_users: 2, cumulative_users: 10, percentage: 100, future: false }],
  })
  assert.equal(summary.totalUsers, 10)
  assert.equal(summary.currentPeriod.label, '9/2026')
  assert.deepEqual(summary.monthlyProgress[0], { month: 9, monthLabel: 'Sep', newUsers: 2, cumulativeUsers: 10, percentage: 100, future: false })
})

test('chart uses backend percentages and stops before future months', () => {
  const geometry = buildAdminUsersChartGeometry(months)
  assert.equal(geometry.points.length, 9)
  assert.deepEqual(geometry.points.map((point) => point.value), [10, 20, 30, 40, 50, 60, 70, 80, 90])
  assert.equal(geometry.points.at(-1)?.item.monthLabel, 'Sep')
  assert.equal(geometry.linePath.includes('NaN'), false)
  assert.equal(geometry.areaPath.includes('NaN'), false)
})

test('chart renders valid geometry for all-zero and single-point series', () => {
  const zeroGeometry = buildAdminUsersChartGeometry(months.map((item, index) => ({ ...item, percentage: index < 9 ? 0 : null })))
  assert.equal(zeroGeometry.points.length, 9)
  assert.equal(new Set(zeroGeometry.points.map((point) => point.y)).size, 1)
  assert.equal(zeroGeometry.linePath.includes('NaN'), false)

  const singleGeometry = buildAdminUsersChartGeometry([{ ...months[0], percentage: 100 }])
  assert.equal(singleGeometry.points.length, 1)
  assert.match(singleGeometry.linePath, /^M /)
  assert.equal(singleGeometry.areaPath.includes('NaN'), false)
})

test('users page exposes only read-only account management actions', async () => {
  const source = await readFile(new URL('../src/features/admin/pages/AdminUsersPage.tsx', import.meta.url), 'utf8')
  const tableSource = await readFile(new URL('../src/features/admin/components/AdminUsersTable.tsx', import.meta.url), 'utf8')
  const topbarSource = await readFile(new URL('../src/features/admin/components/AdminTopbar.tsx', import.meta.url), 'utf8')
  const chartSource = await readFile(new URL('../src/features/admin/components/AdminUsersChart.tsx', import.meta.url), 'utf8')
  const drawerSource = await readFile(new URL('../src/features/admin/components/AdminUserDetailDrawer.tsx', import.meta.url), 'utf8')
  const filterSource = await readFile(new URL('../src/features/admin/components/AdminFilterSelect.tsx', import.meta.url), 'utf8')
  for (const forbidden of ['Add User', 'Export', 'Specialists', 'Last active', 'Doctor', 'Nutritionist']) {
    assert.equal(source.includes(forbidden), false, forbidden)
    assert.equal(tableSource.includes(forbidden), false, forbidden)
  }
  assert.match(source, /New this month \{summary\.currentPeriod\.label\}/)
  assert.match(source, /title="User Management"/)
  assert.match(tableSource, /View details/)
  assert.match(tableSource, /user\.roles\.map/)
  assert.equal(tableSource.includes('<th>Onboarding</th>'), false)
  assert.equal(tableSource.includes('label="Updated"'), false)
  assert.match(topbarSource, /admin\/users\?q=/)
  assert.match(chartSource, /summary\.monthlyProgress\.map/)
  assert.match(drawerSource, /setTimeout\(onClose/)
  assert.match(drawerSource, /data-open=\{visible\}/)
  assert.match(filterSource, /data-open=\{open\}/)
})
