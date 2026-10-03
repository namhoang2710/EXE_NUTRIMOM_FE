import { ArrowRight, EnvelopeSimple, Key, PaperPlaneTilt, Phone, Sparkle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
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

const DEMO_PHONE = '0901234567'
const DEMO_PASSWORD = 'NutriMom@123'
const DEMO_EMAIL = 'mebau@nutrimom.vn'

export function LoginPage() {
  const [authMode, setAuthMode] = useState<'magic-link' | 'password'>('magic-link')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; password?: string; email?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkDebugUrl, setMagicLinkDebugUrl] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const { login, requestMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Vui lòng nhập địa chỉ email của bạn.')
      return
    }
    if (!isValidEmail(trimmed)) {
      setError('Định dạng email chưa hợp lệ.')
      return
    }

    setSubmitting(true)
    try {
      const res = await requestMagicLink(trimmed)
      setMagicLinkSent(true)
      setMagicLinkDebugUrl(res.debug_link || null)
      setCooldown(45)
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : 'Không thể gửi liên kết. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const nextErrors = {
      phone: isValidPhone(phone.trim()) ? undefined : 'Số điện thoại Việt Nam chưa hợp lệ.',
      password: password && password.length <= 72 ? undefined : 'Vui lòng nhập mật khẩu (tối đa 72 ký tự).',
    }
    setFieldErrors(nextErrors)
    if (nextErrors.phone || nextErrors.password) return

    if (!phone.trim() || !password) {
      setError('Vui lòng nhập số điện thoại và mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      const authenticatedUser = await login({ phone: phone.trim(), password, deviceId: getDeviceId() })
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
      setError(requestError instanceof ApiClientError ? requestError.message : 'Không thể đăng nhập. Vui lòng thử lại.')
      if (requestError instanceof ApiClientError) setFieldErrors(requestError.fields)
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemoAccount() {
    setPhone(DEMO_PHONE)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  function fillDemoEmail() {
    setEmail(DEMO_EMAIL)
    setError('')
  }

  return (
    <AuthLayout
      title="Chào mừng bạn trở lại"
      subtitle={authMode === 'magic-link' ? 'Đăng nhập bảo mật và tức thì qua Email mà không cần nhớ mật khẩu.' : 'Đăng nhập bằng số điện thoại và mật khẩu của bạn.'}
      footer={<p>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>}
      showHomeLink
    >
      <div style={{ display: 'flex', gap: 8, padding: 4, background: 'var(--color-surface-subtle, #f1f5f9)', borderRadius: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => { setAuthMode('magic-link'); setError(''); setMagicLinkSent(false) }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 7,
            border: 'none',
            background: authMode === 'magic-link' ? '#ffffff' : 'transparent',
            color: authMode === 'magic-link' ? '#7c3aed' : '#64748b',
            boxShadow: authMode === 'magic-link' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Sparkle size={16} weight={authMode === 'magic-link' ? 'fill' : 'regular'} />
          Qua Email (Magic Link)
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('password'); setError('') }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 7,
            border: 'none',
            background: authMode === 'password' ? '#ffffff' : 'transparent',
            color: authMode === 'password' ? '#7c3aed' : '#64748b',
            boxShadow: authMode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Phone size={16} weight={authMode === 'password' ? 'fill' : 'regular'} />
          Mật khẩu & SĐT
        </button>
      </div>

      {authMode === 'magic-link' ? (
        magicLinkSent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <PaperPlaneTilt size={32} weight="duotone" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Kiểm tra hộp thư của bạn!
            </h3>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
              Chúng tôi đã gửi một liên kết đăng nhập an toàn đến <strong>{email}</strong>. Vui lòng mở email và bấm vào liên kết để vào thẳng hệ thống.
            </p>

            {import.meta.env.DEV && magicLinkDebugUrl && (
              <div style={{ margin: '16px 0', padding: 12, borderRadius: 10, background: '#faf5ff', border: '1px dashed #c084fc', textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: 4 }}>
                  MÔI TRƯỜNG DEV - TEST NHANH:
                </span>
                <a
                  href={magicLinkDebugUrl}
                  style={{ fontSize: 12, color: '#7c3aed', wordBreak: 'break-all', textDecoration: 'underline', fontWeight: 600 }}
                >
                  👉 Bấm vào đây để đăng nhập trực tiếp (Magic Link)
                </a>
              </div>
            )}

            <button
              type="button"
              className="secondary-button"
              disabled={cooldown > 0 || submitting}
              onClick={(e) => void handleMagicLinkSubmit(e as any)}
              style={{ width: '100%', marginTop: 8 }}
            >
              {cooldown > 0 ? `Gửi lại liên kết sau ${cooldown}s` : 'Chưa nhận được? Gửi lại'}
            </button>

            <button
              type="button"
              onClick={() => { setMagicLinkSent(false); setError('') }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, textDecoration: 'underline', marginTop: 14, cursor: 'pointer' }}
            >
              Đổi địa chỉ email khác
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleMagicLinkSubmit} noValidate>
            {error && <StatusMessage tone="error">{error}</StatusMessage>}

            <FormField
              label="Địa chỉ Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ví dụ: mebau@nutrimom.vn"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              icon={<EnvelopeSimple size={20} />}
              disabled={submitting}
              autoFocus
            />

            <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
              <span>{submitting ? 'Đang gửi liên kết...' : 'Gửi liên kết đăng nhập'}</span>
              {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
            </button>

            {import.meta.env.DEV && (
              <div className="demo-account">
                <div>
                  <strong>Email mẫu thử nghiệm</strong>
                  <span>{DEMO_EMAIL}</span>
                </div>
                <button type="button" onClick={fillDemoEmail}>Điền nhanh</button>
              </div>
            )}
          </form>
        )
      ) : (
        <form className="auth-form" onSubmit={handlePasswordSubmit} noValidate>
          {error && <StatusMessage tone="error">{error}</StatusMessage>}

          <FormField
            label="Số điện thoại"
            name="phone"
            error={fieldErrors.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ví dụ: 0901 234 567"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); setFieldErrors((current) => ({ ...current, phone: undefined })) }}
            icon={<Phone size={20} />}
            disabled={submitting}
          />

          <PasswordField
            label="Mật khẩu"
            name="password"
            error={fieldErrors.password}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })) }}
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
      )}
    </AuthLayout>
  )
}
