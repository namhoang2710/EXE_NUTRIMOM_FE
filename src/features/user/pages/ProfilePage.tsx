import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { profileDraft, buildProfilePatch, reconcileProfileDraft } from '../model/profile-patch'
import type { Gender } from '../model/user-types'

function validBirthDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const now = new Date()
  const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate())
  return !Number.isNaN(date.getTime()) && date < now && date >= oldest
}

export function ProfilePage({ onboarding = false }: { onboarding?: boolean }) {
  const { profile, profileError, reloadProfile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => profileDraft(profile))
  const dirty = useRef(false)
  const saving = useRef(false)
  function changeDraft(next: typeof draft) { dirty.current = true; setDraft(next) }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [conflict, setConflict] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  useEffect(() => {
    if (!profile) return
    setDraft((current) => reconcileProfileDraft(current, profile, dirty.current))
  }, [profile])
  if (!profile) return <main className="nm-account-page"><section className="nm-account-state-card"><h1>Hồ sơ cá nhân</h1>{profileError || error ? <><p role="alert">{error || profileError}</p><button type="button" className="nm-secondary-action" disabled={busy} onClick={() => void reload()}>Thử lại</button></> : <p role="status">Đang tải hồ sơ...</p>}</section></main>

  async function reload() {
    setBusy(true)
    try {
      const latest = await reloadProfile()
      dirty.current = false
      setDraft(profileDraft(latest))
      setConflict(false); setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ.') }
    finally { setBusy(false) }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving.current || !profile) return
    setError(''); setSuccess('')
    const name = draft.display_name.trim()
    if (!name || name.length > 100) { setError('Tên hiển thị cần từ 1 đến 100 ký tự.'); return }
    if (draft.email && (draft.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))) { setError('Email chưa hợp lệ.'); return }
    if (draft.date_of_birth && !validBirthDate(draft.date_of_birth)) { setError('Ngày sinh phải trong quá khứ và tuổi không quá 120.'); return }
    if (onboarding && (!draft.date_of_birth || !draft.gender)) { setError('Vui lòng chọn ngày sinh và giới tính để tiếp tục.'); return }
    if ((profile.date_of_birth && !draft.date_of_birth) || (profile.gender && !draft.gender)) { setError('Hiện chưa hỗ trợ xóa ngày sinh hoặc giới tính đã lưu. Hãy chọn giá trị thay thế.'); return }
    const body = buildProfilePatch(profile, draft)
    if (!body) {
      if (onboarding) navigate('/app', { replace: true })
      else setSuccess('Không có thay đổi cần lưu.')
      return
    }
    saving.current = true
    setBusy(true)
    try {
      const latest = await updateProfile(body)
      dirty.current = false
      setDraft(profileDraft(latest))
      setConflict(false)
      if (onboarding) navigate('/app', { replace: true })
      else setSuccess('Hồ sơ đã được cập nhật.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.status === 409) { setConflict(true); setError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất.') }
      else setError(reason instanceof Error ? reason.message : 'Chưa thể lưu hồ sơ.')
    } finally { saving.current = false; setBusy(false) }
  }

  return <main className="nm-account-page"><div className="nm-account-intro"><span>NutriMom · Hồ sơ</span><h1>{onboarding ? 'Chào mừng bạn đến với NutriMom' : 'Hồ sơ cá nhân'}</h1><p>{onboarding ? 'Cho chúng tôi biết thêm một chút về bạn để bắt đầu hành trình chăm sóc.' : 'Thông tin của bạn luôn có thể được cập nhật khi cần.'}</p></div>
    <form className="nm-account-form" onSubmit={(event) => void save(event)} noValidate aria-busy={busy}>
      <div className="nm-profile-avatar" aria-label="Ảnh đại diện">{profile.avatar_url && !avatarFailed ? <img src={profile.avatar_url} alt="Ảnh đại diện" onError={() => setAvatarFailed(true)} /> : profile.display_name.charAt(0).toUpperCase()}</div>
      <div className="nm-form-grid"><label>Tên hiển thị<input value={draft.display_name} maxLength={100} onChange={(event) => changeDraft({ ...draft, display_name: event.target.value })} disabled={busy} required /></label><label>Số điện thoại<input value={profile.phone} readOnly aria-readonly="true" /></label><label>Email<input type="email" value={draft.email} maxLength={255} onChange={(event) => changeDraft({ ...draft, email: event.target.value })} disabled={busy} placeholder="ten@example.com" /></label><label>Ngày sinh<input type="date" value={draft.date_of_birth} onChange={(event) => changeDraft({ ...draft, date_of_birth: event.target.value })} disabled={busy} required={onboarding} /></label><label>Giới tính<select value={draft.gender} onChange={(event) => changeDraft({ ...draft, gender: event.target.value as Gender | '' })} disabled={busy} required={onboarding}><option value="">Chọn giới tính</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option></select></label></div>
      {error && <p className="nm-form-error" role="alert">{error}</p>}{success && <p className="nm-form-success" role="status">{success}</p>}
      <div className="nm-form-actions">{conflict && <button type="button" className="nm-secondary-action" onClick={() => void reload()}>Tải lại</button>}<button type="submit" className="nm-primary-action" disabled={busy}>{busy ? 'Đang lưu...' : onboarding ? 'Tiếp tục' : 'Lưu thay đổi'}</button></div>
    </form>
  </main>
}
