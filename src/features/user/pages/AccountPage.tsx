import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  IdentificationCard,
  Phone,
  ShieldCheck,
  SignOut,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function AccountPage() {
  const { user, refresh, logout } = useAuth()
  const [message, setMessage] = useState('')
  const [busyAction, setBusyAction] = useState<'refresh' | 'logout' | null>(null)
  const navigate = useNavigate()

  if (!user) return null

  async function handleRefresh() {
    setMessage('')
    setBusyAction('refresh')
    try {
      await refresh()
      setMessage('Phiên đăng nhập đã được làm mới an toàn.')
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Không thể làm mới phiên.')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLogout() {
    setBusyAction('logout')
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <main className="account-page">
      <header className="account-nav">
        <div className="account-nav-inner">
          <div className="brand-lockup compact">
            <img src="/nutrimom-logo.png" width="42" height="42" alt="" />
            <span>NutriMom</span>
          </div>
          <div className="nav-actions">
            <ThemeToggle />
            <button className="nav-logout" type="button" onClick={() => void handleLogout()} disabled={Boolean(busyAction)}>
              <SignOut size={19} />
              <span>{busyAction === 'logout' ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>
      </header>

      <section className="account-content">
        <div className="welcome-block">
          <div className="profile-mark" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</div>
          <div>
            <p className="welcome-kicker">Tài khoản của bạn</p>
            <h1>Xin chào, {user.displayName}</h1>
            <p>Backend đã xác thực phiên và trả về hồ sơ người dùng hiện tại.</p>
          </div>
        </div>

        <div className="account-grid">
          <section className="profile-section" aria-labelledby="profile-title">
            <div className="section-title-row">
              <div>
                <h2 id="profile-title">Thông tin tài khoản</h2>
                <p>Dữ liệu lấy trực tiếp từ endpoint <code>/auth/me</code>.</p>
              </div>
              <IdentificationCard size={28} aria-hidden="true" />
            </div>

            <dl className="profile-details">
              <div>
                <dt><Phone size={19} /> Số điện thoại</dt>
                <dd>{user.phone}</dd>
              </div>
              <div>
                <dt><ShieldCheck size={19} /> Trạng thái</dt>
                <dd className="status-value"><span className="semantic-dot" />{user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status}</dd>
              </div>
              <div>
                <dt><CalendarBlank size={19} /> Ngày tạo</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt><CheckCircle size={19} /> Quyền truy cập</dt>
                <dd className="role-list">{user.roles.map((role) => <span key={role}>{role}</span>)}</dd>
              </div>
            </dl>
          </section>

          <aside className="session-section" aria-labelledby="session-title">
            <ShieldCheck size={34} weight="duotone" aria-hidden="true" />
            <h2 id="session-title">Phiên đăng nhập an toàn</h2>
            <p>Access token được giữ trong phiên trình duyệt. Refresh token được xoay vòng khi hết hạn.</p>
            {message && <div className="session-message" role="status">{message}</div>}
            <button className="secondary-button" type="button" onClick={() => void handleRefresh()} disabled={Boolean(busyAction)}>
              <ArrowsClockwise size={20} className={busyAction === 'refresh' ? 'spin' : ''} />
              {busyAction === 'refresh' ? 'Đang làm mới...' : 'Làm mới phiên'}
            </button>
          </aside>
        </div>
      </section>
    </main>
  )
}
