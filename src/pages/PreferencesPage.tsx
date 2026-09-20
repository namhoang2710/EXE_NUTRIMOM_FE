import { Bell, FloppyDisk, Gear, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { userApi } from '../lib/domain-api'
import type { ApiPreferences } from '../types/domain'

export function PreferencesPage() {
  const [preferences, setPreferences] = useState<ApiPreferences | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  useEffect(() => { void userApi.preferences().then(setPreferences).catch((reason: Error) => setError(reason.message)) }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!preferences) return
    const form = new FormData(event.currentTarget)
    try {
      const updated = await userApi.updatePreferences({ timezone: String(form.get('timezone')), locale: String(form.get('locale')), weight_unit: String(form.get('weight_unit')), length_unit: String(form.get('length_unit')), glucose_unit: String(form.get('glucose_unit')), push_enabled: form.get('push_enabled') === 'on', email_enabled: form.get('email_enabled') === 'on', version: preferences.version })
      setPreferences(updated); setMessage('Đã lưu cài đặt.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu cài đặt.') }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try {
      await userApi.deleteAccount({ reason: String(form.get('reason') || ''), password: String(form.get('password') || '') })
      await logout(); navigate('/login', { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể gửi yêu cầu xóa tài khoản.') }
  }

  return <AppShell><div className="page-heading"><p className="welcome-kicker">Tùy chọn cá nhân</p><h1>Cài đặt</h1><p>Điều chỉnh ngôn ngữ, đơn vị đo và cách NutriMom gửi nhắc nhở.</p></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}<section className="app-card form-card"><Gear size={30} weight="duotone" />{preferences && <form className="compact-form" onSubmit={submit}><label>Timezone<input name="timezone" defaultValue={preferences.timezone || 'Asia/Ho_Chi_Minh'} /></label><label>Locale<input name="locale" defaultValue={preferences.locale || 'vi-VN'} /></label><label>Đơn vị cân nặng<input name="weight_unit" defaultValue={preferences.weight_unit || 'KG'} /></label><label>Đơn vị chiều dài<input name="length_unit" defaultValue={preferences.length_unit || 'CM'} /></label><label>Đơn vị đường huyết<input name="glucose_unit" defaultValue={preferences.glucose_unit || 'MMOL_L'} /></label><label className="check-row"><input name="push_enabled" type="checkbox" defaultChecked={preferences.push_enabled} /><span><Bell size={18} /> Nhận thông báo đẩy</span></label><label className="check-row"><input name="email_enabled" type="checkbox" defaultChecked={preferences.email_enabled} /><span>Nhận email từ NutriMom</span></label><button className="primary-button"><FloppyDisk size={20} />Lưu cài đặt</button></form>}</section><section className="danger-zone"><WarningCircle size={24} /><div><h2>Xóa tài khoản</h2><p>Thao tác này sẽ vô hiệu hóa tài khoản và đăng xuất khỏi các thiết bị.</p></div><button className="secondary-button danger-button" type="button" onClick={() => setDeleteOpen(true)}>Xóa tài khoản</button></section>{deleteOpen && <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-label="Xóa tài khoản"><div className="section-title-row"><h2>Xác nhận xóa tài khoản</h2><button className="text-button" type="button" onClick={() => setDeleteOpen(false)}>Đóng</button></div><p>Nhập lý do và mật khẩu để xác thực lại trước khi xóa.</p><form className="compact-form" onSubmit={deleteAccount}><label>Lý do<textarea name="reason" required maxLength={500} /></label><label>Mật khẩu<input name="password" type="password" required autoComplete="current-password" /></label><button className="danger-submit" type="submit">Xác nhận xóa tài khoản</button></form></section></div>}</AppShell>
}
