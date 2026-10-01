import { Star } from '@phosphor-icons/react'
import type { AdminConsultation, AdminConsultationReview } from '../model/admin-consultations'
import { getAdminConsultationSpecialtyLabel } from '../model/admin-consultations'
import { formatVietnamDate, formatVietnamDateTime, formatVietnamTime } from '../model/admin-formatters'

const fallbackUserName = 'Chưa có tên khách hàng'
const fallbackExpertName = 'Chưa có tên chuyên gia'

function Schedule({ consultation }: { consultation: AdminConsultation }) {
  if (!consultation.slot) return <span className="admin-consultation-fallback">Chưa có lịch tư vấn</span>
  const date = formatVietnamDate(consultation.slot.slotDate)
  const start = formatVietnamTime(consultation.slot.startTime)
  const end = formatVietnamTime(consultation.slot.endTime)
  if (!date || !start || !end) return <span className="admin-consultation-fallback">Chưa có lịch tư vấn</span>
  return <><strong>{date}</strong><span>{start} - {end}</span></>
}
function CompletedAt({ value }: { value: string | null }) {
  const formatted = formatVietnamDateTime(value)
  return formatted
    ? <time dateTime={value ?? undefined}>{formatted}</time>
    : <span className="admin-consultation-fallback warning">Chưa có thời gian hoàn thành</span>
}
function Rating({ review }: { review: AdminConsultationReview }) {
  return <div className="admin-consultation-rating" aria-label={`Đánh giá ${review.rating} trên 5 sao`}>
    <span aria-hidden="true">{[1, 2, 3, 4, 5].map((value) => <Star className={value <= review.rating ? 'is-filled' : 'is-empty'} key={value} size={13} weight={value <= review.rating ? 'fill' : 'regular'} />)}</span>
    <strong>{review.rating}/5</strong>
  </div>
}

function Review({ review }: { review: AdminConsultationReview | null }) {
  if (!review) return <span className="admin-consultation-fallback">Chưa đánh giá</span>
  const comment = review.comment?.trim()
  return <div className="admin-consultation-review"><Rating review={review} /><p title={comment || undefined}>{comment || 'Không có nhận xét'}</p></div>
}

function Specialty({ consultation }: { consultation: AdminConsultation }) {
  return <span className={`admin-consultation-specialty ${consultation.specialty.toLowerCase()}`}>
    {getAdminConsultationSpecialtyLabel(consultation.specialty)}
  </span>
}

export function AdminConsultationsTable({ consultations }: { consultations: AdminConsultation[] }) {
  return <>
    <div className="admin-table-scroll admin-consultations-table-wrap">
      <table className="admin-table admin-consultations-table">
        <thead><tr><th>Khách hàng</th><th>Chuyên gia</th><th>Tư vấn</th><th>Lịch tư vấn</th><th>Hoàn thành</th><th>Feedback</th></tr></thead>
        <tbody>{consultations.map((consultation) => <tr key={consultation.id}>
          <td><strong className="admin-consultation-person">{consultation.userDisplayName?.trim() || fallbackUserName}</strong></td>
          <td><strong className="admin-consultation-person">{consultation.expertName?.trim() || fallbackExpertName}</strong></td>
          <td><Specialty consultation={consultation} /></td>
          <td><div className="admin-consultation-schedule"><Schedule consultation={consultation} /></div></td>
          <td><div className="admin-consultation-completed"><CompletedAt value={consultation.completedAt} /></div></td>
          <td><Review review={consultation.review} /></td>
        </tr>)}</tbody>
      </table>
    </div>

    <div className="admin-consultation-cards">{consultations.map((consultation) => <article key={consultation.id} className="admin-consultation-card">
      <dl>
        <div><dt>Khách hàng</dt><dd><strong>{consultation.userDisplayName?.trim() || fallbackUserName}</strong></dd></div>
        <div><dt>Chuyên gia</dt><dd><strong>{consultation.expertName?.trim() || fallbackExpertName}</strong></dd></div>
        <div><dt>Tư vấn</dt><dd><Specialty consultation={consultation} /></dd></div>
        <div><dt>Lịch tư vấn</dt><dd><div className="admin-consultation-schedule"><Schedule consultation={consultation} /></div></dd></div>
        <div><dt>Hoàn thành</dt><dd><CompletedAt value={consultation.completedAt} /></dd></div>
        <div><dt>Feedback</dt><dd><Review review={consultation.review} /></dd></div>
      </dl>
    </article>)}</div>
  </>
}

