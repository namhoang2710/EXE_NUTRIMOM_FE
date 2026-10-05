import { ArrowClockwise, CalendarBlank, CaretLeft, CaretRight, ChatText, Clock, Star, UserCircle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { VideoRoomLink } from '@/features/consultation-video/components/VideoRoomLink'
import { canCancelConsultation, canReviewConsultation, formatConsultationDate, formatConsultationDateTime, formatConsultationTime } from '../model/consultation-formatters'
import type { ConsultationPage, ConsultationRequest } from '../model/consultation-types'
import { consultationAssignmentLabels, consultationSpecialtyLabels, consultationStatusLabels } from '../model/consultation-types'

export function ConsultationCard({ item, highlighted = false, index = 0, onCancel, onReview }: { item: ConsultationRequest; highlighted?: boolean; index?: number; onCancel?: (item: ConsultationRequest) => void; onReview?: (item: ConsultationRequest) => void }) {
  const reduceMotion = useReducedMotion()
  return <motion.article className={`consultation-card status-${item.status.toLowerCase()}${highlighted ? ' is-highlighted' : ''}`} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.25) }}>
    <div className="consultation-card__top"><div className="consultation-card__identity"><span className="consultation-card__avatar" aria-hidden="true"><UserCircle size={26} weight="duotone" /></span><div><h3>{item.expertName || 'Đang chờ chuyên gia'}</h3><p>{consultationSpecialtyLabels[item.specialty]}</p></div></div><span className="consultation-status"><span aria-hidden="true" />{consultationStatusLabels[item.status]}</span></div>
    <dl className="consultation-card__facts">
      <div><dt><CalendarBlank size={17} aria-hidden="true" />Lịch tư vấn</dt><dd>{item.slot ? formatConsultationDate(item.slot.date) : 'Đang chờ xếp lịch'}</dd></div>
      <div><dt><Clock size={17} aria-hidden="true" />Thời gian</dt><dd>{item.slot ? `${formatConsultationTime(item.slot.startTime)} - ${formatConsultationTime(item.slot.endTime)}` : 'Chưa xác định'}</dd></div>
      <div><dt><ChatText size={17} aria-hidden="true" />Loại yêu cầu</dt><dd>{consultationAssignmentLabels[item.assignmentType]}</dd></div>
    </dl>
    {item.note && <div className="consultation-card__note"><span>Ghi chú</span><p>{item.note}</p></div>}
    <div className="consultation-card__footer"><p>Tạo lúc {formatConsultationDateTime(item.createdAt)}</p><div className="consultation-card__actions">
      {item.reviewed && <span className="consultation-reviewed"><Star size={16} weight="fill" aria-hidden="true" />Đã đánh giá</span>}
      {item.status === 'PENDING_CONSULTATION' && item.slot && <VideoRoomLink id={item.id} />}
      {onCancel && canCancelConsultation(item) && <button type="button" className="consultation-text-button is-danger" onClick={() => onCancel(item)}>Hủy lịch</button>}
      {onReview && canReviewConsultation(item) && <button type="button" className="consultation-secondary-button" onClick={() => onReview(item)}><Star size={17} aria-hidden="true" />Đánh giá</button>}
    </div></div>
  </motion.article>
}

export function RecentConsultation({ item, highlighted }: { item: ConsultationRequest; highlighted: boolean }) {
  return <section className="consultation-recent" aria-labelledby="recent-consultation-heading"><div className="consultation-recent__heading"><span>Mới nhất</span><h2 id="recent-consultation-heading">Lịch vừa đặt</h2></div><ConsultationCard item={item} highlighted={highlighted} /></section>
}

function ListSkeleton() {
  return <div className="consultation-list" aria-busy="true" aria-label="Đang tải danh sách tư vấn">{[0, 1, 2].map((key) => <div className="consultation-list-skeleton" key={key}><span /><i /><i /><div><i /><i /><i /></div></div>)}</div>
}

export function ConsultationList({ page, loading, error, onRetry, onPageChange, onCancel, onReview }: { page: ConsultationPage | null; loading: boolean; error: string | null; onRetry: () => void; onPageChange: (page: number) => void; onCancel: (item: ConsultationRequest) => void; onReview: (item: ConsultationRequest) => void }) {
  return <section className="consultation-history" aria-labelledby="consultation-history-heading"><div className="consultation-section-heading"><div><h2 id="consultation-history-heading">Lịch sử tư vấn</h2></div><p>Theo dõi yêu cầu, lịch đã xác nhận và đánh giá sau mỗi buổi tư vấn.</p></div>
    {loading ? <ListSkeleton /> : error ? <div className="consultation-history-state is-error" role="alert"><ArrowClockwise size={32} aria-hidden="true" /><h3>Chưa tải được danh sách</h3><p>{error}</p><button type="button" className="consultation-secondary-button" onClick={onRetry}>Thử lại</button></div>
      : !page || page.items.length === 0 ? <div className="consultation-history-state"><CalendarBlank size={36} weight="duotone" aria-hidden="true" /><h3>Chưa có buổi tư vấn</h3><p>Lịch hoặc yêu cầu tư vấn mới sẽ xuất hiện tại đây.</p></div>
        : <><div className="consultation-list">{page.items.map((item, index) => <ConsultationCard key={item.id} item={item} index={index} onCancel={onCancel} onReview={onReview} />)}</div>
          {page.totalPages > 1 && <nav className="consultation-pagination" aria-label="Phân trang lịch tư vấn"><button type="button" disabled={page.page <= 1} aria-label="Trang trước" onClick={() => onPageChange(page.page - 1)}><CaretLeft size={18} aria-hidden="true" /></button><span>Trang <strong>{page.page}</strong> / {page.totalPages}</span><button type="button" disabled={page.page >= page.totalPages} aria-label="Trang sau" onClick={() => onPageChange(page.page + 1)}><CaretRight size={18} aria-hidden="true" /></button></nav>}
        </>}
  </section>
}
