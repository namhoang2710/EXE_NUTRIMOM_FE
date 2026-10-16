import { ArrowClockwise, Camera, CheckCircle, Eye, EyeSlash, Plus, SpinnerGap, Trash, UserPlus, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { adminExpertsApi } from '../api/admin-api'
import type { AdminExpert, ExpertFormErrors, ExpertSpecialty, ExpertSpecialtyOption } from '../model/admin-experts'
import { isExpertSpecialty, validateCreateExpert, validateExpertAvatar, mapExpertFieldErrors } from '../model/admin-experts'
import { focusTargetForTab, getFocusableElements, restoreDialogFocus } from '@/shared/model/dialog-focus'
import { AdminFilterSelect } from './AdminFilterSelect'

interface CreateFormState {
  phone: string
  password: string
  fullName: string
  specialty: string
  title: string
  workplace: string
  yearsOfExperience: string
  bio: string
}

const emptyForm: CreateFormState = {
  phone: '', password: '', fullName: '', specialty: '', title: '', workplace: '', yearsOfExperience: '0', bio: '',
}

export function AdminExpertCreateDialog({ specialties, specialtyNotice, onClose, onCreated }: {
  specialties: readonly ExpertSpecialtyOption[]
  specialtyNotice?: string | null
  onClose: () => void
  onCreated: (expert: AdminExpert) => void
}) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<ExpertFormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [created, setCreated] = useState<AdminExpert | null>(null)
  const [partialError, setPartialError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [visible, setVisible] = useState(false)
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const closing = useRef(false)
  const requestCloseRef = useRef<() => void>(() => undefined)
  const firstInput = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLElement>(null)
  const mutationLock = useRef(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const previewUrl = useMemo(() => avatar ? URL.createObjectURL(avatar) : '', [avatar])
  const dirty = Object.entries(form).some(([key, current]) => current !== emptyForm[key as keyof CreateFormState]) || Boolean(avatar)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const requestClose = useCallback(() => {
    if (closing.current || busy) return
    if (!created && dirty && !window.confirm('Bỏ thông tin chuyên gia vừa nhập?')) return
    closing.current = true
    setVisible(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimer.current = window.setTimeout(onClose, reduced ? 0 : 300)
  }, [busy, created, dirty, onClose])
  requestCloseRef.current = requestClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    document.body.classList.add('admin-dialog-open')
    const frame = window.requestAnimationFrame(() => { setVisible(true); firstInput.current?.focus() })
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') requestCloseRef.current(); if (event.key === 'Tab' && panel.current) { const target = focusTargetForTab(getFocusableElements(panel.current),document.activeElement,event.shiftKey); if (target) { event.preventDefault(); target.focus() } } }
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

  function update<Key extends keyof CreateFormState>(key: Key, value: CreateFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    const error = validateExpertAvatar(file)
    setErrors((current) => ({ ...current, avatar: error ?? undefined }))
    if (!error) setAvatar(file)
    event.target.value = ''
  }

  async function uploadSelectedAvatar(expert: AdminExpert) {
    if (!avatar) return expert
    return adminExpertsApi.uploadAvatar(expert.userId, avatar)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mutationLock.current || created) return
    const nextErrors = validateCreateExpert(form)
    const avatarError = validateExpertAvatar(avatar)
    if (avatarError) nextErrors.avatar = avatarError
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0 || !isExpertSpecialty(form.specialty)) return
    mutationLock.current = true; setBusy(true)
    try {
      const expert = await adminExpertsApi.create({
        phone: form.phone, password: form.password, fullName: form.fullName,
        specialty: form.specialty as ExpertSpecialty, title: form.title, workplace: form.workplace,
        yearsOfExperience: Number(form.yearsOfExperience), bio: form.bio,
      })
      setForm((current) => ({ ...current, password: '' }))
      setCreated(expert)
      onCreated(expert)
      if (avatar) {
        try {
          const withAvatar = await uploadSelectedAvatar(expert)
          onCreated(withAvatar)
          closing.current = true
          setVisible(false)
          closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
        } catch (reason) {
          setPartialError(reason instanceof Error ? reason.message : 'Đã tạo chuyên gia, nhưng chưa thể tải ảnh đại diện.')
        }
      } else {
        closing.current = true
        setVisible(false)
        closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
      }
    } catch (reason) {
      if (reason instanceof ApiClientError) setErrors(mapExpertFieldErrors(reason.fields))
      if (reason instanceof ApiClientError && reason.code === 'PHONE_ALREADY_EXISTS') {
        setErrors((current) => ({ ...current, phone: reason.message }))
        firstInput.current?.focus()
      } else setSubmitError(reason instanceof Error ? reason.message : 'Chưa thể tạo chuyên gia.')
    } finally { mutationLock.current = false; setBusy(false) }
  }

  async function retryAvatar() {
    if (!created || !avatar || mutationLock.current) return
    mutationLock.current = true
    setBusy(true); setPartialError('')
    try {
      const updated = await uploadSelectedAvatar(created)
      onCreated(updated)
      closing.current = true; setVisible(false)
      closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
    } catch (reason) {
      setPartialError(reason instanceof Error ? reason.message : 'Chưa thể tải ảnh đại diện.')
    } finally { mutationLock.current = false; setBusy(false) }
  }

  return <div className="admin-dialog-backdrop admin-expert-dialog-backdrop" data-open={visible} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}>
    <section ref={panel} className="admin-editor admin-expert-editor" role="dialog" aria-modal="true" aria-labelledby="create-expert-title">
      <header className="admin-editor-header"><div><span>Quản lý tài khoản</span><h2 id="create-expert-title">Tạo chuyên gia</h2><p>Tạo tài khoản chuyên gia và hồ sơ nghề nghiệp.</p></div><button className="admin-editor-close" type="button" aria-label="Đóng biểu mẫu tạo chuyên gia" disabled={busy} onClick={requestClose}><X size={22} /></button></header>
      {created && partialError ? <div className="admin-expert-partial"><CheckCircle size={32} weight="duotone" /><div><h3>Đã tạo chuyên gia thành công</h3><p>Tài khoản của <strong>{created.fullName}</strong> đã được tạo, nhưng chưa tải ảnh đại diện.</p><div className="admin-field-error" role="alert">{partialError}</div><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestClose}>Đóng và tải ảnh sau</button><button className="admin-button primary" type="button" disabled={busy} onClick={() => { void retryAvatar() }}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <ArrowClockwise size={17} />}Thử lại tải ảnh</button></div></div></div> :
      <form className="admin-editor-form" noValidate onSubmit={(event) => { void submit(event) }}>
        {submitError && <div className="admin-form-alert" role="alert">{submitError}</div>}
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>01</span><div><h3>Thông tin tài khoản</h3><p>Thông tin đăng nhập cho tài khoản chuyên gia.</p></div></div><div className="admin-expert-form-grid">
          <label><span>Số điện thoại <b>*</b></span><input ref={firstInput} autoComplete="tel" name="phone" value={form.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'expert-phone-error' : undefined} onChange={(event) => update('phone', event.target.value)} />{errors.phone && <small id="expert-phone-error" className="admin-field-error">{errors.phone}</small>}</label>
          <label><span>Mật khẩu <b>*</b></span><span className="admin-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} name="password" value={form.password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'expert-password-error' : undefined} onChange={(event) => update('password', event.target.value)} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}</button></span>{errors.password && <small id="expert-password-error" className="admin-field-error">{errors.password}</small>}</label>
        </div></section>
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>02</span><div><h3>Thông tin nghề nghiệp</h3><p>Thông tin hiển thị trên hồ sơ chuyên gia.</p></div></div><div className="admin-expert-form-grid">
          <label><span>Họ tên <b>*</b></span><input maxLength={100} name="fullName" value={form.fullName} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'expert-name-error' : undefined} onChange={(event) => update('fullName', event.target.value)} />{errors.fullName && <small id="expert-name-error" className="admin-field-error">{errors.fullName}</small>}</label>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Specialty *" placeholder="Chọn chuyên khoa" options={specialties.map((item) => ({ value: item.code, label: item.displayName }))} value={form.specialty} open={specialtyOpen} onOpenChange={setSpecialtyOpen} onChange={(value) => update('specialty', value)} />{errors.specialty && <small id="expert-specialty-error" className="admin-field-error">{errors.specialty}</small>}{specialtyNotice && <small className="admin-field-note">{specialtyNotice}</small>}</div>
          <label><span>Chức danh</span><input maxLength={100} name="title" value={form.title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "expert-title-error" : undefined} onChange={(event) => update('title', event.target.value)} />{errors.title && <small id="expert-title-error" className="admin-field-error">{errors.title}</small>}</label>
          <label><span>Nơi làm việc</span><input maxLength={255} name="workplace" value={form.workplace} aria-invalid={Boolean(errors.workplace)} aria-describedby={errors.workplace ? "expert-workplace-error" : undefined} onChange={(event) => update('workplace', event.target.value)} />{errors.workplace && <small id="expert-workplace-error" className="admin-field-error">{errors.workplace}</small>}</label>
          <label><span>Số năm kinh nghiệm</span><input type="number" min={0} max={80} step={1} name="yearsOfExperience" value={form.yearsOfExperience} aria-invalid={Boolean(errors.yearsOfExperience)} aria-describedby={errors.yearsOfExperience ? "expert-yearsOfExperience-error" : undefined} onChange={(event) => update('yearsOfExperience', event.target.value)} />{errors.yearsOfExperience && <small id="expert-yearsOfExperience-error" className="admin-field-error">{errors.yearsOfExperience}</small>}</label>
          <label className="admin-field-wide"><span>Giới thiệu</span><textarea maxLength={4000} rows={5} name="bio" value={form.bio} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? "expert-bio-error" : undefined} onChange={(event) => update('bio', event.target.value)} /><small className="admin-character-count">{form.bio.length}/4000</small>{errors.bio && <small id="expert-bio-error" className="admin-field-error">{errors.bio}</small>}</label>
        </div></section>
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>03</span><div><h3>Ảnh đại diện</h3><p>Ảnh JPEG, PNG hoặc WebP, tối đa 10 MiB. Tải lên sau khi tạo tài khoản.</p></div></div><div className="admin-expert-avatar-picker">
          <button className="admin-avatar-preview" type="button" onClick={() => avatarInput.current?.click()}>{previewUrl ? <img src={previewUrl} alt="Xem trước ảnh đại diện" /> : <Camera size={30} />}</button>
          <div><input ref={avatarInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} /><div className="admin-inline-actions"><button className="admin-button secondary" type="button" onClick={() => avatarInput.current?.click()}><Plus size={16} />{avatar ? 'Đổi ảnh' : 'Chọn ảnh'}</button>{avatar && <button className="admin-text-danger" type="button" onClick={() => setAvatar(null)}><Trash size={15} />Xóa</button>}</div>{avatar && <p>{avatar.name} · {(avatar.size / 1024 / 1024).toFixed(1)} MiB</p>}{errors.avatar && <small className="admin-field-error">{errors.avatar}</small>}</div>
        </div></section>
        <footer className="admin-editor-actions"><span>Thông tin đăng nhập đã được gửi khi tạo tài khoản.</span><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestClose}>Hủy</button><button className="admin-button primary" type="submit" disabled={busy}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <UserPlus size={17} />}{busy ? 'Đang tạo…' : 'Tạo chuyên gia'}</button></div></footer>
      </form>}
    </section>
  </div>
}
