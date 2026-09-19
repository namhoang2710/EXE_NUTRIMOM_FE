import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { userApi } from '../api/user-api'
import type { Gender, ProfilePatch, UserProfile } from '../model/user-types'

function validBirthDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const now = new Date()
  const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate())
  return !Number.isNaN(date.getTime()) && date < now && date >= oldest
}

export function ProfilePage({ onboarding = false }: { onboarding?: boolean }) {
  const { profile, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => ({ display_name: profile?.display_name ?? '', email: profile?.email ?? '', date_of_birth: profile?.date_of_birth ?? '', gender: profile?.gender ?? '' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [conflict, setConflict] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  if (!profile) return null

  async function reload() {
    const latest = await reloadProfile()
    setDraft({ display_name: latest.display_name, email: latest.email ?? '', date_of_birth: latest.date_of_birth ?? '', gender: latest.gender ?? '' })
    setConflict(false)
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(''); setSuccess('')
    const name = draft.display_name.trim()
    if (!name || name.length > 100) { setError('Tên hiển thị cần từ 1 đến 100 ký tự.'); return }
    if (draft.email && (draft.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))) { setError('Email chưa hợp lệ.'); return }
    if (draft.date_of_birth && !validBirthDate(draft.date_of_birth)) { setError('Ngày sinh phải trong quá khứ và tuổi không quá 120.'); return }
    if (onboarding && (!draft.date_of_birth || !draft.gender)) { setError('Vui lòng chọn ngày sinh và giới tính để tiếp tục.'); return }
    const body: ProfilePatch = { version: profile!.version }
    if (name !== profile!.display_name) body.display_name = name
    if (draft.email !== (profile!.email ?? '')) body.email = draft.email
    if (draft.date_of_birth !== (profile!.date_of_birth ?? '') && draft.date_of_birth) body.date_of_birth = draft.date_of_birth
    if (draft.gender !== (profile!.gender ?? '') && draft.gender) body.gender = draft.gender as Gender
    setBusy(true)
    try {
      await userApi.updateProfile(body)
      const latest: UserProfile = await reloadProfile()
      if (onboarding && latest.onboarding_status === 'CONTEXT_REQUIRED') navigate('/onboarding/pregnancy', { replace: true })
      else if (onboarding && latest.onboarding_status === 'COMPLETED') navigate('/app', { replace: true })
      else if (onboarding) setError('Hồ sơ chưa hoàn tất. Vui lòng kiểm tra lại thông tin đã nhập.')
      else setSuccess('Hồ sơ đã được cập nhật.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.status === 409) { setConflict(true); setError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất.') }
      else setError(reason instanceof Error ? reason.message : 'Chưa thể lưu hồ sơ.')
    } finally { setBusy(false) }
  }

  return <main className="nm-account-page"><div className="nm-account-intro"><span>NutriMom · Hồ sơ</span><h1>{onboarding ? 'Chào mừng bạn đến với NutriMom' : 'Hồ sơ cá nhân'}</h1><p>{onboarding ? 'Cho chúng tôi biết thêm một chút về bạn để bắt đầu hành trình chăm sóc.' : 'Thông tin của bạn luôn có thể được cập nhật khi cần.'}</p></div>
    <form className="nm-account-form" onSubmit={(event) => void save(event)} noValidate>
      <div className="nm-profile-avatar" aria-label="Ảnh đại diện">{profile.avatar_url && !avatarFailed ? <img src={profile.avatar_url} alt="Ảnh đại diện" onError={() => setAvatarFailed(true)} /> : profile.display_name.charAt(0).toUpperCase()}</div>
      <div className="nm-form-grid"><label>Tên hiển thị<input value={draft.display_name} maxLength={100} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} disabled={busy} required /></label><label>Số điện thoại<input value={profile.phone} readOnly aria-readonly="true" /></label><label>Email<input type="email" value={draft.email} maxLength={255} onChange={(event) => setDraft({ ...draft, email: event.target.value })} disabled={busy} placeholder="ten@example.com" /></label><label>Ngày sinh<input type="date" value={draft.date_of_birth} onChange={(event) => setDraft({ ...draft, date_of_birth: event.target.value })} disabled={busy} required={onboarding} /></label><label>Giới tính<select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as Gender | '' })} disabled={busy} required={onboarding}><option value="">Chọn giới tính</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option></select></label></div>
      {error && <p className="nm-form-error" role="alert">{error}</p>}{success && <p className="nm-form-success" role="status">{success}</p>}
      <div className="nm-form-actions">{conflict && <button type="button" className="nm-secondary-action" onClick={() => void reload()}>Tải lại</button>}<button type="submit" className="nm-primary-action" disabled={busy}>{busy ? 'Đang lưu...' : onboarding ? 'Tiếp tục' : 'Lưu thay đổi'}</button></div>
    </form>
  </main>
}
