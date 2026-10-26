import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordField } from '@/shared/components/PasswordField'
import { passwordApi } from '@/features/auth/api/password-api'
import { registerPasswordError } from '@/features/auth/model/auth-validation'
import { clearSession } from '@/core/auth/token-store'
import { ApiClientError } from '@/core/api/api-error'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import '@/features/reviews/styles/reviews.css'

export function AccountPasswordPage() {
  const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notSet, setNotSet] = useState(false)
  const gate = useRef(false), navigate = useNavigate(), cooldown = usePaymentCooldown('password-change')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (gate.current || cooldown.blocked) return
    const invalid = !current ? 'Vui lòng nhập mật khẩu hiện tại.' : registerPasswordError(password) || (password !== confirm ? 'Mật khẩu xác nhận chưa khớp.' : '')
    if (invalid) { setError(invalid); return }
    gate.current = true; setBusy(true); setError(''); setNotSet(false)
    try { await passwordApi.change(current, password); clearSession(); navigate('/login', { replace: true, state: { passwordUpdated: true } }) }
    catch (reason) { cooldown.handleRateLimit(reason); setNotSet(reason instanceof ApiClientError && reason.code === 'PASSWORD_NOT_SET'); setError(reason instanceof ApiClientError ? reason.fields.new_password || reason.message : reason instanceof Error ? reason.message : 'Chưa thể đổi mật khẩu.') }
    finally { gate.current = false; setBusy(false) }
  }
  return <main className="nm-account-workspace-page"><header className="nm-account-workspace-heading"><span>Thiết lập tài khoản</span><h1>Đổi mật khẩu</h1><p>Sau khi đổi thành công, bạn cần đăng nhập lại trên các thiết bị.</p></header>
    <form className="nm-review-form" onSubmit={event => void submit(event)} noValidate>
      <PasswordField name="currentPassword" label="Mật khẩu hiện tại" value={current} autoComplete="current-password" maxLength={100} disabled={busy || cooldown.blocked} onChange={event => setCurrent(event.target.value)} />
      <PasswordField name="newPassword" label="Mật khẩu mới" value={password} autoComplete="new-password" maxLength={20} disabled={busy || cooldown.blocked} onChange={event => setPassword(event.target.value)} />
      <PasswordField name="confirmPassword" label="Nhập lại mật khẩu mới" value={confirm} autoComplete="new-password" maxLength={20} disabled={busy || cooldown.blocked} onChange={event => setConfirm(event.target.value)} />
      <small>8–20 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; không có khoảng trắng.</small>
      {error && <p role="alert" className="nm-form-error">{error}</p>}{notSet && <Link to="/forgot-password">Nhận liên kết tạo mật khẩu qua email</Link>}
      {cooldown.remaining > 0 && <p role="status">Thử lại sau {cooldown.remaining} giây.</p>}
      <footer><Link to="/forgot-password">Quên mật khẩu hiện tại?</Link><button type="submit" className="nm-review-primary" disabled={busy || cooldown.blocked}>{busy ? 'Đang cập nhật…' : 'Lưu mật khẩu mới'}</button></footer>
    </form>
  </main>
}
