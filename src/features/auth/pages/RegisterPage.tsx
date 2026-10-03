import { ArrowRight, CheckCircle, EnvelopeSimple, Phone, User } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { PasswordField } from '@/shared/components/PasswordField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import { isValidEmail, isValidPhone, isValidRegisterPassword } from '../model/auth-validation'

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
  const { register } = useAuth()
  const navigate = useNavigate()

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
        title="Đăng ký thành công!"
        subtitle="Chào mừng bạn đến với NutriMom."
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
            <CheckCircle size={36} weight="fill" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            Tài khoản đã được tạo thành công
          </h3>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
            Hệ thống đã gửi một email xác nhận đến <strong>{form.email}</strong>. Vui lòng kiểm tra hộp thư của bạn.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/app', { replace: true })}
            style={{ width: '100%' }}
          >
            <span>Bắt đầu sử dụng ngay</span>
            <ArrowRight size={20} weight="bold" />
          </button>
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
