import { FloppyDisk, UserCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { DateField } from '../components/DateField'
import { SelectField } from '../components/SelectField'
import { StatusMessage } from '../components/StatusMessage'
import { ApiClientError } from '../lib/api'
import { userApi } from '../lib/domain-api'
import { useAuth } from '../hooks/useAuth'
import type { ApiProfile } from '../types/domain'

interface Props { onboarding?: boolean }
const genders = [{ value: 'FEMALE', label: 'Nữ' }, { value: 'MALE', label: 'Nam' }, { value: 'OTHER', label: 'Khác / không muốn nêu' }]

function ProfileContent({ onboarding = false }: Props) {
  const navigate = useNavigate()
  const { reloadUser } = useAuth()
  const [profile, setProfile] = useState<ApiProfile | null>(null)
  const [form, setForm] = useState<{ display_name: string; email: string; date_of_birth: string; gender: NonNullable<ApiProfile['gender']> }>({ display_name: '', email: '', date_of_birth: '', gender: 'FEMALE' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { void userApi.profile().then((data) => { setProfile(data); setForm({ display_name: data.display_name || '', email: data.email || '', date_of_birth: data.date_of_birth || '', gender: data.gender || 'FEMALE' }) }).catch((reason: Error) => setError(reason.message)) }, [])
  async function submit(event: FormEvent) { event.preventDefault(); if (!profile) return; setBusy(true); setError(''); try { const updated = await userApi.updateProfile({ ...form, version: profile.version }); setProfile(updated); setMessage(onboarding ? 'Hồ sơ đã hoàn tất. Bạn đã có thể bắt đầu hành trình cùng NutriMom.' : 'Đã lưu thay đổi hồ sơ.'); if (onboarding) { await reloadUser(); navigate('/app', { replace: true }) } } catch (reason) { setError(reason instanceof ApiClientError ? reason.message : 'Không thể lưu hồ sơ.') } finally { setBusy(false) } }
  const body = <><div className="page-heading"><p className="welcome-kicker">{onboarding ? 'Bắt đầu cùng NutriMom' : 'Trang cá nhân'}</p><h1>{onboarding ? 'Hoàn thiện hồ sơ cơ bản' : 'Thông tin của bạn'}</h1><p>{onboarding ? 'Thai kỳ là thông tin tuỳ chọn, bạn có thể cập nhật sau trong mục Sức khỏe.' : 'Cập nhật thông tin để NutriMom hỗ trợ bạn tốt hơn.'}</p></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}<section className="app-card form-card"><UserCircle size={30} weight="duotone" /><form className="auth-form" onSubmit={submit}><label className="field-group"><span>Tên hiển thị</span><div className="input-shell"><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required /></div></label><label className="field-group"><span>Email</span><div className="input-shell"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label><DateField label="Ngày sinh" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /><SelectField label="Giới tính" value={form.gender} options={genders} onChange={(gender) => setForm({ ...form, gender: gender as NonNullable<ApiProfile['gender']> })} /><button className={`primary-button${busy ? ' is-loading' : ''}`} disabled={busy || !profile}><FloppyDisk size={20} />{busy ? 'Đang lưu...' : onboarding ? 'Hoàn tất hồ sơ' : 'Lưu thay đổi'}</button></form></section></>
  return onboarding ? <main className="onboarding-page"><div className="onboarding-frame">{body}</div></main> : <AppShell>{body}</AppShell>
}

export function ProfilePage() { return <ProfileContent /> }
export function OnboardingProfilePage() { return <ProfileContent onboarding /> }
