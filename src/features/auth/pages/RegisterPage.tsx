import { ArrowRight, EnvelopeSimple, Phone, User } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { PasswordField } from '@/shared/components/PasswordField'
import { OtpInput } from '@/shared/components/OtpInput'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import { mapRegisterFieldErrors, registerFieldError, type RegisterFormValues } from '../model/auth-validation'
import { activateOnce } from '../model/activation-request'
import { authenticatedDestination } from '../model/role-routing'
import { getStoredTrafficSource } from '@/core/analytics/traffic-tracker'

type RegisterForm = RegisterFormValues

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
  const touched = useRef(new Set<keyof RegisterForm>())
  const [submitting, setSubmitting] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)
  const [pendingEmail] = useState(() => {
    return typeof window !== 'undefined' ? (sessionStorage.getItem('nutrimom:pending_activation_email') || '') : ''
  })

  // Activation OTP state
  const [otpCode, setOtpCode] = useState('')
  const [activating, setActivating] = useState(false)
  const activationInFlight = useRef(false)
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
    } catch (err) {
      setResendStatus(null)
      setActivationError(err instanceof ApiClientError ? err.serverMessage || err.message : 'Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  async function handleActivate(codeToVerify: string) {
    if (!/^\d{6}$/.test(codeToVerify) || activationInFlight.current) return
    activationInFlight.current = true
    setActivating(true)
    setActivationError('')
    try {
      const user = await activateOnce(codeToVerify, form.email.trim(), () => activateAccount(codeToVerify, form.email.trim()))
      navigate(authenticatedDestination(user), { replace: true })
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActivationError(err.serverMessage || err.message || 'Mã xác thực kích hoạt không chính xác hoặc đã hết hạn.')
      } else {
        setActivationError('Kích hoạt tài khoản thất bại. Vui lòng thử lại.')
      }
    } finally {
      activationInFlight.current = false
      setActivating(false)
    }
  }

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    setError('')
    setFieldErrors((current) => ({
      ...current,
      [key]: touched.current.has(key) ? registerFieldError(key, next) : '',
      ...(key === 'password' && touched.current.has('confirmPassword')
        ? { confirmPassword: registerFieldError('confirmPassword', next) } : {}),
    }))
  }

  function validateField(key: keyof RegisterForm) {
    touched.current.add(key)
    setFieldErrors((current) => ({ ...current, [key]: registerFieldError(key, form) }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    const nextErrors: Record<string, string> = {}
    const trimmedDisplayName = form.displayName.trim()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()

    for (const key of Object.keys(initialForm) as (keyof RegisterForm)[]) {
      touched.current.add(key)
      const message = registerFieldError(key, form)
      if (message) nextErrors[key] = message
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
        acquisitionSource: getStoredTrafficSource(),
      })
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nutrimom:pending_activation_email', trimmedEmail)
      }
      setRegisteredSuccess(true)
      setCountdown(45)
      setOtpCode('')
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.serverMessage || requestError.message
        : 'Không thể tạo tài khoản. Vui lòng thử lại.')
      if (requestError instanceof ApiClientError) {
        const errors = mapRegisterFieldErrors(requestError.fields)
        if (requestError.code === 'EMAIL_ALREADY_EXISTS') errors.email = requestError.serverMessage || requestError.message
        if (requestError.code === 'PHONE_ALREADY_EXISTS' || requestError.code === 'INVALID_PHONE') errors.phone = requestError.serverMessage || requestError.message
        if (requestError.code === 'TERMS_NOT_ACCEPTED') errors.accepted = requestError.serverMessage || requestError.message
        setFieldErrors(errors)
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
            background: 'var(--success-soft)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <EnvelopeSimple size={36} weight="duotone" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Xác thực tài khoản NutriMom
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 6px' }}>
            Mã kích hoạt gồm 6 chữ số đã được gửi tới:
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15, overflowWrap: 'anywhere' }}>{form.email}</span>
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
                color: 'var(--accent-strong)',
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

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <OtpInput
              value={otpCode}
              error={activationError}
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
              <p style={{ fontSize: 13, color: 'var(--accent-strong)', marginBottom: 8, fontWeight: 500 }}>
                {resendStatus}
              </p>
            )}
            {countdown > 0 ? (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Gửi lại mã sau <strong>{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={handleResend}
                disabled={resending}
                style={{ fontSize: 13, color: 'var(--accent-strong)', fontWeight: 600, textDecoration: 'underline' }}
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
      error={error}
      subtitle="Bắt đầu hồ sơ chăm sóc thai kỳ của bạn chỉ trong vài phút."
      footer={<p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>}
      panelVariant="register"
      showHomeLink
    >
      <form className="auth-form auth-form--register" onSubmit={handleSubmit} noValidate>
        {pendingEmail && (
          <div style={{
            background: 'var(--accent-soft, #f0fdfa)',
            border: '1px solid var(--accent, #0d9488)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#134e4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span>Bạn đang có mã kích hoạt gửi tới <strong>{pendingEmail}</strong>?</span>
            <Link
              to={`/auth/activate?email=${encodeURIComponent(pendingEmail)}`}
              style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'underline' }}
            >
              Nhập mã kích hoạt ngay →
            </Link>
          </div>
        )}

        {error && (fieldErrors.email || fieldErrors.phone || error.toLowerCase().includes('đã')) && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#9f1239',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span>Thông tin này đã tồn tại trong hệ thống. Bạn có thể:</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/login" style={{ color: '#0d9488', fontWeight: 600 }}>👉 Đăng nhập</Link>
              {form.email.trim() && (
                <Link
                  to={`/auth/activate?email=${encodeURIComponent(form.email.trim())}`}
                  style={{ color: '#0d9488', fontWeight: 600 }}
                >
                  👉 Nhập mã kích hoạt email
                </Link>
              )}
            </div>
          </div>
        )}

        <FormField
          label="Tên hiển thị"
          name="displayName"
          error={fieldErrors.displayName || fieldErrors.display_name}
          autoComplete="name"
          placeholder="Ví dụ: Nguyễn An"
          value={form.displayName}
          onChange={(event) => update('displayName', event.target.value)}
          onBlur={() => validateField('displayName')}
          icon={<User size={20} />}
          disabled={submitting}
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
          onBlur={() => validateField('email')}
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
          onBlur={() => validateField('phone')}
          icon={<Phone size={20} />}
          disabled={submitting}
        />

        <PasswordField
          label="Mật khẩu"
          name="password"
          error={fieldErrors.password}
          autoComplete="new-password"
          placeholder="8–20 ký tự, gồm Aa, số và ký tự đặc biệt"
          hint="8–20 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt; không khoảng trắng."
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          onBlur={() => validateField('password')}
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
          onBlur={() => validateField('confirmPassword')}
          disabled={submitting}
        />

        <div className="auth-terms">
          <label className="check-row">
            <input
              type="checkbox"
              name="accepted"
              aria-invalid={Boolean(fieldErrors.accepted)}
              aria-describedby="accepted-error"
              checked={form.accepted}
              onChange={(event) => update('accepted', event.target.checked)}
              onBlur={() => validateField('accepted')}
              disabled={submitting}
            />
            <span>Tôi đồng ý với <a href="#terms">điều khoản sử dụng</a> và <a href="#privacy">chính sách riêng tư</a>.</span>
          </label>
          <p className="field-error" id="accepted-error" aria-live="polite">{fieldErrors.accepted || '\u00a0'}</p>
        </div>

        <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
          <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
          {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
        </button>
      </form>
    </AuthLayout>
  )
}
