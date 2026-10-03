import { ArrowRight, User } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { PasswordField } from '@/shared/components/PasswordField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import { isValidEmail, isValidPhone } from '../model/auth-validation'
import { authenticatedDestination, isAdminUser, isExpertUser } from '../model/role-routing'

export function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const { login, resendActivation } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleResendActivation() {
    if (!identifier.includes('@') || resending) return
    setResending(true)
    try {
      const res = await resendActivation(identifier.trim())
      setResendStatus(res.message || 'Đã gửi lại mã kích hoạt vào email thành công!')
    } catch {
      setResendStatus('Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setShowResend(false)
    setResendStatus(null)
    const trimmed = identifier.trim()

    let identifierError: string | undefined
    if (!trimmed) {
      identifierError = 'Vui lòng nhập email hoặc số điện thoại.'
    } else if (trimmed.includes('@')) {
      if (!isValidEmail(trimmed)) identifierError = 'Địa chỉ email chưa đúng định dạng.'
    } else {
      if (!isValidPhone(trimmed)) identifierError = 'Số điện thoại Việt Nam chưa hợp lệ.'
    }

    const nextErrors = {
      identifier: identifierError,
      password: password && password.length <= 72 ? undefined : 'Vui lòng nhập mật khẩu.',
    }
    setFieldErrors(nextErrors)
    if (nextErrors.identifier || nextErrors.password) return

    setSubmitting(true)
    try {
      const authenticatedUser = await login({ phone: trimmed, password, deviceId: getDeviceId() })
      const requestedPath = (location.state as { from?: string } | null)?.from
      if (isAdminUser(authenticatedUser) || isExpertUser(authenticatedUser)) {
        navigate(authenticatedDestination(authenticatedUser), { replace: true })
      } else if (requestedPath?.startsWith('/admin') || requestedPath?.startsWith('/expert')) {
        navigate('/app', {
          replace: true,
          state: { authorizationError: 'Bạn không có quyền truy cập khu vực này.' },
        })
      } else {
        navigate(authenticatedDestination(authenticatedUser, undefined, requestedPath), { replace: true })
      }
    } catch (requestError) {
      const isActivationPending = requestError instanceof ApiClientError && (
        requestError.code === 'ACCOUNT_PENDING_ACTIVATION' || requestError.message.includes('kích hoạt')
      )
      if (isActivationPending && trimmed.includes('@')) {
        setShowResend(true)
      }
      setError(requestError instanceof ApiClientError ? requestError.message : 'Tài khoản hoặc mật khẩu không chính xác.')
      if (requestError instanceof ApiClientError && requestError.fields) {
        setFieldErrors({
          identifier: requestError.fields.phone || requestError.fields.email,
          password: requestError.fields.password,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập NutriMom"
      subtitle="Đăng nhập bằng Email hoặc Số điện thoại của bạn."
      footer={<p>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>}
      panelVariant="login"
      showHomeLink
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div style={{ marginBottom: 12 }}>
            <StatusMessage tone="error">{error}</StatusMessage>
            {showResend && (
              <div style={{ marginTop: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link
                  to={`/auth/activate?email=${encodeURIComponent(identifier.trim())}`}
                  style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'underline' }}
                >
                  👉 Bấm vào đây để nhập mã kích hoạt 6 chữ số
                </Link>
                {resendStatus ? (
                  <p style={{ fontSize: 13, color: '#0d9488', fontWeight: 500, margin: 0 }}>{resendStatus}</p>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={handleResendActivation}
                    disabled={resending}
                    style={{ fontSize: 12, color: '#64748b' }}
                  >
                    {resending ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại mã vào email'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <FormField
          label="Email hoặc Số điện thoại"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="Nhập email hoặc số điện thoại"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value)
            setError('')
            setFieldErrors((prev) => ({ ...prev, identifier: undefined }))
          }}
          error={fieldErrors.identifier}
          icon={<User size={20} />}
          disabled={submitting}
          autoFocus
        />

        <PasswordField
          label="Mật khẩu"
          name="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
            setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={fieldErrors.password}
          disabled={submitting}
        />

        <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
          <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
        </button>
      </form>
    </AuthLayout>
  )
}
