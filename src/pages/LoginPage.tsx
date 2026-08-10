import { ArrowRight, Key, Phone } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/FormField'
import { PasswordField } from '../components/PasswordField'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '../lib/api'
import { getDeviceId } from '../lib/device'

const DEMO_PHONE = '0901234567'
const DEMO_PASSWORD = 'NutriMom@123'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!phone.trim() || !password) {
      setError('Vui lòng nhập số điện thoại và mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      await login({ phone: phone.trim(), password, device_id: getDeviceId() })
      const target = (location.state as { from?: string } | null)?.from || '/app'
      navigate(target, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.message
        : 'Không thể đăng nhập. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemoAccount() {
    setPhone(DEMO_PHONE)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  return (
    <AuthLayout
      title="Chào mừng bạn trở lại"
      subtitle="Đăng nhập để tiếp tục theo dõi hành trình chăm sóc mẹ và bé."
      footer={<p>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <FormField
          label="Số điện thoại"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ví dụ: 0901 234 567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          icon={<Phone size={20} />}
          disabled={submitting}
        />

        <PasswordField
          label="Mật khẩu"
          name="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />

        <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
          <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
        </button>

        <div className="auth-divider"><span>hoặc</span></div>

        <Link className="secondary-button" to="/otp?mode=login">
          <Key size={20} aria-hidden="true" />
          Đăng nhập bằng OTP
        </Link>

        {import.meta.env.DEV && (
          <div className="demo-account">
            <div>
              <strong>Tài khoản thử local</strong>
              <span>{DEMO_PHONE} / {DEMO_PASSWORD}</span>
            </div>
            <button type="button" onClick={fillDemoAccount}>Điền nhanh</button>
          </div>
        )}
      </form>
    </AuthLayout>
  )
}
