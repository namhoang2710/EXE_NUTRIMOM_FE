import { useEffect, useRef, useState } from 'react'
import { AnimatedCardStatusList } from '@/components/ui/card-status-list'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { DiscardDraftDialog } from '@/shared/components/DiscardDraftDialog'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
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
  const baseline = useRef<FamilyMember | null>(null)
  const [conflict, setConflict] = useState(false)
  const [discard, setDiscard] = useState(false)
  const cooldown = usePaymentCooldown('family-member-scopes')
  useEffect(() => {
    if (member?.id === baseline.current?.id) return
    baseline.current = member; setScopes(member?.scopes || []); setError(''); setConflict(false); setDiscard(false)
  }, [member])
  function requestClose() {
    if (busy) return
    if (JSON.stringify([...scopes].sort()) !== JSON.stringify([...(baseline.current?.scopes || [])].sort())) setDiscard(true)
    else onClose()
  }
  async function reloadLatest() {
    if (!member || saving.current || cooldown.blocked) return
    saving.current = true; setBusy(true)
    try {
      const latest = (await familyApi.members()).find((item) => item.id === member.id)
      if (!latest) { setError('Thành viên không còn trong nhóm. Các lựa chọn của bạn vẫn được giữ.'); return }
      baseline.current = latest; setConflict(false); setError('Đã tải quyền mới. Các lựa chọn bạn đang sửa vẫn được giữ; kiểm tra trước khi lưu.')
    } catch (reason) { cooldown.handleRateLimit(reason); setError(familyErrorMessage(reason)) }
    finally { saving.current = false; setBusy(false) }
  }
  async function save() {
    if (!member || saving.current) return
    if (conflict || cooldown.blocked) return
    const allowedScopes = supportedFamilyScopes(scopes)
    if (!allowedScopes.length) { setError('Vui lòng giữ lại ít nhất một quyền đang hoạt động.'); return }
    saving.current = true; setBusy(true); setError('')
    try { onSaved(await familyApi.updateMember(member.id, allowedScopes, baseline.current?.version ?? member.version)); logDiagnostic({ level: 'info', category: 'family-scope', event: 'scope_update_succeeded' }); onClose() }
    catch (reason) {
      logDiagnostic({ level: 'warn', category: 'family-scope', event: 'scope_update_failed', reason: isFamilyError(reason, 'VERSION_CONFLICT') ? 'version-conflict' : 'request-failed' })
      setError(familyErrorMessage(reason))
      cooldown.handleRateLimit(reason)
      if (isFamilyError(reason, 'VERSION_CONFLICT')) { setConflict(true); onConflict() }
    } finally { saving.current = false; setBusy(false) }
  }
  return <><AccessibleDialog open={Boolean(member)} title="Chỉnh quyền thành viên" description={member ? memberDialogLabel(member) : undefined} onClose={requestClose} busy={busy || discard} className="family-dialog family-permission-dialog" footer={<><button className="secondary-button" type="button" disabled={busy} onClick={requestClose}>Hủy</button><button className="primary-button" type="button" disabled={busy || conflict || cooldown.remaining > 0} onClick={() => void save()}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining}s` : busy ? 'Đang lưu...' : 'Lưu quyền'}</button></>}>
    <div className="family-permission-dialog-content"><AnimatedCardStatusList title="Phạm vi chia sẻ" cards={scopeCards} selectedIds={scopes} onSelectionChange={setScopes} disabled={busy} /><p className="family-helper">Lịch dùng chung có hiệu lực ngay ở lần tải tiếp theo. Cảnh báo và hồ sơ y tế chưa sẵn sàng.</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}</div>
    {conflict && <button className="secondary-button" type="button" disabled={busy || cooldown.remaining > 0} onClick={() => void reloadLatest()}>Xem quyền mới, giữ lựa chọn</button>}
  </AccessibleDialog><DiscardDraftDialog open={discard} onContinue={() => setDiscard(false)} onDiscard={onClose} /></>
}
