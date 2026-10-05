import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage } from '../model/family-errors'
import { formatVietnamDateTime } from '../model/family-formatters'
import type { FamilyInvitationPreview } from '../model/family-types'
import '../styles/family.css'

export function FamilyInvitePage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const token = params.get('token')?.trim() || ''
  const [preview, setPreview] = useState<FamilyInvitationPreview>()
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>()
  useEffect(() => {
    if (!token) { setError(new Error('Liên kết lời mời thiếu token.')); setLoading(false); return }
    const current = new AbortController(); setLoading(true); setError(undefined)
    void familyApi.previewInvitation(token, current.signal).then((result) => { if (!current.signal.aborted) setPreview(result); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'preview_loaded' }) }).catch((reason: unknown) => { if (!current.signal.aborted) { setError(reason); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'preview_failed' }) } }).finally(() => { if (!current.signal.aborted) setLoading(false) })
    return () => current.abort()
  }, [token])
  async function accept() {
    if (!token || preview?.status !== 'PENDING') return
    setBusy(true); setError(undefined)
    try { await familyApi.acceptInvitation(token); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'accept_succeeded' }); navigate('/app/family', { replace: true, state: { invitationAccepted: true } }) }
    catch (reason) { setError(reason); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'accept_failed' }) }
    finally { setBusy(false) }
  }
  const statusMessage = preview?.status === 'ACCEPTED' ? 'Lời mời này đã được chấp nhận.' : preview?.status === 'REVOKED' ? 'Lời mời đã bị thu hồi.' : preview?.status === 'EXPIRED' ? 'Lời mời đã hết hạn. Hãy xin một liên kết mới.' : ''
  return <main className="family-page"><div className="family-page-body"><section className="family-onboarding" aria-labelledby="invite-title">{loading ? <p>Đang kiểm tra lời mời...</p> : error && !preview ? <><WarningCircle size={42} /><h1 id="invite-title">Không thể mở lời mời</h1><StatusMessage tone="error">{familyErrorMessage(error)}</StatusMessage><DiagnosticCopyButton feature="family-invitation" event="preview_failed" error={error} /><Link className="secondary-button" to="/app">Về tổng quan</Link></> : preview ? <><CheckCircle size={42} weight="duotone" /><h1 id="invite-title">Lời mời từ {preview.inviter_display_name}</h1><p>{preview.relationship_label} · {preview.masked_target}</p><div className="family-scope-list">{preview.scope_labels.map((label) => <span key={label}>{label}</span>)}</div><p>Hết hạn: {formatVietnamDateTime(preview.expires_at)}</p>{statusMessage && <StatusMessage tone="error">{statusMessage}</StatusMessage>}{error && <><StatusMessage tone="error">{familyErrorMessage(error)}</StatusMessage><DiagnosticCopyButton feature="family-invitation" event="accept_failed" error={error} /></>}{preview.status === 'PENDING' ? <button className="primary-button" type="button" disabled={busy} onClick={() => void accept()}>{busy ? 'Đang chấp nhận...' : 'Chấp nhận lời mời'}</button> : <Link className="secondary-button" to="/app">Về tổng quan</Link>}</> : null}</section></div></main>
}
