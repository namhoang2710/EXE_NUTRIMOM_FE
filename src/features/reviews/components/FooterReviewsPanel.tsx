import { useState } from 'react'
import { reviewsApi } from '../api/reviews-api'
import { useReviewCooldown, useReviewData, useReviewFeed } from '../hooks/useReviewData'
import type { PublicReview } from '../model/review-types'
import { ReviewSummary } from './ReviewSummary'
import { ReviewCard } from './ReviewCard'
import { ReviewStatus } from './ReviewStatus'
import { PublicReviewsModal } from './PublicReviewsModal'

export function FooterReviewsPanel({ visible }: { visible: boolean }) {
  const [open, setOpen] = useState(false)
  const enabled = visible && !open
  const summary = useReviewData('footer:summary', (force, signal) => reviewsApi.summary(force, signal), enabled, 60_000)
  const feed = useReviewFeed('public', {}, enabled, 2, 60_000)
  const remaining = useReviewCooldown('public')
  return <>
    <div className="nm-footer-review-stats">
      {summary.data && <ReviewSummary summary={summary.data} />}
      <ReviewStatus loading={summary.loading && !summary.data} error={summary.error} remaining={remaining} onRetry={() => void summary.refresh()} />
    </div>
    <div className="nm-footer-review-latest">
      {!summary.error && !remaining && <ReviewStatus error={feed.error} onRetry={() => void feed.reload()} />}
      <div className="nm-footer-review-excerpts">{(feed.items as PublicReview[]).map(review => <ReviewCard key={review.id} review={review} compact />)}</div>
      <button type="button" className="nm-review-secondary" onClick={() => setOpen(true)}>Xem tất cả đánh giá</button>
    </div>
    <PublicReviewsModal open={open} onOpenChange={setOpen} />
  </>
}
