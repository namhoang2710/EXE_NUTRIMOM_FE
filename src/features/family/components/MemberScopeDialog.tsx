import { useEffect, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { memberLabel, scopeLabels } from '../model/family-formatters'
import type { FamilyMember, FamilyScope } from '../model/family-types'

const allScopes = Object.keys(scopeLabels) as FamilyScope[]

interface Props { member: FamilyMember | null; onClose: () => void; onSaved: (member: FamilyMember) => void; onConflict: () => void }

export function MemberScopeDialog({ member, onClose, onSaved, onConflict }: Props) {
  const [scopes, setScopes] = useState<FamilyScope[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setScopes(member?.scopes || []); setError('') }, [member])
  async function save() {
    if (!member) return
    if (!scopes.length) { setError('Vui lòng giữ lại ít nhất một quyền.'); return }
    setBusy(true); setError('')
    try { onSaved(await familyApi.updateMember(member.id, scopes, member.version)); onClose() }
    catch (reason) {
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'VERSION_CONFLICT')) onConflict()
    } finally { setBusy(false) }
  }
  return <AccessibleDialog open={Boolean(member)} title="Chỉnh quyền thành viên" description={member ? memberLabel(member) : undefined} onClose={onClose} busy={busy} className="family-dialog" footer={<><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Đang lưu...' : 'Lưu quyền'}</button></>}>
    <fieldset className="family-check-grid"><legend>Phạm vi chia sẻ</legend>{allScopes.map((scope) => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={() => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope])} />{scopeLabels[scope]}</label>)}</fieldset><p className="family-helper">Một số quyền dành cho tính năng đang được hoàn thiện.</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}
  </AccessibleDialog>
}
