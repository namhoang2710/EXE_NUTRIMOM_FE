import { ArrowClockwise, CalendarBlank, IdentificationCard, ShieldCheck, UserCircle, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { adminApi } from '../api/admin-api'
import type { AdminUserDetail, AdminUserListItem } from '../model/admin-users'
import { formatAdminUserEnum } from '../model/admin-users'
import { formatAdminDate, getInitials } from '../model/admin-formatters'
import { StatusBadge } from './AdminUI'

type DetailState = 'loading' | 'success' | 'error'

function value(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function dateValue(date: string | null, withTime = true) {
  return date ? formatAdminDate(date, withTime) : '—'
}

function DetailRow({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return <div className="admin-detail-row"><dt>{label}</dt><dd className={mono ? 'admin-detail-mono' : undefined}>{children}</dd></div>
}

export function AdminUserDetailDrawer({ user, onClose }: { user: AdminUserListItem; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [status, setStatus] = useState<DetailState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [visible, setVisible] = useState(false)
  const closing = useRef(false)
  const closeTimer = useRef<number | null>(null)

  const requestClose = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setVisible(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimer.current = window.setTimeout(onClose, reduceMotion ? 0 : 360)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    adminApi.getAdminUserDetail(user.id, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setDetail(result)
      setStatus('success')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      const message = reason instanceof ApiClientError && reason.status === 404
        ? 'This user no longer exists.'
        : reason instanceof Error ? reason.message : 'Unable to load user details.'
      setError(message)
      setStatus('error')
    })
    return () => controller.abort()
  }, [reload, user.id])

  useEffect(() => {
    document.body.classList.add('admin-dialog-open')
    const animationFrame = window.requestAnimationFrame(() => setVisible(true))
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      document.body.classList.remove('admin-dialog-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [requestClose])

  const displayName = detail?.displayName?.trim() || user.displayName?.trim() || 'Unnamed user'
  return (
    <div className="admin-user-drawer-backdrop" data-open={visible} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}>
      <aside className="admin-user-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title">
        <header className="admin-user-drawer-header">
          <div className="admin-user-detail-person"><span className="admin-avatar">{getInitials(displayName)}</span><div><span>User details</span><h2 id="admin-user-detail-title">{displayName}</h2><p>{user.phone}</p></div></div>
          <button className="admin-editor-close" type="button" aria-label="Close user details" onClick={requestClose}><X size={19} /></button>
        </header>

        {status === 'loading' && <div className="admin-detail-loading" aria-label="Loading user details"><span /><span /><span /><span /><span /></div>}
        {status === 'error' && <div className="admin-state admin-detail-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><h3>Could not load user details</h3><p>{error}</p><button className="admin-button secondary" type="button" onClick={() => setReload((current) => current + 1)}><ArrowClockwise size={17} />Try again</button></div>}

        {status === 'success' && detail && <div className="admin-user-detail-content">
          <section><h3><UserCircle size={18} />Account information</h3><dl>
            <DetailRow label="Display name">{value(detail.displayName)}</DetailRow>
            <DetailRow label="Phone">{detail.phone}</DetailRow>
            <DetailRow label="Email">{value(detail.email)}</DetailRow>
            <DetailRow label="Gender">{detail.gender ? formatAdminUserEnum(detail.gender) : '—'}</DetailRow>
            <DetailRow label="Date of birth">{dateValue(detail.dateOfBirth, false)}</DetailRow>
          </dl></section>
          <section><h3><ShieldCheck size={18} />Access and state</h3><dl>
            <DetailRow label="Roles"><span className="admin-user-badges">{detail.roles.map((role) => <span className="admin-role-badge" key={role}>{formatAdminUserEnum(role)}</span>)}</span></DetailRow>
            <DetailRow label="Status"><StatusBadge value={detail.status} /></DetailRow>
            <DetailRow label="Onboarding"><StatusBadge value={formatAdminUserEnum(detail.onboardingStatus)} /></DetailRow>
          </dl></section>
          <section><h3><IdentificationCard size={18} />Consent</h3><dl>
            <DetailRow label="Terms accepted">{dateValue(detail.termsAcceptedAt)}</DetailRow>
            <DetailRow label="Privacy accepted">{dateValue(detail.privacyAcceptedAt)}</DetailRow>
          </dl></section>
          <section><h3><CalendarBlank size={18} />System information</h3><dl>
            <DetailRow label="User ID" mono>{detail.id}</DetailRow>
            <DetailRow label="Created">{formatAdminDate(detail.createdAt, true)}</DetailRow>
            <DetailRow label="Updated">{formatAdminDate(detail.updatedAt, true)}</DetailRow>
            <DetailRow label="Version">{detail.version}</DetailRow>
          </dl></section>
        </div>}
      </aside>
    </div>
  )
}
