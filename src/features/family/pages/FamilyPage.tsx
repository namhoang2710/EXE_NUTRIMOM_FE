import { ClipboardText, Plus, UsersThree, Waveform } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Tabs } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { FamilyGroupPanel } from '../components/FamilyGroupPanel'
import { FamilyLoadingState } from '../components/FamilyLoadingState'
import { FamilyTasksPanel } from '../components/FamilyTasksPanel'
import { AcceptInvitationDialog } from '../components/InvitationDialogs'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { waitForFamilyLoading } from '../model/family-loading'
import type { FamilyGroup, FamilyMember } from '../model/family-types'
import '../styles/family.css'

type FamilyTab = 'group' | 'tasks' | 'activity'
const validTabs = new Set<FamilyTab>(['group', 'tasks', 'activity'])
let bootstrapPromise: Promise<{ groups: FamilyGroup[]; members: FamilyMember[] }> | null = null

async function loadFamilyBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = familyApi.groups().then(async (groups) => ({ groups, members: groups.length ? await familyApi.members() : [] }))
    void bootstrapPromise.finally(() => { window.setTimeout(() => { bootstrapPromise = null }, 0) }).catch(() => undefined)
  }
  return bootstrapPromise
}
export function FamilyPage() {
  const { user, profile } = useAuth()
  const currentUserId = profile?.id || user?.id || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') as FamilyTab | null
  const activeTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : 'group'
  const focusedTaskId = searchParams.get('task')?.trim() || ''
  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createErrorCode, setCreateErrorCode] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const alive = useRef(true)

  const load = useCallback(async () => {
    const startedAt = Date.now()
    setLoading(true); setError('')
    try {
      const result = await loadFamilyBootstrap()
      if (alive.current) { setGroups(result.groups); setMembers(result.members) }
    } catch (reason) { if (alive.current) setError(familyErrorMessage(reason)) }
    finally {
      await waitForFamilyLoading(startedAt)
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false } }, [load])

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
    setCreating(true); setError(''); setCreateErrorCode(''); setSuccess('')
    try {
      const created = await familyApi.createGroup()
      setGroups([created]); setMembers([]); setSuccess('Nhóm gia đình đã sẵn sàng.')
    } catch (reason) {
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'ACTIVE_PREGNANCY_NOT_FOUND')) setCreateErrorCode('ACTIVE_PREGNANCY_NOT_FOUND')
    } finally { setCreating(false) }
  }

  async function reloadMembers() {
    try { setMembers(await familyApi.members()); setError('') }
    catch (reason) { setError(familyErrorMessage(reason)) }
  }

  const tabs = [
    {
      value: 'group',
      label: 'Nhóm gia đình',
      icon: <UsersThree size={19} weight="duotone" aria-hidden="true" />,
      content: <FamilyGroupPanel group={group!} members={members} currentUserId={currentUserId} loading={false} error={error} onReload={() => void reloadMembers()} onMembersChange={setMembers} active={activeTab === 'group'} />,
    },
    {
      value: 'tasks',
      label: 'Việc cần làm',
      icon: <ClipboardText size={19} weight="duotone" aria-hidden="true" />,
      content: <FamilyTasksPanel isOwner={isOwner} canUseTasks={activeTab === 'tasks' && canUseTasks} members={members} focusedTaskId={focusedTaskId} onCloseFocusedTask={closeFocusedTask} />,
    },
    {
      value: 'activity',
      label: 'Hoạt động',
      icon: <Waveform size={19} weight="duotone" aria-hidden="true" />,
      content: <ActivityTimeline enabled={activeTab === 'activity' && canViewActivity} members={members} />,
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
      <div className="family-announcer" aria-live="polite">{success && <StatusMessage tone="success">{success}</StatusMessage>}</div>
      {loading ? <FamilyLoadingState label="Đang tải nhóm gia đình" description="NutriMom đang đồng bộ thành viên và quyền chia sẻ." /> : <div className="family-content-ready">{!group ? <section className="family-onboarding" aria-labelledby="family-empty-title"><div><UsersThree size={44} weight="duotone" aria-hidden="true" /><h2 id="family-empty-title">Bắt đầu cùng gia đình</h2><p>Bạn có thể tạo nhóm cho thai kỳ đang hoạt động hoặc tham gia bằng token được mời.</p></div><div className="family-onboarding-actions"><article><Plus size={28} weight="duotone" aria-hidden="true" /><h3>Tạo nhóm gia đình</h3><p>Dành cho chủ thai kỳ đang hoạt động.</p><button className="primary-button" type="button" disabled={creating} onClick={() => void createGroup()}>{creating ? 'Đang tạo...' : 'Tạo nhóm'}</button></article><article><Waveform size={28} weight="duotone" aria-hidden="true" /><h3>Nhập token lời mời</h3><p>Dành cho tài khoản được người thân mời.</p><button className="secondary-button" type="button" onClick={() => setAcceptOpen(true)}>Nhập token</button></article></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{createErrorCode === 'ACTIVE_PREGNANCY_NOT_FOUND' && <Link className="text-link" to="/app/profile/health">Tạo hồ sơ thai kỳ</Link>}<AcceptInvitationDialog open={acceptOpen} onClose={() => setAcceptOpen(false)} onAccepted={() => { setSuccess('Bạn đã tham gia nhóm gia đình.'); void load() }} /></section> : <Tabs items={tabs} value={activeTab} onValueChange={chooseTab} ariaLabel="Khu vực Family Hub" idPrefix="family" className="family-tabs" />}</div>}
    </div>
  </main>
}

