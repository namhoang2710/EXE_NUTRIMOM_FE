import { ArrowRight, Phone, User } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/FormField'
import { PasswordField } from '../components/PasswordField'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '../lib/api'
import { getDeviceId } from '../lib/device'

interface RegisterForm {
  displayName: string
  phone: string
  password: string
  confirmPassword: string
  accepted: boolean
}

const initialForm: RegisterForm = {
  displayName: '',
  phone: '',
  password: '',
  confirmPassword: '',
  accepted: false,
}

export function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!form.displayName.trim() || !form.phone.trim() || !form.password) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.')
      return
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    if (!form.accepted) {
      setError('Bạn cần đồng ý với điều khoản sử dụng và chính sách riêng tư.')
      return
    }

    setSubmitting(true)
    try {
      await register({
        display_name: form.displayName.trim(),
        phone: form.phone.trim(),
        password: form.password,
        device_id: getDeviceId(),
      })
      navigate('/app', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.message
        : 'Không thể tạo tài khoản. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Tạo tài khoản NutriMom"
      subtitle="Bắt đầu hồ sơ chăm sóc thai kỳ của bạn chỉ trong vài phút."
      footer={<p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <FormField
          label="Tên hiển thị"
          name="displayName"
          autoComplete="name"
          placeholder="Ví dụ: Nguyễn An"
          value={form.displayName}
          onChange={(event) => update('displayName', event.target.value)}
          icon={<User size={20} />}
          disabled={submitting}
        />

        <FormField
          label="Số điện thoại"
          name="phone"
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
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          hint="Có ít nhất một chữ cái và một chữ số."
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          disabled={submitting}
        />

        <PasswordField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
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

        <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
          <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
          {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
        </button>

        <Link className="text-link centered-link" to="/otp?mode=register">Đăng ký bằng mã OTP</Link>
      </form>
    </AuthLayout>
  )
}
