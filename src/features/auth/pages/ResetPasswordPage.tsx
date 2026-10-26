import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { PasswordField } from '@/shared/components/PasswordField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { clearSession } from '@/core/auth/token-store'
import { ApiClientError } from '@/core/api/api-error'
import { passwordApi, type ResetValidation } from '../api/password-api'
import { usePasswordCooldown } from '../hooks/usePasswordCooldown'
import { registerPasswordError } from '../model/auth-validation'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  return <ResetPasswordContent key={token} token={token} />
}
function ResetPasswordContent({ token }: { token: string }) {
  const navigate = useNavigate()
  const [validation, setValidation] = useState<ResetValidation>(), [checking, setChecking] = useState(true), [validationError, setValidationError] = useState('')
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  const gate = useRef(false), remaining = usePasswordCooldown('code-verify')
  useEffect(() => {
    const controller = new AbortController()
    setChecking(true); setValidationError('')
    if (!token || token.length > 128) { setChecking(false); setValidationError('Liên kết đặt lại mật khẩu không hợp lệ.'); return () => controller.abort() }
    void passwordApi.validate(token, controller.signal).then(result => {
      if (controller.signal.aborted) return
      if (result.valid !== true) throw new Error('Liên kết đặt lại mật khẩu không còn dùng được.')
      setValidation(result)
    }).catch(reason => { if (!controller.signal.aborted) setValidationError(reason instanceof Error ? reason.message : 'Chưa thể kiểm tra liên kết.') })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [retry, token])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (gate.current || remaining || !validation) return
    const invalid = registerPasswordError(password) || (password !== confirm ? 'Mật khẩu xác nhận chưa khớp.' : '')
    if (invalid) { setError(invalid); return }
    gate.current = true; setBusy(true); setError('')
    try {
      const result = await passwordApi.reset(token, password)
      if (result.reset !== true) throw new Error('Chưa nhận được xác nhận đặt lại mật khẩu.')
      clearSession(); navigate('/login', { replace: true, state: { passwordUpdated: true } })
    } catch (reason) {
      if (reason instanceof ApiClientError && (reason.status === 410 || reason.code === 'PASSWORD_RESET_TOKEN_INVALID')) { setValidation(undefined); setValidationError('Liên kết đã hết hạn hoặc đã sử dụng. Vui lòng yêu cầu liên kết mới.') }
      else setError(reason instanceof ApiClientError ? reason.fields.new_password || reason.message : reason instanceof Error ? reason.message : 'Chưa thể đặt lại mật khẩu.')
    } finally { gate.current = false; setBusy(false) }
  }
  return <AuthLayout title="Đặt lại mật khẩu" subtitle={validation ? `Tạo mật khẩu mới cho ${validation.email_masked}.` : 'Kiểm tra liên kết và bảo vệ lại tài khoản của bạn.'} panelVariant="login" showHomeLink footer={<p><Link to="/login">Về đăng nhập</Link> · <Link to="/forgot-password">Yêu cầu liên kết mới</Link></p>}>
    {checking ? <p role="status">Đang kiểm tra liên kết…</p> : validationError ? <div><StatusMessage tone="error">{validationError}</StatusMessage><button className="secondary-button" type="button" disabled={remaining > 0} onClick={() => setRetry(value => value + 1)}>Kiểm tra lại liên kết</button></div> : <form className="auth-form" onSubmit={event => void submit(event)} noValidate>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <PasswordField name="newPassword" label="Mật khẩu mới" value={password} maxLength={20} autoComplete="new-password" disabled={busy} onChange={event => setPassword(event.target.value)} />
      <PasswordField name="confirmPassword" label="Nhập lại mật khẩu mới" value={confirm} maxLength={20} autoComplete="new-password" disabled={busy} onChange={event => setConfirm(event.target.value)} />
      <p className="auth-hint">8–20 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.</p>
      <button type="submit" className="primary-button" disabled={busy || remaining > 0}>{busy ? 'Đang cập nhật…' : 'Lưu mật khẩu mới'}</button>
    </form>}
    {remaining > 0 && <p role="status">Thử lại sau {remaining} giây.</p>}
  </AuthLayout>
}
