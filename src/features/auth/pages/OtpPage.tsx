import { ArrowLeft, ArrowRight, Phone, User } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { FormField } from '@/shared/components/FormField'
import { OtpInput } from '@/shared/components/OtpInput'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getDeviceId } from '@/core/auth/device'
import type { OtpChallenge, OtpPurpose } from '@/features/auth/model/auth-types'

export function OtpPage() {
  const [searchParams] = useSearchParams()
  const isRegister = searchParams.get('mode') === 'register'
  const purpose: OtpPurpose = isRegister ? 'REGISTER' : 'LOGIN'
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function sendOtp() {
    setError('')
    setMessage('')

    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại nhận OTP.')
      return
    }
    if (isRegister && !displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị.')
      return
    }
    if (isRegister && !accepted) {
      setError('Bạn cần đồng ý với điều khoản trước khi đăng ký.')
      return
    }

    setSubmitting(true)
    try {
      const response = await requestOtp({
        phone: phone.trim(),
        purpose,
        acceptedTerms: isRegister ? accepted : undefined,
        deviceId: getDeviceId(),
      })
      setChallenge(response)
      setCooldown(response.resendAfter)
      setCode('')
      setMessage(`Mã OTP đã được gửi tới ${response.maskedPhone}.`)
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.message
        : 'Không thể gửi mã OTP. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendOtp()
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!challenge || code.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP.')
      return
    }

    setSubmitting(true)
    try {
      await verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: getDeviceId(),
        displayName: isRegister ? displayName.trim() : undefined,
      })
      navigate('/app', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiClientError
        ? requestError.message
        : 'Mã OTP chưa được xác minh. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = challenge
    ? 'Nhập mã xác minh'
    : isRegister ? 'Đăng ký bằng OTP' : 'Đăng nhập bằng OTP'

  return (
    <AuthLayout
      title={title}
      subtitle={challenge
        ? 'Mã gồm 6 chữ số và chỉ sử dụng được một lần.'
        : 'Nhận mã xác minh động từ backend NutriMom.'}
      footer={<p>Muốn dùng mật khẩu? <Link to="/login">Về trang đăng nhập</Link></p>}
      panelVariant={isRegister ? 'register' : 'login'}
    >
      {!challenge ? (
        <form className="auth-form" onSubmit={handleRequest} noValidate>
          {error && <StatusMessage tone="error">{error}</StatusMessage>}

          {isRegister && (
            <FormField
              label="Tên hiển thị"
              name="displayName"
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn An"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              icon={<User size={20} />}
              disabled={submitting}
            />
          )}

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

          {isRegister && (
            <label className="check-row">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>Tôi đồng ý với điều khoản sử dụng và chính sách riêng tư.</span>
            </label>
          )}

          <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
            <span>{submitting ? 'Đang gửi mã...' : 'Gửi mã OTP'}</span>
            {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
          </button>

          {isRegister && <Link className="text-link centered-link" to="/register">Đăng ký bằng mật khẩu</Link>}
        </form>
      ) : (
        <form className="auth-form otp-form" onSubmit={handleVerify} noValidate>
          {message && <StatusMessage tone="success">{message}</StatusMessage>}
          {error && <StatusMessage tone="error">{error}</StatusMessage>}

          <OtpInput value={code} onChange={setCode} disabled={submitting} />

          {challenge.debugCode && import.meta.env.DEV && (
            <div className="debug-code">
              <div>
                <span>Mã thử từ backend</span>
                <strong>{challenge.debugCode}</strong>
              </div>
              <button type="button" onClick={() => setCode(challenge.debugCode || '')}>Điền mã</button>
            </div>
          )}

          <button className={`primary-button${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting || code.length !== 6}>
            <span>{submitting ? 'Đang xác minh...' : 'Xác minh và tiếp tục'}</span>
            {!submitting && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
          </button>

          <div className="otp-actions">
            <button
              className="text-button"
              type="button"
              onClick={() => { setChallenge(null); setError(''); setMessage('') }}
              disabled={submitting}
            >
              <ArrowLeft size={17} />
              Đổi số điện thoại
            </button>
            <button className="text-button" type="button" onClick={() => void sendOtp()} disabled={submitting || cooldown > 0}>
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
