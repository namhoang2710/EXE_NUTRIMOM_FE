import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { activityFeedNextState, buildActivityPath, buildTasksPath, invitationBody, resetActivityFeedState } from '../src/features/family/model/family-requests.ts'
import { activityDayKey, formatVietnamDateTime, memberLabel, relationshipLabels, scopeLabels, taskPriorityLabels, taskStatusLabels, toIsoTimestamp } from '../src/features/family/model/family-formatters.ts'
import { createInvitationListRequestCoordinator, formatInvitationRetryCountdown } from '../src/features/family/model/invitation-list-requests.ts'
import { createdInvitationSummary } from '../src/features/family/model/invitation-normalizers.ts'

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
  const dashboard = await readFile(new URL('../src/features/user/pages/AppHomePage.tsx', import.meta.url), 'utf8')
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
  assert.match(invitations, /comingSoonScopes.*ALERTS.*MEDICAL_RECORDS/)
  assert.doesNotMatch(invitations, /comingSoonScopes[^\n]*SHARED_CALENDAR/)
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

test('family group and invitation history avoid technical identifiers and wording', async () => {
  const group = await readFile(new URL('../src/features/family/components/FamilyGroupPanel.tsx', import.meta.url), 'utf8')
  const invitations = await readFile(new URL('../src/features/family/components/InvitationList.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/features/family/styles/family.css', import.meta.url), 'utf8')
  assert.match(group, /<strong>Nhóm đang hoạt động<\/strong>/)
  assert.doesNotMatch(group, /Thai kỳ \{shortUserId\(group\.pregnancy_id\)\}/)
  assert.match(invitations, /import \{ LuHistory \} from 'react-icons\/lu'/)
  assert.match(invitations, /<LuHistory aria-hidden="true" \/>Lịch sử lời mời<\/h3>/)
  assert.doesNotMatch(invitations, /Danh sách đã che thông tin nhận/)
  assert.match(styles, /\.family-section-heading h2 \{[^}]*font-weight: 760;/)
  assert.match(styles, /\.family-invitations \.family-section-heading h3 \{[^}]*font-size:[^}]*font-weight: 760;/)
})

test('invitation deletion is confirmed, stays right-aligned, spins and uses the calendar toast', async () => {
  const invitations = await readFile(new URL('../src/features/family/components/InvitationList.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/features/family/styles/family.css', import.meta.url), 'utf8')
  assert.match(invitations, /title="Xóa lời mời này\?"/)
  assert.match(invitations, /Lời mời gửi đến <strong>\{confirming\?\.masked_target\}<\/strong> sẽ bị thu hồi và không thể sử dụng được nữa\./)
  assert.doesNotMatch(invitations, /busy=\{revoking\}[^]*stable/)
  assert.match(invitations, /revoking && <CircleNotch className="nm-dialog-spinner"/)
  assert.match(invitations, /<GlobalActionToast toast=\{toast\}/)
  assert.match(invitations, /message: 'Đã xóa thành công'/)
  assert.match(styles, /\.family-invitation-row \{ grid-template-columns: minmax\(0, 1fr\) auto;/)
  assert.match(styles, /\.family-invitations \{[^}]*border:[^}]*border-radius:[^}]*background:/)
})

test('Global Action Toast is portaled to the viewport instead of the scrolling tab', async () => {
  const toast = await readFile(new URL('../src/features/calendar/components/CalendarToast.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/features/calendar/styles/calendar.css', import.meta.url), 'utf8')
  assert.match(toast, /export function GlobalActionToast/)
  assert.match(toast, /createPortal\([^]*document\.body\)/)
  assert.match(toast, /data-ui="global-action-toast"/)
  assert.match(styles, /\.calendar-action-toast \{ position: fixed; z-index: 90;/)
})

test('invitation list deduplicates Strict Mode loads, caches remounts and cools down after 429', async () => {
  let now = 1_000
  let calls = 0
  let resolveFirst!: (value: string[]) => void
  const coordinator = createInvitationListRequestCoordinator<string[]>(5_000, 30_000, () => now)
  const request = () => {
    calls += 1
    return new Promise<string[]>((resolve) => { resolveFirst = resolve })
  }

  const first = coordinator.load(request)
  const strictReplay = coordinator.load(request)
  assert.equal(first, strictReplay)
  assert.equal(calls, 1)
  resolveFirst(['invitation-1'])
  assert.deepEqual(await first, ['invitation-1'])
  assert.deepEqual(await coordinator.load(request), ['invitation-1'])
  assert.equal(calls, 1)

  await assert.rejects(coordinator.load(async () => {
    calls += 1
    throw { status: 429, retryAfterMs: 12_000 }
  }, { force: true }))
  assert.equal(coordinator.isCoolingDown(), true)
  assert.equal(coordinator.remainingMs(), 12_000)
  await assert.rejects(coordinator.load(async () => {
    calls += 1
    return ['must-not-run']
  }, { force: true }))
  assert.equal(calls, 2)

  now += 12_001
  assert.deepEqual(await coordinator.load(async () => {
    calls += 1
    return ['after-cooldown']
  }, { force: true }), ['after-cooldown'])
  assert.equal(calls, 3)
})

test('invitation list serves its cached snapshot during a rate-limit cooldown', async () => {
  let now = 1_000
  let calls = 0
  const coordinator = createInvitationListRequestCoordinator<string[]>(5_000, 30_000, () => now)
  const request = async () => { calls += 1; return ['invitation-1'] }

  assert.deepEqual(await coordinator.load(request), ['invitation-1'])
  now += 5_001
  await assert.rejects(coordinator.load(async () => {
    calls += 1
    throw { status: 429, retryAfterMs: 12_000 }
  }, { force: true }))

  assert.deepEqual(await coordinator.load(async () => {
    calls += 1
    return ['must-not-run']
  }), ['invitation-1'])
  assert.deepEqual(coordinator.snapshot(), ['invitation-1'])
  assert.equal(calls, 2)
})

test('invitation rate-limit countdown is formatted for the user', () => {
  assert.equal(formatInvitationRetryCountdown(30), '00:30')
  assert.equal(formatInvitationRetryCountdown(9.1), '00:10')
  assert.equal(formatInvitationRetryCountdown(65), '01:05')
  assert.equal(formatInvitationRetryCountdown(-1), '00:00')
})

test('invitation rate-limit UI uses one compact countdown and hides diagnostic actions', async () => {
  const invitations = await readFile(new URL('../src/features/family/components/InvitationList.tsx', import.meta.url), 'utf8')
  assert.match(invitations, /Hệ thống đang tạm giới hạn lượt tải\. Bạn có thể thử lại sau \$\{countdownLabel\}\./)
  assert.match(invitations, /Thử lại \(\$\{countdownLabel\}\)/)
  assert.match(invitations, /!rateLimited && <DiagnosticCopyButton/)
  assert.doesNotMatch(invitations, /Thử lại sau \$\{cooldownSeconds\} giây/)
})

test('created invitations update the list locally without exposing their raw target', () => {
  const summary = createdInvitationSummary({
    id: 'invitation-1', family_group_id: 'family-1', invited_email: 'guardian@example.com',
    token: 'secret-token', invite_url: 'nutrimom://family/invitations?token=secret-token', relationship: 'PARENT',
    scopes: ['SHARED_CALENDAR'], status: 'PENDING', delivery_status: 'SENT', sent_at: '2026-10-06T00:00:00Z',
    expires_at: '2026-10-08T00:00:00Z', created_at: '2026-10-06T00:00:00Z',
  })
  assert.equal(summary.masked_target, 'g***@example.com')
  assert.equal(JSON.stringify(summary).includes('guardian@example.com'), false)
  assert.equal(JSON.stringify(summary).includes('secret-token'), false)
})

test('invitation list applies local mutations to an in-flight request and its cache', async () => {
  let resolveRequest!: (value: string[]) => void
  let calls = 0
  const coordinator = createInvitationListRequestCoordinator<string[]>(60_000)
  const pending = coordinator.load(() => {
    calls += 1
    return new Promise<string[]>((resolve) => { resolveRequest = resolve })
  })
  coordinator.mutate((current) => ['created-locally', ...current])
  resolveRequest(['from-server'])
  assert.deepEqual(await pending, ['created-locally', 'from-server'])
  assert.deepEqual(await coordinator.load(async () => { calls += 1; return [] }), ['created-locally', 'from-server'])
  assert.equal(calls, 1)
})

test('invitation list can seed its cache from a local create or delete', async () => {
  let calls = 0
  const coordinator = createInvitationListRequestCoordinator<string[]>(60_000)
  coordinator.replace(['local-invitation'])

  assert.deepEqual(await coordinator.load(async () => {
    calls += 1
    return ['must-not-run']
  }), ['local-invitation'])
  assert.equal(calls, 0)
})

test('creating and deleting invitations update local state instead of refetching the list', async () => {
  const group = await readFile(new URL('../src/features/family/components/FamilyGroupPanel.tsx', import.meta.url), 'utf8')
  const list = await readFile(new URL('../src/features/family/components/InvitationList.tsx', import.meta.url), 'utf8')
  const requests = await readFile(new URL('../src/features/family/model/invitation-list-requests.ts', import.meta.url), 'utf8')
  assert.match(group, /onCreated=\{\(created\) => setCreatedInvitations/)
  assert.doesNotMatch(group, /invitationRefresh/)
  assert.match(list, /invitationListRequests\.replace\(nextItems\)/)
  assert.match(list, /onClick=\{\(\) => void load\(\)\}/)
  assert.match(list, /error && !hasSnapshot/)
  assert.match(group, /enabled=\{active\}/)
  assert.match(requests, /INVITATION_LIST_CACHE_MS = 60_000/)
})
