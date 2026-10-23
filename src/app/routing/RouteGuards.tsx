import type { PropsWithChildren, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { OnboardingStatus } from '@/features/user/model/user-types'
import { authenticatedDestination, isAdminUser, isExpertUser } from '@/features/auth/model/role-routing'
import { AuthLoginTransition } from '@/shared/layouts/AuthLoginTransition'
import { peekReturnPath } from '@/features/community/model/community-return-path'

function PageSkeleton() {
  return <main className="page-skeleton" aria-label="Đang kiểm tra phiên đăng nhập"><div className="skeleton-brand" /><div className="skeleton-panel"><div /><div /><div /></div></main>
}

function destination(status?: OnboardingStatus) {
  if (status === 'PROFILE_REQUIRED') return '/onboarding/profile'
  // Khách bấm Đăng nhập/Đăng ký từ trang Cộng đồng: hồ sơ xong thì quay lại đó.
  return peekReturnPath() ?? '/app'
}

function ProfileUnavailable() {
  const { profileError, reloadProfile } = useAuth()
  return <main className="page-skeleton"><section className="skeleton-panel"><h1>Chưa thể tải hồ sơ</h1><p>{profileError}</p><button type="button" onClick={() => void reloadProfile().catch(() => undefined)}>Tải lại</button></section></main>
}

function LoginRequired() {
  const { logoutRedirect } = useAuth()
  const location = useLocation()
  if (location.key === logoutRedirect?.locationKey) return <Navigate to={logoutRedirect.to} replace state={null} />
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}

export function GuestOnly({ children, animateExit = false }: PropsWithChildren<{ animateExit?: boolean }>) {
  const { status, user, profile } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (animateExit) {
    const requestedPath = (location.state as { from?: unknown } | null)?.from
    const deniedWorkspace = !isAdminUser(user) && !isExpertUser(user)
      && typeof requestedPath === 'string' && (requestedPath.startsWith('/admin') || requestedPath.startsWith('/expert'))
    return (
      <AuthLoginTransition
        authenticated={status === 'authenticated'}
        to={authenticatedDestination(user, profile?.onboarding_status, requestedPath)}
        state={deniedWorkspace ? { authorizationError: 'Bạn không có quyền truy cập khu vực này.' } : undefined}
      >
        {children}
      </AuthLoginTransition>
    )
  }
  if (status === 'authenticated') return <Navigate to={authenticatedDestination(user, profile?.onboarding_status, (location.state as { from?: unknown } | null)?.from)} replace />
  return children
}

export function AdminOnly({ children }: PropsWithChildren) {
  const { status, user, profile } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <LoginRequired />
  if (!isAdminUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  return children
}

export function ExpertOnly({ children }: PropsWithChildren) {
  const { status, user, profile } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <LoginRequired />
  if (!isExpertUser(user) || isAdminUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  return children
}

export function ProtectedRoute({ children, publicLoadingFallback }: PropsWithChildren<{ publicLoadingFallback?: ReactNode }>) {
  const { status, profile, profileError, user } = useAuth()
  if (status === 'loading') return publicLoadingFallback ?? <PageSkeleton />
  if (status === 'anonymous') return <LoginRequired />
  if (isAdminUser(user) || isExpertUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  if (!profile) return profileError ? <ProfileUnavailable /> : <PageSkeleton />
  if (profile.onboarding_status === 'PROFILE_REQUIRED') return <Navigate to="/onboarding/profile" replace />
  return children
}

export function OnboardingRoute({ children, step }: PropsWithChildren<{ step: 'PROFILE_REQUIRED' | 'CONTEXT_REQUIRED' }>) {
  const { status, profile, profileError, user } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <LoginRequired />
  if (isAdminUser(user) || isExpertUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  if (!profile) return profileError ? <ProfileUnavailable /> : <PageSkeleton />
  if (step === 'CONTEXT_REQUIRED') return profile.onboarding_status === 'CONTEXT_REQUIRED' ? children : <Navigate to={destination(profile.onboarding_status)} replace />
  if (profile.onboarding_status !== step) return <Navigate to={destination(profile.onboarding_status)} replace />
  return children
}
