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
  const tasks = await readFile(new URL('../src/features/family/components/FamilyTasksPanel.tsx', import.meta.url), 'utf8')
  const activity = await readFile(new URL('../src/features/family/components/ActivityTimeline.tsx', import.meta.url), 'utf8')
  const loadingState = await readFile(new URL('../src/features/family/components/FamilyLoadingState.tsx', import.meta.url), 'utf8')
  const loader = await readFile(new URL('../src/components/ui/loader.tsx', import.meta.url), 'utf8')
  const loadingTiming = await readFile(new URL('../src/features/family/model/family-loading.ts', import.meta.url), 'utf8')
  assert.match(page, /<FamilyLoadingState label="Đang tải nhóm gia đình"/)
  assert.match(page, /family-onboarding/)
  assert.match(tasks, /<FamilyLoadingState label="Đang tải việc cần làm"/)
  assert.match(activity, /<FamilyLoadingState label="Đang tải hoạt động"/)
  assert.match(loadingState, /<LoaderOne \/>/)
  assert.match(loader, /useReducedMotion/)
  assert.match(loadingTiming, /FAMILY_LOADING_MINIMUM_MS = 1500/)
  assert.match(activity, />Thử lại</)
})

test('Family Hub dropdowns animate down when opened and up when closed', async () => {
  const dropdown = await readFile(new URL('../src/components/ui/animated-select.tsx', import.meta.url), 'utf8')
  const tasks = await readFile(new URL('../src/features/family/components/FamilyTasksPanel.tsx', import.meta.url), 'utf8')
  const invitations = await readFile(new URL('../src/features/family/components/InvitationDialogs.tsx', import.meta.url), 'utf8')
  const taskEditor = await readFile(new URL('../src/features/family/components/TaskEditorDialog.tsx', import.meta.url), 'utf8')
  assert.match(dropdown, /AnimatePresence/)
  assert.match(dropdown, /initial=.*opacity: 0, height: 0, y: -8/)
  assert.match(dropdown, /animate=\{\{ opacity: 1, height: 'auto', y: 0 \}\}/)
  assert.match(dropdown, /exit=.*opacity: 0, height: 0, y: -8/)
  assert.match(dropdown, /role="listbox"/)
  assert.match(dropdown, /event\.key === 'Escape'/)
  assert.match(tasks, /<AnimatedSelect className="family-filter-select"/)
  assert.match(invitations, /<AnimatedSelect className="family-field" label="Mối quan hệ"/)
  assert.match(taskEditor, /<AnimatedSelect className="family-field" label="Ưu tiên"/)
  assert.doesNotMatch(`${tasks}${invitations}${taskEditor}`, /<select/)
})

test('family sharing permissions use animated accessible status cards', async () => {
  const cards = await readFile(new URL('../src/components/ui/card-status-list.tsx', import.meta.url), 'utf8')
  const invitations = await readFile(new URL('../src/features/family/components/InvitationDialogs.tsx', import.meta.url), 'utf8')
  const memberScopes = await readFile(new URL('../src/features/family/components/MemberScopeDialog.tsx', import.meta.url), 'utf8')
  assert.match(cards, /useReducedMotion/)
  assert.match(cards, /staggerChildren/)
  assert.match(cards, /type="checkbox"/)
  assert.match(cards, /AnimatePresence/)
  assert.match(cards, /whileHover=/)
  assert.match(invitations, /<AnimatedCardStatusList title="Quyền chia sẻ"/)
  assert.match(memberScopes, /<AnimatedCardStatusList title="Phạm vi chia sẻ"/)
  assert.match(invitations, /comingSoonScopes.*SHARED_CALENDAR.*ALERTS.*MEDICAL_RECORDS/)
})

test('Family Hub uses the branded hero, accessible animated tabs and live group status', async () => {
  const page = await readFile(new URL('../src/features/family/pages/FamilyPage.tsx', import.meta.url), 'utf8')
  const group = await readFile(new URL('../src/features/family/components/FamilyGroupPanel.tsx', import.meta.url), 'utf8')
  const tabs = await readFile(new URL('../src/components/ui/tabs.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/features/family/styles/family.css', import.meta.url), 'utf8')
  assert.match(page, /src="\/banner_logos_family_hubs\.png"/)
  assert.doesNotMatch(page, /<FeaturePage>/)
  assert.match(page, /<h1 className="sr-only">Family Hub<\/h1>/)
  assert.doesNotMatch(page, /<h1>Family Hub<\/h1>/)
  assert.match(page, /<Tabs items=\{tabs\}/)
  assert.match(tabs, /role="tablist"/)
  assert.match(tabs, /aria-selected=\{active\}/)
  assert.match(tabs, /useReducedMotion/)
  assert.match(tabs, /orderedItems/)
  assert.match(tabs, /layoutId=\{`\$\{layoutPrefix\}-panel-\$\{item\.value\}`\}/)
  assert.match(tabs, /useAnimationControls/)
  assert.match(tabs, /liftControls\.start\(\{ y: \[0, 40, 0\]/)
  assert.match(tabs, /if \(reduceMotion \|\| !active\)/)
  assert.match(tabs, /top: reduceMotion \? index \* -28 : hovering \? index \* -50 : 0/)
  assert.match(tabs, /inert=\{!active\}/)
  assert.match(page, /content: <FamilyGroupPanel/)
  assert.match(page, /content: <FamilyTasksPanel/)
  assert.match(page, /content: <ActivityTimeline/)
  assert.match(group, /family-live-dot/)
  assert.match(styles, /#22c55e/)
})
