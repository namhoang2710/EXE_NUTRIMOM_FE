import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { logDiagnostic } from '@/core/diagnostics/logger'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { familyApi } from '../api/family-api'
import { FamilyInvitationView } from '../components/FamilyInvitationView'
import { invitationPreviewRequests, receivedInvitationRequests } from '../model/received-invitation-requests'
import { refreshFamilyAfterAccept } from '../model/family-bootstrap'
import type { FamilyInvitationPreview } from '../model/family-types'
import '../styles/family.css'

export function FamilyInvitationByIdPage() {
  const { invitationId = '' } = useParams()
  const navigate = useNavigate()
  const { reloadProfile } = useAuth()
  const [preview, setPreview] = useState<FamilyInvitationPreview>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const accepting = useRef(false)

  useEffect(() => {
    if (!invitationId) { setError(new Error('Liên kết lời mời thiếu mã định danh.')); setLoading(false); return }
    setLoading(true); setError(undefined)
    let active = true
    const lease = invitationPreviewRequests.acquire(invitationId, (signal) => familyApi.previewInvitationById(invitationId, signal))
    void lease.promise
      .then((result) => { if (active) { setPreview(result); logDiagnostic({ level: 'info', category: 'family-invitation', event: 'preview_loaded', route_template: '/family-invitations/{id}/preview' }) } })
      .catch((reason: unknown) => { if (active) { setError(reason); logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'preview_failed', route_template: '/family-invitations/{id}/preview' }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; lease.release() }
  }, [invitationId])

  async function accept() {
    if (!invitationId || preview?.status !== 'PENDING' || accepting.current) return
    accepting.current = true; setBusy(true); setError(undefined)
    try {
      await familyApi.acceptInvitationById(invitationId)
      invitationPreviewRequests.invalidate(invitationId)
      receivedInvitationRequests.invalidate()
      logDiagnostic({ level: 'info', category: 'family-invitation', event: 'accept_succeeded', route_template: '/family-invitations/{id}/accept' })
      await refreshFamilyAfterAccept(reloadProfile)
      navigate('/app/family', { replace: true, state: { invitationAccepted: true } })
    } catch (reason) {
      setError(reason)
      logDiagnostic({ level: 'warn', category: 'family-invitation', event: 'accept_failed', route_template: '/family-invitations/{id}/accept' })
    } finally { accepting.current = false; setBusy(false) }
  }

  return <main className="family-page"><div className="family-page-body"><FamilyInvitationView source="id" preview={preview} loading={loading} busy={busy} error={error} onAccept={() => void accept()} /></div></main>
}
