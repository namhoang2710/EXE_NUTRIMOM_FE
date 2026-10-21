import { PencilLine } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityApi } from '../api/community-api'
import { CommunityAside } from '../components/CommunityAside'
import { CommunityFilters, type CommunityTab } from '../components/CommunityFilters'
import { CommunityNotificationsPanel } from '../components/CommunityNotificationsPanel'
import { CommunitySidebar } from '../components/CommunitySidebar'
import { ComposerPrompt } from '../components/ComposerPrompt'
import { FeedEmpty, FeedError } from '../components/FeedStatus'
import { PostCard } from '../components/PostCard'
import { PostCardSkeleton } from '../components/PostCardSkeleton'
import { PostComposerDialog } from '../components/PostComposerDialog'
import { ReportDialog } from '../components/ReportDialog'
import { useCommunityFeed, type FeedSource } from '../hooks/useCommunityFeed'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { usePostReactions } from '../hooks/usePostReactions'
import { friendlyError, isAbort } from '../model/community-errors'
import { clearReturnPath } from '../model/community-return-path'
import { isPostTopic } from '../model/community-topics'
import type { CommunityPost } from '../model/community-types'
import '../styles/community.css'

const UUID = /^[0-9a-f-]{36}$/i

/** Bài được mở từ Đã lưu / Thông báo (`?post=`): hiện ở đầu trang, có highlight. */
function useFocusedPost(postId: string | null) {
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setPost(null)
    setError(null)
    if (!postId) return
    const controller = new AbortController()
    communityApi.post(postId, controller.signal).then(setPost, (reason: unknown) => {
      if (!isAbort(reason)) setError(friendlyError(reason).message)
    })
    return () => controller.abort()
  }, [postId])
  return { post, setPost, error }
}

export function CommunityPage() {
  const [params, setParams] = useSearchParams()
  // Desktop (≥ 1100px): 3 cột — menu trái, feed giữa, thông báo/quy tắc phải. Nhỏ hơn: 1 cột.
  const isDesktop = useMediaQuery('(min-width: 1100px)')
  const { profile, user } = useAuth()
  const displayName = profile?.display_name || user?.displayName || ''
  const tab: CommunityTab = params.get('tab') === 'saved' || params.get('tab') === 'mine' ? params.get('tab') as CommunityTab : 'all'
  const rawTopic = params.get('topic')
  const topic = isPostTopic(rawTopic) ? rawTopic : undefined
  const hasImages = params.get('images') === '1'
  const focusId = UUID.test(params.get('post') ?? '') ? params.get('post') : null

  const source = useMemo<FeedSource>(() => (tab === 'mine'
    ? { kind: 'mine' }
    : { kind: 'feed', query: { topic, hasImages, saved: tab === 'saved' } }), [tab, topic, hasImages])
  const feed = useCommunityFeed(source)
  const { state, patchPost, removePost, adjustComments } = feed
  const { post: focusedPost, setPost: setFocusedPost, error: focusedError } = useFocusedPost(focusId)

  // Đường dẫn đích lưu tạm cho luồng đăng ký đã dùng xong: xoá để không ảnh hưởng lần đăng nhập sau.
  useEffect(() => { clearReturnPath() }, [])

  const [composer, setComposer] = useState<{ editing: CommunityPost | null } | null>(null)
  const [reporting, setReporting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CommunityPost | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deletingRef = useRef(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Thao tác trên bài đang mở riêng (?post=) cũng phải cập nhật bản đó.
  const patchEverywhere = useCallback((postId: string, patch: Partial<CommunityPost>) => {
    patchPost(postId, patch)
    setFocusedPost((current) => (current?.id === postId ? { ...current, ...patch } : current))
  }, [patchPost, setFocusedPost])
  const removeEverywhere = useCallback((postId: string) => {
    removePost(postId)
    setFocusedPost((current) => (current?.id === postId ? null : current))
  }, [removePost, setFocusedPost])
  const reactions = usePostReactions(patchEverywhere, removeEverywhere)

  const onCommentCount = useCallback((postId: string, delta: number) => {
    adjustComments(postId, delta)
    setFocusedPost((current) => (current?.id === postId ? { ...current, comment_count: Math.max(0, current.comment_count + delta) } : current))
  }, [adjustComments, setFocusedPost])
  // Ở tab Đã lưu, bỏ lưu xong thì bài rời khỏi danh sách ngay.
  const { toggleSave } = reactions
  const onSave = useCallback(async (post: CommunityPost) => {
    const unsaving = post.saved_by_me
    if (await toggleSave(post) && unsaving && tab === 'saved') removePost(post.id)
  }, [toggleSave, removePost, tab])
  const onReport = useCallback((post: CommunityPost) => setReporting(post.id), [])
  const onEdit = useCallback((post: CommunityPost) => setComposer({ editing: post }), [])
  const onDelete = useCallback((post: CommunityPost) => setDeleting(post), [])

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(feed.loadMore, state.status === 'ready' && state.hasMore)

  // Cuộn tới bài được mở từ Đã lưu / Thông báo sau khi tải xong.
  const scrolledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!focusedPost || scrolledFor.current === focusedPost.id) return
    scrolledFor.current = focusedPost.id
    document.getElementById(`community-post-${focusedPost.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedPost])

  function updateParams(next: { tab?: CommunityTab; topic?: string | null; hasImages?: boolean; post?: string | null }) {
    const merged = new URLSearchParams(params)
    if (next.tab !== undefined) { if (next.tab === 'all') merged.delete('tab'); else merged.set('tab', next.tab) }
    if (next.topic !== undefined) { if (next.topic) merged.set('topic', next.topic); else merged.delete('topic') }
    if (next.hasImages !== undefined) { if (next.hasImages) merged.set('images', '1'); else merged.delete('images') }
    if (next.post !== undefined) { if (next.post) merged.set('post', next.post); else merged.delete('post') }
    setParams(merged, { replace: next.post === undefined })
  }

  function onSaved(post: CommunityPost, created: boolean) {
    setComposer(null)
    if (created) {
      setNotice('Bài viết đã được gửi và đang chờ quản trị viên duyệt.')
      if (tab === 'mine' && !focusId) feed.reload(); else updateParams({ tab: 'mine', post: null })
      return
    }
    setNotice(post.status === 'PENDING' ? 'Đã lưu thay đổi. Bài viết sẽ hiển thị lại sau khi được duyệt.' : 'Đã lưu thay đổi.')
    if (tab === 'mine' || post.status === 'APPROVED') patchEverywhere(post.id, post)
    else removeEverywhere(post.id)
  }

  async function confirmDelete() {
    if (!deleting || deletingRef.current) return
    deletingRef.current = true
    setDeleteBusy(true)
    try {
      await communityApi.deletePost(deleting.id)
      removeEverywhere(deleting.id)
      setNotice('Đã xoá bài viết.')
      setDeleting(null)
    } catch (reason) {
      setNotice(friendlyError(reason).message)
      setDeleting(null)
    } finally {
      deletingRef.current = false
      setDeleteBusy(false)
    }
  }

  const visibleItems = focusedPost ? state.items.filter((post) => post.id !== focusedPost?.id) : state.items
  const visiblePinned = focusedPost ? state.pinned.filter((post) => post.id !== focusedPost?.id) : state.pinned
  const cardProps = { onLike: reactions.toggleLike, onSave, onReport, onEdit, onDelete, onCommentCount }
  const message = notice ?? reactions.error

  const compose = () => setComposer({ editing: null })
  const changeFilters = (next: { tab?: CommunityTab; topic?: string | null; hasImages?: boolean }) => updateParams({ ...next, post: null })
  const notifications = <CommunityNotificationsPanel onOpenPost={(postId) => updateParams({ post: postId })} />
  const feedSection = <>
    {message && <p className="nm-community-notice" role="status">{message} <button type="button" className="nm-community-link" onClick={() => { setNotice(null); reactions.clearError() }}>Đóng</button></p>}

    <section className="nm-community-feed" aria-busy={state.status === 'loading' || state.status === 'loadingMore'} aria-label="Danh sách bài viết">
      {focusId && !focusedPost && !focusedError && <PostCardSkeleton withImage={false} />}
      {focusedError && <p className="nm-community-notice is-error" role="alert">{focusedError} <button type="button" className="nm-community-link" onClick={() => updateParams({ post: null })}>Đóng</button></p>}
      {focusedPost && <div className="nm-community-focus"><p className="nm-community-focus__label">Bài viết bạn đang xem</p><PostCard post={focusedPost} highlighted showStatus={!(focusedPost.status === 'APPROVED')} {...cardProps} /></div>}

      {state.status === 'loading' && <PostCardSkeleton count={3} />}
      {state.status === 'error' && <FeedError message={state.error ?? ''} retryAt={state.retryAt} onRetry={feed.retry} />}

      {visiblePinned.map((post) => <PostCard key={`pin-${post.id}`} post={post} {...cardProps} />)}
      {visibleItems.map((post) => <PostCard key={post.id} post={post} showStatus={tab === 'mine'} {...cardProps} />)}

      {state.status === 'ready' && visibleItems.length === 0 && visiblePinned.length === 0 && !focusedPost && (
        tab === 'mine' ? <FeedEmpty title="Bạn chưa có bài viết nào" text="Hãy chia sẻ câu chuyện đầu tiên với các mẹ nhé." action={<button type="button" className="nm-primary-action" onClick={() => compose()}>Viết bài</button>} />
          : tab === 'saved' ? <FeedEmpty title="Chưa có bài đã lưu" text="Bấm “Lưu” trên bài viết để đọc lại sau." />
            : <FeedEmpty title="Chưa có bài viết phù hợp" text="Thử chọn chủ đề khác hoặc là người mở đầu câu chuyện." />)}

      {state.status === 'loadingMore' && <PostCardSkeleton withImage={false} />}
      {state.status === 'errorMore' && <FeedError message={state.error ?? ''} retryAt={state.retryAt} onRetry={feed.retry} />}
      {state.status === 'ready' && !state.hasMore && visibleItems.length > 0 && <p className="nm-community-end">Bạn đã xem hết bài viết.</p>}
      <div ref={sentinelRef} className="nm-community-sentinel" aria-hidden="true" />
    </section>

  </>

  return <main className={`nm-community-page${isDesktop ? ' is-wide' : ''}`}>
    {isDesktop
      ? <div className="nm-community-layout">
        <CommunitySidebar tab={tab} topic={topic} hasImages={hasImages} onChange={changeFilters} onCompose={compose} />
        <div className="nm-community-center">
          {tab !== 'saved' && <ComposerPrompt name={displayName} onCompose={compose} />}
          {feedSection}
        </div>
        <CommunityAside notifications={<CommunityNotificationsPanel inline onOpenPost={(postId) => updateParams({ post: postId })} />} />
      </div>
      : <>
        <header className="nm-community-hero">
          <div>
            <span className="nm-eyebrow">NutriMom · Cộng đồng</span>
            <h1>Cộng đồng dành cho mẹ</h1>
            <p>Chia sẻ hành trình mang thai, hỏi đáp và động viên nhau mỗi ngày.</p>
          </div>
          <div className="nm-community-hero__actions">
            {notifications}
            <button type="button" className="nm-primary-action" onClick={compose}><PencilLine size={18} aria-hidden="true" />Viết bài</button>
          </div>
        </header>
        <CommunityFilters tab={tab} topic={topic} hasImages={hasImages} onChange={changeFilters} />
        {feedSection}
      </>}

    {composer && <PostComposerDialog editing={composer.editing} onClose={() => setComposer(null)} onSaved={onSaved} />}
    <ReportDialog postId={reporting} onClose={() => setReporting(null)} />
    <AccessibleDialog open={deleting !== null} title="Xoá bài viết?" description="Bài viết và ảnh sẽ không còn hiển thị. Thao tác này không hoàn tác được." onClose={() => setDeleting(null)} busy={deleteBusy}
      footer={<><button type="button" className="nm-secondary-action" onClick={() => setDeleting(null)} disabled={deleteBusy}>Huỷ</button><button type="button" className="nm-primary-action is-danger" onClick={() => void confirmDelete()} disabled={deleteBusy}>{deleteBusy ? 'Đang xoá…' : 'Xoá'}</button></>}>
      <p className="nm-community-muted">{deleting?.content.slice(0, 160)}</p>
    </AccessibleDialog>
  </main>
}
