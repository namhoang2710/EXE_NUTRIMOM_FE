import { ArrowClockwise, Briefcase, Camera, CalendarBlank, ChartBar, FloppyDisk, IdentificationCard, PencilSimple, ShieldCheck, SpinnerGap, Trash, WarningCircle, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { adminExpertsApi } from '../api/admin-api'
import type { AdminExpert, ExpertFormErrors, ExpertSpecialty, ExpertSpecialtyOption, ExpertStatus } from '../model/admin-experts'
import { formatExpertSpecialty, isExpertSpecialty, validateExpertAvatar, validateExpertProfile, mapExpertFieldErrors } from '../model/admin-experts'
import { focusTargetForTab, getFocusableElements, restoreDialogFocus } from '@/shared/model/dialog-focus'
import { adminReads } from '../api/admin-read'
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
  const panel = useRef<HTMLElement>(null)
  const mutationLock = useRef(false)
  const editingRef = useRef(editing)
  editingRef.current = editing
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
    if (!versionConflict) setSaveError('')
    setSpecialtyOpen(false)
    setStatusOpen(false)
    setDiscardConfirm(false)
  }, [detail, versionConflict])

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
      if (!editingRef.current) setForm(toEditState(result))
      else setSuccessMessage('Đã tải hồ sơ mới. Bản nháp và tệp ảnh bạn chọn vẫn được giữ; kiểm tra trước khi lưu.')
      setVersionConflict(false); setSaveError(''); setErrors({})
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Chưa thể tải chi tiết chuyên gia.'); setStatus('error')
    })
    return () => controller.abort()
  }, [expert.userId, onChanged, reload])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    document.body.classList.add('admin-dialog-open')
    const frame = window.requestAnimationFrame(() => { setVisible(true); closeButton.current?.focus() })
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && panel.current) { const activePanel = panel.current.querySelector<HTMLElement>('[role="alertdialog"]') || panel.current; const target = focusTargetForTab(getFocusableElements(activePanel),document.activeElement,event.shiftKey); if (target) { event.preventDefault(); target.focus() } }
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
      restoreDialogFocus(opener)
    }
  }, [])
  useEffect(() => { if (Object.keys(errors).length) panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus() },[errors])

  function update<Key extends keyof EditState>(key: Key, value: EditState[Key]) {
    setEditTouched(true)
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    if (!versionConflict) setSaveError('')
  }

  function beginEdit() {
    if (!detail) return
    setForm(toEditState(detail)); setErrors({}); if (!versionConflict) setSaveError(''); setEditTouched(false); setAvatarTouched(false); setAvatar(null); setAvatarError(''); setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!detail || mutationLock.current || versionConflict) return
    const nextErrors = validateExpertProfile(form)
    setErrors(nextErrors); setSaveError(''); setSuccessMessage(''); setVersionConflict(false)
    if (Object.keys(nextErrors).length > 0 || !isExpertSpecialty(form.specialty)) return
    mutationLock.current = true; setBusy(true)
    try {
      const updated = await adminExpertsApi.update(detail.userId, {
        fullName: form.fullName, specialty: form.specialty as ExpertSpecialty, title: form.title,
        workplace: form.workplace, yearsOfExperience: Number(form.yearsOfExperience), bio: form.bio,
        status: form.status, version: detail.version,
      })
      setDetail(updated); onChanged(updated); setEditing(false); setEditTouched(false); setAvatarTouched(false); setForm(toEditState(updated)); setSuccessMessage('Đã cập nhật hồ sơ chuyên gia.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        adminReads.invalidate('GET:/admin/experts/' + detail.userId)
        setVersionConflict(true); setSaveError('Hồ sơ đã thay đổi. Hãy tải phiên bản mới nhất trước khi lưu.')
      } else { if (reason instanceof ApiClientError) setErrors(mapExpertFieldErrors(reason.fields)); setSaveError(reason instanceof Error ? reason.message : 'Chưa thể lưu hồ sơ.') }
    } finally { mutationLock.current = false; setBusy(false) }
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
    if (!detail || !avatar || mutationLock.current) return
    mutationLock.current = true
    setBusy(true); setAvatarError('')
    try {
      const updated = await adminExpertsApi.uploadAvatar(detail.userId, avatar)
      setDetail(updated); setAvatar(null); setAvatarTouched(false); onChanged(updated); setSuccessMessage('Đã cập nhật ảnh đại diện.')
    } catch (reason) { setAvatarError(reason instanceof Error ? reason.message : 'Chưa thể tải ảnh đại diện.') }
    finally { mutationLock.current = false; setBusy(false) }
  }

  async function deactivate() {
    if (!detail || mutationLock.current) return
    mutationLock.current = true
    setBusy(true); setDeactivateError('')
    try {
      await adminExpertsApi.deactivate(detail.userId)
      const updated = { ...detail, status: 'INACTIVE' as const }
      setDetail(updated); setForm(toEditState(updated)); onChanged(updated); setConfirming(false); setSuccessMessage('Đã ngừng hoạt động chuyên gia.')
    } catch (reason) { setDeactivateError(reason instanceof Error ? reason.message : 'Chưa thể ngừng hoạt động chuyên gia.') }
    finally { mutationLock.current = false; setBusy(false) }
  }

  const shown = detail ?? expert
  return <div className="admin-user-drawer-backdrop" data-open={visible} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestDismiss() }}>
    <aside ref={panel} className="admin-user-drawer admin-expert-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-expert-detail-title">
      <header className="admin-user-drawer-header"><div className="admin-user-detail-person"><AdminExpertAvatar name={shown.fullName} url={shown.avatarUrl} size="large" /><div><span>Chi tiết chuyên gia</span><h2 id="admin-expert-detail-title">{shown.fullName}</h2><p>{shown.phone} · <StatusBadge value={shown.status} /></p></div></div><button ref={closeButton} className="admin-editor-close" type="button" aria-label={editing ? 'Quay lại chi tiết chuyên gia' : 'Đóng chi tiết chuyên gia'} disabled={busy} onClick={requestDismiss}><X size={19} /></button></header>
      {status === 'loading' && !detail && <div className="admin-detail-loading" aria-label="Đang tải chi tiết chuyên gia"><span /><span /><span /><span /></div>}
      {status === 'error' && !detail && <div className="admin-state admin-detail-state" role="alert"><span className="admin-state-icon error"><ArrowClockwise size={24} /></span><h3>Chưa thể tải chi tiết chuyên gia</h3><p>{error}</p><button className="admin-button secondary" type="button" onClick={() => { adminReads.invalidate('GET:/admin/experts/' + expert.userId); setReload((current) => current + 1) }}><ArrowClockwise size={17} />Thử lại</button></div>}
      {successMessage && <div className="admin-success-notice" role="status">{successMessage}</div>}
      {detail && !editing && <div className="admin-user-detail-content">
        <div className="admin-expert-detail-actions"><button className="admin-button primary" type="button" onClick={beginEdit}><PencilSimple size={17} />Sửa hồ sơ</button>{detail.status !== 'INACTIVE' && <button className="admin-button danger-outline" type="button" onClick={() => { setConfirming(true); setDeactivateError('') }}><Trash size={17} />Ngừng hoạt động chuyên gia</button>}</div>
        <section><h3><Briefcase size={18} />Hồ sơ nghề nghiệp</h3><dl><DetailRow label="Chuyên khoa">{formatExpertSpecialty(detail.specialty, specialties)}</DetailRow><DetailRow label="Chức danh">{display(detail.title)}</DetailRow><DetailRow label="Nơi làm việc">{display(detail.workplace)}</DetailRow><DetailRow label="Kinh nghiệm">{detail.yearsOfExperience} {detail.yearsOfExperience === 1 ? 'năm' : 'năm'}</DetailRow><DetailRow label="Giới thiệu">{display(detail.bio)}</DetailRow></dl></section>
        <section><h3><ChartBar size={18} />Đánh giá</h3><dl><DetailRow label="Điểm trung bình">{Number.isFinite(detail.averageRating) ? detail.averageRating.toFixed(1) : '0.0'}</DetailRow><DetailRow label="Số lượt đánh giá">{detail.ratingCount || 0}</DetailRow></dl></section>
        <section><h3><IdentificationCard size={18} />Tài khoản và quyền</h3><dl><DetailRow label="Số điện thoại">{detail.phone}</DetailRow><DetailRow label="Trạng thái"><StatusBadge value={detail.status} /></DetailRow></dl></section>
        <section><h3><CalendarBlank size={18} />Thông tin hệ thống</h3><dl><DetailRow label="Mã người dùng" mono>{detail.userId}</DetailRow><DetailRow label="Phiên bản">{detail.version}</DetailRow><DetailRow label="Ngày tạo">{formatAdminDate(detail.createdAt, true)}</DetailRow><DetailRow label="Cập nhật">{formatAdminDate(detail.updatedAt, true)}</DetailRow></dl></section>
      </div>}
      {detail && editing && <form className="admin-expert-drawer-form" noValidate onSubmit={(event) => { void save(event) }}>
        {saveError && <div className="admin-form-alert" role="alert">{saveError}{versionConflict && <button type="button" onClick={() => { adminReads.invalidate('GET:/admin/experts/' + expert.userId); setReload((current) => current + 1) }}><ArrowClockwise size={15} />Tải lại phiên bản mới</button>}</div>}
        <section><h3><Briefcase size={18} />Hồ sơ nghề nghiệp</h3><div className="admin-expert-form-grid">
          <label><span>Số điện thoại</span><input value={detail.phone} readOnly /></label>
          <label><span>Họ tên *</span><input maxLength={100} name="fullName" value={form.fullName} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "expert-edit-fullName-error" : undefined} onChange={(event) => update('fullName', event.target.value)} />{errors.fullName && <small id="expert-edit-fullName-error" className="admin-field-error">{errors.fullName}</small>}</label>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Specialty *" placeholder="Chọn chuyên khoa" options={specialties.map((item) => ({ value: item.code, label: item.displayName }))} value={form.specialty} open={specialtyOpen} onOpenChange={setSpecialtyOpen} onChange={(value) => update('specialty', value)} />{errors.specialty && <small id="expert-edit-specialty-error" className="admin-field-error">{errors.specialty}</small>}</div>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Trạng thái" placeholder="Chọn trạng thái" options={[{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }]} value={form.status} open={statusOpen} onOpenChange={setStatusOpen} onChange={(value) => update('status', value as ExpertStatus)} /></div>
          <label><span>Chức danh</span><input maxLength={100} name="title" value={form.title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "expert-edit-title-error" : undefined} onChange={(event) => update('title', event.target.value)} />{errors.title && <small id="expert-edit-title-error" className="admin-field-error">{errors.title}</small>}</label>
          <label><span>Nơi làm việc</span><input maxLength={255} name="workplace" value={form.workplace} aria-invalid={Boolean(errors.workplace)} aria-describedby={errors.workplace ? "expert-edit-workplace-error" : undefined} onChange={(event) => update('workplace', event.target.value)} />{errors.workplace && <small id="expert-edit-workplace-error" className="admin-field-error">{errors.workplace}</small>}</label>
          <label><span>Số năm kinh nghiệm</span><input type="number" min={0} max={80} name="yearsOfExperience" value={form.yearsOfExperience} aria-invalid={Boolean(errors.yearsOfExperience)} aria-describedby={errors.yearsOfExperience ? "expert-edit-yearsOfExperience-error" : undefined} onChange={(event) => update('yearsOfExperience', event.target.value)} />{errors.yearsOfExperience && <small id="expert-edit-yearsOfExperience-error" className="admin-field-error">{errors.yearsOfExperience}</small>}</label>
          <label className="admin-field-wide"><span>Giới thiệu</span><textarea rows={6} maxLength={4000} name="bio" value={form.bio} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? "expert-edit-bio-error" : undefined} onChange={(event) => update('bio', event.target.value)} /><small className="admin-character-count">{form.bio.length}/4000</small>{errors.bio && <small id="expert-edit-bio-error" className="admin-field-error">{errors.bio}</small>}</label>
        </div></section>
        <section><h3><Camera size={18} />Ảnh đại diện</h3><div className="admin-expert-avatar-picker compact"><div className="admin-avatar-preview">{previewUrl ? <img src={previewUrl} alt="Xem trước ảnh mới" /> : <AdminExpertAvatar name={detail.fullName} url={detail.avatarUrl} size="large" />}</div><div><label className="admin-button secondary admin-upload-button"><Camera size={16} />Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseAvatar} /></label>{avatar && <button className="admin-button primary compact" type="button" disabled={busy} onClick={() => { void uploadAvatar() }}>{busy ? <SpinnerGap className="admin-spin" size={16} /> : <FloppyDisk size={16} />}Tải ảnh đại diện</button>}{avatarError && <small className="admin-field-error">{avatarError}</small>}</div></div></section>
        <footer className="admin-editor-actions"><span>Phiên bản {detail.version} được dùng để kiểm tra thay đổi.</span><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestDismiss}>Hủy</button><button className="admin-button primary" type="submit" disabled={busy || versionConflict}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <FloppyDisk size={17} />}{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></footer>
      </form>}
      {discardConfirm && <div className="admin-expert-drawer-confirm-backdrop" role="presentation"><section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-expert-changes-title"><span className="admin-confirm-icon"><WarningCircle size={28} /></span><h2 id="discard-expert-changes-title">Bỏ thay đổi chưa lưu?</h2><p>Các thay đổi chưa được lưu. Bạn có thể tiếp tục sửa hoặc trở về hồ sơ đã lưu.</p><div><button className="admin-button secondary" type="button" onClick={() => setDiscardConfirm(false)}>Tiếp tục sửa</button><button className="admin-button danger" type="button" onClick={returnToDetail}>Bỏ thay đổi</button></div></section></div>}
      {confirming && <div className="admin-expert-confirm-backdrop" role="presentation"><section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-expert-title"><span className="admin-confirm-icon"><WarningCircle size={28} /></span><h2 id="deactivate-expert-title">Ngừng hoạt động chuyên gia?</h2><p><strong>{detail?.fullName}</strong> sẽ ngừng hoạt động và không nhận lịch mới. Tài khoản và lịch sử vẫn được giữ.</p>{deactivateError && <div className="admin-field-error" role="alert">{deactivateError}</div>}<div><button className="admin-button secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Hủy</button><button className="admin-button danger" type="button" disabled={busy} onClick={() => { void deactivate() }}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <ShieldCheck size={17} />}{busy ? 'Đang ngừng hoạt động…' : 'Ngừng hoạt động chuyên gia'}</button></div></section></div>}
    </aside>
  </div>
}
