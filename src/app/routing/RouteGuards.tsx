import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { OnboardingStatus } from '@/features/user/model/user-types'
import { authenticatedDestination, isAdminUser, isExpertUser } from '@/features/auth/model/role-routing'

function PageSkeleton() {
  return <main className="page-skeleton" aria-label="Đang kiểm tra phiên đăng nhập"><div className="skeleton-brand" /><div className="skeleton-panel"><div /><div /><div /></div></main>
}

function destination(status?: OnboardingStatus) {
  if (status === 'PROFILE_REQUIRED') return '/onboarding/profile'
  return '/app'
}

function ProfileUnavailable() {
  const { profileError, reloadProfile } = useAuth()
  return <main className="page-skeleton"><section className="skeleton-panel"><h1>Chưa thể tải hồ sơ</h1><p>{profileError}</p><button type="button" onClick={() => void reloadProfile().catch(() => undefined)}>Tải lại</button></section></main>
}

export function GuestOnly({ children }: PropsWithChildren) {
  const { status, user, profile } = useAuth()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'authenticated') return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  return children
}

export function AdminOnly({ children }: PropsWithChildren) {
  const { status, user, profile } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdminUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  return children
}

export function ExpertOnly({ children }: PropsWithChildren) {
  const { status, user, profile } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!isExpertUser(user) || isAdminUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  return children
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status, profile, profileError, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  if (isAdminUser(user) || isExpertUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  if (!profile) return profileError ? <ProfileUnavailable /> : <PageSkeleton />
  if (profile.onboarding_status === 'PROFILE_REQUIRED') return <Navigate to="/onboarding/profile" replace />
  return children
}

export function OnboardingRoute({ children, step }: PropsWithChildren<{ step: 'PROFILE_REQUIRED' | 'CONTEXT_REQUIRED' }>) {
  const { status, profile, profileError, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (isAdminUser(user) || isExpertUser(user)) return <Navigate to={authenticatedDestination(user, profile?.onboarding_status)} replace />
  if (!profile) return profileError ? <ProfileUnavailable /> : <PageSkeleton />
  if (step === 'CONTEXT_REQUIRED') return profile.onboarding_status === 'CONTEXT_REQUIRED' ? children : <Navigate to={destination(profile.onboarding_status)} replace />
  if (profile.onboarding_status !== step) return <Navigate to={destination(profile.onboarding_status)} replace />
  return children
}
