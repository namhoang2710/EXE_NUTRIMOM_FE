import { ArrowRight, EnvelopeSimple, Phone, User } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { PasswordField } from '@/shared/components/PasswordField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { OtpInput } from '@/shared/components/OtpInput'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import { isValidEmail, isValidPhone, isValidRegisterPassword } from '../model/auth-validation'
import { authenticatedDestination } from '../model/role-routing'

interface RegisterForm {
  displayName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  accepted: boolean
}

const initialForm: RegisterForm = {
  displayName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  accepted: false,
}

export function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  // Activation OTP state
  const [otpCode, setOtpCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const { register, resendActivation, activateAccount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  async function handleResend() {
    if (!form.email || resending || countdown > 0) return
    setResending(true)
    setActivationError('')
    try {
      const res = await resendActivation(form.email.trim())
      setResendStatus(res.message || 'Đã gửi lại mã kích hoạt thành công!')
      setCountdown(45)
    } catch {
      setResendStatus('Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  async function handleActivate(codeToVerify: string) {
    if (codeToVerify.length < 6 || activating) return
    setActivating(true)
    setActivationError('')
    try {
      const user = await activateAccount(codeToVerify, form.email.trim())
      navigate(authenticatedDestination(user), { replace: true })
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActivationError(err.message || 'Mã xác thực kích hoạt không chính xác hoặc đã hết hạn.')
      } else {
        setActivationError('Kích hoạt tài khoản thất bại. Vui lòng thử lại.')
      }
    } finally {
      setActivating(false)
    }
  }

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const nextErrors: Record<string, string> = {}
    const trimmedDisplayName = form.displayName.trim()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()

    if (!trimmedDisplayName || trimmedDisplayName.length > 100) {
      nextErrors.displayName = 'Tên hiển thị cần từ 1 đến 100 ký tự.'
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.'
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Địa chỉ email chưa đúng định dạng.'
    }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      nextErrors.phone = 'Số điện thoại Việt Nam chưa hợp lệ.'
    }
    if (!isValidRegisterPassword(form.password)) {
      nextErrors.password = 'Mật khẩu cần 8–72 ký tự, có ít nhất một chữ cái và một chữ số.'
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    }
    if (!form.accepted) {
      nextErrors.accepted = 'Bạn cần đồng ý với điều khoản sử dụng và chính sách riêng tư.'
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await register({
        displayName: trimmedDisplayName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: form.password,
        deviceId: getDeviceId(),
        acceptedTerms: form.accepted,
      })
      setRegisteredSuccess(true)
      setCountdown(45)
      setOtpCode('')
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.message
        : 'Không thể tạo tài khoản. Vui lòng thử lại.')
      if (requestError instanceof ApiClientError && requestError.fields) {
        setFieldErrors(requestError.fields)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (registeredSuccess) {
    return (
      <AuthLayout
        title="Kích hoạt tài khoản"
        subtitle="Nhập mã xác thực 6 chữ số đã gửi về email để hoàn tất kích hoạt"
        panelVariant="register"
        showHomeLink
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <EnvelopeSimple size={36} weight="duotone" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            Xác thực tài khoản NutriMom
          </h3>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 6px' }}>
            Mã kích hoạt gồm 6 chữ số đã được gửi tới:
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>{form.email}</span>
            <button
              type="button"
              onClick={() => {
                setRegisteredSuccess(false)
                setOtpCode('')
                setActivationError('')
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
              Đổi thông tin
            </button>
          </div>

          {activationError && (
            <div style={{ marginBottom: 16 }}>
              <StatusMessage tone="error">{activationError}</StatusMessage>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <OtpInput
              value={otpCode}
              onChange={(val) => {
                setOtpCode(val)
                setActivationError('')
                if (val.length === 6) {
                  void handleActivate(val)
                }
              }}
              disabled={activating}
            />
          </div>

          <button
            className={`primary-button${activating ? ' is-loading' : ''}`}
            type="button"
            onClick={() => void handleActivate(otpCode)}
            disabled={activating || otpCode.length < 6}
            style={{ width: '100%' }}
          >
            <span>{activating ? 'Đang kích hoạt...' : 'Kích hoạt & Đăng nhập'}</span>
            {!activating && <ArrowRight size={20} weight="bold" />}
          </button>

          <div style={{ marginTop: 20 }}>
            {resendStatus && (
              <p style={{ fontSize: 13, color: '#0d9488', marginBottom: 8, fontWeight: 500 }}>
                {resendStatus}
              </p>
            )}
            {countdown > 0 ? (
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Gửi lại mã sau <strong>{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={handleResend}
                disabled={resending}
                style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'underline' }}
              >
                {resending ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại mã kích hoạt'}
              </button>
            )}
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Tạo tài khoản NutriMom"
      subtitle="Bắt đầu hồ sơ chăm sóc thai kỳ của bạn chỉ trong vài phút."
      footer={<p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>}
      panelVariant="register"
      showHomeLink
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <FormField
          label="Tên hiển thị"
          name="displayName"
          error={fieldErrors.displayName || fieldErrors.display_name}
          autoComplete="name"
          placeholder="Ví dụ: Nguyễn An"
          value={form.displayName}
          onChange={(event) => update('displayName', event.target.value)}
          icon={<User size={20} />}
          disabled={submitting}
          autoFocus
        />

        <FormField
          label="Địa chỉ Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={fieldErrors.email}
          placeholder="Ví dụ: nguyennan@gmail.com"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          icon={<EnvelopeSimple size={20} />}
          disabled={submitting}
        />

        <FormField
          label="Số điện thoại (tùy chọn)"
          name="phone"
          error={fieldErrors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ví dụ: 0901 234 567"
          value={form.phone}
          onChange={(event) => update('phone', event.target.value)}
          icon={<Phone size={20} />}
          disabled={submitting}
        />

        <PasswordField
          label="Mật khẩu"
          name="password"
          error={fieldErrors.password}
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự (chữ cái và chữ số)"
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          disabled={submitting}
        />

        <PasswordField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          value={form.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          disabled={submitting}
        />

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.accepted}
            onChange={(event) => update('accepted', event.target.checked)}
            disabled={submitting}
          />
          <span>Tôi đồng ý với <a href="#terms">điều khoản sử dụng</a> và <a href="#privacy">chính sách riêng tư</a>.</span>
        </label>
        {fieldErrors.accepted && <p className="field-error">{fieldErrors.accepted}</p>}

        <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
          <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
          {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
        </button>
      </form>
    </AuthLayout>
  )
}
