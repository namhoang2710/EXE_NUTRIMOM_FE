import { ArrowClockwise, EnvelopeSimpleOpen } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { formatVietnamDateTime } from '../model/family-formatters'
import type { ReceivedFamilyInvitation } from '../model/family-types'

interface Props {
  items: ReceivedFamilyInvitation[]
  loading: boolean
  error?: string
  onRetry: () => void
}

export function ReceivedInvitationList({ items, loading, error, onRetry }: Props) {
  if (!items.length && !error) return null

  const pendingCount = items.filter((item) => item.status === 'PENDING').length
  return <section className="family-received-invitations" aria-labelledby="family-received-title" aria-busy={loading}>
    <div className="family-section-heading">
      <div><h2 id="family-received-title"><EnvelopeSimpleOpen size={25} weight="duotone" aria-hidden="true" />Lời mời dành cho bạn {pendingCount > 0 && <span className="family-pending-badge" aria-label={`${pendingCount} lời mời đang chờ`}>{pendingCount > 99 ? '99+' : pendingCount}</span>}</h2><p>Mở lời mời để xem phạm vi chia sẻ và chấp nhận bằng tài khoản hiện tại.</p></div>
      {error && <button className="family-icon-button" type="button" aria-label="Tải lại lời mời dành cho bạn" disabled={loading} onClick={onRetry}><ArrowClockwise className={loading ? 'nm-dialog-spinner' : undefined} size={19} /></button>}
    </div>
    {items.length ? <div className="family-received-list">{items.map((item) => <Link className="family-received-item" to={`/app/family/invitations/${encodeURIComponent(item.id)}`} key={item.id}><span className="family-received-avatar" aria-hidden="true">{item.inviter_display_name.trim().charAt(0).toUpperCase()}</span><span><strong>{item.inviter_display_name}</strong><small>{item.relationship_label} · {item.masked_target}</small><span className="family-scope-list">{item.scope_labels.map((label) => <span key={label}>{label}</span>)}</span><time dateTime={item.expires_at}>Hết hạn: {formatVietnamDateTime(item.expires_at)}</time></span></Link>)}</div> : <div className="family-inline-state"><StatusMessage tone="error">{error || 'Không thể tải lời mời dành cho bạn.'}</StatusMessage></div>}
    {error && items.length > 0 && <StatusMessage tone="error">{error}</StatusMessage>}
  </section>
}
