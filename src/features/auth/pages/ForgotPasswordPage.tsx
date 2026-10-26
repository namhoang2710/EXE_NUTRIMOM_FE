import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Envelope } from '@phosphor-icons/react'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useRetryCountdown } from '@/features/payment/hooks/usePaymentCooldown'
import { passwordApi } from '../api/password-api'
import { usePasswordCooldown } from '../hooks/usePasswordCooldown'
import { isValidEmail } from '../model/auth-validation'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [resendAt, setResendAt] = useState(0)
  const gate = useRef(false), remaining = Math.max(usePasswordCooldown('email-send'), useRetryCountdown(resendAt))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (gate.current || remaining) return
    setError('')
    if (!isValidEmail(email.trim())) { setError('Vui lòng nhập địa chỉ email hợp lệ.'); return }
    gate.current = true; setBusy(true)
    try {
      const result = await passwordApi.forgot(email)
      if (result.accepted !== true || !result.message) throw new Error('Chưa nhận được xác nhận từ máy chủ. Vui lòng thử lại sau.')
      setMessage(result.message); setResendAt(Date.now() + 60_000)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể gửi yêu cầu. Vui lòng thử lại sau.') }
    finally { gate.current = false; setBusy(false) }
  }
  return <AuthLayout title="Quên mật khẩu?" subtitle="Nhập email tài khoản để nhận liên kết đặt lại mật khẩu." panelVariant="login" showHomeLink footer={<p>Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link></p>}>
    <form className="auth-form auth-form--forgot-password" onSubmit={event => void submit(event)} noValidate>
      {message && <StatusMessage tone="success">{message}</StatusMessage>}{error && <StatusMessage tone="error">{error}</StatusMessage>}
      <FormField icon={<Envelope size={20} />} name="email" label="Email tài khoản" type="email" autoComplete="email" value={email} maxLength={255} disabled={busy} onChange={event => setEmail(event.target.value)} placeholder="ten@example.com" />
      <button type="submit" className="primary-button" disabled={busy || remaining > 0}>{busy ? 'Đang gửi…' : remaining ? `Gửi lại sau ${remaining} giây` : message ? 'Gửi lại liên kết' : 'Gửi liên kết đặt lại mật khẩu'}</button>
    </form>
  </AuthLayout>
}
