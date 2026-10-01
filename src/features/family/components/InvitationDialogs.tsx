import { CheckCircle, Copy, LinkSimple } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { AnimatedSelect, type AnimatedSelectOption } from '@/components/ui/animated-select'
import { AnimatedCardStatusList, type CardStatusItem } from '@/components/ui/card-status-list'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage } from '../model/family-errors'
import { formatVietnamDateTime, relationshipLabels, scopeLabels } from '../model/family-formatters'
import type { FamilyInvitation, FamilyRelationship, FamilyScope } from '../model/family-types'

const relationships = Object.keys(relationshipLabels) as FamilyRelationship[]
const relationshipOptions: AnimatedSelectOption<FamilyRelationship>[] = relationships.map((value) => ({ value, label: relationshipLabels[value] }))
const scopes = Object.keys(scopeLabels) as FamilyScope[]
const comingSoonScopes = new Set<FamilyScope>(['SHARED_CALENDAR', 'ALERTS', 'MEDICAL_RECORDS'])
const scopeCards: CardStatusItem<FamilyScope>[] = scopes.map((scope) => ({ id: scope, title: scopeLabels[scope], comingSoon: comingSoonScopes.has(scope) }))

interface InviteDialogProps {
  open: boolean
  onClose: () => void
}
export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const [targetType, setTargetType] = useState<'phone' | 'email'>('phone')
  const [target, setTarget] = useState('')
  const [relationship, setRelationship] = useState<FamilyRelationship>('PARTNER')
  const [selectedScopes, setSelectedScopes] = useState<FamilyScope[]>(['PREGNANCY_SUMMARY', 'FAMILY_TASKS', 'ACTIVITY_FEED'])
  const [expires, setExpires] = useState(48)
  const [result, setResult] = useState<FamilyInvitation | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const targetRef = useRef<HTMLInputElement>(null)

  function close() {
    setResult(null); setError(''); setCopied(false); onClose()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!target.trim()) { setError('Vui lòng nhập người nhận lời mời.'); return }
    if (!selectedScopes.length) { setError('Vui lòng chọn ít nhất một quyền chia sẻ.'); return }
    setBusy(true); setError('')
    try {
      setResult(await familyApi.createInvitation({
        ...(targetType === 'phone' ? { invited_phone: target } : { invited_email: target }),
        relationship,
        scopes: selectedScopes,
        expires_in_hours: expires,
      }))
    } catch (reason) { setError(familyErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  async function copyToken() {
    if (!result) return
    try { await navigator.clipboard.writeText(result.token); setCopied(true) }
    catch { setError('Không thể sao chép tự động. Hãy chọn và sao chép token bên dưới.') }
  }

  return <AccessibleDialog open={open} title={result ? 'Lời mời đã sẵn sàng' : 'Mời thành viên'} description={result ? 'Token chỉ được hiển thị sau khi tạo. Hãy gửi qua kênh an toàn.' : 'Chọn đúng một cách nhận lời mời và phạm vi được chia sẻ.'} onClose={close} busy={busy} initialFocusRef={targetRef} className="family-dialog" footer={result ? <button className="primary-button" type="button" onClick={close}>Đóng</button> : undefined}>
    {result ? <div className="family-token-success" role="status"><CheckCircle size={38} weight="fill" aria-hidden="true" /><div className="family-token-box"><code>{result.token}</code><button type="button" className="secondary-button" onClick={() => void copyToken()}><Copy size={18} aria-hidden="true" />{copied ? 'Đã sao chép' : 'Sao chép'}</button></div><p>Hết hạn: {formatVietnamDateTime(result.expires_at)}</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}</div> : <form className="family-form" onSubmit={(event) => void submit(event)}>
      <fieldset className="family-segmented"><legend>Cách nhận lời mời</legend><label><input type="radio" name="target-type" checked={targetType === 'phone'} onChange={() => { setTargetType('phone'); setTarget('') }} />Số điện thoại</label><label><input type="radio" name="target-type" checked={targetType === 'email'} onChange={() => { setTargetType('email'); setTarget('') }} />Email</label></fieldset>
      <label className="family-field"><span>{targetType === 'phone' ? 'Số điện thoại' : 'Email'}</span><input ref={targetRef} type={targetType === 'phone' ? 'tel' : 'email'} value={target} onChange={(event) => setTarget(event.target.value)} autoComplete={targetType === 'phone' ? 'tel' : 'email'} /></label>
      <AnimatedSelect className="family-field" label="Mối quan hệ" value={relationship} options={relationshipOptions} onValueChange={setRelationship} />
      <AnimatedCardStatusList title="Quyền chia sẻ" cards={scopeCards} selectedIds={selectedScopes} onSelectionChange={setSelectedScopes} disabled={busy} />
      <p className="family-helper">Lịch dùng chung, cảnh báo và chia sẻ hồ sơ y tế đang được hoàn thiện.</p>
      <label className="family-field"><span>Hiệu lực (giờ)</span><input type="number" min={1} max={168} value={expires} onChange={(event) => setExpires(Number(event.target.value))} /></label>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={close}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo lời mời'}</button></div>
    </form>}
  </AccessibleDialog>
}

interface AcceptDialogProps { open: boolean; onClose: () => void; onAccepted: () => void }

export function AcceptInvitationDialog({ open, onClose, onAccepted }: AcceptDialogProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const tokenRef = useRef<HTMLInputElement>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!token.trim()) { setError('Vui lòng nhập token lời mời.'); return }
    setBusy(true); setError('')
    try { await familyApi.acceptInvitation(token); setToken(''); onAccepted(); onClose() }
    catch (reason) { setError(familyErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <AccessibleDialog open={open} title="Tham gia nhóm gia đình" description="Nhập token một lần do chủ nhóm gửi cho bạn." onClose={onClose} busy={busy} initialFocusRef={tokenRef} className="family-dialog">
    <form className="family-form" onSubmit={(event) => void submit(event)}><label className="family-field"><span>Token lời mời</span><div className="family-input-icon"><LinkSimple size={19} aria-hidden="true" /><input ref={tokenRef} value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" /></div></label>{error && <StatusMessage tone="error">{error}</StatusMessage>}<div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang tham gia...' : 'Tham gia'}</button></div></form>
  </AccessibleDialog>
}

