import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapAppointment, mapPayment, AdminContractError } from '../model/admin-workspace-contract'
import { adminLabel } from '../model/admin-workspace-query'
import { DataState } from './AdminWorkspaceUI'
import { dateTime, money } from '../model/admin-workspace-formatters'
import { StatusBadge } from './AdminUI'

export function AppointmentDrawer({ id, completedOnly = false, onClose }: { id: string; completedOnly?: boolean; onClose: () => void }) {
  const resource = useAdminResource(`/admin/appointments/${encodeURIComponent(id)}`, (p) => { const item = mapAppointment(p); if (completedOnly && item.status !== 'COMPLETED') throw new AdminContractError('detail.status.COMPLETED'); if (!item.updated_at) throw new AdminContractError('detail.updated_at'); return item })
  const item = resource.data
  return <AccessibleDialog open title={completedOnly ? 'Chi tiết tư vấn đã hoàn tất' : 'Chi tiết lịch tư vấn'} description="Thông tin vận hành · chỉ xem" className="admin-operational-dialog" onClose={onClose}><DataState loading={resource.loading} error={resource.error} empty={!item} retry={resource.retry}>{item && <dl className="admin-operational-detail">
    <dt>Người dùng</dt><dd>{item.user_display_name || 'Chưa có tên'}</dd><dt>Chuyên gia</dt><dd>{item.expert_name || 'Chưa được tiếp nhận'}</dd><dt>Chuyên khoa</dt><dd>{adminLabel(item.specialty)}</dd><dt>Phân công</dt><dd>{adminLabel(item.assignment_type)}</dd>
    <dt>Trạng thái</dt><dd><StatusBadge value={item.status} />{item.attention_reason==='ACCEPTANCE_OVERDUE'&&<p className="admin-warning">Quá hạn tiếp nhận</p>}{item.attention_reason === 'PAST_END_UNCOMPLETED' && <p className="admin-warning">Quá giờ, chưa hoàn tất</p>}</dd>
    <dt>Lịch (giờ Việt Nam)</dt><dd>{item.slot ? `${item.slot.slot_date} · ${item.slot.start_time} – ${item.slot.end_time}` : 'Chưa có lịch'}</dd><dt>Ngày tạo</dt><dd>{dateTime(item.created_at)}</dd><dt>Cập nhật</dt><dd>{dateTime(item.updated_at!)}</dd><dt>Hoàn tất</dt><dd>{item.completed_at ? dateTime(item.completed_at) : '—'}</dd>
    {item.preferred_date&&<><dt>Ngày mong muốn</dt><dd>{item.preferred_date}</dd></>}
    {item.acceptance_deadline_at&&<><dt>Hạn tiếp nhận</dt><dd>{dateTime(item.acceptance_deadline_at)}</dd></>}
    {item.accepted_at&&<><dt>Đã nhận lúc</dt><dd>{dateTime(item.accepted_at)}</dd></>}
    {item.waiting_hours != null && <><dt>Thời gian chờ</dt><dd>{item.waiting_hours.toFixed(1)} giờ</dd></>}
    <dt>Đánh giá</dt><dd>{item.review ? `${item.review.rating}/5 · ${item.review.comment || 'Không có nhận xét'}` : 'Chưa có đánh giá'}</dd><dt>Mã yêu cầu</dt><dd>{item.id}</dd>
  </dl>}</DataState></AccessibleDialog>
}
export function PaymentDrawer({ code, onClose }: { code: string; onClose: () => void }) {
  const resource = useAdminResource(`/admin/payment-orders/${encodeURIComponent(code)}`, (p) => { const item = mapPayment(p); if (!item.updated_at) throw new AdminContractError('payment.updated_at'); return item })
  const item = resource.data
  return <AccessibleDialog open title="Chi tiết đơn thanh toán" description="Thông tin đơn · chỉ xem" className="admin-operational-dialog" onClose={onClose}><DataState loading={resource.loading} error={resource.error} empty={!item} retry={resource.retry}>{item && <>
    {(item.status === 'PAID' && !item.paid_at) && <p className="admin-query-error">Dữ liệu thanh toán cần kiểm tra. Thiếu thời điểm ghi nhận nên chưa tính vào doanh thu theo kỳ.</p>}
    <dl className="admin-operational-detail"><dt>Mã đơn</dt><dd>{item.order_code}</dd><dt>Người mua</dt><dd>{item.user_display_name || 'Chưa có tên'}</dd><dt>Gói</dt><dd>{item.plan_name}</dd><dt>Số tiền</dt><dd>{money(item.amount)}</dd><dt>Trạng thái</dt><dd><StatusBadge value={item.status} /></dd><dt>Ngày tạo</dt><dd>{dateTime(item.created_at)}</dd><dt>Thanh toán</dt><dd>{item.paid_at ? dateTime(item.paid_at) : 'Chưa có thời điểm thanh toán'}</dd><dt>Cập nhật</dt><dd>{dateTime(item.updated_at!)}</dd><dt>Mô tả</dt><dd>{item.description || '—'}</dd></dl>
  </>}</DataState></AccessibleDialog>
}
