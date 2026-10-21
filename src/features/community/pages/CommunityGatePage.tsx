import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdminUser, isExpertUser } from '@/features/auth/model/role-routing'
import { CommunityLockedView } from '../components/CommunityLockedView'
import { PostCardSkeleton } from '../components/PostCardSkeleton'
import { safeCommunityPath } from '../model/community-return-path'
import '../styles/community.css'

/**
 * `/community` công khai: khách thấy màn khoá mờ; người đã đăng nhập được chuyển vào feed thật.
 * Dữ liệu cộng đồng vẫn chỉ đọc được qua API có xác thực — trang này không gọi API nào.
 */
export function CommunityGatePage() {
  const { status, user } = useAuth()
  const location = useLocation()
  const target = safeCommunityPath(`/app/community${location.search}`)
  if (status === 'loading') return <main className="nm-community-page" aria-busy="true"><PostCardSkeleton /></main>
  if (status === 'authenticated') {
    if (isAdminUser(user)) return <Navigate to="/admin/community" replace />
    if (isExpertUser(user)) return <Navigate to="/expert" replace />
    return <Navigate to={target} replace />
  }
  return <main className="nm-community-page is-gate"><CommunityLockedView returnTo={target} /></main>
}
