import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDeviceId } from '@/core/auth/device'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { userApi } from '../api/user-api'

export function DeleteAccountPanel() {
  const { profile, requestOtp, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<'password' | 'otp'>('password')
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function sendOtp() {
    if (!profile || Date.now() < cooldownUntil) return
    setBusy(true); setError('')
    try {
      const result = await requestOtp({ phone: profile.phone, purpose: 'LOGIN', deviceId: getDeviceId() })
      setChallengeId(result.challengeId)
      const until = Date.now() + result.resendAfter * 1000
      setCooldownUntil(until)
      setNow(Date.now())
      const interval = window.setInterval(() => { setNow(Date.now()); if (Date.now() >= until) window.clearInterval(interval) }, 1000)
      window.setTimeout(() => window.clearInterval(interval), result.resendAfter * 1000 + 1000)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể gửi OTP.') }
    finally { setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reason.trim()) { setError('Vui lòng nhập lý do.'); return }
    if (method === 'password' && !password) { setError('Vui lòng nhập mật khẩu.'); return }
    if (method === 'otp' && (!challengeId || !/^\d{6}$/.test(code))) { setError('Vui lòng xác minh bằng mã OTP gồm 6 chữ số.'); return }
    setBusy(true); setError('')
    try {
      await userApi.disableAccount(method === 'password' ? { reason: reason.trim(), password } : { reason: reason.trim(), otp_challenge_id: challengeId, otp_code: code })
      await logout().catch(() => undefined)
      navigate('/', { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể vô hiệu hóa tài khoản.') }
    finally { setBusy(false) }
  }
  return <section className="nm-delete-panel"><h2>Quản lý tài khoản</h2><p>Nếu muốn ngừng sử dụng NutriMom, bạn có thể vô hiệu hóa tài khoản sau khi xác thực lại.</p>{!open ? <button type="button" className="nm-secondary-action" onClick={() => setOpen(true)}>Vô hiệu hóa tài khoản</button> : <form onSubmit={(event) => void submit(event)}><label>Lý do<textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} required /></label><label>Cách xác thực<select value={method} onChange={(event) => { setMethod(event.target.value as typeof method); setError('') }} disabled={busy}><option value="password">Mật khẩu</option><option value="otp">Mã OTP</option></select></label>{method === 'password' ? <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label> : <><button type="button" className="nm-secondary-action" onClick={() => void sendOtp()} disabled={busy || now < cooldownUntil}>{now < cooldownUntil ? `Gửi lại sau ${Math.ceil((cooldownUntil - now) / 1000)}s` : 'Gửi mã OTP'}</button>{challengeId && <label>Mã OTP<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy} /></label>}</>}{error && <p className="nm-form-error" role="alert">{error}</p>}<div className="nm-form-actions"><button type="button" className="nm-secondary-action" onClick={() => setOpen(false)} disabled={busy}>Hủy</button><button type="submit" className="nm-danger-action" disabled={busy}>{busy ? 'Đang xử lý...' : 'Xác nhận vô hiệu hóa'}</button></div></form>}</section>
}
