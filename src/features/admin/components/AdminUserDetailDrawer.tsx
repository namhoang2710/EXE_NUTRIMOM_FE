import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapAdminUserDetail, type AdminUserDetailDto } from '../model/admin-users-mappers'
import { DataState } from './AdminWorkspaceUI'
import { dateTime } from '../model/admin-workspace-formatters'
import { adminLabel } from '../model/admin-workspace-query'
import { StatusBadge } from './AdminUI'
const mapDetail = (p: unknown) => mapAdminUserDetail(p as AdminUserDetailDto)
export function AdminUserDetailDrawer({ userId, onClose }: { userId:string; onClose:() => void }) {
  const resource = useAdminResource(`/admin/users/${encodeURIComponent(userId)}`,mapDetail)
  const item = resource.data
  return <AccessibleDialog open title="Chi tiết người dùng" className="admin-operational-dialog" onClose={onClose}><DataState loading={resource.loading} error={resource.error} empty={!item} retry={resource.retry}>{item && <dl className="admin-operational-detail">
    <dt>Tên hiển thị</dt><dd>{item.displayName || 'Chưa có tên'}</dd><dt>Số điện thoại</dt><dd>{item.phone || '—'}</dd><dt>Email</dt><dd>{item.email || '—'}</dd><dt>Giới tính</dt><dd>{item.gender ? adminLabel(item.gender) : '—'}</dd><dt>Ngày sinh</dt><dd>{item.dateOfBirth || '—'}</dd><dt>Vai trò</dt><dd>{item.roles.map(adminLabel).join(', ')}</dd><dt>Trạng thái</dt><dd><StatusBadge value={item.status} /></dd><dt>Hồ sơ</dt><dd><StatusBadge value={item.onboardingStatus} /></dd><dt>Đồng ý điều khoản</dt><dd>{item.termsAcceptedAt ? dateTime(item.termsAcceptedAt) : '—'}</dd><dt>Đồng ý quyền riêng tư</dt><dd>{item.privacyAcceptedAt ? dateTime(item.privacyAcceptedAt) : '—'}</dd><dt>Ngày tạo</dt><dd>{dateTime(item.createdAt)}</dd><dt>Cập nhật</dt><dd>{dateTime(item.updatedAt)}</dd><dt>Phiên bản</dt><dd>{item.version}</dd><dt>Mã người dùng</dt><dd>{item.id}</dd>
  </dl>}</DataState></AccessibleDialog>
}
