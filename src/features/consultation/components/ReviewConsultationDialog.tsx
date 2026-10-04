import { Rating } from '@/components/reui/rating'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { ConsultationRequest } from '../model/consultation-types'

export function ReviewConsultationDialog({ item, rating, comment, busy, error, onRatingChange, onCommentChange, onClose, onSubmit }: {
  item: ConsultationRequest | null
  rating: number
  comment: string
  busy: boolean
  error: string | null
  onRatingChange: (rating: number) => void
  onCommentChange: (comment: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return <AccessibleDialog open={Boolean(item)} title="Đánh giá chuyên gia" description={`Chia sẻ trải nghiệm của bạn với ${item?.expertName || 'chuyên gia'}.`} onClose={onClose} busy={busy} className="consultation-dialog">
    <div className="consultation-rating-field"><span id="consultation-rating-label">Mức độ hài lòng</span><div className="consultation-rating-control"><Rating rating={rating} onRatingChange={onRatingChange} editable disabled={busy} aria-labelledby="consultation-rating-label" /><strong aria-live="polite">{rating || 0} / 5</strong></div></div>
    <div className="consultation-field"><div className="consultation-field__label"><label htmlFor="review-comment">Nhận xét (không bắt buộc)</label><span>{comment.length}/2000</span></div><textarea id="review-comment" rows={4} maxLength={2000} value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder="Điều gì khiến bạn hài lòng hoặc có thể tốt hơn?" /></div>
    {error && <p className="consultation-form-error" role="alert">{error}</p>}
    <div className="consultation-dialog-actions"><button type="button" className="consultation-secondary-button" disabled={busy} onClick={onClose}>Để sau</button><button type="button" className="consultation-primary-button" disabled={!rating || busy} onClick={onSubmit}>{busy ? 'Đang gửi...' : 'Gửi đánh giá'}</button></div>
  </AccessibleDialog>
}
