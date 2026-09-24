import { ChatCircleText, Star, UserCircle } from '@phosphor-icons/react'
import { expertConsoleApi } from '../api/expert-console-api'
import { useExpertResource } from '../hooks/useExpertResource'
import { formatDateTime } from '../model/expert-console-formatters'
import type { ExpertProfile, ReviewSort } from '../model/expert-console-types'
import { Pagination, PanelHeading, ResourceState } from './ExpertUI'

export function ReviewsPanel({ profile, search, setParams }: {
  profile: ExpertProfile | null
  search: URLSearchParams
  setParams: (values: Record<string, string | undefined>) => void
}) {
  const rating = Number(search.get('review_rating')) || 0
  const from = search.get('review_from') || ''
  const to = search.get('review_to') || ''
  const hasComment = search.get('review_comment') === 'true'
  const sort = (['rating_desc', 'rating_asc'].includes(search.get('review_sort') || '') ? search.get('review_sort') : 'newest') as ReviewSort
  const page = Math.max(1, Number(search.get('review_page')) || 1)
  const key = `${rating}|${from}|${to}|${hasComment}|${sort}|${page}`
  const resource = useExpertResource(
    (signal) => expertConsoleApi.reviews({ rating: rating || undefined, from: from || undefined, to: to || undefined, hasComment: hasComment || undefined, sort, page, pageSize: 10 }, signal),
    [key],
  )

  return (
    <section className="expert-panel">
      <PanelHeading eyebrow="Chất lượng dịch vụ" title="Đánh giá từ người dùng" description="Theo dõi phản hồi sau tư vấn để cải thiện trải nghiệm chăm sóc." action={profile ? <div className="expert-rating-summary"><Star size={22} weight="fill" /><strong>{profile.averageRating.toFixed(1)}</strong><span>{profile.ratingCount} đánh giá</span></div> : undefined} />
      <div className="expert-filters review">
        <label><span>Số sao</span><select value={rating || ''} onChange={(event) => setParams({ review_rating: event.target.value || undefined, review_page: undefined })}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map((star) => <option key={star} value={star}>{star} sao</option>)}</select></label>
        <label><span>Từ ngày</span><input type="date" value={from} max={to || undefined} onChange={(event) => setParams({ review_from: event.target.value || undefined, review_page: undefined })} /></label>
        <label><span>Đến ngày</span><input type="date" value={to} min={from || undefined} onChange={(event) => setParams({ review_to: event.target.value || undefined, review_page: undefined })} /></label>
        <label><span>Sắp xếp</span><select value={sort} onChange={(event) => setParams({ review_sort: event.target.value === 'newest' ? undefined : event.target.value, review_page: undefined })}><option value="newest">Mới nhất</option><option value="rating_desc">Điểm cao nhất</option><option value="rating_asc">Điểm thấp nhất</option></select></label>
        <label className="expert-checkbox"><input type="checkbox" checked={hasComment} onChange={(event) => setParams({ review_comment: event.target.checked ? 'true' : undefined, review_page: undefined })} /><span>Chỉ có nhận xét</span></label>
      </div>
      <ResourceState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} onRetry={resource.reload}>
        <div className="expert-review-list">
          {resource.data?.items.map((review) => <article key={review.id}>
            <header><span><UserCircle size={21} weight="duotone" /></span><div><strong>Người dùng · {review.userId.slice(-6)}</strong><small>{formatDateTime(review.createdAt)}</small></div><div className="expert-stars" aria-label={`${review.rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} weight={star <= review.rating ? 'fill' : 'regular'} />)}</div></header>
            <p>{review.comment || <em>Người dùng không để lại nhận xét.</em>}</p>
            <footer><ChatCircleText size={15} /> Mã buổi tư vấn · {review.requestId.slice(-8)}</footer>
          </article>)}
        </div>
        {resource.data && <Pagination page={resource.data.page} totalPages={resource.data.totalPages} totalItems={resource.data.totalItems} onChange={(next) => setParams({ review_page: String(next) })} />}
      </ResourceState>
    </section>
  )
}

