import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Rating } from '@/components/reui/rating'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { ResponsiveModal } from '@/shared/components/ResponsiveModal'
import { reviewsApi } from '../api/reviews-api'
import { useReviewCooldown, useReviewData } from '../hooks/useReviewData'
import { canWriteWebReview, reviewDraftError, reviewTextLength } from '../model/review-types'
import { ReviewSummary } from '../components/ReviewSummary'
import { ReviewStatus } from '../components/ReviewStatus'

export function UserReviewsPage() { return <UserReviewsContent key={getSessionScope()} /> }
function UserReviewsContent() {
  const { user } = useAuth()
  const allowed = canWriteWebReview(user)
  const mine = useReviewData(`mine:${getSessionScope()}`, (force, signal) => reviewsApi.mine(force, signal), allowed, 0, 'own')
  const summary = useReviewData('user:summary', (force, signal) => reviewsApi.summary(force, signal), true, 60_000)
  const remaining = useReviewCooldown('own')
  const [rating, setRating] = useState(0), [content, setContent] = useState(''), [version, setVersion] = useState<number>()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [conflict, setConflict] = useState(false), [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = useRef(false), gate = useRef(false)
  useEffect(() => {
    if (mine.data === undefined || dirty.current) return
    setRating(mine.data?.rating ?? 0); setContent(mine.data?.content ?? ''); setVersion(mine.data?.version)
  }, [mine.data])
  const hidden = mine.data?.status === 'HIDDEN'
  async function save(event: FormEvent) {
    event.preventDefault()
    if (gate.current || remaining || !allowed || hidden || conflict || mine.data === undefined) return
    const invalid = reviewDraftError(rating, content)
    if (invalid) { setError(invalid); return }
    gate.current = true; setBusy(true); setError(''); setSuccess('')
    try { const saved = await reviewsApi.save(rating, content, version); dirty.current = false; mine.setData(saved); setVersion(saved.version); setSuccess('Đã lưu đánh giá của bạn. Cảm ơn bạn đã chia sẻ cùng NutriMom.') }
    catch (reason) { if (reason instanceof ApiClientError && reason.status === 409) setConflict(true); setError(reason instanceof Error ? reason.message : 'Chưa thể lưu đánh giá.') }
    finally { gate.current = false; setBusy(false) }
  }
  async function loadLatest() {
    const latest = await mine.refresh()
    if (latest === undefined) return
    setVersion(latest?.version); setConflict(false); setError(''); setSuccess('Đã tải bản mới. Nội dung bạn đang soạn vẫn được giữ.')
  }
  async function remove() {
    if (gate.current || remaining) return
    gate.current = true; setBusy(true); setError('')
    try { await reviewsApi.remove(); dirty.current = false; mine.setData(null); setRating(0); setContent(''); setVersion(undefined); setConflict(false); setConfirmDelete(false); setSuccess('Đã xóa đánh giá. Bạn có thể viết lại khi muốn.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể xóa đánh giá.') }
    finally { gate.current = false; setBusy(false) }
  }
  return <main className="nm-account-workspace-page nm-user-reviews-page">
    <header className="nm-account-workspace-heading"><span>Trải nghiệm cùng NutriMom</span><h1>Đánh giá NutriMom</h1><p>Chia sẻ điều bạn yêu thích và những điều chúng tôi có thể làm tốt hơn.</p></header>
    <div className="nm-review-workspace"><aside>{summary.data && <ReviewSummary summary={summary.data} />}<ReviewStatus error={summary.error} loading={!summary.data && summary.loading} onRetry={() => void summary.refresh()} /><p className="nm-review-muted">Tổng điểm được tính từ các đánh giá đang công khai.</p></aside>
      {!allowed ? <p className="nm-review-notice">Chức năng viết đánh giá dành cho khách hàng có tài khoản đang hoạt động.</p> : <form className="nm-review-form" onSubmit={event => void save(event)} noValidate aria-busy={busy}>
        <h2>{mine.data ? 'Đánh giá của bạn' : 'Bạn cảm thấy thế nào?'}</h2>
        <ReviewStatus error={mine.error} loading={mine.data === undefined && mine.loading} remaining={remaining} onRetry={() => void mine.refresh()} />
        {hidden && <p className="nm-review-notice">Đánh giá hiện không công khai. {mine.data?.hidden_reason || 'Vui lòng liên hệ NutriMom nếu cần hỗ trợ.'} Bạn vẫn có thể xóa đánh giá này.</p>}
        <fieldset disabled={busy || hidden || mine.data === undefined || remaining > 0}><legend>Điểm đánh giá</legend><Rating rating={rating} editable size="lg" disabled={busy || hidden || mine.data === undefined || remaining > 0} onRatingChange={value => { dirty.current = true; setRating(value); setSuccess('') }} aria-label="Chọn điểm đánh giá" /></fieldset>
        <label>Nội dung đánh giá<textarea value={content} disabled={busy || hidden || mine.data === undefined || remaining > 0} onChange={event => { dirty.current = true; setContent(event.target.value); setSuccess('') }} placeholder="Chia sẻ trải nghiệm của bạn, tối thiểu 10 ký tự…" aria-describedby="review-content-count" /><small id="review-content-count">{reviewTextLength(content)}/1000 ký tự · Tên của bạn được che bớt khi hiển thị công khai.</small></label>
        {mine.data?.reply && <section className="nm-review-reply"><strong>Trả lời từ NutriMom</strong><p>{mine.data.reply.content}</p></section>}
        {error && <p className="nm-form-error" role="alert">{error}</p>}{success && <p className="nm-form-success" role="status">{success}</p>}
        {conflict && <button type="button" className="nm-review-secondary" disabled={busy || remaining > 0} onClick={() => void loadLatest()}>Tải bản mới, giữ nội dung đang soạn</button>}
        <footer>{mine.data && <button type="button" className="nm-review-secondary" disabled={busy || remaining > 0} onClick={() => setConfirmDelete(true)}>Xóa đánh giá</button>}<button type="submit" className="nm-review-primary" disabled={busy || remaining > 0 || hidden || conflict || mine.data === undefined}>{busy ? 'Đang lưu…' : mine.data ? 'Lưu thay đổi' : 'Gửi đánh giá'}</button></footer>
      </form>}
    </div>
    <ResponsiveModal open={confirmDelete} onOpenChange={open => { if (!busy) setConfirmDelete(open) }} title="Xóa đánh giá của bạn?"><p>Đánh giá và trả lời đi kèm sẽ không còn hiển thị công khai. Bạn có thể viết đánh giá mới sau đó.</p><div className="nm-review-form"><ReviewStatus remaining={remaining} />{error && <p role="alert">{error}</p>}<footer><button type="button" className="nm-review-secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Giữ đánh giá</button><button type="button" className="nm-review-primary" disabled={busy || remaining > 0} onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></footer></div></ResponsiveModal>
  </main>
}
