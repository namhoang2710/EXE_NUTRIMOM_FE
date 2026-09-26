import { Star } from '@phosphor-icons/react'
import { useRef } from 'react'
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
  const firstStarRef = useRef<HTMLButtonElement>(null)
  function onStarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 1 : event.key === 'End' ? 5 : Math.min(5, Math.max(1, (rating || 1) + (event.key === 'ArrowRight' ? 1 : -1)))
    onRatingChange(next)
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`)?.focus()
  }
  return <AccessibleDialog open={Boolean(item)} title="Đánh giá chuyên gia" description={`Chia sẻ trải nghiệm của bạn với ${item?.expertName || 'chuyên gia'}.`} onClose={onClose} busy={busy} initialFocusRef={firstStarRef} className="consultation-dialog">
    <div className="consultation-rating-field"><span id="consultation-rating-label">Mức độ hài lòng</span><div className="consultation-stars" role="radiogroup" aria-labelledby="consultation-rating-label" onKeyDown={onStarKeyDown}>{[1, 2, 3, 4, 5].map((value) => <button ref={value === 1 ? firstStarRef : undefined} key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} sao`} data-rating={value} tabIndex={rating === value || (!rating && value === 1) ? 0 : -1} onClick={() => onRatingChange(value)}><Star size={30} weight={value <= rating ? 'fill' : 'regular'} aria-hidden="true" /></button>)}</div></div>
    <div className="consultation-field"><div className="consultation-field__label"><label htmlFor="review-comment">Nhận xét (không bắt buộc)</label><span>{comment.length}/2000</span></div><textarea id="review-comment" rows={4} maxLength={2000} value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder="Điều gì khiến bạn hài lòng hoặc có thể tốt hơn?" /></div>
    {error && <p className="consultation-form-error" role="alert">{error}</p>}
    <div className="consultation-dialog-actions"><button type="button" className="consultation-secondary-button" disabled={busy} onClick={onClose}>Để sau</button><button type="button" className="consultation-primary-button" disabled={!rating || busy} onClick={onSubmit}>{busy ? 'Đang gửi...' : 'Gửi đánh giá'}</button></div>
  </AccessibleDialog>
}
