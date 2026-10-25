import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { ResponsiveModal } from '@/shared/components/ResponsiveModal'
import { reviewsApi } from '../api/reviews-api'
import { useReviewCooldown, useReviewData, useReviewFeed } from '../hooks/useReviewData'
import { reviewDraftError, reviewTextLength, type AdminReview } from '../model/review-types'
import { ReviewSummary } from '../components/ReviewSummary'
import { ReviewCard } from '../components/ReviewCard'
import { reviewDate } from '../model/review-types'
import { ReviewStatus } from '../components/ReviewStatus'

export function AdminReviewsPage() {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [rating, setRating] = useState(''), [status, setStatus] = useState(''), [hasReply, setHasReply] = useState('')
  const [params, setParams] = useSearchParams(), selectedId = params.get('review')
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 350); return () => clearTimeout(timer) }, [search])
  const remaining = useReviewCooldown('admin')
  const feed = useReviewFeed('admin', { q: query, rating, status, has_reply: hasReply }, true, 10, 30_000)
  const summary = useReviewData('admin:public-summary', (force, signal) => reviewsApi.summary(force, signal), true, 30_000)
  const pending = useReviewData(`pending:${getSessionScope()}`, (force, signal) => reviewsApi.pending(force, signal), true, 30_000, 'admin')
  const select = (id?: string) => { const next = new URLSearchParams(params); if (id) next.set('review', id); else next.delete('review'); setParams(next, { replace: true }) }
  return <main className="admin-page nm-admin-reviews"><header className="admin-page-heading"><div><span>Trải nghiệm khách hàng</span><h1>Đánh giá NutriMom</h1><p>Xem trải nghiệm của khách hàng và phản hồi với tư cách NutriMom.</p></div></header>
    <section className="nm-admin-review-overview" aria-label="Tổng quan đánh giá">{summary.data && <ReviewSummary summary={summary.data} />}<div><h2>{pending.data ? `${pending.data.count} đánh giá chưa trả lời` : 'Đánh giá chưa trả lời'}</h2><p>Tổng điểm và phân bố sao chỉ tính các đánh giá đang công khai.</p><ReviewStatus error={pending.error || summary.error} loading={!summary.data && summary.loading} remaining={remaining} onRetry={() => { void summary.refresh(); void pending.refresh() }} /></div></section>
    <section className="nm-admin-review-list" aria-label="Quản lý đánh giá"><div className="nm-review-filters"><label>Tìm kiếm<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nội dung hoặc tên người viết" disabled={remaining > 0} /></label><label>Số sao<select value={rating} onChange={event => setRating(event.target.value)} disabled={remaining > 0}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(star => <option key={star} value={star}>{star} sao</option>)}</select></label><label>Trạng thái<select value={status} onChange={event => setStatus(event.target.value)} disabled={remaining > 0}><option value="">Tất cả</option><option value="PUBLISHED">Công khai</option><option value="HIDDEN">Đang ẩn</option><option value="DELETED">Đã xóa</option></select></label><label>Trả lời<select value={hasReply} onChange={event => setHasReply(event.target.value)} disabled={remaining > 0}><option value="">Tất cả</option><option value="false">Chưa trả lời</option><option value="true">Đã trả lời</option></select></label></div>
      <ReviewStatus error={feed.error} loading={!feed.items.length && feed.loading} remaining={remaining} onRetry={() => void feed.reload()} />
      {feed.hasNew && <button type="button" className="nm-review-secondary" disabled={remaining > 0} onClick={() => void feed.reload()}>Có cập nhật mới · Tải lại danh sách</button>}
      {!feed.loading && !feed.error && !feed.items.length && <p className="nm-review-empty">Chưa có đánh giá phù hợp.</p>}
      {(feed.items as AdminReview[]).map(review => <article className="nm-admin-review-row" key={review.id}><div><strong>{review.author.display_name} · {review.rating} sao</strong><p>{review.content}</p><small>{reviewDate(review.created_at)} · {review.status === 'PUBLISHED' ? 'Công khai' : review.status === 'HIDDEN' ? 'Đang ẩn' : 'Đã xóa'} · {review.reply ? 'Đã trả lời' : 'Chưa trả lời'}{review.edited_after_reply ? ' · Người dùng đã chỉnh sửa sau phản hồi' : ''}</small></div><button type="button" className="nm-review-secondary" onClick={() => select(review.id)}>Xem và trả lời</button></article>)}
      {feed.hasMore && <button type="button" className="nm-review-secondary" disabled={remaining > 0 || feed.loadingMore} onClick={() => void feed.more()}>{feed.loadingMore ? 'Đang tải…' : 'Tải thêm đánh giá'}</button>}
    </section>
    <ResponsiveModal open={Boolean(selectedId)} onOpenChange={open => { if (!open) select() }} title="Phản hồi đánh giá">{selectedId && <AdminReplyEditor key={`${getSessionScope()}:${selectedId}`} id={selectedId} />}</ResponsiveModal>
  </main>
}
function AdminReplyEditor({ id }: { id: string }) {
  const detail = useReviewData(`detail:${getSessionScope()}:${id}`, (force, signal) => reviewsApi.detail(id, force, signal), true, 0, 'admin')
  const [content, setContent] = useState(''), [version, setVersion] = useState<number>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [conflict, setConflict] = useState(false), [confirmRemove, setConfirmRemove] = useState(false)
  const dirty = useRef(false), gate = useRef(false), remaining = useReviewCooldown('admin')
  useEffect(() => { if (detail.data && !dirty.current) { setContent(detail.data.reply?.content ?? ''); setVersion(detail.data.version) } }, [detail.data])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (gate.current || remaining || version === undefined || detail.data?.status === 'DELETED' || conflict) return
    const invalid = reviewDraftError(0, content, true)
    if (invalid) { setError(invalid); return }
    gate.current = true; setBusy(true); setError(''); setMessage('')
    try { await reviewsApi.reply(id, content, version); dirty.current = false; const latest = await detail.refresh(); if (latest) { detail.setData(latest); setVersion(latest.version) }; setMessage('Đã lưu trả lời của NutriMom.') }
    catch (reason) { if (reason instanceof ApiClientError && reason.status === 409) setConflict(true); setError(reason instanceof Error ? reason.message : 'Chưa thể trả lời đánh giá.') }
    finally { gate.current = false; setBusy(false) }
  }
  async function latest() { const next = await detail.refresh(); if (next) { setVersion(next.version); setConflict(false); setError(''); setMessage('Đã tải phiên bản mới. Nội dung trả lời đang soạn vẫn được giữ.') } }
  async function remove() {
    if (gate.current || remaining || version === undefined) return
    gate.current = true; setBusy(true); setError('')
    try { await reviewsApi.removeReply(id, version); dirty.current = false; setContent(''); await latest(); setConfirmRemove(false); setMessage('Đã gỡ trả lời.') }
    catch (reason) { if (reason instanceof ApiClientError && reason.status === 409) setConflict(true); setError(reason instanceof Error ? reason.message : 'Chưa thể gỡ trả lời.') }
    finally { gate.current = false; setBusy(false) }
  }
  const review = detail.data
  return <div className="nm-review-feed"><ReviewStatus error={detail.error} loading={!review && detail.loading} remaining={remaining} onRetry={() => void detail.refresh()} />{review && <><ReviewCard review={{ ...review, author: { display_name: review.author.display_name } }} />
    {review.status === 'DELETED' ? <section className="nm-review-form"><p className="nm-review-notice">Đánh giá đã được người viết xóa, không thể tiếp tục trả lời.</p>{content && <label>Bản nháp trả lời được giữ<textarea readOnly value={content} /></label>}</section> : <form className="nm-review-form" onSubmit={event => void submit(event)}><h2>Trả lời với tư cách NutriMom</h2>{review.edited_after_reply && <p className="nm-review-notice">Nội dung đánh giá đã được chỉnh sửa sau trả lời trước.</p>}{review.status === 'HIDDEN' && <p className="nm-review-notice">Đánh giá đang ẩn khỏi trang công khai.</p>}<label>Nội dung trả lời<textarea value={content} disabled={busy || remaining > 0} onChange={event => { dirty.current = true; setContent(event.target.value); setMessage('') }} /><small>{reviewTextLength(content)}/1000 ký tự</small></label>{error && <p role="alert" className="nm-form-error">{error}</p>}{message && <p role="status" className="nm-form-success">{message}</p>}{conflict && <button type="button" className="nm-review-secondary" disabled={busy || remaining > 0} onClick={() => void latest()}>Tải bản mới, giữ nội dung trả lời</button>}<footer>{review.reply && <button type="button" className="nm-review-secondary" disabled={busy || remaining > 0} onClick={() => setConfirmRemove(!confirmRemove)}>Gỡ trả lời</button>}<button type="submit" className="nm-review-primary" disabled={busy || remaining > 0 || conflict || version === undefined}>{busy ? 'Đang lưu…' : 'Lưu trả lời'}</button></footer>{confirmRemove && <div className="nm-review-notice"><p>Gỡ trả lời này khỏi đánh giá?</p><button type="button" disabled={busy || remaining > 0} onClick={() => void remove()}>Xác nhận gỡ trả lời</button></div>}</form>}
  </>}</div>
}
