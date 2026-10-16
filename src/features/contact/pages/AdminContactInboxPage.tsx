import { CaretRight } from '@phosphor-icons/react'
import { AdminDropdown } from '@/features/admin/components/AdminDropdown'
import { Link } from 'react-router-dom'
import { TableCard } from '@/features/admin/components/AdminUI'
import { useAdminFilters } from '@/features/admin/hooks/useAdminFilters'
import { useAdminResource } from '@/features/admin/hooks/useAdminResource'
import { DataState, QueryErrors, SearchFilter, WorkspacePagination } from '@/features/admin/components/AdminWorkspaceUI'
import { mapAdminPage } from '@/features/admin/model/admin-workspace-contract'
import { ContactStatusBadge } from '../components/ContactStatusBadge'
import type { AdminContactSummaryDto } from '../model/contact-dto'
import { contactEndpoints } from '../model/contact-endpoints'
import { formatVietnamDateTime } from '../model/contact-format'
import { contactTopicLabel, contactTopicOptions, contactStatusOptions } from '../model/contact-labels'
import '../styles/contact-admin.css'
const mapInbox = (p:unknown) => mapAdminPage(p,(item) => item as AdminContactSummaryDto)
export function AdminContactInboxPage() {
  const f = useAdminFilters('support')
  const list = useAdminResource(f.valid ? `${contactEndpoints.adminRequests}?${f.queryString}` : null,mapInbox)
  return <div className="admin-page admin-contact-page"><h1 className="sr-only">Hộp thư hỗ trợ</h1>
    <section className="admin-card"><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminDropdown label="Trạng thái" name="status" value={f.query.get('status') || ''} onChange={(status) => f.commit({ status })} options={[{ value: '', label: 'Tất cả' }, ...contactStatusOptions]} /><AdminDropdown label="Chủ đề" name="topic" value={f.query.get('topic') || ''} onChange={(topic) => f.commit({ topic })} options={[{ value: '', label: 'Tất cả' }, ...contactTopicOptions]} /></div><QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} /></section>
    <TableCard title="Yêu cầu hỗ trợ" description="Mới nhất trước."><DataState loading={list.loading} error={list.error} empty={!list.data?.items.length} retry={list.retry}>
      <div className="admin-table-scroll"><table className="admin-table admin-contact-table"><thead><tr><th>Thời gian gửi</th><th>Người gửi</th><th>Số điện thoại</th><th>Chủ đề</th><th>Nội dung</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{list.data?.items.map((request) => <tr key={request.id}><td>{formatVietnamDateTime(request.created_at)}</td><td><strong>{request.user_display_name}</strong></td><td>{request.user_phone}</td><td>{contactTopicLabel(request.topic)}</td><td><span className="admin-contact-preview">{request.message_preview}</span></td><td><ContactStatusBadge value={request.status} variant="admin" /></td><td><Link className="admin-row-action" to={`/admin/support/${request.id}`} state={{ inboxSearch:f.params.toString() }} aria-label={`Xem yêu cầu của ${request.user_display_name}`}><CaretRight size={17} /></Link></td></tr>)}</tbody></table></div>
    </DataState>{f.valid && <WorkspacePagination data={list.data} page={f.page} pageSize={f.pageSize} busy={list.loading} commit={f.commit} />}</TableCard>
  </div>
}
