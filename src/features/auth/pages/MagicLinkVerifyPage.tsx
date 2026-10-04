import { ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { authenticatedDestination, isAdminUser, isExpertUser } from '../model/role-routing'

export function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { verifyMagicLink } = useAuth()
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const executed = useRef(false)

  useEffect(() => {
    if (executed.current) return
    executed.current = true

    if (!token || !token.trim()) {
      setVerifying(false)
      setError('Liên kết xác thực không hợp lệ hoặc bị thiếu mã token.')
      return
    }

    async function handleVerify() {
      try {
        const user = await verifyMagicLink(token!.trim())
        setSuccess(true)
        setVerifying(false)
        setTimeout(() => {
          if (isAdminUser(user) || isExpertUser(user)) {
            navigate(authenticatedDestination(user), { replace: true })
          } else {
            navigate('/app', { replace: true })
          }
        }, 1200)
      } catch (err) {
        setVerifying(false)
        if (err instanceof ApiClientError) {
          setError(err.message || 'Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.')
        } else {
          setError('Không thể xác thực liên kết. Vui lòng thử lại.')
        }
      }
    }

    void handleVerify()
  }, [token, verifyMagicLink, navigate])

  return (
    <AuthLayout
      title="Xác thực đăng nhập"
      subtitle="Đang kiểm tra liên kết bảo mật của bạn..."
      showHomeLink
    >
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {verifying && (
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                border: '4px solid #f3e8ff',
                borderTopColor: '#7c3aed',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
              Đang xác thực liên kết...
            </h3>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Vui lòng đợi giây lát trong khi chúng tôi chuẩn bị không gian cho bạn.
            </p>
          </div>
        )}

        {success && (
          <div>
            <CheckCircle size={56} weight="fill" color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
              Đăng nhập thành công!
            </h3>
            <p style={{ fontSize: 14, color: '#047857' }}>
              Đang chuyển hướng bạn tới không gian NutriMom...
            </p>
          </div>
        )}

        {error && (
          <div>
            <WarningCircle size={56} weight="fill" color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <StatusMessage tone="error">{error}</StatusMessage>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 16, marginBottom: 24 }}>
              Liên kết có thể đã được sử dụng hoặc đã quá thời hạn 15 phút.
            </p>
            <Link
              to="/login"
              className="primary-button"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <span>Yêu cầu liên kết mới</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
