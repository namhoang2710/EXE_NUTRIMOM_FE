import { Check, Checks, Eye, PencilSimple, PushPin, Trash, X } from '@phosphor-icons/react'
import { canEditAdminPost } from '../model/admin-community'
import type { AdminPostItem } from '../model/community-types'

export type ModerationAction = 'approve' | 'approvePin' | 'reject' | 'pin' | 'unpin' | 'remove' | 'deleteOwn'
export function AdminPostActions({ item, userId, busy, onAction, onDetail, onEdit }: {
  item: AdminPostItem; userId: string; busy: boolean
  onAction: (item: AdminPostItem, action: ModerationAction) => void
  onDetail?: (item: AdminPostItem) => void; onEdit: (item: AdminPostItem) => void
}) {
  const { post, deleted_at: deleted } = item
  const active = !deleted && post.status !== 'REMOVED'
  return <div className="nm-admin-community-actions" aria-label="Công cụ quản trị bài viết">
    {onDetail && <button type="button" onClick={() => onDetail(item)}><Eye size={16} />Chi tiết</button>}
    {active && post.status === 'PENDING' && <>
      <button type="button" className="is-primary" disabled={busy} onClick={() => onAction(item, 'approve')}><Check size={16} />Duyệt</button>
      <button type="button" disabled={busy} onClick={() => onAction(item, 'approvePin')}><Checks size={16} />Duyệt & ghim</button>
      <button type="button" disabled={busy} onClick={() => onAction(item, 'reject')}><X size={16} />Từ chối</button>
    </>}
    {active && post.status === 'REJECTED' && <button type="button" className="is-primary" disabled={busy} onClick={() => onAction(item, 'approve')}><Check size={16} />Duyệt lại</button>}
    {active && (post.status === 'APPROVED' || post.pinned) && <button type="button" disabled={busy} onClick={() => onAction(item, post.pinned ? 'unpin' : 'pin')}><PushPin size={16} />{post.pinned ? 'Bỏ ghim' : 'Ghim'}</button>}
    {canEditAdminPost(item, userId) && <button type="button" disabled={busy} onClick={() => onEdit(item)}><PencilSimple size={16} />Sửa bài của tôi</button>}
    {canEditAdminPost(item, userId) && <button type="button" className="is-danger" disabled={busy} onClick={() => onAction(item, 'deleteOwn')}>Xóa bài của tôi</button>}
    {active && <button type="button" className="is-danger" disabled={busy} onClick={() => onAction(item, 'remove')}><Trash size={16} />Gỡ bài</button>}
  </div>
}
