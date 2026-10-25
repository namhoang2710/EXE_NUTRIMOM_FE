import { Rating } from '@/components/reui/rating'
import type { PublicReview } from '../model/review-types'
import { reviewDate } from '../model/review-types'
export function ReviewCard({ review, compact = false }: { review: PublicReview; compact?: boolean }) {
  return <article className={`nm-web-review-card${compact ? ' is-compact' : ''}`}>
    <header><strong>{review.author.display_name}</strong><time dateTime={review.created_at}>{reviewDate(review.created_at)}</time></header>
    <Rating rating={review.rating} size="sm" aria-label={`${review.rating} sao`} />
    <p className="nm-review-content">{review.content}</p>
    {review.edited_at && <small>Đã chỉnh sửa {reviewDate(review.edited_at)}</small>}
    {review.reply && <section className="nm-review-reply" aria-label="Trả lời của NutriMom"><strong>NutriMom</strong><p>{review.reply.content}</p><time dateTime={review.reply.updated_at || review.reply.replied_at}>{reviewDate(review.reply.updated_at || review.reply.replied_at)}</time></section>}
  </article>
}
