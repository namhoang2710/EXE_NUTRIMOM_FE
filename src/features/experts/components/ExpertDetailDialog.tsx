import { Briefcase, CalendarCheck, MapPin, Medal, Star } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { ExpertDetail } from '../model/expert-types'
import { expertSpecialtyLabels } from '../model/expert-types'

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase('vi')).join('') || 'NM'
}

export function ExpertDetailDialog({ open, expert, loading, error, bookingDisabled, onClose, onRetry, onBook }: {
  open: boolean
  expert: ExpertDetail | null
  loading: boolean
  error: string | null
  bookingDisabled: boolean
  onClose: () => void
  onRetry: () => void
  onBook: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [expert?.avatarUrl])

  return <AccessibleDialog
    open={open}
    title="Chi tiết chuyên gia"
    description="Thông tin chuyên môn và kinh nghiệm tư vấn."
    onClose={onClose}
    className="expert-detail-dialog"
    footer={<><button type="button" className="expert-detail-secondary" onClick={onClose}>Đóng</button><button type="button" className="expert-detail-primary" disabled={bookingDisabled || !expert} onClick={onBook}><CalendarCheck size={19} weight="bold" aria-hidden="true" />Đặt lịch khám</button></>}
  >
    {loading ? <div className="expert-detail-skeleton" aria-busy="true" aria-label="Đang tải hồ sơ chuyên gia"><span /><div><i /><i /><i /></div></div>
      : error ? <div className="expert-detail-state" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Thử lại</button></div>
        : expert ? <div className="expert-detail-content">
          <div className="expert-detail-identity">
            <span className="expert-detail-avatar">{expert.avatarUrl && !imageFailed ? <img src={expert.avatarUrl} alt={`Ảnh đại diện của ${expert.fullName}`} onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{initials(expert.fullName)}</span>}</span>
            <div><p>{expert.title}</p><h3>{expert.fullName}</h3><span>{expertSpecialtyLabels[expert.specialty]}</span></div>
          </div>
          <dl className="expert-detail-facts">
            <div><dt><MapPin size={18} aria-hidden="true" />Nơi công tác</dt><dd>{expert.workplace}</dd></div>
            <div><dt><Medal size={18} aria-hidden="true" />Kinh nghiệm</dt><dd>{expert.yearsOfExperience} năm</dd></div>
            <div><dt><Briefcase size={18} aria-hidden="true" />Trạng thái</dt><dd className="is-available">Đang nhận lịch tư vấn</dd></div>
            <div><dt><Star size={18} weight="fill" aria-hidden="true" />Đánh giá</dt><dd>{expert.ratingCount ? `${expert.averageRating.toFixed(1)} / 5 · ${expert.ratingCount} lượt` : 'Chưa có đánh giá'}</dd></div>
          </dl>
          <section className="expert-detail-bio"><h3>Giới thiệu</h3><p>{expert.bio || 'Chuyên gia chưa cập nhật phần giới thiệu.'}</p></section>
        </div> : null}
  </AccessibleDialog>
}
