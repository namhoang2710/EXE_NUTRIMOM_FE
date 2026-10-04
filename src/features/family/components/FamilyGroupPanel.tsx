import { GearSix, Plus, ShieldCheck, Trash, UserCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { ActionStateDialog } from '@/shared/components/ActionStateDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage } from '../model/family-errors'
import { memberLabel, relationshipLabels, scopeLabels, shortUserId } from '../model/family-formatters'
import type { FamilyGroup, FamilyMember, FamilyRelationship } from '../model/family-types'
import { FamilyLoadingState } from './FamilyLoadingState'
import { InviteDialog } from './InvitationDialogs'
import { MemberScopeDialog } from './MemberScopeDialog'

interface Props {
  group: FamilyGroup
  members: FamilyMember[]
  currentUserId: string
  loading: boolean
  error: string
  onReload: () => void
  onMembersChange: (members: FamilyMember[]) => void
}
export function FamilyGroupPanel({ group, members, currentUserId, loading, error, onReload, onMembersChange }: Props) {
  const isOwner = group.owner_user_id === currentUserId
  const currentMembership = members.find((member) => member.user_id === currentUserId)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [scopeMember, setScopeMember] = useState<FamilyMember | null>(null)
  const [revokeMember, setRevokeMember] = useState<FamilyMember | null>(null)
  const [conflict, setConflict] = useState(false)

  if (loading) return <FamilyLoadingState label="Đang tải thành viên" />
  return <section className="family-section" aria-labelledby="family-group-title">
    <div className="family-section-heading"><div><h2 id="family-group-title">Nhóm gia đình</h2><p>{isOwner ? 'Quản lý thành viên và quyền chia sẻ cho thai kỳ.' : 'Các quyền chủ nhóm đang chia sẻ với bạn.'}</p></div>{isOwner && <button className="primary-button" type="button" onClick={() => setInviteOpen(true)}><Plus size={18} aria-hidden="true" />Mời thành viên</button>}</div>
    {error && <div className="family-inline-state"><StatusMessage tone="error">{error}</StatusMessage><button className="secondary-button" type="button" onClick={onReload}>Thử lại</button></div>}
    {conflict && <div className="family-inline-state"><StatusMessage tone="error">Dữ liệu thành viên đã thay đổi. Hãy tải lại trước khi tiếp tục.</StatusMessage><button className="secondary-button" type="button" onClick={() => { setConflict(false); onReload() }}>Tải lại</button></div>}
    <div className="family-group-summary"><span className="family-group-summary-icon"><ShieldCheck size={28} weight="duotone" aria-hidden="true" /></span><div><strong>Nhóm đang hoạt động</strong><span>Thai kỳ {shortUserId(group.pregnancy_id)}</span></div><span className="family-status"><span className="family-live-dot" aria-hidden="true" />Đang hoạt động</span></div>
    {isOwner ? <div className="family-member-list">
      {members.length ? members.map((member) => <article className="family-member-row" key={member.id}><UserCircle size={32} weight="duotone" aria-hidden="true" /><div className="family-member-copy"><h3>{relationshipLabels[member.relationship as FamilyRelationship] || member.relationship}</h3><p>Mã người dùng: {shortUserId(member.user_id)}</p><div className="family-scope-list">{member.scopes.map((scope) => <span key={scope}>{scopeLabels[scope]}</span>)}</div></div><div className="family-row-actions"><button className="family-icon-button" type="button" aria-label={`Chỉnh quyền ${memberLabel(member)}`} onClick={() => setScopeMember(member)}><GearSix size={20} /></button><button className="family-icon-button is-danger" type="button" aria-label={`Thu hồi ${memberLabel(member)}`} onClick={() => setRevokeMember(member)}><Trash size={20} /></button></div></article>) : <div className="family-empty"><UserCircle size={38} weight="duotone" aria-hidden="true" /><h3>Chưa có thành viên</h3><p>Tạo lời mời để chia sẻ đúng thông tin với người thân.</p><button className="secondary-button" type="button" onClick={() => setInviteOpen(true)}>Tạo lời mời</button></div>}
    </div> : currentMembership ? <article className="family-membership-card"><UserCircle size={34} weight="duotone" aria-hidden="true" /><div><h3>{memberLabel(currentMembership)}</h3><p>Vai trò: {currentMembership.membership_role === 'PARTNER' ? 'Bạn đời' : 'Thành viên gia đình'}</p><div className="family-scope-list">{currentMembership.scopes.map((scope) => <span key={scope}>{scopeLabels[scope]}</span>)}</div></div></article> : <StatusMessage tone="error">Chưa tải được thông tin thành viên của bạn.</StatusMessage>}
    <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    <MemberScopeDialog member={scopeMember} onClose={() => setScopeMember(null)} onSaved={(saved) => onMembersChange(members.map((item) => item.id === saved.id ? saved : item))} onConflict={() => setConflict(true)} />
    <ActionStateDialog open={Boolean(revokeMember)} title="Thu hồi thành viên?" description="Thành viên sẽ mất quyền truy cập nội dung được chia sẻ." confirmLabel="Thu hồi" cancelLabel="Giữ thành viên" busyLabel="Đang thu hồi..." successMessage="Đã thu hồi thành viên khỏi nhóm." danger onAction={async () => { if (revokeMember) await familyApi.revokeMember(revokeMember.id) }} onCompleted={() => { if (revokeMember) onMembersChange(members.filter((item) => item.id !== revokeMember.id)) }} onClose={() => setRevokeMember(null)} errorMessage={familyErrorMessage} />
  </section>
}

