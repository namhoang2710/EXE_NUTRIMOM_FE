import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { activityFeedNextState, buildActivityPath, buildTasksPath, invitationBody, resetActivityFeedState } from '../src/features/family/model/family-requests.ts'
import { activityDayKey, formatVietnamDateTime, memberLabel, relationshipLabels, scopeLabels, taskPriorityLabels, taskStatusLabels, toIsoTimestamp } from '../src/features/family/model/family-formatters.ts'

test('family API uses the backend endpoints, methods and snake_case bodies', async () => {
  const source = await readFile(new URL('../src/features/family/api/family-api.ts', import.meta.url), 'utf8')
  assert.match(source, /'\/family-groups'/)
  assert.match(source, /'\/family-invitations'/)
  assert.match(source, /'\/family-invitations\/accept'/)
  assert.match(source, /`\/family-members\/\$\{encodeURIComponent\(memberId\)\}`/)
  assert.match(source, /`\/family\/tasks\/\$\{encodeURIComponent\(taskId\)\}`/)
  assert.match(source, /method: 'POST'/)
  assert.match(source, /method: 'PATCH'/)
  assert.match(source, /method: 'DELETE'/)
  assert.match(source, /pregnancy_id|assignee_id/)
})

test('invitation sends exactly one target', () => {
  const base = { relationship: 'PARTNER' as const, scopes: ['FAMILY_TASKS' as const] }
  assert.deepEqual(invitationBody({ ...base, invited_phone: ' 0901234567 ' }), { invited_phone: '0901234567', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'] })
  assert.deepEqual(invitationBody({ ...base, invited_email: ' family@example.com ' }), { invited_email: 'family@example.com', relationship: 'PARTNER', scopes: ['FAMILY_TASKS'] })
  assert.throws(() => invitationBody({ ...base, invited_phone: '0901', invited_email: 'family@example.com' }))
  assert.throws(() => invitationBody(base))
})

test('task filter keeps assignee_id as the member id and encodes query values', () => {
  assert.equal(buildTasksPath({ assignee_id: 'member/id', status: 'IN_PROGRESS' }), '/family/tasks?assignee_id=member%2Fid&status=IN_PROGRESS')
})

test('member and task patches always send version', async () => {
  const source = await readFile(new URL('../src/features/family/api/family-api.ts', import.meta.url), 'utf8')
  assert.match(source, /JSON\.stringify\(\{ scopes, version \}\)/)
  assert.match(source, /updateTask: \(taskId: string, body: UpdateTaskInput\)/)
  const types = await readFile(new URL('../src/features/family/model/family-types.ts', import.meta.url), 'utf8')
  assert.match(types, /interface UpdateTaskInput[^]*version: number/)
})

test('family enums are translated to Vietnamese', () => {
  assert.equal(taskStatusLabels.COMPLETED, 'Đã hoàn thành')
  assert.equal(taskPriorityLabels.URGENT, 'Khẩn cấp')
  assert.equal(relationshipLabels.SIBLING, 'Anh/chị/em')
  assert.equal(scopeLabels.ACTIVITY_FEED, 'Hoạt động')
})

test('activity cursor is opaque, load-more appends, and refresh resets it', () => {
  const cursor = 'opaque+/= cursor'
  const activityUrl = new URL(buildActivityPath(cursor), 'https://nutrimom.test')
  assert.equal(activityUrl.searchParams.get('cursor'), cursor)
  const first = activityFeedNextState(resetActivityFeedState(), { items: [{ id: '1', type: 'CONTACT_COMPLETED', title: 'Xong', created_at: '2026-10-01T00:00:00Z' }], next_cursor: cursor, has_more: true }, true)
  const second = activityFeedNextState(first, { items: [{ id: '2', type: 'FAMILY_TASK_COMPLETED', title: 'Xong việc', created_at: '2026-09-30T00:00:00Z' }], has_more: false }, false)
  assert.deepEqual(second.items.map((item) => item.id), ['1', '2'])
  assert.deepEqual(resetActivityFeedState(), { items: [], nextCursor: undefined, hasMore: false })
})

test('optional family fields have safe fallbacks', () => {
  assert.equal(formatVietnamDateTime(), 'Chưa đặt thời hạn')
  assert.equal(memberLabel(), 'Một thành viên gia đình')
  assert.equal(toIsoTimestamp('not-a-date'), undefined)
  assert.equal(typeof activityDayKey('not-a-date'), 'string')
})

test('version conflict exposes a reload action', async () => {
  const tasks = await readFile(new URL('../src/features/family/components/FamilyTasksPanel.tsx', import.meta.url), 'utf8')
  const members = await readFile(new URL('../src/features/family/components/FamilyGroupPanel.tsx', import.meta.url), 'utf8')
  assert.match(tasks, /VERSION_CONFLICT[^]*>Tải lại</)
  assert.match(members, /Dữ liệu thành viên đã thay đổi[^]*>Tải lại</)
})

test('owner and member receive distinct action groups', async () => {
  const group = await readFile(new URL('../src/features/family/components/FamilyGroupPanel.tsx', import.meta.url), 'utf8')
  const tasks = await readFile(new URL('../src/features/family/components/FamilyTasksPanel.tsx', import.meta.url), 'utf8')
  assert.match(group, /isOwner && <button[^]*Mời thành viên/)
  assert.match(group, /isOwner \? <div className="family-member-list"/)
  assert.match(tasks, /isOwner && <button[^]*Tạo việc/)
  assert.match(tasks, /!canUseTasks[^]*Việc cần làm chưa được chia sẻ/)
})

test('family route is protected by the app guard and navbar links to it', async () => {
  const router = await readFile(new URL('../src/app/router.tsx', import.meta.url), 'utf8')
  const navbar = await readFile(new URL('../src/shared/layouts/AuthenticatedNavbar.tsx', import.meta.url), 'utf8')
  assert.match(router, /path="app" element=\{<ProtectedRoute><AppLayout \/><\/ProtectedRoute>\}/)
  assert.match(router, /path="family"/)
  assert.match(navbar, /to="\/app\/family"[^>]*>Gia đình<\/NavLink>/)
})

test('partner dashboard reads optional activity_feed and links to Family Hub', async () => {
  const types = await readFile(new URL('../src/types/domain.ts', import.meta.url), 'utf8')
  const dashboard = await readFile(new URL('../src/pages/DashboardPage.tsx', import.meta.url), 'utf8')
  assert.match(types, /activity_feed\?: PartnerActivityEvent\[]/)
  assert.match(dashboard, /activity_feed !== undefined/)
  assert.match(dashboard, /activity_feed\.slice\(0, 3\)/)
  assert.match(dashboard, /to="\/app\/family\?tab=activity"/)
})

test('Family Hub includes loading, empty and retry states', async () => {
  const page = await readFile(new URL('../src/features/family/pages/FamilyPage.tsx', import.meta.url), 'utf8')
  const activity = await readFile(new URL('../src/features/family/components/ActivityTimeline.tsx', import.meta.url), 'utf8')
  assert.match(page, /family-page-skeleton/)
  assert.match(page, /family-onboarding/)
  assert.match(activity, /family-activity-skeleton/)
  assert.match(activity, />Thử lại</)
})
