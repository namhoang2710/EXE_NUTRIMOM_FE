import { ArrowClockwise, CircleNotch, Trash, WarningCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuHistory } from 'react-icons/lu'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { GlobalActionToast, type CalendarToastMessage } from '@/features/calendar/components/CalendarToast'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { DiagnosticCopyButton } from '@/shared/components/DiagnosticCopyButton'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyRateLimitError } from '../model/family-errors'
import { formatVietnamDateTime, relationshipLabels, scopeLabels } from '../model/family-formatters'
import { formatInvitationRetryCountdown, invitationListRequests } from '../model/invitation-list-requests'
import type { FamilyInvitationSummary, FamilyRelationship } from '../model/family-types'

interface InvitationListProps {
  enabled?: boolean
  createdInvitations?: FamilyInvitationSummary[]
  onInvitationDeleted?: (id: string) => void
}

function mergeInvitations(primary: FamilyInvitationSummary[], secondary: FamilyInvitationSummary[]) {
  const ids = new Set(primary.map((item) => item.id))
  return [...primary, ...secondary.filter((item) => !ids.has(item.id))]
}

export function InvitationList({ enabled = true, createdInvitations = [], onInvitationDeleted }: InvitationListProps) {
  const [items, setItems] = useState<FamilyInvitationSummary[]>(() => invitationListRequests.snapshot() ?? [])
  const [hasSnapshot, setHasSnapshot] = useState(() => invitationListRequests.snapshot() !== undefined)
  const [loading, setLoading] = useState(() => invitationListRequests.snapshot() === undefined)
  const [error, setError] = useState<unknown>()
  const [confirming, setConfirming] = useState<FamilyInvitationSummary>()
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState('')
  const [toast, setToast] = useState<CalendarToastMessage>()
  const [cooldownSeconds, setCooldownSeconds] = useState(() => Math.ceil(invitationListRequests.remainingMs() / 1_000))
  const itemsRef = useRef(items)
  const toastId = useRef(0)
  const mounted = useRef(false)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await invitationListRequests.load(async () => {
        try {
          const invitations = await familyApi.invitations()
          logDiagnostic({ level: 'info', category: 'family-invitation', event: 'list_loaded' })
          return invitations
        } catch (reason) {
          logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'list_failed' })
          throw reason
        }
      }, { force })
      if (mounted.current) {
        itemsRef.current = result
        setItems(result)
        setHasSnapshot(true)
        setCooldownSeconds(0)
      }
    } catch (reason) {
      if (mounted.current) {
        setError(reason)
        setCooldownSeconds(Math.ceil(invitationListRequests.remainingMs() / 1_000))
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (enabled) void load()
    return () => { mounted.current = false }
  }, [enabled, load])

  useEffect(() => {
    if (!createdInvitations.length) return
    const update = (current: FamilyInvitationSummary[]) => mergeInvitations(createdInvitations, current)
    const nextItems = update(itemsRef.current)
    itemsRef.current = nextItems
    invitationListRequests.replace(nextItems)
    setItems(nextItems)
    setHasSnapshot(true)
    setError(undefined)
  }, [createdInvitations])

  const coolingDown = cooldownSeconds > 0
  const rateLimited = coolingDown && isFamilyRateLimitError(error)
  const countdownLabel = formatInvitationRetryCountdown(cooldownSeconds)
  useEffect(() => {
    if (!coolingDown) return
    const updateCountdown = () => setCooldownSeconds(Math.ceil(invitationListRequests.remainingMs() / 1_000))
    const timer = window.setInterval(updateCountdown, 250)
    return () => window.clearInterval(timer)
  }, [coolingDown])

  const dismissToast = useCallback(() => setToast(undefined), [])

  function requestRevoke(item: FamilyInvitationSummary) {
    setRevokeError('')
    setConfirming(item)
  }

  function closeConfirmation() {
    if (revoking) return
    setRevokeError('')
    setConfirming(undefined)
  }

  async function revoke() {
    if (!confirming || revoking) return
    const invitation = confirming
    setRevoking(true)
    setRevokeError('')
    try {
      await familyApi.revokeInvitation(invitation.id)
      const removeInvitation = (current: FamilyInvitationSummary[]) => current.filter((item) => item.id !== invitation.id)
      const nextItems = removeInvitation(itemsRef.current)
      itemsRef.current = nextItems
      invitationListRequests.replace(nextItems)
      setItems(nextItems)
      setHasSnapshot(true)
      onInvitationDeleted?.(invitation.id)
      setConfirming(undefined)
      toastId.current += 1
      setToast({ id: toastId.current, message: 'Đã xóa thành công', tone: 'success' })
      logDiagnostic({ level: 'info', category: 'family-invitation', event: 'revoke_succeeded' })
    } catch (reason) {
      setRevokeError(familyErrorMessage(reason))
      logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'revoke_failed' })
    } finally {
      setRevoking(false)
    }
  }

  return <>
    <section className="family-invitations" aria-labelledby="family-invitations-title">
      <div className="family-section-heading">
        <div>
          <h3 id="family-invitations-title"><LuHistory aria-hidden="true" />Lịch sử lời mời</h3>
        </div>
        <button className="family-icon-button" type="button" aria-label={coolingDown ? `Có thể tải lại lời mời sau ${cooldownSeconds} giây` : 'Tải lại lời mời'} aria-busy={loading} disabled={loading || coolingDown} onClick={() => void load()}>
          <ArrowClockwise className={loading ? 'nm-dialog-spinner' : undefined} size={19} />
        </button>
      </div>

      {loading && !hasSnapshot ? <p>Đang tải lời mời...</p> : error && !hasSnapshot ? (
        <div className="family-inline-state">
          <StatusMessage tone="error">{rateLimited ? `Hệ thống đang tạm giới hạn lượt tải. Bạn có thể thử lại sau ${countdownLabel}.` : familyErrorMessage(error)}</StatusMessage>
          {!rateLimited && <DiagnosticCopyButton feature="family-invitation" event="list_failed" error={error} />}
          <button className="secondary-button" type="button" disabled={loading || coolingDown} onClick={() => void load(true)}>{coolingDown ? `Thử lại (${countdownLabel})` : 'Thử lại'}</button>
        </div>
      ) : items.length ? (
        <div className="family-member-list">
          {items.map((item) => <article className="family-member-row family-invitation-row" key={item.id}>
            <div className="family-member-copy">
              <h3>{item.masked_target}</h3>
              <p>{relationshipLabels[item.relationship as FamilyRelationship] || item.relationship} · {item.status}</p>
              <div className="family-scope-list">{item.scopes.map((scope) => <span key={scope}>{scopeLabels[scope]}</span>)}</div>
              <small>Gửi: {item.delivery_status || 'Chưa xác định'} · {item.sent_at ? formatVietnamDateTime(item.sent_at) : 'chưa gửi'} · Hết hạn: {formatVietnamDateTime(item.expires_at)} · Tạo: {formatVietnamDateTime(item.created_at)}</small>
            </div>
            {item.status === 'PENDING' && <button className="family-icon-button is-danger" type="button" aria-label={`Xóa lời mời ${item.masked_target}`} onClick={() => requestRevoke(item)}><Trash size={20} /></button>}
          </article>)}
        </div>
      ) : <p>Chưa có lời mời nào.</p>}
    </section>

    <AccessibleDialog
      open={Boolean(confirming)}
      title="Xóa lời mời này?"
      onClose={closeConfirmation}
      busy={revoking}
      className="family-delete-invitation-dialog"
      footer={<>
        <button className="secondary-button" type="button" disabled={revoking} onClick={closeConfirmation}>Giữ lại</button>
        <button className="danger-submit" type="button" disabled={revoking} aria-busy={revoking} onClick={() => void revoke()}>
          {revoking && <CircleNotch className="nm-dialog-spinner" size={18} weight="bold" aria-hidden="true" />}
          <span>{revoking ? 'Đang xóa...' : 'Xóa lời mời'}</span>
        </button>
      </>}
    >
      <div className="family-delete-invitation-state">
        <WarningCircle size={36} weight="duotone" aria-hidden="true" />
        <p className="family-delete-invitation-message">Lời mời gửi đến <strong>{confirming?.masked_target}</strong> sẽ bị thu hồi và không thể sử dụng được nữa.</p>
        {revokeError && <p className="nm-dialog-error" role="alert">{revokeError}</p>}
      </div>
    </AccessibleDialog>

    <GlobalActionToast toast={toast} onClose={dismissToast} />
  </>
}
