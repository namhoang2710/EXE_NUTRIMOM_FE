import { useEffect, useRef, useState } from 'react'
import { AnimatedCardStatusList } from '@/components/ui/card-status-list'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { memberDialogLabel } from '../model/family-formatters'
import type { FamilyMember, FamilyScope } from '../model/family-types'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { familyScopeCards, supportedFamilyScopes } from '../model/scope-capabilities'

const scopeCards = familyScopeCards

interface Props { member: FamilyMember | null; onClose: () => void; onSaved: (member: FamilyMember) => void; onConflict: () => void }

export function MemberScopeDialog({ member, onClose, onSaved, onConflict }: Props) {
  const [scopes, setScopes] = useState<FamilyScope[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  useEffect(() => { setScopes(member?.scopes || []); setError('') }, [member])
  async function save() {
    if (!member || saving.current) return
    const allowedScopes = supportedFamilyScopes(scopes)
    if (!allowedScopes.length) { setError('Vui lòng giữ lại ít nhất một quyền đang hoạt động.'); return }
    saving.current = true; setBusy(true); setError('')
    try { onSaved(await familyApi.updateMember(member.id, allowedScopes, member.version)); logDiagnostic({ level: 'info', category: 'family-scope', event: 'scope_update_succeeded' }); onClose() }
    catch (reason) {
      logDiagnostic({ level: 'warn', category: 'family-scope', event: 'scope_update_failed', reason: isFamilyError(reason, 'VERSION_CONFLICT') ? 'version-conflict' : 'request-failed' })
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'VERSION_CONFLICT')) onConflict()
    } finally { saving.current = false; setBusy(false) }
  }
  return <AccessibleDialog open={Boolean(member)} title="Chỉnh quyền thành viên" description={member ? memberDialogLabel(member) : undefined} onClose={onClose} busy={busy} className="family-dialog family-permission-dialog" footer={<><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Đang lưu...' : 'Lưu quyền'}</button></>}>
    <div className="family-permission-dialog-content"><AnimatedCardStatusList title="Phạm vi chia sẻ" cards={scopeCards} selectedIds={scopes} onSelectionChange={setScopes} disabled={busy} /><p className="family-helper">Lịch dùng chung có hiệu lực ngay ở lần tải tiếp theo. Cảnh báo và hồ sơ y tế chưa sẵn sàng.</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}</div>
  </AccessibleDialog>
}
