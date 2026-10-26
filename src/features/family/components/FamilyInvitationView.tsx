import { ClockCountdown, EnvelopeSimple, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyErrorMessage } from '../model/family-errors'
import { formatVietnamDateTime } from '../model/family-formatters'
import type { FamilyInvitationPreview } from '../model/family-types'
import { FamilyLoadingState } from './FamilyLoadingState'

interface Props {
  source: 'token' | 'id'
  preview?: FamilyInvitationPreview
  loading: boolean
  busy: boolean
  error?: unknown
  onAccept: () => void
}

function statusMessage(status: FamilyInvitationPreview['status']) {
  if (status === 'ACCEPTED') return 'Lời mời này đã được sử dụng.'
  if (status === 'REVOKED') return 'Lời mời này đã bị thu hồi.'
  if (status === 'EXPIRED') return 'Lời mời này đã hết hạn.'
  return undefined
}

const invitationStatusLabels: Record<FamilyInvitationPreview['status'], string> = {
  PENDING: 'Đang chờ',
  ACCEPTED: 'Đã chấp nhận',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Đã hết hạn',
}

function invitationError(source: Props['source'], error: unknown) {
  if (source === 'id' && error instanceof ApiClientError && error.status === 404) {
    return 'Lời mời không tồn tại, không còn khả dụng hoặc không dành cho tài khoản hiện tại.'
  }
  if (source === 'token' && error instanceof ApiClientError && (error.status === 403 || error.code === 'INVITATION_TARGET_MISMATCH')) {
    return 'Bạn đang đăng nhập bằng tài khoản khác với địa chỉ được mời. Hãy đăng nhập bằng đúng địa chỉ hiển thị ở trên rồi thử lại.'
  }
  return familyErrorMessage(error)
}

export function FamilyInvitationView({ source, preview, loading, busy, error, onAccept }: Props) {
  const unavailable = preview ? statusMessage(preview.status) : undefined
  if (loading) return <FamilyLoadingState label="Đang kiểm tra lời mời" description="NutriMom đang tải thông tin an toàn của lời mời." />
  if (error && !preview) return <section className="family-onboarding" aria-labelledby="invite-title"><div><WarningCircle size={42} weight="duotone" aria-hidden="true" /><h1 id="invite-title">Không thể mở lời mời</h1><StatusMessage tone="error">{invitationError(source, error)}</StatusMessage><DiagnosticCopyButton feature="family-invitation" event="preview_failed" error={error} /><Link className="secondary-button" to="/app/family">Về Family Hub</Link></div></section>
  if (!preview) return null

  const inviterInitial = preview.inviter_display_name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'N'
  return <section className="family-onboarding family-invitation-preview" aria-labelledby="invite-title">
    <header className="family-invitation-header"><span className="family-invitation-avatar" aria-hidden="true">{inviterInitial}</span><div><span className={`family-invitation-status is-${preview.status.toLowerCase()}`}>{invitationStatusLabels[preview.status]}</span><h1 id="invite-title">{preview.inviter_display_name} mời bạn vào Family Hub</h1><p>{preview.relationship_label}</p></div></header>
    {preview.status === 'PENDING' && <StatusMessage tone="info">{`Lời mời này được gửi tới ${preview.masked_target}. Hãy đăng nhập bằng đúng địa chỉ này để chấp nhận.`}</StatusMessage>}
    <div className="family-invitation-preview-details">
      <div className="family-invitation-fact"><EnvelopeSimple size={21} weight="duotone" aria-hidden="true" /><span><small>Địa chỉ nhận</small><strong>{preview.masked_target} · {preview.target_type === 'EMAIL' ? 'Email' : 'Số điện thoại'}</strong></span></div>
      <div className="family-invitation-fact"><ClockCountdown size={21} weight="duotone" aria-hidden="true" /><span><small>Thời hạn</small><strong>{formatVietnamDateTime(preview.expires_at)}</strong></span></div>
      <div className="family-invitation-permissions"><span><ShieldCheck size={20} weight="duotone" aria-hidden="true" />Quyền được chia sẻ</span><div className="family-scope-list" aria-label="Quyền chia sẻ">{preview.scope_labels.map((label) => <span key={label}>{label}</span>)}</div></div>
    </div>
    {unavailable && <StatusMessage tone="info">{unavailable}</StatusMessage>}
    {error !== undefined && <><StatusMessage tone="error">{invitationError(source, error)}</StatusMessage><DiagnosticCopyButton feature="family-invitation" event="accept_failed" error={error} /></>}
    <div className="family-dialog-actions">
      <Link className="secondary-button" to="/app/family">Về Family Hub</Link>
      {preview.status === 'PENDING' && <button className="primary-button" type="button" disabled={busy} aria-busy={busy} onClick={onAccept}>{busy ? 'Đang chấp nhận...' : 'Chấp nhận lời mời'}</button>}
    </div>
  </section>
}
