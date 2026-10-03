import { ArrowRight, CheckCircle, WarningCircle, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { authenticatedDestination } from '../model/role-routing'

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { activateAccount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setError('Liên kết kích hoạt không hợp lệ hoặc thiếu mã xác thực.')
      setLoading(false)
      return
    }

    let active = true
    async function doActivate() {
      try {
        const user = await activateAccount(token!)
        if (!active) return
        setSuccess(true)
        setLoading(false)
        setTimeout(() => {
          navigate(authenticatedDestination(user), { replace: true })
        }, 1500)
      } catch (err) {
        if (!active) return
        setLoading(false)
        setError(err instanceof ApiClientError ? err.message : 'Kích hoạt tài khoản thất bại. Vui lòng thử lại.')
      }
    }

    void doActivate()
    return () => { active = false }
  }, [token, activateAccount, navigate])

  return (
    <AuthLayout
      title="Kích hoạt tài khoản"
      subtitle="Xác thực email để truy cập ứng dụng NutriMom"
      panelVariant="login"
      showHomeLink
    >
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {loading && (
          <div>
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
              Đang xác thực liên kết...
            </h3>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Vui lòng đợi trong giây lát, hệ thống đang kích hoạt tài khoản của bạn.
            </p>
          </div>
        )}

        {success && (
          <div>
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
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/app', { replace: true })}
              style={{ width: '100%' }}
            >
              <span>Vào ứng dụng ngay</span>
              <ArrowRight size={20} weight="bold" />
            </button>
          </div>
        )}

        {error && (
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <WarningCircle size={36} weight="fill" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Không thể kích hoạt tài khoản
            </h3>
            <div style={{ marginBottom: 24 }}>
              <StatusMessage tone="error">{error}</StatusMessage>
            </div>
            <Link
              to="/login"
              className="primary-button"
              style={{ width: '100%', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              <span>Về trang Đăng nhập</span>
              <ArrowRight size={20} weight="bold" />
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
