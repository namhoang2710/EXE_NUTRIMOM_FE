import { ArrowRight, CheckCircle, SpinnerGap, EnvelopeSimple } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { OtpInput } from '@/shared/components/OtpInput'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { isValidEmail } from '../model/auth-validation'
import { authenticatedDestination } from '../model/role-routing'

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token')
  const emailParam = searchParams.get('email') || ''

  const [email, setEmail] = useState(emailParam)
  const [otpCode, setOtpCode] = useState(tokenParam && tokenParam.length === 6 ? tokenParam : '')
  const [loading, setLoading] = useState(Boolean(tokenParam))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const { activateAccount, resendActivation } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    if (!tokenParam) {
      setLoading(false)
      return
    }

    let active = true
    async function doActivate() {
      try {
        const user = await activateAccount(tokenParam!, emailParam || undefined)
        if (!active) return
        setSuccess(true)
        setLoading(false)
        setTimeout(() => {
          navigate(authenticatedDestination(user), { replace: true })
        }, 1200)
      } catch (err) {
        if (!active) return
        setLoading(false)
        setError(err instanceof ApiClientError ? err.message : 'Kích hoạt tài khoản thất bại. Vui lòng kiểm tra lại mã.')
      }
    }

    void doActivate()
    return () => { active = false }
  }, [tokenParam, emailParam, activateAccount, navigate])

  async function handleManualActivate(codeToVerify: string) {
    if (codeToVerify.length < 6 || loading) return
    if (!email.trim() || !isValidEmail(email.trim())) {
      setError('Vui lòng nhập địa chỉ email hợp lệ của bạn.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const user = await activateAccount(codeToVerify, email.trim())
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        navigate(authenticatedDestination(user), { replace: true })
      }, 1200)
    } catch (err) {
      setLoading(false)
      setError(err instanceof ApiClientError ? err.message : 'Mã xác thực không hợp lệ hoặc đã hết hạn.')
    }
  }

  async function handleResend() {
    if (!email.trim() || resending || countdown > 0) return
    if (!isValidEmail(email.trim())) {
      setError('Vui lòng nhập email hợp lệ.')
      return
    }
    setResending(true)
    setError(null)
    try {
      const res = await resendActivation(email.trim())
      setResendStatus(res.message || 'Đã gửi lại mã kích hoạt thành công!')
      setCountdown(45)
    } catch {
      setResendStatus('Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Kích hoạt tài khoản"
      subtitle="Nhập mã 6 chữ số để kích hoạt tài khoản NutriMom"
      panelVariant="login"
      showHomeLink
    >
      <div style={{ padding: '8px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <SpinnerGap size={32} className="spin" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
              Đang xác thực kích hoạt...
            </h3>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Vui lòng đợi giây lát trong khi chúng tôi chuẩn bị không gian cho bạn.
            </p>
          </div>
        )}

        {success && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 56,
              height: 56,
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
              Kích hoạt thành công!
            </h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 24 }}>
              Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng vào hệ thống...
            </p>
          </div>
        )}

        {!loading && !success && (
          <div>
            {error && (
              <div style={{ marginBottom: 16 }}>
                <StatusMessage tone="error">{error}</StatusMessage>
              </div>
            )}

            <FormField
              label="Địa chỉ Email của bạn"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Nhập email đã đăng ký"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              icon={<EnvelopeSimple size={20} />}
            />

            <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
              <p style={{ fontSize: 14, color: '#475569', margin: '0 0 12px' }}>
                Nhập mã xác thực 6 chữ số gửi về hộp thư:
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <OtpInput
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val)
                    setError(null)
                    if (val.length === 6) {
                      void handleManualActivate(val)
                    }
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              className={`primary-button${loading ? ' is-loading' : ''}`}
              type="button"
              onClick={() => void handleManualActivate(otpCode)}
              disabled={loading || otpCode.length < 6 || !email.trim()}
              style={{ width: '100%' }}
            >
              <span>{loading ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}</span>
              {!loading && <ArrowRight size={20} weight="bold" />}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
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
                  {resending ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại mã'}
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ fontSize: 13, color: '#64748b' }}>
                Quay lại trang Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
