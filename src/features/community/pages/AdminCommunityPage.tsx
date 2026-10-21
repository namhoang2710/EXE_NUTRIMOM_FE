import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityAdminApi } from '../api/community-admin-api'
import { PostImages } from '../components/PostImages'
import { friendlyError, isAbort } from '../model/community-errors'
import { relativeTime } from '../model/community-time'
import { postStatusLabels, reportReasons, topicLabel } from '../model/community-topics'
import type { AdminPostItem, AdminReportItem, PostStatus, ReportStatus } from '../model/community-types'
import '../styles/community.css'

type View = 'PENDING' | 'ALL' | 'REPORTS'
const PAGE_SIZE = 20
const reasonLabel = (value: string) => reportReasons.find((item) => item.value === value)?.label ?? value
const reportStatusLabel: Record<ReportStatus, string> = { OPEN: 'Chờ xử lý', DISMISSED: 'Đã bỏ qua', ACTION_TAKEN: 'Đã gỡ bài' }

/** Danh sách cursor có nút "Tải thêm" (trang quản trị, không cần cuộn vô hạn). */
function useAdminList<T>(load: (cursor: string | null, signal: AbortSignal) => Promise<{ items: T[]; next_cursor?: string | null; has_more: boolean }>) {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (from: string | null) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const page = await load(from, controller.signal)
      setItems((current) => (from ? [...current, ...page.items] : page.items))
      setCursor(page.next_cursor ?? null)
      setHasMore(page.has_more)
    } catch (reason) {
      if (!isAbort(reason)) setError(friendlyError(reason).message)
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void fetchPage(null)
    return () => controllerRef.current?.abort()
  }, [fetchPage])

  return { items, setItems, hasMore, loading, error, reload: () => void fetchPage(null), loadMore: () => { if (cursor) void fetchPage(cursor) } }
}

type Pending = { kind: 'reject'; postId: string } | { kind: 'remove'; postId: string }
  | { kind: 'resolve'; reportId: string; action: 'DISMISS' | 'REMOVE_POST' } | null

export function AdminCommunityPage() {
  const [view, setView] = useState<View>('PENDING')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [note, setNote] = useState('')

  const status: PostStatus | undefined = view === 'PENDING' ? 'PENDING' : undefined
  const loadPosts = useCallback((cursor: string | null, signal: AbortSignal) => communityAdminApi.posts(status, cursor, PAGE_SIZE, signal), [status])
  const loadReports = useCallback((cursor: string | null, signal: AbortSignal) => communityAdminApi.reports('OPEN', cursor, PAGE_SIZE, signal), [])
  const posts = useAdminList<AdminPostItem>(loadPosts)
  const reports = useAdminList<AdminReportItem>(loadReports)

  // Một thao tác kiểm duyệt tại một thời điểm; ref chặn bấm đúp trước khi state kịp cập nhật.
  const actingRef = useRef(false)
  async function act(key: string, action: () => Promise<unknown>, success: string) {
    if (actingRef.current) return
    actingRef.current = true
    setBusy(key)
    setMessage(null)
    try {
      await action()
      setMessage(success)
      posts.reload()
      reports.reload()
    } catch (reason) {
      setMessage(friendlyError(reason).message)
    } finally {
      actingRef.current = false
      setBusy(null)
    }
  }

  async function confirmPending() {
    if (!pending) return
    const text = note.trim()
    if (pending.kind === 'reject' && !text) { setMessage('Vui lòng nhập lý do từ chối.'); return }
    const current = pending
    setPending(null)
    setNote('')
    if (current.kind === 'reject') await act(current.postId, () => communityAdminApi.reject(current.postId, text), 'Đã từ chối bài viết.')
    else if (current.kind === 'remove') await act(current.postId, () => communityAdminApi.remove(current.postId, text), 'Đã gỡ bài viết.')
    else await act(current.reportId, () => communityAdminApi.resolve(current.reportId, current.action, text), current.action === 'DISMISS' ? 'Đã bỏ qua báo cáo.' : 'Đã gỡ bài và đóng báo cáo.')
  }

  const pendingTitle = pending?.kind === 'reject' ? 'Từ chối bài viết' : pending?.kind === 'remove' ? 'Gỡ bài viết'
    : pending?.kind === 'resolve' && pending.action === 'DISMISS' ? 'Bỏ qua báo cáo' : 'Gỡ bài theo báo cáo'

  return <div className="admin-page nm-admin-community"><h1 className="sr-only">Kiểm duyệt cộng đồng</h1>
    <section className="admin-card">
      <div className="admin-management-tabs" aria-label="Kiểm duyệt cộng đồng">
        {([['PENDING', 'Chờ duyệt'], ['ALL', 'Tất cả bài'], ['REPORTS', 'Báo cáo']] as const).map(([key, label]) =>
          <button key={key} type="button" data-active={view === key} onClick={() => setView(key)}>{label}</button>)}
      </div>
      {message && <p className="nm-community-notice" role="status">{message}</p>}
    </section>

    {view !== 'REPORTS' && <section className="admin-card nm-admin-community__list" aria-busy={posts.loading}>
      {posts.error && <p className="nm-community-error" role="alert">{posts.error} <button type="button" className="admin-button secondary compact" onClick={posts.reload}>Thử lại</button></p>}
      {!posts.loading && !posts.error && posts.items.length === 0 && <p className="admin-inline-empty">{view === 'PENDING' ? 'Không có bài nào chờ duyệt.' : 'Chưa có bài viết.'}</p>}
      {posts.items.map(({ post, open_report_count: openReports, deleted_at: deletedAt }) => <article key={post.id} className="nm-community-card">
        <header className="nm-community-card__head">
          <span className="nm-community-avatar" aria-hidden="true">{post.author.display_name.charAt(0).toUpperCase()}</span>
          <div className="nm-community-card__meta"><strong>{post.author.display_name}</strong><span>{relativeTime(post.created_at)} · {topicLabel(post.topic)}{post.edited_at && ' · đã chỉnh sửa'}</span></div>
          <div className="nm-community-card__tags">
            {post.pinned && <span className="nm-community-tag is-pinned">Đã ghim</span>}
            {openReports > 0 && <span className="nm-community-tag is-rejected">{openReports} báo cáo</span>}
            <span className={`nm-community-tag is-${post.status.toLowerCase()}`}>{deletedAt && post.status !== 'REMOVED' ? 'Người đăng đã xoá' : postStatusLabels[post.status]}</span>
          </div>
        </header>
        {post.reject_reason && <p className="nm-community-reject"><strong>Lý do:</strong> {post.reject_reason}</p>}
        <p className="nm-community-text">{post.content}</p>
        <PostImages images={post.images} />
        <footer className="nm-community-card__actions nm-admin-community__actions">
          {post.status !== 'APPROVED' && post.status !== 'REMOVED' && !deletedAt && <button type="button" className="admin-button primary compact" disabled={busy !== null} onClick={() => void act(post.id, () => communityAdminApi.approve(post.id), 'Đã duyệt bài viết.')}>Duyệt</button>}
          {post.status === 'PENDING' && !deletedAt && <button type="button" className="admin-button secondary compact" disabled={busy !== null} onClick={() => setPending({ kind: 'reject', postId: post.id })}>Từ chối</button>}
          {post.status === 'APPROVED' && !deletedAt && <button type="button" className="admin-button secondary compact" disabled={busy !== null} onClick={() => void act(post.id, () => communityAdminApi.pin(post.id, !post.pinned), post.pinned ? 'Đã bỏ ghim.' : 'Đã ghim bài viết.')}>{post.pinned ? 'Bỏ ghim' : 'Ghim'}</button>}
          {post.status !== 'REMOVED' && <button type="button" className="admin-button danger compact" disabled={busy !== null} onClick={() => setPending({ kind: 'remove', postId: post.id })}>Gỡ bài</button>}
        </footer>
      </article>)}
      {posts.loading && <p className="nm-community-muted" role="status">Đang tải…</p>}
      {posts.hasMore && !posts.loading && <button type="button" className="admin-button secondary" onClick={posts.loadMore}>Tải thêm</button>}
    </section>}

    {view === 'REPORTS' && <section className="admin-card nm-admin-community__list" aria-busy={reports.loading}>
      {reports.error && <p className="nm-community-error" role="alert">{reports.error} <button type="button" className="admin-button secondary compact" onClick={reports.reload}>Thử lại</button></p>}
      {!reports.loading && !reports.error && reports.items.length === 0 && <p className="admin-inline-empty">Không có báo cáo nào cần xử lý.</p>}
      {reports.items.map((report) => <article key={report.id} className="nm-community-card">
        <header className="nm-community-card__head">
          <div className="nm-community-card__meta"><strong>{reasonLabel(report.reason)}</strong><span>Người báo cáo: {report.reporter.display_name} · {relativeTime(report.created_at)}</span></div>
          <div className="nm-community-card__tags"><span className="nm-community-tag is-rejected">{report.open_report_count} báo cáo mở</span><span className="nm-community-tag">{reportStatusLabel[report.status]}</span></div>
        </header>
        {report.note && <p className="nm-community-muted">Ghi chú: {report.note}</p>}
        <blockquote className="nm-admin-community__quote"><strong>{report.post_author?.display_name ?? 'Thành viên'}:</strong> {report.post_excerpt ?? '(bài viết không còn)'}</blockquote>
        <footer className="nm-community-card__actions nm-admin-community__actions">
          <button type="button" className="admin-button secondary compact" disabled={busy !== null} onClick={() => setPending({ kind: 'resolve', reportId: report.id, action: 'DISMISS' })}>Bỏ qua</button>
          {!report.post_deleted && <button type="button" className="admin-button danger compact" disabled={busy !== null} onClick={() => setPending({ kind: 'resolve', reportId: report.id, action: 'REMOVE_POST' })}>Gỡ bài</button>}
        </footer>
      </article>)}
      {reports.loading && <p className="nm-community-muted" role="status">Đang tải…</p>}
      {reports.hasMore && !reports.loading && <button type="button" className="admin-button secondary" onClick={reports.loadMore}>Tải thêm</button>}
    </section>}

    <AccessibleDialog open={pending !== null} title={pendingTitle} onClose={() => { setPending(null); setNote('') }}
      description={pending?.kind === 'reject' ? 'Người đăng sẽ thấy lý do này.' : pending?.kind === 'remove' || pending?.kind === 'resolve' && pending.action === 'REMOVE_POST' ? 'Bài viết sẽ bị ẩn và người đăng nhận thông báo (không nêu người báo cáo).' : undefined}
      footer={<><button type="button" className="admin-button secondary" onClick={() => { setPending(null); setNote('') }}>Huỷ</button><button type="button" className="admin-button primary" onClick={() => void confirmPending()}>Xác nhận</button></>}>
      <label className="nm-community-field">{pending?.kind === 'reject' ? 'Lý do từ chối (bắt buộc)' : 'Ghi chú (không bắt buộc)'}
        <textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
    </AccessibleDialog>
  </div>
}
