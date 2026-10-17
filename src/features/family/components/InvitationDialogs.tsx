import { useFeatureAccess } from '@/features/payment/hooks/useFeatureAccess'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { UpgradePrompt } from '@/features/payment/components/UpgradePrompt'
import { CheckCircle, Copy, LinkSimple } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { AnimatedSelect, type AnimatedSelectOption } from '@/components/ui/animated-select'
import { AnimatedCardStatusList } from '@/components/ui/card-status-list'
import { ApiClientError } from '@/core/api/api-error'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage } from '../model/family-errors'
import { formatVietnamDateTime, relationshipLabels } from '../model/family-formatters'
import { identifyTimedOutInvitation, reconcileTimedOutInvitation, type InvitationReconciliationCriteria } from '../model/invitation-reconciliation'
import { receivedInvitationRequests } from '../model/received-invitation-requests'
import { familyScopeCards, supportedFamilyScopes } from '../model/scope-capabilities'
import type { FamilyInvitation, FamilyInvitationSummary, FamilyRelationship, FamilyScope } from '../model/family-types'
import { logDiagnostic } from '@/core/diagnostics/logger'

const relationships = Object.keys(relationshipLabels) as FamilyRelationship[]
const relationshipOptions: AnimatedSelectOption<FamilyRelationship>[] = relationships.map((value) => ({ value, label: relationshipLabels[value] }))
// familyScopeCards uses one shared capability source; comingSoonScopes are ALERTS and MEDICAL_RECORDS.
const scopeCards = familyScopeCards

function deliveryMessage(status: FamilyInvitation['delivery_status']) {
  switch (status) {
    case 'SENT': return 'Email lời mời đã được gửi.'
    case 'FAILED': return 'Chưa gửi được email. Bạn có thể gửi liên kết lời mời qua một kênh an toàn.'
    case 'SKIPPED': return 'Kênh gửi tự động đã được bỏ qua. Bạn có thể gửi liên kết lời mời qua một kênh an toàn.'
  }
}

interface InviteDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: (invitation: FamilyInvitation) => void
  onReconciled?: (invitation: FamilyInvitationSummary) => void
  onNotify?: (message: string) => void
}
type VerificationState =
  | { kind: 'verifying' }
  | { kind: 'found'; invitation: FamilyInvitationSummary }
  | { kind: 'unknown'; ambiguous: boolean }

export function InviteDialog({ open, onClose, onCreated, onReconciled, onNotify }: InviteDialogProps) {
  const access = useFeatureAccess('FAMILY_SHARING', open)
  const cooldown = usePaymentCooldown('family-sharing')
  const upgradeHint = access.upgrade ?? access.hint
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState<FamilyRelationship>('PARTNER')
  const [selectedScopes, setSelectedScopes] = useState<FamilyScope[]>(['PREGNANCY_SUMMARY', 'FAMILY_TASKS', 'ACTIVITY_FEED'])
  const [expires, setExpires] = useState(48)
  const [result, setResult] = useState<FamilyInvitation | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verification, setVerification] = useState<VerificationState>()
  const targetRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const verificationController = useRef<AbortController | undefined>(undefined)
  const lastCriteria = useRef<InvitationReconciliationCriteria | undefined>(undefined)

  useEffect(() => () => verificationController.current?.abort(), [])

  function close() {
    verificationController.current?.abort()
    verificationController.current = undefined
    access.clearUpgrade(); setResult(null); setVerification(undefined); setError(''); setCopied(false); onClose()
  }

  function completeReconciliation(invitation: FamilyInvitationSummary) {
    setVerification({ kind: 'found', invitation })
    onReconciled?.(invitation)
  }

  async function verifyAfterTimeout(criteria: InvitationReconciliationCriteria) {
    verificationController.current?.abort()
    const controller = new AbortController()
    verificationController.current = controller
    setVerification({ kind: 'verifying' })
    try {
      const outcome = await reconcileTimedOutInvitation((signal) => familyApi.invitations(signal), criteria, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (outcome.status === 'found') completeReconciliation(outcome.invitation)
      else setVerification({ kind: 'unknown', ambiguous: outcome.status === 'ambiguous' })
    } catch {
      if (!controller.signal.aborted) setVerification({ kind: 'unknown', ambiguous: false })
    } finally {
      if (verificationController.current === controller) verificationController.current = undefined
    }
  }

  async function verifyManually() {
    const criteria = lastCriteria.current
    if (!criteria || busy) return
    setBusy(true); setError('')
    const controller = new AbortController()
    verificationController.current = controller
    try {
      const outcome = identifyTimedOutInvitation(await familyApi.invitations(controller.signal), criteria)
      if (outcome.status === 'found') completeReconciliation(outcome.invitation)
      else setVerification({ kind: 'unknown', ambiguous: outcome.status === 'ambiguous' })
    } catch (reason) {
      if (!controller.signal.aborted) setError(familyErrorMessage(reason))
    } finally {
      if (verificationController.current === controller) verificationController.current = undefined
      setBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || cooldown.blocked) return
    const invitedEmail = email.trim()
    if (!invitedEmail) { setError('Vui lòng nhập email người nhận lời mời.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) { setError('Địa chỉ email chưa đúng định dạng.'); return }
    if (!selectedScopes.length) { setError('Vui lòng chọn ít nhất một quyền chia sẻ.'); return }
    const allowedScopes = supportedFamilyScopes(selectedScopes)
    if (!allowedScopes.length) { setError('Vui lòng chọn ít nhất một quyền chia sẻ đang hoạt động.'); return }
    const criteria = { invitedEmail: invitedEmail.toLowerCase(), relationship, scopes: allowedScopes, submittedAt: Date.now() }
    lastCriteria.current = criteria
    submitting.current = true; setBusy(true); setError(''); setVerification(undefined)
    try {
      if (!await access.checkAccess()) return
      const created = await familyApi.createInvitation({
        invited_email: invitedEmail,
        relationship,
        scopes: allowedScopes,
        expires_in_hours: expires,
      })
      setResult(created); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'create_succeeded' }); onCreated?.(created)
    } catch (reason) {
      if (access.handleError(reason)) return
      cooldown.handleRateLimit(reason)
      if (reason instanceof ApiClientError && reason.code === 'REQUEST_TIMEOUT') {
        logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'create_timeout' })
        await verifyAfterTimeout(criteria)
      } else {
        setError(familyErrorMessage(reason)); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'create_failed' })
      }
    }
    finally { submitting.current = false; setBusy(false) }
  }

  async function copyToken() {
    if (!result) return
    try { await navigator.clipboard.writeText(result.invite_url); setCopied(true); onNotify?.('Đã sao chép liên kết lời mời.') }
    catch { setError('Không thể sao chép tự động. Hãy chọn và sao chép liên kết bên dưới.') }
  }

  return <AccessibleDialog open={open} title={result ? 'Lời mời đã sẵn sàng' : verification ? 'Đang xác minh lời mời' : 'Mời thành viên'} description={result ? 'Sao chép liên kết để gửi qua kênh an toàn khi cần.' : verification ? 'NutriMom đang kiểm tra xem yêu cầu vừa rồi đã được máy chủ ghi nhận hay chưa.' : 'Nhập email người nhận và chọn phạm vi được chia sẻ.'} onClose={close} busy={busy} initialFocusRef={targetRef} className="family-dialog" footer={result || verification?.kind === 'found' ? <button className="primary-button" type="button" onClick={close}>Đóng</button> : undefined}>
    {upgradeHint && !result ? <UpgradePrompt hint={upgradeHint} onDismiss={access.upgrade && !access.hint ? access.clearUpgrade : close} /> : result ? <div className="family-token-success" role="status"><CheckCircle size={38} weight="fill" aria-hidden="true" /><StatusMessage tone={result.delivery_status === 'SENT' ? 'success' : 'error'}>{deliveryMessage(result.delivery_status)}</StatusMessage><div className="family-token-box"><code>{result.invite_url}</code><button type="button" className="secondary-button" onClick={() => void copyToken()}><Copy size={18} aria-hidden="true" />{copied ? 'Đã sao chép' : 'Sao chép liên kết'}</button></div><p>Hết hạn: {formatVietnamDateTime(result.expires_at)}</p>{error && <StatusMessage tone="error">{error}</StatusMessage>}</div> : <form className="family-form" onSubmit={(event) => void submit(event)}>
      {verification ? <div className="family-verification-state">
        {verification.kind === 'verifying' ? <StatusMessage tone="info">Đang xác minh lời mời. Vui lòng giữ cửa sổ này mở trong giây lát.</StatusMessage> : verification.kind === 'found' ? <><StatusMessage tone="success">{`Lời mời đã được tạo. Trạng thái hiện tại: ${verification.invitation.status}.`}</StatusMessage><p>Đích nhận: {verification.invitation.masked_target} · Hết hạn: {formatVietnamDateTime(verification.invitation.expires_at)}</p><p>Liên kết không còn có thể khôi phục từ danh sách. Hãy kiểm tra email hoặc thu hồi và tạo lại lời mời khi cần.</p></> : <><StatusMessage tone="info">{verification.ambiguous ? 'Có nhiều lời mời gần giống nhau nên chưa thể xác nhận yêu cầu vừa rồi.' : 'Chưa thể xác nhận lời mời đã được tạo hay chưa.'}</StatusMessage><p>Không gửi lại tự động để tránh tạo lời mời trùng. Bạn có thể tải lại trạng thái thủ công.</p><button className="secondary-button" type="button" disabled={busy} onClick={() => void verifyManually()}>Tải lại trạng thái</button></>}
        {error && <StatusMessage tone="error">{error}</StatusMessage>}
      </div> : <>
      <label className="family-field"><span>Email</span><input ref={targetRef} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <AnimatedSelect className="family-field" label="Mối quan hệ" value={relationship} options={relationshipOptions} onValueChange={setRelationship} />
      <AnimatedCardStatusList title="Quyền chia sẻ" cards={scopeCards} selectedIds={selectedScopes} onSelectionChange={setSelectedScopes} disabled={busy} />
      <p className="family-helper">Lịch dùng chung đã sẵn sàng. Cảnh báo và chia sẻ hồ sơ y tế vẫn đang được hoàn thiện.</p>
      <label className="family-field"><span>Hiệu lực (giờ)</span><input type="number" min={1} max={168} value={expires} onChange={(event) => setExpires(Number(event.target.value))} /></label>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={close}>Hủy</button><button className="primary-button" type="submit" disabled={busy || cooldown.remaining > 0}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining}s` : busy ? 'Đang tạo...' : 'Tạo lời mời'}</button></div>
      </>}
    </form>}
  </AccessibleDialog>
}

interface AcceptDialogProps { open: boolean; onClose: () => void; onAccepted: () => void | Promise<void> }

export function AcceptInvitationDialog({ open, onClose, onAccepted }: AcceptDialogProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const tokenRef = useRef<HTMLInputElement>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!token.trim()) { setError('Vui lòng nhập token lời mời.'); return }
    setBusy(true); setError('')
    try { await familyApi.acceptInvitation(token); receivedInvitationRequests.invalidate(); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'accept_succeeded', route_template: '/family-invitations/accept' }); setToken(''); await onAccepted(); onClose() }
    catch (reason) { setError(familyErrorMessage(reason)); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'accept_failed' }) }
    finally { setBusy(false) }
  }
  return <AccessibleDialog open={open} title="Tham gia nhóm gia đình" description="Nhập token một lần do chủ nhóm gửi cho bạn." onClose={onClose} busy={busy} initialFocusRef={tokenRef} className="family-dialog">
    <form className="family-form" onSubmit={(event) => void submit(event)}><label className="family-field"><span>Token lời mời</span><div className="family-input-icon"><LinkSimple size={19} aria-hidden="true" /><input ref={tokenRef} value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" /></div></label>{error && <StatusMessage tone="error">{error}</StatusMessage>}<div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang tham gia...' : 'Tham gia'}</button></div></form>
  </AccessibleDialog>
}

