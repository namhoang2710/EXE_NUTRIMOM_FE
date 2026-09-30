import { Star, UserCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { formatDateTime } from '../model/expert-console-formatters'
import type { ExpertProfile, ExpertReview, ReviewSort } from '../model/expert-console-types'
import { ExpertDateField, ExpertSelect, Pagination, PanelHeading, ResourceState } from './ExpertUI'

const ratingOptions = [
  { value: '', label: 'Tất cả' },
  ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} sao` })),
]

const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'rating_desc', label: 'Điểm cao nhất' },
  { value: 'rating_asc', label: 'Điểm thấp nhất' },
]

function RatingStars({ rating, size = 15 }: { rating: number; size?: number }) {
  return <div className="expert-stars" role="img" aria-label={`Đánh giá ${rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={size} weight={star <= rating ? 'fill' : 'regular'} aria-hidden="true" />)}</div>
}

export function ReviewsPanel({ profile, search, setParams, refreshToken }: {
  profile: ExpertProfile | null
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
  refreshToken: number
}) {
  const [selectedReview, setSelectedReview] = useState<ExpertReview | null>(null)
  const rating = Number(search.get('review_rating')) || 0
  const from = search.get('review_from') || ''
  const to = search.get('review_to') || ''
  const hasComment = search.get('review_comment') === 'true'
  const sort = (['rating_desc', 'rating_asc'].includes(search.get('review_sort') || '') ? search.get('review_sort') : 'newest') as ReviewSort
  const page = Math.max(1, Number(search.get('review_page')) || 1)
  const key = `${rating}|${from}|${to}|${hasComment}|${sort}|${page}|${refreshToken}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.reviews({ rating: rating || undefined, from: from || undefined, to: to || undefined, hasComment: hasComment || undefined, sort, page, pageSize: 10 }, signal),
    [key],
  )

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Chất lượng dịch vụ" title="Đánh giá từ người dùng" description="Theo dõi phản hồi sau tư vấn để cải thiện trải nghiệm chăm sóc." action={profile ? <div className="expert-rating-summary"><Star size={22} weight="fill" /><strong>{profile.averageRating.toFixed(1)}</strong><span>{profile.ratingCount} đánh giá toàn hệ thống</span></div> : undefined} />
      <div className="expert-filters review">
        <ExpertSelect label="Số sao" value={rating ? String(rating) : ''} options={ratingOptions} onChange={(value) => setParams({ review_rating: value || undefined, review_page: undefined })} />
        <ExpertDateField label="Từ ngày" value={from} max={to || undefined} onChange={(value) => setParams({ review_from: value || undefined, review_page: undefined })} />
        <ExpertDateField label="Đến ngày" value={to} min={from || undefined} onChange={(value) => setParams({ review_to: value || undefined, review_page: undefined })} />
        <ExpertSelect label="Sắp xếp" value={sort} options={sortOptions} onChange={(value) => setParams({ review_sort: value === 'newest' ? undefined : value, review_page: undefined })} />
        <label className="expert-checkbox"><input type="checkbox" checked={hasComment} onChange={(event) => setParams({ review_comment: event.target.checked ? 'true' : undefined, review_page: undefined })} /><span>Chỉ có nhận xét</span></label>
      </div>
      <ResourceState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} onRetry={resource.reload} emptyTitle={rating || from || to || hasComment ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá'} emptyMessage={rating || from || to || hasComment ? 'Hãy thay đổi bộ lọc để xem phản hồi khác.' : 'Đánh giá mới sẽ xuất hiện sau khi người dùng hoàn tất phản hồi.'}>
        {resource.data && <p className="expert-review-filter-total"><strong>{resource.data.totalItems}</strong> kết quả phù hợp bộ lọc hiện tại</p>}
        <div className="expert-review-list">
          {resource.data?.items.map((review) => <article key={review.id} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Xem đánh giá của ${review.userDisplayName || 'Người dùng'}`} onClick={() => setSelectedReview(review)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedReview(review) } }}>
            <header><span><UserCircle size={21} weight="duotone" /></span><div><strong>{review.userDisplayName || 'Người dùng'}</strong><small>{formatDateTime(review.createdAt)}</small></div><RatingStars rating={review.rating} /></header>
          </article>)}
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ review_page: String(next) })} />}
      </ResourceState>
      <AccessibleDialog open={Boolean(selectedReview)} title="Chi tiết đánh giá" description="Phản hồi sau buổi tư vấn." onClose={() => setSelectedReview(null)} className="expert-dialog expert-review-dialog" footer={<button className="expert-button primary" type="button" onClick={() => setSelectedReview(null)}>Đóng</button>}>
        {selectedReview && <div className="expert-review-dialog-content">
          <div className="expert-review-dialog-user"><span><UserCircle size={24} weight="duotone" /></span><div><strong>{selectedReview.userDisplayName || 'Người dùng'}</strong><small>{formatDateTime(selectedReview.createdAt)} (giờ Việt Nam)</small></div></div>
          <div className="expert-review-dialog-rating"><RatingStars rating={selectedReview.rating} size={20} /><strong>{selectedReview.rating} / 5</strong></div>
          <section><h3>Nhận xét</h3><p>{selectedReview.comment?.trim() || 'Người dùng không để lại nhận xét'}</p></section>
          <p className="expert-review-dialog-request">Mã buổi tư vấn: <code>{selectedReview.requestId}</code></p>
        </div>}
      </AccessibleDialog>
    </section>
  )
}
