import { ArrowClockwise, Camera, CheckCircle, Eye, EyeSlash, Plus, SpinnerGap, Trash, UserPlus, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { adminExpertsApi } from '../api/admin-api'
import type { AdminExpert, ExpertFormErrors, ExpertSpecialty, ExpertSpecialtyOption } from '../model/admin-experts'
import { isExpertSpecialty, validateCreateExpert, validateExpertAvatar } from '../model/admin-experts'
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
  const avatarInput = useRef<HTMLInputElement>(null)
  const previewUrl = useMemo(() => avatar ? URL.createObjectURL(avatar) : '', [avatar])
  const dirty = Object.entries(form).some(([key, current]) => current !== emptyForm[key as keyof CreateFormState]) || Boolean(avatar)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const requestClose = useCallback(() => {
    if (closing.current || busy) return
    if (!created && dirty && !window.confirm('Discard the expert information you entered?')) return
    closing.current = true
    setVisible(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimer.current = window.setTimeout(onClose, reduced ? 0 : 300)
  }, [busy, created, dirty, onClose])
  requestCloseRef.current = requestClose

  useEffect(() => {
    document.body.classList.add('admin-dialog-open')
    const frame = window.requestAnimationFrame(() => { setVisible(true); firstInput.current?.focus() })
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') requestCloseRef.current() }
    window.addEventListener('keydown', escape)
    return () => {
      window.cancelAnimationFrame(frame)
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      document.body.classList.remove('admin-dialog-open')
      window.removeEventListener('keydown', escape)
    }
  }, [])

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
    const nextErrors = validateCreateExpert(form)
    const avatarError = validateExpertAvatar(avatar)
    if (avatarError) nextErrors.avatar = avatarError
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0 || !isExpertSpecialty(form.specialty)) return
    setBusy(true)
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
          setPartialError(reason instanceof Error ? reason.message : 'The expert was created, but the avatar could not be uploaded.')
        }
      } else {
        closing.current = true
        setVisible(false)
        closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
      }
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'PHONE_ALREADY_EXISTS') {
        setErrors((current) => ({ ...current, phone: reason.message }))
        firstInput.current?.focus()
      } else setSubmitError(reason instanceof Error ? reason.message : 'Could not create the expert.')
    } finally { setBusy(false) }
  }

  async function retryAvatar() {
    if (!created || !avatar) return
    setBusy(true); setPartialError('')
    try {
      const updated = await uploadSelectedAvatar(created)
      onCreated(updated)
      closing.current = true; setVisible(false)
      closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
    } catch (reason) {
      setPartialError(reason instanceof Error ? reason.message : 'Avatar upload failed again.')
    } finally { setBusy(false) }
  }

  return <div className="admin-dialog-backdrop admin-expert-dialog-backdrop" data-open={visible} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}>
    <section className="admin-editor admin-expert-editor" role="dialog" aria-modal="true" aria-labelledby="create-expert-title">
      <header className="admin-editor-header"><div><span>Account management</span><h2 id="create-expert-title">Create expert</h2><p>Create an EXPERT account and its professional profile.</p></div><button className="admin-editor-close" type="button" aria-label="Close create expert form" disabled={busy} onClick={requestClose}><X size={22} /></button></header>
      {created && partialError ? <div className="admin-expert-partial"><CheckCircle size={32} weight="duotone" /><div><h3>Expert created successfully</h3><p>The account for <strong>{created.fullName}</strong> exists, but its avatar was not uploaded.</p><div className="admin-field-error" role="alert">{partialError}</div><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestClose}>Close without avatar</button><button className="admin-button primary" type="button" disabled={busy} onClick={() => { void retryAvatar() }}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <ArrowClockwise size={17} />}Retry avatar upload</button></div></div></div> :
      <form className="admin-editor-form" noValidate onSubmit={(event) => { void submit(event) }}>
        {submitError && <div className="admin-form-alert" role="alert">{submitError}</div>}
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>01</span><div><h3>Account information</h3><p>Credentials are used only to provision this expert account.</p></div></div><div className="admin-expert-form-grid">
          <label><span>Phone <b>*</b></span><input ref={firstInput} autoComplete="tel" value={form.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'expert-phone-error' : undefined} onChange={(event) => update('phone', event.target.value)} />{errors.phone && <small id="expert-phone-error" className="admin-field-error">{errors.phone}</small>}</label>
          <label><span>Password <b>*</b></span><span className="admin-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} value={form.password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'expert-password-error' : undefined} onChange={(event) => update('password', event.target.value)} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}</button></span>{errors.password && <small id="expert-password-error" className="admin-field-error">{errors.password}</small>}</label>
        </div></section>
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>02</span><div><h3>Professional information</h3><p>Public information displayed with the expert profile.</p></div></div><div className="admin-expert-form-grid">
          <label><span>Full name <b>*</b></span><input maxLength={100} value={form.fullName} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'expert-name-error' : undefined} onChange={(event) => update('fullName', event.target.value)} />{errors.fullName && <small id="expert-name-error" className="admin-field-error">{errors.fullName}</small>}</label>
          <div className="admin-expert-select-field"><AdminFilterSelect label="Specialty *" placeholder="Select specialty" options={specialties.map((item) => ({ value: item.code, label: item.displayName }))} value={form.specialty} open={specialtyOpen} onOpenChange={setSpecialtyOpen} onChange={(value) => update('specialty', value)} />{errors.specialty && <small className="admin-field-error">{errors.specialty}</small>}{specialtyNotice && <small className="admin-field-note">{specialtyNotice}</small>}</div>
          <label><span>Professional title</span><input maxLength={100} value={form.title} onChange={(event) => update('title', event.target.value)} />{errors.title && <small className="admin-field-error">{errors.title}</small>}</label>
          <label><span>Workplace</span><input maxLength={255} value={form.workplace} onChange={(event) => update('workplace', event.target.value)} />{errors.workplace && <small className="admin-field-error">{errors.workplace}</small>}</label>
          <label><span>Years of experience</span><input type="number" min={0} max={80} step={1} value={form.yearsOfExperience} onChange={(event) => update('yearsOfExperience', event.target.value)} />{errors.yearsOfExperience && <small className="admin-field-error">{errors.yearsOfExperience}</small>}</label>
          <label className="admin-field-wide"><span>Bio</span><textarea maxLength={4000} rows={5} value={form.bio} onChange={(event) => update('bio', event.target.value)} /><small className="admin-character-count">{form.bio.length}/4000</small>{errors.bio && <small className="admin-field-error">{errors.bio}</small>}</label>
        </div></section>
        <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>03</span><div><h3>Avatar</h3><p>Optional JPEG, PNG or WebP image up to 10 MiB. It uploads after account creation.</p></div></div><div className="admin-expert-avatar-picker">
          <button className="admin-avatar-preview" type="button" onClick={() => avatarInput.current?.click()}>{previewUrl ? <img src={previewUrl} alt="Selected expert avatar preview" /> : <Camera size={30} />}</button>
          <div><input ref={avatarInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} /><div className="admin-inline-actions"><button className="admin-button secondary" type="button" onClick={() => avatarInput.current?.click()}><Plus size={16} />{avatar ? 'Replace image' : 'Choose image'}</button>{avatar && <button className="admin-text-danger" type="button" onClick={() => setAvatar(null)}><Trash size={15} />Remove</button>}</div>{avatar && <p>{avatar.name} · {(avatar.size / 1024 / 1024).toFixed(1)} MiB</p>}{errors.avatar && <small className="admin-field-error">{errors.avatar}</small>}</div>
        </div></section>
        <footer className="admin-editor-actions"><span>Password is never displayed or stored by this page after creation.</span><div><button className="admin-button secondary" type="button" disabled={busy} onClick={requestClose}>Cancel</button><button className="admin-button primary" type="submit" disabled={busy}>{busy ? <SpinnerGap className="admin-spin" size={17} /> : <UserPlus size={17} />}{busy ? 'Creating…' : 'Create expert'}</button></div></footer>
      </form>}
    </section>
  </div>
}
