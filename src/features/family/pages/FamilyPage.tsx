import { ClipboardText, Plus, UsersThree, Waveform } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { FeaturePage } from '@/shared/layouts/FeaturePage'
import { familyApi } from '../api/family-api'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { FamilyGroupPanel } from '../components/FamilyGroupPanel'
import { FamilyTasksPanel } from '../components/FamilyTasksPanel'
import { AcceptInvitationDialog } from '../components/InvitationDialogs'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
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
    setLoading(true); setError('')
    try {
      const result = await loadFamilyBootstrap()
      if (alive.current) { setGroups(result.groups); setMembers(result.members) }
    } catch (reason) { if (alive.current) setError(familyErrorMessage(reason)) }
    finally { if (alive.current) setLoading(false) }
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

  return <FeaturePage><main className="family-page">
    <header className="family-page-heading"><div><p className="welcome-kicker">Gia đình đồng hành</p><h1>Family Hub</h1><p>Chia sẻ đúng thông tin, phối hợp công việc và theo dõi hoạt động của gia đình.</p></div>{group && <div className="family-role-badge"><UsersThree size={20} weight="duotone" aria-hidden="true" />{isOwner ? 'Chủ nhóm' : 'Thành viên'}</div>}</header>
    <div className="family-announcer" aria-live="polite">{success && <StatusMessage tone="success">{success}</StatusMessage>}</div>
    {loading ? <div className="family-page-skeleton" aria-busy="true" aria-label="Đang tải Family Hub"><span /><span /><span /></div> : !group ? <section className="family-onboarding" aria-labelledby="family-empty-title"><div><UsersThree size={44} weight="duotone" aria-hidden="true" /><h2 id="family-empty-title">Bắt đầu cùng gia đình</h2><p>Bạn có thể tạo nhóm cho thai kỳ đang hoạt động hoặc tham gia bằng token được mời.</p></div><div className="family-onboarding-actions"><article><Plus size={28} weight="duotone" aria-hidden="true" /><h3>Tạo nhóm gia đình</h3><p>Dành cho chủ thai kỳ đang hoạt động.</p><button className="primary-button" type="button" disabled={creating} onClick={() => void createGroup()}>{creating ? 'Đang tạo...' : 'Tạo nhóm'}</button></article><article><Waveform size={28} weight="duotone" aria-hidden="true" /><h3>Nhập token lời mời</h3><p>Dành cho tài khoản được người thân mời.</p><button className="secondary-button" type="button" onClick={() => setAcceptOpen(true)}>Nhập token</button></article></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{createErrorCode === 'ACTIVE_PREGNANCY_NOT_FOUND' && <Link className="text-link" to="/app/profile/health">Tạo hồ sơ thai kỳ</Link>}<AcceptInvitationDialog open={acceptOpen} onClose={() => setAcceptOpen(false)} onAccepted={() => { setSuccess('Bạn đã tham gia nhóm gia đình.'); void load() }} /></section> : <>
      <nav className="family-tabs" aria-label="Khu vực Family Hub">{([{ id: 'group', label: 'Nhóm gia đình', icon: UsersThree }, { id: 'tasks', label: 'Việc cần làm', icon: ClipboardText }, { id: 'activity', label: 'Hoạt động', icon: Waveform }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeTab === id ? 'is-active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => chooseTab(id)}><Icon size={19} weight="duotone" aria-hidden="true" />{label}</button>)}</nav>
      {activeTab === 'group' && <FamilyGroupPanel group={group} members={members} currentUserId={currentUserId} loading={false} error={error} onReload={() => void reloadMembers()} onMembersChange={setMembers} />}
      {activeTab === 'tasks' && <FamilyTasksPanel isOwner={isOwner} canUseTasks={canUseTasks} members={members} />}
      {activeTab === 'activity' && <ActivityTimeline enabled={canViewActivity} members={members} />}
    </>}
  </main></FeaturePage>
}

