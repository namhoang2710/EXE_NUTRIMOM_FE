import { ArrowClockwise, Briefcase, Camera, CalendarBlank, ChartBar, FloppyDisk, IdentificationCard, PencilSimple, ShieldCheck, SpinnerGap, Trash, WarningCircle, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { adminExpertsApi } from '../api/admin-api'
import type { AdminExpert, ExpertFormErrors, ExpertSpecialty, ExpertSpecialtyOption, ExpertStatus } from '../model/admin-experts'
import { formatExpertSpecialty, isExpertSpecialty, validateExpertAvatar, validateExpertProfile } from '../model/admin-experts'
import { formatAdminDate } from '../model/admin-formatters'
import { AdminExpertAvatar } from './AdminExpertAvatar'
import { AdminFilterSelect } from './AdminFilterSelect'
import { StatusBadge } from './AdminUI'

type DetailState = 'loading' | 'success' | 'error'
interface EditState { fullName: string; specialty: string; title: string; workplace: string; yearsOfExperience: string; bio: string; status: ExpertStatus }

function display(value: string | number | null | undefined) { return value === null || value === undefined || value === '' ? '—' : String(value) }
function DetailRow({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return <div className="admin-detail-row"><dt>{label}</dt><dd className={mono ? 'admin-detail-mono' : undefined}>{children}</dd></div>
}
function toEditState(expert: AdminExpert): EditState {
  return { fullName: expert.fullName, specialty: expert.specialty, title: expert.title ?? '', workplace: expert.workplace ?? '', yearsOfExperience: String(expert.yearsOfExperience), bio: expert.bio ?? '', status: expert.status }
}

export function AdminExpertDetailDrawer({ expert, specialties, onClose, onChanged }: {
  expert: AdminExpert
  specialties: readonly ExpertSpecialtyOption[]
  onClose: () => void
  onChanged: (expert: AdminExpert) => void
}) {
  const [detail, setDetail] = useState<AdminExpert | null>(null)
  const [status, setStatus] = useState<DetailState>('loading')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTouched, setEditTouched] = useState(false)
  const [avatarTouched, setAvatarTouched] = useState(false)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [form, setForm] = useState<EditState>(() => toEditState(expert))
  const [errors, setErrors] = useState<ExpertFormErrors>({})
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [versionConflict, setVersionConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')
  const confirmingRef = useRef(false)
  const discardConfirmRef = useRef(false)
  const closing = useRef(false)
  const closeTimer = useRef<number | null>(null)
  const requestDismissRef = useRef<() => void>(() => undefined)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previewUrl = useMemo(() => avatar ? URL.createObjectURL(avatar) : '', [avatar])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const requestClose = useCallback(() => {
    if (closing.current || busy) return
    closing.current = true
    setVisible(false)
    closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360)
  }, [busy, onClose])

  const returnToDetail = useCallback(() => {
    if (detail) setForm(toEditState(detail))
    setEditing(false)
    setEditTouched(false)
    setAvatarTouched(false)
    setAvatar(null)
    setAvatarError('')
    setErrors({})
    setSaveError('')
    setVersionConflict(false)
    setSpecialtyOpen(false)
    setStatusOpen(false)
    setDiscardConfirm(false)
  }, [detail])

  const requestDismiss = useCallback(() => {
    if (busy) return
    if (!editing) { requestClose(); return }
    if (editTouched || avatarTouched) { setDiscardConfirm(true); return }
    returnToDetail()
  }, [avatarTouched, busy, editTouched, editing, requestClose, returnToDetail])
  requestDismissRef.current = requestDismiss
  confirmingRef.current = confirming
  discardConfirmRef.current = discardConfirm

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading'); setError('')
    adminExpertsApi.detail(expert.userId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setDetail(result); setStatus('success'); onChanged(result)
      if (reload === 0) setForm(toEditState(result))
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Unable to load expert details.'); setStatus('error')
    })
    return () => controller.abort()
  }, [expert.userId, onChanged, reload])

  useEffect(() => {
    document.body.classList.add('admin-dialog-open')
    const frame = window.requestAnimationFrame(() => { setVisible(true); closeButton.current?.focus() })
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (discardConfirmRef.current) setDiscardConfirm(false)
      else if (confirmingRef.current) setConfirming(false)
      else requestDismissRef.current()
    }
    window.addEventListener('keydown', escape)
    return () => {
      window.cancelAnimationFrame(frame)
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      document.body.classList.remove('admin-dialog-open')
      window.removeEventListener('keydown', escape)
    }
  }, [])

  function update<Key extends keyof EditState>(key: Key, value: EditState[Key]) {
    setEditTouched(true)
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaveError(''); setVersionConflict(false)
  }

  function beginEdit() {
    if (!detail) return
    setForm(toEditState(detail)); setErrors({}); setSaveError(''); setVersionConflict(false); setEditTouched(false); setAvatarTouched(false); setAvatar(null); setAvatarError(''); setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!detail) return
    const nextErrors = validateExpertProfile(form, false)
    setErrors(nextErrors); setSaveError(''); setSuccessMessage(''); setVersionConflict(false)
    if (Object.keys(nextErrors).length > 0 || !isExpertSpecialty(form.specialty)) return
    setBusy(true)
    try {
      const updated = await adminExpertsApi.update(detail.userId, {
        fullName: form.fullName, specialty: form.specialty as ExpertSpecialty, title: form.title,
        workplace: form.workplace, yearsOfExperience: Number(form.yearsOfExperience), bio: form.bio,
        status: form.status, version: detail.version,
      })
      setDetail(updated); onChanged(updated); setEditing(false); setEditTouched(false); setAvatarTouched(false); setForm(toEditState(updated)); setSuccessMessage('Expert profile updated successfully.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setVersionConflict(true); setSaveError('This profile changed elsewhere. Reload the latest version before saving again.')
      } else setSaveError(reason instanceof Error ? reason.message : 'Unable to save this profile.')
    } finally { setBusy(false) }
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file) setAvatarTouched(true)
    const nextError = validateExpertAvatar(file)
    setAvatarError(nextError ?? '')
    if (!nextError) setAvatar(file)
    event.target.value = ''
  }

  async function uploadAvatar() {
    if (!detail || !avatar) return
    setBusy(true); setAvatarError('')
    try {
      const updated = await adminExpertsApi.uploadAvatar(detail.userId, avatar)
      setDetail(updated); setAvatar(null); setAvatarTouched(false); onChanged(updated); setSuccessMessage('Expert avatar updated successfully.')
    } catch (reason) { setAvatarError(reason instanceof Error ? reason.message : 'Unable to upload the avatar.') }
    finally { setBusy(false) }
  }

  async function deactivate() {
    if (!detail) return
    setBusy(true); setDeactivateError('')
    try {
      await adminExpertsApi.deactivate(detail.userId)
      const updated = { ...detail, status: 'INACTIVE' as const }
      setDetail(updated); setForm(toEditState(updated)); onChanged(updated); setConfirming(false); setSuccessMessage('Expert deactivated successfully.')
    } catch (reason) { setDeactivateError(reason instanceof Error ? reason.message : 'Unable to deactivate this expert.') }
    finally { setBusy(false) }
  }

  const shown = detail ?? expert
  return <div className="admin-user-drawer-backdrop" data-open={visible} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestDismiss() }}>
    <aside className="admin-user-drawer admin-expert-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-expert-detail-title">
      <header className="admin-user-drawer-header"><div className="admin-user-detail-person"><AdminExpertAvatar name={shown.fullName} url={shown.avatarUrl} size="large" /><div><span>Expert details</span><h2 id="admin-expert-detail-title">{shown.fullName}</h2><p>{shown.phone} · <StatusBadge value={shown.status} /></p></div></div><button ref={closeButton} className="admin-editor-close" type="button" aria-label={editing ? 'Return to expert details' : 'Close expert details'} disabled={busy} onClick={requestDismiss}><X size={19} /></button></header>
      {status === 'loading' && !detail && <div className="admin-detail-loading" aria-label="Loading expert details"><span /><span /><span /><span /></div>}
      {status === 'error' && !detail && <div className="admin-state admin-detail-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><h3>Could not load expert details</h3><p>{error}</p><button className="admin-button secondary" type="button" onClick={() => setReload((current) => current + 1)}><ArrowClockwise size={17} />Try again</button></div>}
      {successMessage && <div className="admin-success-notice" role="status">{successMessage}</div>}
      {detail && !editing && <div className="admin-user-detail-content">
        <div className="admin-expert-detail-actions"><button className="admin-button primary" type="button" onClick={beginEdit}><PencilSimple size={17} />Edit profile</button>{detail.status !== 'INACTIVE' && <button className="admin-button danger-outline" type="button" onClick={() => { setConfirming(true); setDeactivateError('') }}><Trash size={17} />Deactivate expert</button>}</div>
        <section><h3><Briefcase size={18} />Professional profile</h3><dl><DetailRow label="Specialty">{formatExpertSpecialty(detail.specialty, specialties)}</DetailRow><DetailRow label="Title">{display(detail.title)}</DetailRow><DetailRow label="Workplace">{display(detail.workplace)}</DetailRow><DetailRow label="Experience">{detail.yearsOfExperience} {detail.yearsOfExperience === 1 ? 'year' : 'years'}</DetailRow><DetailRow label="Bio">{display(detail.bio)}</DetailRow></dl></section>
        <section><h3><ChartBar size={18} />Performance</h3><dl><DetailRow label="Average rating">{Number.isFinite(detail.averageRating) ? detail.averageRating.toFixed(1) : '0.0'}</DetailRow><DetailRow label="Rating count">{detail.ratingCount || 0}</DetailRow></dl></section>
        <section><h3><IdentificationCard size={18} />Account and access</h3><dl><DetailRow label="Phone">{detail.phone}</DetailRow><DetailRow label="Status"><StatusBadge value={detail.status} /></DetailRow></dl></section>
        <section><h3><CalendarBlank size={18} />System information</h3><dl><DetailRow label="User ID" mono>{detail.userId}</DetailRow><DetailRow label="Version">{detail.version}</DetailRow><DetailRow label="Created">{formatAdminDate(detail.createdAt, true)}</DetailRow><DetailRow label="Updated">{formatAdminDate(detail.updatedAt, true)}</DetailRow></dl></section>
      </div>}
      {detail && editing && <form className="admin-expert-drawer-form" noValidate onSubmit={(event) => { void save(event) }}>
        {saveError && <div className="admin-form-alert" role="alert">{saveError}{versionConflict && <button type="button" onClick={() => setReload((current) => current + 1)}><ArrowClockwise size={15} />Reload latest version</button>}</div>}
        <section><h3><Briefcase size={18} />Professional profile</h3><div className="admin-expert-form-grid">
          <label><span>Phone</span><input value={detail.phone} readOnly /></label>
          <label><span>Full name *</span><input maxLength={100} value={form.fullName} onChange={(event) => update('fullName', event.target.value)} />{errors.fullName && <small className="admin-field-error">{errors.fullName}</small>}</label>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Specialty *" placeholder="Select specialty" options={specialties.map((item) => ({ value: item.code, label: item.displayName }))} value={form.specialty} open={specialtyOpen} onOpenChange={setSpecialtyOpen} onChange={(value) => update('specialty', value)} />{errors.specialty && <small className="admin-field-error">{errors.specialty}</small>}</div>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Status" placeholder="Select status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} value={form.status} open={statusOpen} onOpenChange={setStatusOpen} onChange={(value) => update('status', value as ExpertStatus)} /></div>
          <label><span>Professional title</span><input maxLength={100} value={form.title} onChange={(event) => update('title', event.target.value)} />{errors.title && <small className="admin-field-error">{errors.title}</small>}</label>
          <label><span>Workplace</span><input maxLength={255} value={form.workplace} onChange={(event) => update('workplace', event.target.value)} />{errors.workplace && <small className="admin-field-error">{errors.workplace}</small>}</label>
          <label><span>Years of experience</span><input type="number" min={0} max={80} value={form.yearsOfExperience} onChange={(event) => update('yearsOfExperience', event.target.value)} />{errors.yearsOfExperience && <small className="admin-field-error">{errors.yearsOfExperience}</small>}</label>
          <label className="admin-field-wide"><span>Bio</span><textarea rows={6} maxLength={4000} value={form.bio} onChange={(event) => update('bio', event.target.value)} /><small className="admin-character-count">{form.bio.length}/4000</small>{errors.bio && <small className="admin-field-error">{errors.bio}</small>}</label>
        </div></section>
        <section><h3><Camera size={18} />Avatar</h3><div className="admin-expert-avatar-picker compact"><div className="admin-avatar-preview">{previewUrl ? <img src={previewUrl} alt="New avatar preview" /> : <AdminExpertAvatar name={detail.fullName} url={detail.avatarUrl} size="large" />}</div><div><label className="admin-button secondary admin-upload-button"><Camera size={16} />Choose image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseAvatar} /></label>{avatar && <button className="admin-button primary compact" type="button" disabled={busy} onClick={() => { void uploadAvatar() }}>{busy ? <SpinnerGap className="admin-spin" size={16} /> : <FloppyDisk size={16} />}Upload avatar</button>}{avatarError && <small className="admin-field-error">{avatarError}</small>}</div></div></section>
        <footer className="admin-editor-actions"><span>Version {detail.version} will be used for conflict protection.</span><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestDismiss}>Cancel</button><button className="admin-button primary" type="submit" disabled={busy}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <FloppyDisk size={17} />}{busy ? 'Saving…' : 'Save changes'}</button></div></footer>
      </form>}
      {discardConfirm && <div className="admin-expert-drawer-confirm-backdrop" role="presentation"><section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-expert-changes-title"><span className="admin-confirm-icon"><WarningCircle size={28} /></span><h2 id="discard-expert-changes-title">Discard unsaved changes?</h2><p>You edited this expert profile. Discarding will restore the last saved information and return to the detail view.</p><div><button className="admin-button secondary" type="button" onClick={() => setDiscardConfirm(false)}>Keep editing</button><button className="admin-button danger" type="button" onClick={returnToDetail}>Discard changes</button></div></section></div>}
      {confirming && <div className="admin-expert-confirm-backdrop" role="presentation"><section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-expert-title"><span className="admin-confirm-icon"><WarningCircle size={28} /></span><h2 id="deactivate-expert-title">Deactivate expert?</h2><p><strong>{detail?.fullName}</strong> will become inactive and will no longer be available for new appointments. This is a soft delete; the account and history are retained.</p>{deactivateError && <div className="admin-field-error" role="alert">{deactivateError}</div>}<div><button className="admin-button secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button><button className="admin-button danger" type="button" disabled={busy} onClick={() => { void deactivate() }}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <ShieldCheck size={17} />}{busy ? 'Deactivating…' : 'Deactivate expert'}</button></div></section></div>}
    </aside>
  </div>
}
