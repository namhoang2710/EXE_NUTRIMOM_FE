import { useFeatureAccess } from '@/features/payment/hooks/useFeatureAccess'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { UpgradeDialog } from '@/features/payment/components/UpgradePrompt'
import { ClipboardText, Plus, UsersThree, Waveform } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { GlobalActionToast, type CalendarToastMessage } from '@/features/calendar/components/CalendarToast'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { FamilyGroupPanel } from '../components/FamilyGroupPanel'
import { FamilyLoadingState } from '../components/FamilyLoadingState'
import { FamilyTasksPanel } from '../components/FamilyTasksPanel'
import { AcceptInvitationDialog } from '../components/InvitationDialogs'
import { ReceivedInvitationList } from '../components/ReceivedInvitationList'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { loadFamilyBootstrap, refreshFamilyAfterAccept } from '../model/family-bootstrap'
import { waitForFamilyLoading } from '../model/family-loading'
import { receivedInvitationRequests } from '../model/received-invitation-requests'
import type { FamilyGroup, FamilyMember, ReceivedFamilyInvitation } from '../model/family-types'
import '../styles/family.css'

type FamilyTab = 'group' | 'tasks' | 'activity'
const validTabs = new Set<FamilyTab>(['group', 'tasks', 'activity'])
export function FamilyPage() {
  const { user, profile, reloadProfile } = useAuth()
  const access = useFeatureAccess('FAMILY_SHARING')
  const cooldown = usePaymentCooldown('family-sharing')
  const createGate = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUserId = profile?.id || user?.id || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') as FamilyTab | null
  const activeTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : 'group'
  const focusedTaskId = searchParams.get('task')?.trim() || ''
  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedFamilyInvitation[]>(() => receivedInvitationRequests.snapshot() ?? [])
  const [receivedLoading, setReceivedLoading] = useState(() => receivedInvitationRequests.snapshot() === undefined)
  const [receivedError, setReceivedError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createErrorCode, setCreateErrorCode] = useState('')
  const [toast, setToast] = useState<CalendarToastMessage>()
  const [creating, setCreating] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const alive = useRef(true)
  const loadVersion = useRef(0)
  const receivedLoadVersion = useRef(0)
  const receivedRelease = useRef<() => void>(() => undefined)
  const toastId = useRef(0)
  const invitationAccepted = Boolean((location.state as { invitationAccepted?: boolean } | null)?.invitationAccepted)

  const showToast = useCallback((message: string, tone: CalendarToastMessage['tone'] = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }, [])
  const dismissToast = useCallback(() => setToast(undefined), [])

  const loadReceivedInvitations = useCallback(async (force = false) => {
    const version = ++receivedLoadVersion.current
    setReceivedLoading(true); setReceivedError('')
    const lease = receivedInvitationRequests.acquire((signal) => familyApi.receivedInvitations(signal), { force })
    receivedRelease.current = lease.release
    try {
      const invitations = await lease.promise
      if (alive.current && version === receivedLoadVersion.current) setReceivedInvitations(invitations)
    } catch (reason) {
      if (alive.current && version === receivedLoadVersion.current) setReceivedError(familyErrorMessage(reason))
    } finally {
      lease.release()
      if (alive.current && version === receivedLoadVersion.current) setReceivedLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    const version = ++loadVersion.current
    const startedAt = Date.now()
    setLoading(true); setError('')
    void loadReceivedInvitations()
    try {
      const result = await loadFamilyBootstrap()
      if (alive.current && version === loadVersion.current) { setGroups(result.groups); setMembers(result.members) }
    } catch (reason) { if (alive.current && version === loadVersion.current) setError(familyErrorMessage(reason)) }
    finally {
      await waitForFamilyLoading(startedAt)
      if (alive.current && version === loadVersion.current) setLoading(false)
    }
  }, [loadReceivedInvitations])

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; receivedRelease.current() } }, [load])
  useEffect(() => {
    if (!invitationAccepted) return
    showToast('Bạn đã tham gia nhóm gia đình.')
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [invitationAccepted, location.hash, location.pathname, location.search, navigate, showToast])

  const group = groups[0]
  const isOwner = Boolean(group && group.owner_user_id === currentUserId)
  const membership = members.find((member) => member.user_id === currentUserId)
  const canUseTasks = isOwner || Boolean(membership?.scopes.includes('FAMILY_TASKS'))
  const canViewActivity = isOwner || Boolean(membership?.scopes.includes('ACTIVITY_FEED'))

  function chooseTab(tab: FamilyTab) {
    setSearchParams(tab === 'group' ? {} : { tab }, { replace: true })
  }

  function closeFocusedTask() {
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
  }

  async function createGroup() {
    if (createGate.current || cooldown.blocked) return
    createGate.current = true
    setCreating(true); setError(''); setCreateErrorCode('')
    try {
      if (!await access.checkAccess()) return
      const created = await familyApi.createGroup()
      setGroups([created]); setMembers([]); showToast('Nhóm gia đình đã sẵn sàng.')
    } catch (reason) {
      if (access.handleError(reason)) return
      cooldown.handleRateLimit(reason)
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'ACTIVE_PREGNANCY_NOT_FOUND')) setCreateErrorCode('ACTIVE_PREGNANCY_NOT_FOUND')
    } finally { createGate.current = false; setCreating(false) }
  }

  async function reloadMembers() {
    try { setMembers(await familyApi.members()); setError('') }
    catch (reason) { setError(familyErrorMessage(reason)) }
  }

  async function refreshPermissions() {
    await reloadMembers()
  }

  const tabs = [
    {
      value: 'group',
      label: 'Nhóm gia đình',
      icon: <UsersThree size={19} weight="duotone" aria-hidden="true" />,
      content: <FamilyGroupPanel group={group!} members={members} currentUserId={currentUserId} loading={false} error={error} onReload={() => void reloadMembers()} onMembersChange={setMembers} onNotify={showToast} active={activeTab === 'group'} />,
    },
    {
      value: 'tasks',
      label: 'Việc cần làm',
      icon: <ClipboardText size={19} weight="duotone" aria-hidden="true" />,
      content: <FamilyTasksPanel isOwner={isOwner} canUseTasks={activeTab === 'tasks' && canUseTasks} members={members} focusedTaskId={focusedTaskId} onCloseFocusedTask={closeFocusedTask} onRefreshPermissions={refreshPermissions} onNotify={showToast} />,
    },
    {
      value: 'activity',
      label: 'Hoạt động',
      icon: <Waveform size={19} weight="duotone" aria-hidden="true" />,
      content: <ActivityTimeline enabled={activeTab === 'activity' && canViewActivity} members={members} onRefreshPermissions={refreshPermissions} />,
    },
  ] as const

  return <main className="family-page">
    <header className="family-hero">
      <div className="family-hero-inner">
        <h1 className="sr-only">Family Hub</h1>
        <img src="/banner_logos_family_hubs.png" width="570" height="165" alt="Nutri Mom Family Hubs" fetchPriority="high" />
        <div className="family-hero-caption">
          <p>Chia sẻ đúng thông tin, phối hợp công việc và theo dõi hoạt động của gia đình.</p>
          {group && <div className="family-role-badge"><UsersThree size={20} weight="duotone" aria-hidden="true" />{isOwner ? 'Chủ nhóm' : 'Thành viên'}</div>}
        </div>
      </div>
    </header>
    <div className="family-page-body">
      <ReceivedInvitationList items={receivedInvitations} loading={receivedLoading} error={receivedError} onRetry={() => void loadReceivedInvitations(true)} />
      {loading ? <FamilyLoadingState label="Đang tải nhóm gia đình" description="NutriMom đang đồng bộ thành viên và quyền chia sẻ." /> : <div className="family-content-ready">{!group ? <section className="family-onboarding" aria-labelledby="family-empty-title"><div><UsersThree size={44} weight="duotone" aria-hidden="true" /><h2 id="family-empty-title">Bắt đầu cùng gia đình</h2><p>Bạn có thể tạo nhóm cho thai kỳ đang hoạt động hoặc tham gia bằng token được mời.</p></div><div className="family-onboarding-actions"><article><Plus size={28} weight="duotone" aria-hidden="true" /><h3>Tạo nhóm gia đình</h3><p>{access.locked ? 'Quyền tạo nhóm thuộc gói có Liên kết gia đình. Bạn vẫn có thể nhận lời mời miễn phí.' : 'Dành cho chủ thai kỳ đang hoạt động.'}</p><button className="primary-button" type="button" disabled={creating || cooldown.remaining > 0} onClick={() => void createGroup()}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining}s` : creating ? 'Đang tạo...' : access.locked ? 'Mở quyền tạo nhóm' : 'Tạo nhóm'}</button></article><article><Waveform size={28} weight="duotone" aria-hidden="true" /><h3>Nhập token lời mời</h3><p>Dành cho tài khoản được người thân mời.</p><button className="secondary-button" type="button" onClick={() => setAcceptOpen(true)}>Nhập token</button></article></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{createErrorCode === 'ACTIVE_PREGNANCY_NOT_FOUND' && <Link className="text-link" to="/app/profile/health">Tạo hồ sơ thai kỳ</Link>}<AcceptInvitationDialog open={acceptOpen} onClose={() => setAcceptOpen(false)} onAccepted={async () => { await refreshFamilyAfterAccept(reloadProfile); showToast('Bạn đã tham gia nhóm gia đình.'); await load() }} /></section> : <Tabs items={tabs} value={activeTab} onValueChange={chooseTab} ariaLabel="Khu vực Family Hub" idPrefix="family" className="family-tabs" />}</div>}
    </div>
    <UpgradeDialog hint={access.upgrade} onClose={access.clearUpgrade} />
    <GlobalActionToast toast={toast} onClose={dismissToast} />
  </main>
}

