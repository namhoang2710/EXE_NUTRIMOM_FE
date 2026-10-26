import { ArrowSquareOut, Flag, SealCheck } from '@phosphor-icons/react'
import { useCallback } from 'react'
import { communityAdminApi } from '../api/community-admin-api'
import { useCursorCollection } from '../hooks/useCursorCollection'
import type { AdminReportItem, ReportStatus } from '../model/community-types'
import { relativeTime } from '../model/community-time'
import { reportReasons } from '../model/community-topics'
import { brandDisplayName } from '@/shared/model/display-copy'
import { reportStatusOptions } from '../model/admin-community'
import { FeedEmpty, FeedError } from './FeedStatus'
import { PostCardSkeleton } from './PostCardSkeleton'

const reportKey = (item: AdminReportItem) => item.id
export function AdminCommunityReports({ status, revision, busy, onResolve, onOpen }: {
  status: ReportStatus; revision: number; busy: boolean
  onResolve: (report: AdminReportItem, action: 'DISMISS' | 'REMOVE_POST') => void
  onOpen: (postId: string) => void
}) {
  const load = useCallback((cursor: string | null, signal: AbortSignal) => {
    void revision
    return communityAdminApi.reports(status, cursor, 20, signal)
  }, [status, revision])
  const list = useCursorCollection(load, reportKey)
  return <section className="nm-community-feed" aria-label="Danh sách báo cáo" aria-busy={list.loading}>
    {list.loading && !list.items.length && <PostCardSkeleton count={2} withImage={false} />}
    {list.error && <FeedError message={list.error.message} retryAt={list.error.retryAt} onRetry={list.retry} />}
    {!list.loading && !list.error && !list.items.length && <FeedEmpty title="Không có báo cáo trong mục này" text="Các báo cáo phù hợp sẽ xuất hiện tại đây để bạn xem xét và xử lý." />}
    {list.items.map((report) => <article key={report.id} className="nm-community-card nm-admin-report">
      <header className="nm-community-card__head"><span className="nm-admin-report__icon"><Flag size={21} weight="duotone" /></span><div className="nm-community-card__meta"><strong>{reportReasons.find((item) => item.value === report.reason)?.label ?? report.reason}</strong><span>{relativeTime(report.created_at)}</span></div><span className={`nm-community-tag ${report.status === 'OPEN' ? 'is-pending' : 'is-approved'}`}>{reportStatusOptions.find((item) => item.value === report.status)?.label}</span></header>
      <p className="nm-community-muted">Người báo cáo: <strong>{report.reporter.display_name}</strong></p>
      {report.note && <p className="nm-community-text">{report.note}</p>}
      <blockquote><strong>{report.post_author?.display_name ? brandDisplayName(report.post_author.display_name) : 'Thành viên'}</strong><p>{report.post_excerpt ?? 'Bài viết không còn hiển thị.'}</p></blockquote>
      {report.resolution_note && <p className="nm-community-muted">Ghi chú xử lý: {report.resolution_note}</p>}
      <div className="nm-admin-community-actions"><button type="button" onClick={() => onOpen(report.post_id)}><ArrowSquareOut size={16} />Xem bài viết</button>{report.status === 'OPEN' && <><button type="button" disabled={busy} onClick={() => onResolve(report, 'DISMISS')}><SealCheck size={16} />Bỏ qua báo cáo</button>{!report.post_deleted && <button className="is-danger" type="button" disabled={busy} onClick={() => onResolve(report, 'REMOVE_POST')}>Gỡ bài & đóng báo cáo</button>}</>}</div>
    </article>)}
    {list.hasMore && <button type="button" className="nm-secondary-action" disabled={list.loading || !!list.error} onClick={list.loadMore}>{list.loading ? 'Đang tải…' : 'Tải thêm báo cáo'}</button>}
  </section>
}
