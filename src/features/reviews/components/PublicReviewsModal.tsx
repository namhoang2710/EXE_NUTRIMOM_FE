import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveModal } from '@/shared/components/ResponsiveModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { reviewsApi } from '../api/reviews-api'
import { canWriteWebReview, type PublicReview } from '../model/review-types'
import { useReviewCooldown, useReviewData, useReviewFeed } from '../hooks/useReviewData'
import { ReviewSummary } from './ReviewSummary'
import { ReviewCard } from './ReviewCard'
import { ReviewStatus } from './ReviewStatus'

export function PublicReviewsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Đánh giá NutriMom" className="nm-public-reviews-modal">{open && <PublicReviewsContent close={() => onOpenChange(false)} />}</ResponsiveModal>
}
function PublicReviewsContent({ close }: { close: () => void }) {
  const [rating, setRating] = useState('')
  const { user, status } = useAuth()
  const remaining = useReviewCooldown('public')
  const summary = useReviewData('public:summary', (force, signal) => reviewsApi.summary(force, signal), true, 30_000)
  const feed = useReviewFeed('public', { rating }, true, 10, 30_000)
  return <div className="nm-public-reviews-layout">
    <aside>{summary.data && <ReviewSummary summary={summary.data} />}<ReviewStatus error={summary.error} loading={!summary.data && summary.loading} remaining={remaining} onRetry={() => void summary.refresh()} />
      {status !== 'authenticated' ? <Link className="nm-review-primary" to="/login" state={{ from: '/app/reviews' }} onClick={close}>Đăng nhập để đánh giá</Link> : canWriteWebReview(user) ? <Link className="nm-review-primary" to="/app/reviews" onClick={close}>Viết hoặc sửa đánh giá của tôi</Link> : <p className="nm-review-muted">Đánh giá được viết bởi khách hàng NutriMom.</p>}
    </aside>
    <section className="nm-review-feed" aria-label="Các đánh giá công khai">
      <label className="nm-review-filter">Lọc số sao<select value={rating} onChange={event => setRating(event.target.value)} disabled={remaining > 0}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(star => <option key={star} value={star}>{star} sao</option>)}</select></label>
      <ReviewStatus error={feed.error} loading={!feed.items.length && feed.loading} remaining={remaining} onRetry={() => void feed.reload()} />
      {feed.hasNew && <button className="nm-review-secondary" type="button" disabled={remaining > 0} onClick={() => void feed.reload()}>Có đánh giá mới · Cập nhật danh sách</button>}
      {!feed.loading && !feed.error && !feed.items.length && <p className="nm-review-empty">{rating ? 'Chưa có đánh giá với số sao này.' : 'Hãy là người đầu tiên chia sẻ trải nghiệm cùng NutriMom.'}</p>}
      {(feed.items as PublicReview[]).map(review => <ReviewCard key={review.id} review={review} />)}
      {feed.hasMore && <button className="nm-review-secondary" type="button" disabled={feed.loadingMore || remaining > 0} onClick={() => void feed.more()}>{feed.loadingMore ? 'Đang tải…' : 'Tải thêm đánh giá'}</button>}
    </section>
  </div>
}
