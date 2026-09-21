import { useEffect, useState, type FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { userApi } from '../api/user-api'
import type { UserPreferences } from '../model/user-types'
import { buildPreferencesPatch } from '../model/preferences-patch'

function validTimeZone(value: string) {
  if (!value || value.length > 50) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true } catch { return false }
}

function validLocale(value: string) {
  return /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,4})?$/.test(value)
}

export function SettingsPage() {
  const [saved, setSaved] = useState<UserPreferences | null>(null)
  const [draft, setDraft] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const value = await userApi.preferences()
      setSaved(value)
      setDraft(value)
      setError('')
      setConflict(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải cài đặt.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  function change<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft || !saved) return
    setError('')
    setMessage('')
    if (!/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,4})?$/.test(draft.language)) { setError('Mã ngôn ngữ chưa hợp lệ.'); return }
    if (!validLocale(draft.locale)) { setError('Locale chưa hợp lệ.'); return }
    if (!validTimeZone(draft.timezone)) { setError('Múi giờ IANA chưa hợp lệ.'); return }
    const time = draft.preferred_reminder_time
    if (time && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) { setError('Giờ nhắc cần có dạng HH:mm:ss.'); return }
    const patch = buildPreferencesPatch(saved, draft)
    if (Object.keys(patch).length === 1) { setMessage('Không có thay đổi cần lưu.'); return }
    setBusy(true)
    try {
      const latest = await userApi.updatePreferences(patch)
      setSaved(latest)
      setDraft(latest)
      setMessage('Cài đặt đã được lưu.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.status === 409) {
        setConflict(true)
        setError('Cài đặt đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất.')
      } else setError(reason instanceof Error ? reason.message : 'Chưa thể lưu cài đặt.')
    } finally { setBusy(false) }
  }

  return <main className="nm-account-page">
    <div className="nm-account-intro"><span>NutriMom · Tùy chọn</span><h1>Cài đặt của bạn</h1><p>Điều chỉnh cách NutriMom gửi thông tin và lời nhắc.</p></div>
    {loading ? <p role="status">Đang tải cài đặt...</p> : draft ? <form className="nm-account-form" onSubmit={(event) => void save(event)}>
      <section><h2>Ngôn ngữ, khu vực và múi giờ</h2><div className="nm-form-grid">
        <label>Ngôn ngữ<input value={draft.language} onChange={(event) => change('language', event.target.value)} disabled={busy} /></label>
        <label>Locale<input value={draft.locale} onChange={(event) => change('locale', event.target.value)} disabled={busy} /></label>
        <label>Múi giờ<input value={draft.timezone} onChange={(event) => change('timezone', event.target.value)} disabled={busy} list="nm-timezones" /><datalist id="nm-timezones"><option value="Asia/Ho_Chi_Minh" /><option value="Asia/Singapore" /></datalist></label>
        <label>Giao diện<select value={draft.theme} onChange={(event) => change('theme', event.target.value)} disabled={busy}><option value="LIGHT">Sáng</option><option value="DARK">Tối</option><option value="SYSTEM">Theo thiết bị</option></select></label>
      </div></section>
      <section><h2>Đơn vị hiển thị</h2><div className="nm-form-grid">
        <label>Cân nặng<select value={draft.weight_unit} onChange={(event) => change('weight_unit', event.target.value)} disabled={busy}><option value="KG">Kilogram (kg)</option><option value="LB">Pound (lb)</option></select></label>
        <label>Chiều dài<select value={draft.length_unit} onChange={(event) => change('length_unit', event.target.value)} disabled={busy}><option value="CM">Centimet (cm)</option><option value="IN">Inch (in)</option></select></label>
        <label>Đường huyết<select value={draft.glucose_unit} onChange={(event) => change('glucose_unit', event.target.value)} disabled={busy}><option value="MMOL_L">mmol/L</option><option value="MG_DL">mg/dL</option></select></label>
      </div></section>
      <section><h2>Thông báo và sao lưu</h2><div className="nm-toggle-list">
        {([['backup_enabled', 'Cho phép sao lưu dữ liệu'], ['notification_enabled', 'Cho phép thông báo'], ['push_enabled', 'Thông báo đẩy'], ['email_enabled', 'Email'], ['sms_enabled', 'SMS']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={draft[key]} onChange={(event) => change(key, event.target.checked)} disabled={busy} /></label>)}
      </div></section>
      <section><h2>Giờ nhắc ưu tiên</h2><label>Thời gian<input type="time" step="1" value={draft.preferred_reminder_time ?? ''} onChange={(event) => change('preferred_reminder_time', event.target.value ? `${event.target.value.slice(0, 5)}:00` : saved?.preferred_reminder_time ?? null)} disabled={busy} /></label><p className="nm-form-note">Backend hiện chưa hỗ trợ xóa giờ nhắc đã lưu.</p></section>
      {error && <p className="nm-form-error" role="alert">{error}</p>}
      {message && <p className="nm-form-success" role="status">{message}</p>}
      <div className="nm-form-actions">{conflict && <button type="button" className="nm-secondary-action" onClick={() => void load()}>Tải lại</button>}<button type="submit" className="nm-primary-action" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu cài đặt'}</button></div>
    </form> : <div className="nm-account-form"><p className="nm-form-error" role="alert">{error}</p><button type="button" className="nm-secondary-action" onClick={() => void load()}>Thử lại</button></div>}
  </main>
}
