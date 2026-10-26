import { motion, useReducedMotion } from 'motion/react'
import { adminLabel } from '../model/admin-workspace-query'
import type { AppointmentDto, PaymentOrderDto, SubscriptionDto, UserCohortDto } from '../model/admin-workspace-contract'
import { StatusBadge } from './AdminUI'
import { dateTime, money } from '../model/admin-workspace-formatters'

export function AppointmentTable({ items, onView }: { items: AppointmentDto[]; onView: (id: string) => void }) {
  return <div className="admin-table-scroll"><table className="admin-table admin-operational-table"><thead><tr><th>Người dùng / Chuyên gia</th><th>Lịch (giờ Việt Nam)</th><th>Chuyên khoa</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
    <td><strong>{item.user_display_name || 'Chưa có tên'}</strong><small className="admin-cell-note">{item.expert_name || 'Chưa có chuyên gia'}</small></td>
    <td>{item.slot ? <>{item.slot.slot_date}<small className="admin-cell-note">{item.slot.start_time.slice(0,5)} – {item.slot.end_time.slice(0,5)}</small></> : 'Chưa có lịch'}</td>
    <td>{adminLabel(item.specialty)}</td><td><StatusBadge value={item.status} />{item.attention_reason === 'PAST_END_UNCOMPLETED' && <small className="admin-cell-note admin-warning">Quá giờ, chưa hoàn tất</small>}{item.attention_reason==='ACCEPTANCE_OVERDUE'&&<small className="admin-cell-note admin-warning">Quá hạn tiếp nhận</small>}{item.acceptance_deadline_at&&<small className="admin-cell-note">Hạn nhận: {dateTime(item.acceptance_deadline_at)}</small>}{item.waiting_hours != null && <small className="admin-cell-note">Đã chờ {item.waiting_hours.toFixed(1)} giờ</small>}</td>
    <td><button type="button" className="admin-button secondary compact" onClick={() => onView(item.id)}>Xem</button></td>
  </tr>)}</tbody></table></div>
}
export function PaymentsTable({ items, onView, animationKey = '' }: { items: PaymentOrderDto[]; onView: (code: string) => void; animationKey?: string }) {
  const reduce = useReducedMotion()
  return <div className="admin-table-scroll"><table className="admin-table admin-operational-table"><thead><tr><th>Mã đơn / Người mua</th><th>Gói / Tiền thu</th><th>Trạng thái</th><th>Thanh toán lúc</th><th>Chi tiết</th></tr></thead><tbody key={animationKey}>{items.map((item, index) => <motion.tr key={item.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, delay: reduce ? 0 : Math.min(index, 8) * .035 }}>
    <td><strong>{item.order_code}</strong><small className="admin-cell-note">{item.user_display_name || 'Chưa có tên'}</small></td><td>{item.plan_name}<small className="admin-cell-note">{money(item.amount)}</small></td><td><StatusBadge value={item.status} />{item.status === 'PAID' && !item.paid_at && <small className="admin-cell-note admin-warning">Thiếu thời điểm thanh toán; không tính tiền theo kỳ</small>}</td><td>{item.paid_at ? dateTime(item.paid_at) : '—'}</td><td><button type="button" className="admin-button compact secondary" onClick={() => onView(item.order_code)}>Xem</button></td>
  </motion.tr>)}</tbody></table></div>
}
export function SubscriptionsTable({ items, animationKey = '' }: { items: SubscriptionDto[]; animationKey?: string }) {
  const reduce = useReducedMotion()
  return <div className="admin-table-scroll"><table className="admin-table admin-operational-table"><thead><tr><th>Người dùng</th><th>Gói</th><th>Hiệu lực</th><th>Bắt đầu</th><th>Kết thúc</th><th>Còn lại</th></tr></thead><tbody key={animationKey}>{items.map((item, index) => <motion.tr key={item.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, delay: reduce ? 0 : Math.min(index, 8) * .035 }}><td>{item.user_display_name || item.user_id}</td><td>{adminLabel(item.plan_tier)}</td><td><StatusBadge value={item.effective_status} /></td><td>{dateTime(item.start_date)}</td><td>{dateTime(item.end_date)}</td><td>{item.days_remaining} ngày</td></motion.tr>)}</tbody></table></div>
}
export function UserCohortTable({ items }: { items: UserCohortDto[] }) {
  return <div className="admin-table-scroll"><table className="admin-table admin-operational-table"><thead><tr><th>Người dùng</th><th>Ngày đăng ký</th><th>Tài khoản</th><th>Gói đang sử dụng</th><th>Hết hạn</th></tr></thead><tbody>{items.map((item) => <tr key={item.user_id}><td>{item.display_name || item.user_id}</td><td>{dateTime(item.created_at)}</td><td><StatusBadge value={item.account_status} /></td><td>{adminLabel(item.current_plan_tier)}</td><td>{item.subscription_end_date ? dateTime(item.subscription_end_date) : '—'}</td></tr>)}</tbody></table></div>
}
