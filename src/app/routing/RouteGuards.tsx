import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

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
  const { status, user } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'authenticated') return <Navigate to={user?.roles.includes('ADMIN') ? '/admin' : '/app'} replace />
  return children
}

export function AdminOnly({ children }: PropsWithChildren) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (!user?.roles.includes('ADMIN')) {
    return <Navigate to="/app" replace state={{ authorizationError: 'You are not authorized as admin' }} />
  }
  return children
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  return children
}
