import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function PageSkeleton() {
  return (
    <main className="page-skeleton" aria-label="Đang kiểm tra phiên đăng nhập">
      <div className="skeleton-brand" />
      <div className="skeleton-panel">
        <div />
        <div />
        <div />
      </div>
    </main>
  )
}

export function GuestOnly({ children }: PropsWithChildren) {
  const { status } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'authenticated') return <Navigate to="/app" replace />
  return children
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
