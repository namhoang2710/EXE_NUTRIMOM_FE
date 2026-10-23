import { BookmarkSimple, CaretRight, Flag, Newspaper, PencilLine, PushPin, SquaresFour, Tray, UserCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityAdminApi } from '../api/community-admin-api'
import { communityApi } from '../api/community-api'
import { invalidateCommunityReads } from '../api/community-requests'
import { AdminPostActions, type ModerationAction } from '../components/AdminPostActions'
import { AdminCommunityReports } from '../components/AdminCommunityReports'
import { CommunityRules } from '../components/CommunityRules'
import { CommunityNotificationsPanel } from '../components/CommunityNotificationsPanel'
import { CommunitySelect } from '../components/CommunitySelect'
import { ComposerPrompt } from '../components/ComposerPrompt'
import { FeedEmpty, FeedError, RetryButton } from '../components/FeedStatus'
import { PostCard } from '../components/PostCard'
import { PostCardSkeleton } from '../components/PostCardSkeleton'
import { PostComposerDialog } from '../components/PostComposerDialog'
import { useCursorCollection } from '../hooks/useCursorCollection'
import { usePostReactions } from '../hooks/usePostReactions'
import { useAdminCommunityPending } from '../hooks/useAdminCommunityPending'
import { adminReads } from '@/features/admin/api/admin-read'
import { adminCommunityTab, approveAndPin, canEditAdminPost, postStatusFilter, reportStatusOptions, type AdminCommunityTab } from '../model/admin-community'
import { friendlyError, isAbort, type FriendlyError } from '../model/community-errors'
import { communityTopics, isPostTopic, postStatusLabels } from '../model/community-topics'
import type { AdminPostItem, AdminPostInput, AdminReportItem, CommunityPost, PostStatus, PostTopic, ReportStatus } from '../model/community-types'
import '../styles/community.css'
import '../styles/admin-community.css'

const navigation = [
  { value: 'feed', label: 'Bảng tin cộng đồng', icon: Newspaper, caption: 'Trò chuyện cùng các mẹ' },
  { value: 'pending', label: 'Chờ duyệt', icon: Tray, caption: 'Xem xét nội dung mới' },
  { value: 'all', label: 'Tất cả bài viết', icon: SquaresFour, caption: 'Quản lý nội dung' },
  { value: 'pinned', label: 'Đã ghim', icon: PushPin, caption: 'Nội dung nổi bật' },
  { value: 'mine', label: 'Bài của tôi', icon: UserCircle, caption: 'Bài bạn đã đăng' },
  { value: 'saved', label: 'Đã lưu', icon: BookmarkSimple, caption: 'Bài viết để đọc lại' },
  { value: 'reports', label: 'Báo cáo', icon: Flag, caption: 'Giữ cộng đồng an toàn' },
] as const
const statusOptions = [{ value: '', label: 'Mọi trạng thái' }, ...Object.entries(postStatusLabels).map(([value, label]) => ({ value, label }))]
const postKey = (item: AdminPostItem) => item.post.id
const noReport = () => undefined
type Confirm = { kind: ModerationAction; item: AdminPostItem } | { kind: 'resolve'; report: AdminReportItem; action: 'DISMISS' | 'REMOVE_POST' }

function CommunityStream({ tab, status, topic, images, revision, busy, userId, onAction, onDetail, onEdit, onCompose }: {
  tab: AdminCommunityTab; status?: PostStatus; topic?: PostTopic; images: boolean; revision: number; busy: boolean; userId: string
  onAction: (item: AdminPostItem, action: ModerationAction) => void; onDetail: (item: AdminPostItem) => void
  onEdit: (item: AdminPostItem) => void; onCompose: () => void
}) {
  const load = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    void revision
    if (tab === 'feed' || tab === 'saved') {
      const page = await communityApi.feed({ topic, hasImages: images, saved: tab === 'saved' }, cursor, 20, signal)
      return { ...page, items: [...page.pinned ?? [], ...page.items].map((post) => ({ post, open_report_count: 0 })) }
    }
    if (tab === 'mine') {
      const page = await communityApi.myPosts(cursor, 20, status, signal)
      return { ...page, items: page.items.map((post) => ({ post, open_report_count: 0 })) }
    }
    return communityAdminApi.posts(tab === 'pending' ? 'PENDING' : status, cursor, 20, signal, tab === 'pinned')
  }, [tab, status, topic, images, revision])
  const list = useCursorCollection<AdminPostItem>(load, postKey)
  const { setItems } = list
  const patch = useCallback((id: string, changes: Partial<CommunityPost>) => setItems((items) => items.map((item) => item.post.id === id ? { ...item, post: { ...item.post, ...changes } } : item)), [setItems])
  const remove = useCallback((id: string) => setItems((items) => items.filter((item) => item.post.id !== id)), [setItems])
  const reactions = usePostReactions(patch, remove)
  const onCommentCount = useCallback((id: string, delta: number) => setItems((items) => items.map((item) => item.post.id === id ? { ...item, post: { ...item.post, comment_count: Math.max(0, item.post.comment_count + delta) } } : item)), [setItems])
  const { toggleSave } = reactions
  const onSave = useCallback(async (post: CommunityPost) => { if (await toggleSave(post) && tab === 'saved' && post.saved_by_me) remove(post.id) }, [toggleSave, remove, tab])
  return <>
    {tab === 'mine' && <ComposerPrompt admin name="Ban quản trị" onCompose={onCompose} />}
    {reactions.error && <p className="nm-community-notice is-error" role="alert">{reactions.error}</p>}
    <section className="nm-community-feed" aria-label={navigation.find((item) => item.value === tab)?.label} aria-busy={list.loading}>
      {list.loading && !list.items.length && <PostCardSkeleton count={3} />}
      {list.error && <FeedError message={list.error.message} retryAt={list.error.retryAt} onRetry={list.retry} />}
      {!list.loading && !list.error && !list.items.length && <FeedEmpty title={tab === 'pending' ? 'Bạn đã xem hết bài chờ duyệt' : tab === 'pinned' ? 'Chưa có bài nào được ghim' : 'Chưa có bài viết trong mục này'} text={tab === 'pending' ? 'Các bài mới sẽ xuất hiện tại đây khi được gửi lên.' : 'Chọn mục khác hoặc chia sẻ thông tin hữu ích từ Ban quản trị.'} action={tab === 'mine' ? <button className="nm-primary-action" type="button" onClick={onCompose}>Viết bài</button> : undefined} />}
      {list.items.map((item) => <div key={item.post.id} className="nm-admin-post-entry">
        <PostCard post={item.post} inactive={Boolean(item.deleted_at)} showStatus moderator onLike={reactions.toggleLike} onSave={onSave} onReport={noReport}
          onEdit={() => onEdit(item)} onDelete={() => onAction(item, 'deleteOwn')} onCommentCount={onCommentCount} onDeleteComment={communityAdminApi.deleteComment}
          moderation={<><div className="nm-admin-post-context">{item.open_report_count > 0 && <span><Flag size={14} />{item.open_report_count} báo cáo đang mở</span>}{item.deleted_at && <span>Bài đã được gỡ hoặc xóa</span>}</div><AdminPostActions item={item} userId={userId} busy={busy} onAction={onAction} onDetail={onDetail} onEdit={onEdit} /></>} />
      </div>)}
      {list.hasMore && <button type="button" className="nm-secondary-action nm-admin-community-more" disabled={list.loading || !!list.error} onClick={list.loadMore}>{list.loading ? 'Đang tải…' : 'Tải thêm bài viết'}</button>}
      {list.windowed && <p className="nm-community-muted">Để trang luôn nhẹ, chỉ giữ tối đa 200 bài trong phần đang xem. Bạn vẫn có thể tải tiếp các bài cũ hơn.</p>}
      {!list.loading && !list.error && !list.hasMore && list.items.length > 0 && <p className="nm-community-end">Bạn đã xem hết danh sách hiện tại.</p>}
    </section>
  </>
}

export function AdminCommunityWorkspace() {
  const pending = useAdminCommunityPending()
  const pendingRevision = useRef(0)
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const tab = adminCommunityTab(params.get('tab'))
  const feedMode = tab === 'feed' || tab === 'saved'
  const status = postStatusFilter(params.get('status'))
  const reportStatus: ReportStatus = ['OPEN', 'DISMISSED', 'ACTION_TAKEN'].includes(params.get('reportStatus') ?? '') ? params.get('reportStatus') as ReportStatus : 'OPEN'
  const rawTopic = params.get('topic')
  const topic = isPostTopic(rawTopic) ? rawTopic : undefined
  const images = params.get('images') === '1'
  const selectedId = params.get('post')
  const [detail, setDetail] = useState<AdminPostItem | null>(null)
  const [detailError, setDetailError] = useState<FriendlyError | null>(null)
  const [detailRetry, setDetailRetry] = useState(0)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (pendingRevision.current === pending.revision) return
    pendingRevision.current = pending.revision
    adminReads.expire('GET:/admin/community/posts?')
    if (tab === 'pending') setRevision((value) => value + 1)
  }, [pending.revision, tab])
  const [composer, setComposer] = useState<{ post: CommunityPost | null } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const deadline = useRef(0)
  const [notice, setNotice] = useState<{ message: string; error?: boolean; retryAt?: number } | null>(null)
  const [confirmError, setConfirmError] = useState<FriendlyError | null>(null)
  const patchDetail = useCallback((id: string, patch: Partial<CommunityPost>) => setDetail((current) => current?.post.id === id ? { ...current, post: { ...current.post, ...patch } } : current), [])
  const removeDetail = useCallback(() => { setDetail(null); setDetailError({ message: 'Bài viết không còn tồn tại hoặc đã bị gỡ.', retryAt: 0, status: 404, retryable: false }) }, [])
  const detailReactions = usePostReactions(patchDetail, removeDetail)
  const detailCommentCount = useCallback((id: string, delta: number) => setDetail((current) => current?.post.id === id ? { ...current, post: { ...current.post, comment_count: Math.max(0, current.post.comment_count + delta) } } : current), [])

  const updateParams = (changes: Record<string, string | null>) => setParams((previous) => {
    const next = new URLSearchParams(previous)
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key) }
    return next
  }, { replace: true })
  const chooseTab = (value: string) => updateParams({ tab: value, post: null, status: null })
  const openDetail = (item: AdminPostItem) => updateParams({ post: item.post.id })

  useEffect(() => {
    setDetail(null); setDetailError(null)
    if (!selectedId) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void communityAdminApi.detail(selectedId, controller.signal).then((value) => { if (!controller.signal.aborted) setDetail(value) }, (reason: unknown) => { if (!isAbort(reason) && !controller.signal.aborted) setDetailError(friendlyError(reason)) })
    }, 100)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [selectedId, detailRetry])

  const compose = () => setComposer({ post: null })
  const edit = async (item: AdminPostItem) => {
    if (!canEditAdminPost(item, userId) || lock.current || Date.now() < deadline.current) return
    lock.current = true; setBusy(true)
    try {
      const post = await communityApi.post(item.post.id)
      if (!post.can_edit) throw new Error('Bài viết hiện không thể chỉnh sửa.')
      updateParams({ post: null })
      setComposer({ post })
    } catch (reason) { const error = friendlyError(reason); deadline.current = error.retryAt; setNotice({ message: error.message, error: true, retryAt: error.retryAt }) }
    finally { lock.current = false; setBusy(false) }
  }
  const refresh = () => { communityAdminApi.invalidate(); invalidateCommunityReads(); setRevision((value) => value + 1) }
  const publish = async (input: AdminPostInput) => (await communityAdminApi.create(input)).post
  const onSaved = (post: CommunityPost, created: boolean) => {
    setComposer(null); refresh()
    updateParams({ tab: 'mine', post: post.id, status: null })
    setDetail({ post, open_report_count: 0 })
    setNotice({ message: created ? 'Bài viết của Ban quản trị đã được xuất bản.' : 'Đã lưu thay đổi bài viết.' })
  }
  const runAction = async (item: AdminPostItem, action: ModerationAction) => {
    if (lock.current || Date.now() < deadline.current) return
    lock.current = true; setBusy(true); setNotice(null)
    try {
      let result: AdminPostItem | null = null
      let message = 'Đã cập nhật bài viết.'
      if (action === 'approvePin') {
        const outcome = await approveAndPin(() => communityAdminApi.approve(item.post.id), () => communityAdminApi.pin(item.post.id, true))
        result = outcome.item
        message = outcome.pinError ? `Đã duyệt bài, chưa ghim được. ${friendlyError(outcome.pinError).message}` : 'Đã duyệt và ghim bài viết.'
        if (outcome.pinError) deadline.current = friendlyError(outcome.pinError).retryAt
      } else if (action === 'approve') result = await communityAdminApi.approve(item.post.id)
      else if (action === 'pin' || action === 'unpin') result = await communityAdminApi.pin(item.post.id, action === 'pin')
      if (result && selectedId === result.post.id) setDetail(result)
      refresh(); setNotice({ message })
    } catch (reason) { const error = friendlyError(reason); deadline.current = error.retryAt; setNotice({ message: error.message, error: true, retryAt: error.retryAt }) }
    finally { lock.current = false; setBusy(false) }
  }
  const action = (item: AdminPostItem, kind: ModerationAction) => {
    if (kind === 'reject' || kind === 'remove' || kind === 'deleteOwn') { updateParams({ post: null }); setNote(''); setConfirmError(null); setConfirm({ kind, item }) }
    else void runAction(item, kind)
  }
  async function confirmAction() {
    if (!confirm || lock.current || Date.now() < deadline.current) return
    if (confirm.kind === 'reject' && !note.trim()) { setConfirmError({ message: 'Vui lòng nhập lý do từ chối.', retryAt: 0, status: 422, retryable: false }); return }
    lock.current = true; setBusy(true); setConfirmError(null)
    try {
      if (confirm.kind === 'resolve') await communityAdminApi.resolve(confirm.report.id, confirm.action, note.trim())
      else if (confirm.kind === 'reject') await communityAdminApi.reject(confirm.item.post.id, note.trim())
      else if (confirm.kind === 'deleteOwn') await communityApi.deletePost(confirm.item.post.id)
      else await communityAdminApi.remove(confirm.item.post.id, note.trim())
      setConfirm(null); refresh(); updateParams({ post: null }); setNotice({ message: 'Đã xử lý và cập nhật nội dung cộng đồng.' })
    } catch (reason) { const error = friendlyError(reason); deadline.current = error.retryAt; setConfirmError(error) }
    finally { lock.current = false; setBusy(false) }
  }
  const title = navigation.find((item) => item.value === tab)!
  const confirmTitle = confirm?.kind === 'reject' ? 'Từ chối bài viết' : confirm?.kind === 'deleteOwn' ? 'Xóa bài của tôi' : confirm?.kind === 'resolve' && confirm.action === 'DISMISS' ? 'Bỏ qua báo cáo' : 'Gỡ bài viết'

  return <div className="nm-admin-community admin-page">
    <div className="nm-admin-community-layout">
      <aside className="nm-admin-community-nav" aria-label="Điều hướng cộng đồng admin"><p className="nm-admin-community-label">Cộng đồng của bạn</p><nav>{navigation.map(({ value, label, icon: Icon, caption }) => <button type="button" key={value} className={tab === value ? 'is-active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => chooseTab(value)}><Icon size={21} weight={tab === value ? 'fill' : 'regular'} /><span><strong>{label}{value === 'pending' && pending.count !== null && pending.count > 0 && <span className="nm-admin-community-pending-badge" aria-label={`${pending.count} bài chờ duyệt`} title={pending.error ? 'Số liệu chưa cập nhật, đang chờ kết nối lại.' : undefined}>{pending.count}</span>}</strong><small>{caption}</small></span><CaretRight size={13} /></button>)}</nav><CommunityRules collapsible /></aside>
      <div className="nm-admin-community-main">
        <div className="nm-admin-community-mobile-nav"><CommunitySelect label="Không gian cộng đồng" value={tab} options={navigation.map((item) => ({ ...item, label: item.value === 'pending' && pending.count !== null && pending.count > 0 ? `${item.label} (${pending.count})` : item.label }))} onChange={chooseTab} /></div>
        <div className="nm-admin-community-toolbar"><h1>{title.label}</h1><div className="nm-admin-community-toolbar__actions">{(tab === 'all' || tab === 'mine') && <CommunitySelect label="Trạng thái bài" value={status ?? ''} options={statusOptions} onChange={(value) => updateParams({ status: value })} />}{tab === 'reports' && <CommunitySelect label="Trạng thái báo cáo" value={reportStatus} options={reportStatusOptions} onChange={(value) => updateParams({ reportStatus: value })} />}{tab === 'mine' && <button type="button" className="nm-primary-action" onClick={compose}><PencilLine size={18} />Viết bài</button>}<CommunityNotificationsPanel onOpenPost={(id) => updateParams({ post: id })} /></div></div>
        <div className="nm-admin-community-mobile-rules"><CommunityRules collapsible /></div>
        {feedMode && <div className="nm-admin-community-filters"><CommunitySelect label="Chủ đề" value={topic ?? ''} options={[{ value: '', label: 'Tất cả chủ đề' }, ...communityTopics]} onChange={(value) => updateParams({ topic: value })} /><label className="nm-community-switch"><input type="checkbox" checked={images} onChange={(event) => updateParams({ images: event.target.checked ? '1' : null })} />Chỉ bài có ảnh</label></div>}
        {pending.error && <div className="nm-community-notice is-error" role="status"><p>Chưa cập nhật được số bài chờ duyệt. {pending.error.message}</p><RetryButton retryAt={pending.error.retryAt} onRetry={pending.retry} /></div>}
        {notice && <div className={`nm-community-notice${notice.error ? ' is-error' : ''}`} role={notice.error ? 'alert' : 'status'}><p>{notice.message}</p>{!!notice.retryAt && <RetryButton retryAt={notice.retryAt} onRetry={() => setNotice(null)} />}<button className="nm-community-link" type="button" onClick={() => setNotice(null)}>Đóng</button></div>}
        {tab === 'pinned' && <p className="nm-admin-community-hint"><PushPin size={17} />Tối đa 3 bài ghim. Bỏ ghim một bài để nhường chỗ cho nội dung mới.</p>}
        {tab === 'reports' ? <AdminCommunityReports status={reportStatus} revision={revision} busy={busy} onResolve={(report, next) => { setNote(''); setConfirmError(null); setConfirm({ kind: 'resolve', report, action: next }) }} onOpen={(id) => updateParams({ post: id })} />
          : <CommunityStream tab={tab} status={status} topic={topic} images={images} revision={revision} busy={busy} userId={userId} onAction={action} onDetail={openDetail} onEdit={(item) => void edit(item)} onCompose={compose} />}
      </div>
    </div>
    {composer && <PostComposerDialog admin editing={composer.post} onClose={() => setComposer(null)} onSaved={onSaved} onPublish={publish} />}
    <AccessibleDialog open={!!selectedId} animated title="Chi tiết bài viết" className="nm-admin-community-detail" onClose={() => updateParams({ post: null })}>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={`nm-community-notice${notice.error ? ' is-error' : ''}`}>{notice.message}</p>}
      {detailError ? <FeedError message={detailError.message} retryAt={detailError.retryAt} onRetry={() => setDetailRetry((value) => value + 1)} /> : !detail ? <PostCardSkeleton withImage={false} /> : <>
        {detailReactions.error && <p role="alert" className="nm-community-error">{detailReactions.error}</p>}
        <PostCard post={detail.post} inactive={Boolean(detail.deleted_at)} idPrefix="admin-community-detail" moderator showStatus onLike={detailReactions.toggleLike} onSave={(post) => void detailReactions.toggleSave(post)} onReport={noReport} onEdit={() => void edit(detail)} onDelete={() => action(detail, 'deleteOwn')} onCommentCount={detailCommentCount}
          moderation={<AdminPostActions item={detail} userId={userId} busy={busy} onAction={action} onEdit={(item) => void edit(item)} />} onDeleteComment={communityAdminApi.deleteComment} />
        <dl className="nm-admin-community-metadata"><div><dt>Tạo lúc</dt><dd>{new Date(detail.post.created_at).toLocaleString('vi-VN')}</dd></div>{detail.post.published_at && <div><dt>Xuất bản</dt><dd>{new Date(detail.post.published_at).toLocaleString('vi-VN')}</dd></div>}{detail.moderated_at && <div><dt>Kiểm duyệt gần nhất</dt><dd>{new Date(detail.moderated_at).toLocaleString('vi-VN')}</dd></div>}{detail.post.reject_reason && <div><dt>Lý do kiểm duyệt</dt><dd>{detail.post.reject_reason}</dd></div>}<div><dt>Báo cáo đang mở</dt><dd>{detail.open_report_count}</dd></div></dl>
      </>}
    </AccessibleDialog>
    <AccessibleDialog animated open={confirm !== null} title={confirmTitle} onClose={() => { if (!busy) setConfirm(null) }} busy={busy} description={confirm?.kind === 'resolve' && confirm.action === 'DISMISS' ? 'Báo cáo này sẽ được đóng. Bài viết vẫn hiển thị.' : 'Người đăng sẽ thấy quyết định phù hợp. Khi gỡ bài, các báo cáo còn mở của bài cũng được đóng.'}
      footer={<><button className="nm-secondary-action" type="button" disabled={busy} onClick={() => setConfirm(null)}>Huỷ</button>{confirmError?.retryAt ? <RetryButton retryAt={confirmError.retryAt} onRetry={() => void confirmAction()} /> : <button className="nm-primary-action" type="button" disabled={busy} onClick={() => void confirmAction()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button>}</>}>
      <label className="nm-community-field">{confirm?.kind === 'reject' ? 'Lý do từ chối (bắt buộc)' : 'Ghi chú (không bắt buộc)'}<textarea rows={4} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>{confirmError && <p role="alert" className="nm-community-error">{confirmError.message}</p>}
    </AccessibleDialog>
  </div>
}
