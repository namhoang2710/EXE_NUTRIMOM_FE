import { useEffect, useState } from 'react'
import { AnimatedCardStatusList, type CardStatusItem } from '@/components/ui/card-status-list'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { memberLabel, scopeLabels } from '../model/family-formatters'
import type { FamilyMember, FamilyScope } from '../model/family-types'
import { logDiagnostic } from '@/core/diagnostics/logger'

const allScopes = Object.keys(scopeLabels) as FamilyScope[]
const comingSoonScopes = new Set<FamilyScope>(['ALERTS', 'MEDICAL_RECORDS'])
const scopeCards: CardStatusItem<FamilyScope>[] = allScopes.map((scope) => ({ id: scope, title: scopeLabels[scope], comingSoon: comingSoonScopes.has(scope) }))

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
    try { onSaved(await familyApi.updateMember(member.id, scopes, member.version)); logDiagnostic({ level: 'info', category: 'family-scope', event: 'scope_update_succeeded' }); onClose() }
    catch (reason) {
      logDiagnostic({ level: 'warn', category: 'family-scope', event: 'scope_update_failed', reason: isFamilyError(reason, 'VERSION_CONFLICT') ? 'version-conflict' : 'request-failed' })
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'VERSION_CONFLICT')) onConflict()
    } finally { setBusy(false) }
  }
  return <AccessibleDialog open={Boolean(member)} title="Chỉnh quyền thành viên" description={member ? memberLabel(member) : undefined} onClose={onClose} busy={busy} className="family-dialog" footer={<><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Đang lưu...' : 'Lưu quyền'}</button></>}>
    <AnimatedCardStatusList title="Phạm vi chia sẻ" cards={scopeCards} selectedIds={scopes} onSelectionChange={setScopes} disabled={busy} /><p className="family-helper">Lịch dùng chung có hiệu lực ngay ở lần tải tiếp theo. Cảnh báo và hồ sơ y tế chưa sẵn sàng.</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}
  </AccessibleDialog>
}
