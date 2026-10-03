import { ArrowRight, EnvelopeSimple, User } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { PasswordField } from '@/shared/components/PasswordField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { OtpInput } from '@/shared/components/OtpInput'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import { isValidEmail, isValidPhone } from '../model/auth-validation'
import { authenticatedDestination, isAdminUser, isExpertUser } from '../model/role-routing'

export function LoginPage() {
  const [tab, setTab] = useState<'password' | 'email-otp'>('password')

  // Password Login State
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  // Email OTP Login State
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)

  const { login, resendActivation, requestMagicLink, verifyMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Cooldown timer countdown
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

  async function handleResendActivation() {
    if (!identifier.includes('@') || resending) return
    setResending(true)
    try {
      const res = await resendActivation(identifier.trim())
      setResendStatus(res.message || 'Đã gửi lại email kích hoạt thành công!')
    } catch {
      setResendStatus('Không thể gửi lại email kích hoạt. Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  function handleNavigateSuccess(authenticatedUser: any) {
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
  }

  async function handleSubmitPassword(event: FormEvent<HTMLFormElement>) {
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
      handleNavigateSuccess(authenticatedUser)
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

  async function handleRequestOtp(e?: FormEvent) {
    if (e) e.preventDefault()
    setOtpError('')
    const trimmed = otpEmail.trim()
    if (!trimmed) {
      setOtpError('Vui lòng nhập địa chỉ email của bạn.')
      return
    }
    if (!isValidEmail(trimmed)) {
      setOtpError('Địa chỉ email chưa đúng định dạng.')
      return
    }
    setOtpSending(true)
    try {
      await requestMagicLink(trimmed)
      setOtpStep('verify')
      setOtpCountdown(45)
      setOtpCode('')
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOtpError(err.message || 'Không thể gửi mã xác thực. Vui lòng thử lại sau.')
      } else {
        setOtpError('Lỗi kết nối. Vui lòng thử lại.')
      }
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyOtp(codeToVerify: string) {
    if (codeToVerify.length < 6 || otpVerifying) return
    setOtpVerifying(true)
    setOtpError('')
    try {
      const authenticatedUser = await verifyMagicLink(codeToVerify, otpEmail.trim())
      handleNavigateSuccess(authenticatedUser)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOtpError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.')
      } else {
        setOtpError('Xác thực mã thất bại. Vui lòng thử lại.')
      }
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập NutriMom"
      subtitle={tab === 'password' ? 'Đăng nhập bằng Email hoặc Số điện thoại của bạn.' : 'Nhận mã xác thực 6 chữ số qua email để đăng nhập.'}
      footer={<p>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>}
      panelVariant="login"
      showHomeLink
    >
      {/* Tab Switcher */}
      <div
        role="tablist"
        aria-label="Hình thức đăng nhập"
        style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 12,
          marginBottom: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'password'}
          onClick={() => { setTab('password'); setError(''); }}
          style={{
            flex: 1,
            padding: '9px 14px',
            fontSize: 14,
            fontWeight: tab === 'password' ? 600 : 500,
            color: tab === 'password' ? '#0d9488' : '#64748b',
            background: tab === 'password' ? '#ffffff' : 'transparent',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            boxShadow: tab === 'password' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Mật khẩu
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'email-otp'}
          onClick={() => { setTab('email-otp'); setOtpError(''); }}
          style={{
            flex: 1,
            padding: '9px 14px',
            fontSize: 14,
            fontWeight: tab === 'email-otp' ? 600 : 500,
            color: tab === 'email-otp' ? '#0d9488' : '#64748b',
            background: tab === 'email-otp' ? '#ffffff' : 'transparent',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            boxShadow: tab === 'email-otp' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Mã xác thực Email
        </button>
      </div>

      {tab === 'password' ? (
        <form className="auth-form" onSubmit={handleSubmitPassword} noValidate>
          {error && (
            <div style={{ marginBottom: 12 }}>
              <StatusMessage tone="error">{error}</StatusMessage>
              {showResend && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  {resendStatus ? (
                    <p style={{ fontSize: 13, color: '#0d9488', fontWeight: 500 }}>{resendStatus}</p>
                  ) : (
                    <button
                      type="button"
                      className="text-button"
                      onClick={handleResendActivation}
                      disabled={resending}
                      style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      {resending ? 'Đang gửi lại...' : '👉 Bấm vào đây để gửi lại email kích hoạt'}
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
      ) : (
        <div className="auth-form">
          {otpError && (
            <div style={{ marginBottom: 14 }}>
              <StatusMessage tone="error">{otpError}</StatusMessage>
            </div>
          )}

          {otpStep === 'request' ? (
            <form onSubmit={handleRequestOtp} noValidate>
              <FormField
                label="Địa chỉ Email"
                name="otpEmail"
                type="email"
                autoComplete="email"
                placeholder="Nhập email để nhận mã 6 chữ số"
                value={otpEmail}
                onChange={(e) => {
                  setOtpEmail(e.target.value)
                  setOtpError('')
                }}
                icon={<EnvelopeSimple size={20} />}
                disabled={otpSending}
                autoFocus
              />

              <button
                className={`primary-button${otpSending ? ' is-loading' : ''}`}
                type="submit"
                disabled={otpSending}
              >
                <span>{otpSending ? 'Đang gửi mã...' : 'Gửi mã đăng nhập'}</span>
                {!otpSending && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
              </button>
            </form>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 6px' }}>
                  Nhập mã xác thực gồm 6 chữ số đã gửi tới:
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>{otpEmail}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('request')
                      setOtpCode('')
                      setOtpError('')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Đổi
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                <OtpInput
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val)
                    setOtpError('')
                    if (val.length === 6) {
                      void handleVerifyOtp(val)
                    }
                  }}
                  disabled={otpVerifying}
                />
              </div>

              <button
                className={`primary-button${otpVerifying ? ' is-loading' : ''}`}
                type="button"
                onClick={() => void handleVerifyOtp(otpCode)}
                disabled={otpVerifying || otpCode.length < 6}
              >
                <span>{otpVerifying ? 'Đang xác thực...' : 'Đăng nhập'}</span>
                {!otpVerifying && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
              </button>

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                {otpCountdown > 0 ? (
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    Gửi lại mã sau <strong>{otpCountdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRequestOtp()}
                    disabled={otpSending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {otpSending ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  )
}
