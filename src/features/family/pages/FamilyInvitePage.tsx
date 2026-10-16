import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { familyApi } from '../api/family-api'
import { FamilyInvitationView } from '../components/FamilyInvitationView'
import { createAbortableRequestCoordinator, receivedInvitationRequests } from '../model/received-invitation-requests'
import { refreshFamilyAfterAccept } from '../model/family-bootstrap'
import type { FamilyInvitationPreview } from '../model/family-types'
import '../styles/family.css'

function createTokenPreviewCoordinator(_token: string) {
  return createAbortableRequestCoordinator<FamilyInvitationPreview>(0)
}

export function FamilyInvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { reloadProfile } = useAuth()
  const token = params.get('token')?.trim() || ''
  const [preview, setPreview] = useState<FamilyInvitationPreview>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const accepting = useRef(false)
  const previewRequests = useMemo(() => createTokenPreviewCoordinator(token), [token])

  useEffect(() => {
    if (!token) { setError(new Error('Liên kết lời mời thiếu token.')); setLoading(false); return }
    let active = true
    setLoading(true); setError(undefined)
    const lease = previewRequests.acquire((signal) => familyApi.previewInvitation(token, signal))
    void lease.promise
      .then((result) => { if (active) { setPreview(result); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'preview_loaded', route_template: '/family-invitations/preview' }) } })
      .catch((reason: unknown) => { if (active) { setError(reason); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'preview_failed', route_template: '/family-invitations/preview' }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; lease.release() }
  }, [previewRequests, token])

  async function accept() {
    if (!token || preview?.status !== 'PENDING' || accepting.current) return
    accepting.current = true; setBusy(true); setError(undefined)
    try {
      await familyApi.acceptInvitation(token)
      receivedInvitationRequests.invalidate()
      logDiagnostic({ level: 'info', category: 'family-invitation', event: 'accept_succeeded', route_template: '/family-invitations/accept' })
      await refreshFamilyAfterAccept(reloadProfile)
      navigate('/app/family', { replace: true, state: { invitationAccepted: true } })
    } catch (reason) {
      setError(reason)
      logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'accept_failed', route_template: '/family-invitations/accept' })
    } finally { accepting.current = false; setBusy(false) }
  }

  return <main className="family-page"><div className="family-page-body"><FamilyInvitationView source="token" preview={preview} loading={loading} busy={busy} error={error} onAccept={() => void accept()} /></div></main>
}
