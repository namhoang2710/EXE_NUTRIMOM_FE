import { BookmarkSimple, ChatCircle, Flag, Heart, PencilSimple, PushPin, SealCheck, Trash } from '@phosphor-icons/react'
import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import type { CommunityPost } from '../model/community-types'
import { initial, relativeTime } from '../model/community-time'
import { postStatusLabels, topicLabel } from '../model/community-topics'
import { CommentsSection } from './CommentsSection'
import { PostImages } from './PostImages'
import { brandDisplayName } from '@/shared/model/display-copy'

const COLLAPSE_AT = 420

interface Props {
  post: CommunityPost
  highlighted?: boolean
  showStatus?: boolean
  onLike: (post: CommunityPost) => void
  onSave: (post: CommunityPost) => void
  onReport: (post: CommunityPost) => void
  onEdit: (post: CommunityPost) => void
  onDelete: (post: CommunityPost) => void
  onCommentCount: (postId: string, delta: number) => void
  moderator?: boolean
  moderation?: ReactNode
  onDeleteComment?: (commentId: string) => Promise<unknown>
  idPrefix?: string
  inactive?: boolean
}

/** Một bài trong feed. memo: tim/lưu một bài không làm vẽ lại các bài khác. */
export const PostCard = memo(function PostCard({ post, highlighted = false, showStatus = false, onLike, onSave, onReport, onEdit, onDelete, onCommentCount, moderator = false, moderation, onDeleteComment, idPrefix = 'community-post', inactive = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(highlighted)
  const [heartBurst, setHeartBurst] = useState(0)
  const previousLike = useRef({ liked: post.liked_by_me, count: post.like_count })
  useEffect(() => {
    const previous = previousLike.current
    if ((!previous.liked && post.liked_by_me) || post.like_count > previous.count) setHeartBurst((value) => value + 1)
    else if (previous.liked && !post.liked_by_me) setHeartBurst(0)
    previousLike.current = { liked: post.liked_by_me, count: post.like_count }
  }, [post.liked_by_me, post.like_count])
  const isPublic = post.status === 'APPROVED' && !inactive
  const long = post.content.length > COLLAPSE_AT
  const text = long && !expanded ? `${post.content.slice(0, COLLAPSE_AT).trimEnd()}…` : post.content
  const authorName = brandDisplayName(post.author.display_name)

  return <article id={`${idPrefix}-${post.id}`} className={`nm-community-card${highlighted ? ' is-highlighted' : ''}${heartBurst > 0 ? ' is-celebrating' : ''}`} aria-label={`Bài viết của ${authorName}`}>
    <header className="nm-community-card__head">
      <span className="nm-community-avatar" aria-hidden="true">{initial(authorName)}</span>
      <div className="nm-community-card__meta">
        <strong>{authorName}</strong>
        {post.official && <span className="nm-community-official"><SealCheck size={14} weight="fill" aria-hidden />Ban quản trị</span>}
        <span><time dateTime={post.published_at ?? post.created_at}>{relativeTime(post.published_at ?? post.created_at)}</time>{post.edited_at && ' · đã chỉnh sửa'} · {topicLabel(post.topic)}</span>
      </div>
      <div className="nm-community-card__tags">
        {post.pinned && <span className="nm-community-tag is-pinned"><PushPin size={14} weight="fill" aria-hidden="true" />Đã ghim</span>}
        {showStatus && <span className={`nm-community-tag is-${post.status.toLowerCase()}`}>{postStatusLabels[post.status]}</span>}
      </div>
    </header>

    {showStatus && post.status === 'REJECTED' && post.reject_reason && <p className="nm-community-reject"><strong>Lý do từ chối:</strong> {post.reject_reason}</p>}
    {showStatus && post.status === 'PENDING' && <p className="nm-community-muted">{moderator ? 'Bài viết đang chờ kiểm duyệt trước khi xuất hiện trên bảng tin.' : 'Bài viết đang chờ quản trị viên duyệt, chỉ bạn nhìn thấy.'}</p>}

    <div className="nm-community-card__body">
    <p className="nm-community-text">{text}</p>
    {long && <button type="button" className="nm-community-link" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>}
    <PostImages images={post.images} />
    {heartBurst > 0 && <span key={heartBurst} className="nm-community-heart-burst" aria-hidden onAnimationEnd={() => setHeartBurst(0)}><Heart size={84} weight="fill" /></span>}
    </div>

    <footer className="nm-community-card__actions">
      <button type="button" className={`nm-community-action${post.liked_by_me ? ' is-liked' : ''}`} aria-pressed={post.liked_by_me} disabled={!isPublic} onClick={() => onLike(post)}>
        <Heart size={19} weight={post.liked_by_me ? 'fill' : 'regular'} aria-hidden="true" /><span>{post.like_count}</span><span className="sr-only"> lượt thích</span>
      </button>
      <button type="button" className="nm-community-action" aria-expanded={commentsOpen} disabled={!isPublic} onClick={() => setCommentsOpen(!commentsOpen)}>
        <ChatCircle size={19} aria-hidden="true" /><span>{post.comment_count}</span><span className="sr-only"> bình luận</span>
      </button>
      <button type="button" className={`nm-community-action${post.saved_by_me ? ' is-saved' : ''}`} aria-pressed={post.saved_by_me} disabled={!isPublic} onClick={() => onSave(post)}>
        <BookmarkSimple size={19} weight={post.saved_by_me ? 'fill' : 'regular'} aria-hidden="true" /><span>{post.saved_by_me ? 'Đã lưu' : 'Lưu'}</span>
      </button>
      <span className="nm-community-card__spacer" />
      {!moderator && post.can_edit && <button type="button" className="nm-community-icon-button" aria-label="Sửa bài viết" onClick={() => onEdit(post)}><PencilSimple size={18} /></button>}
      {!moderator && post.can_delete && <button type="button" className="nm-community-icon-button" aria-label="Xoá bài viết" onClick={() => onDelete(post)}><Trash size={18} /></button>}
      {!moderator && !post.can_edit && isPublic && <button type="button" className="nm-community-icon-button" aria-label="Báo cáo bài viết" onClick={() => onReport(post)}><Flag size={18} /></button>}
    </footer>

    {moderation}
    {commentsOpen && isPublic && <CommentsSection postId={post.id} moderator={moderator} onDeleteComment={onDeleteComment} onCountChange={(delta) => onCommentCount(post.id, delta)} />}
  </article>
})
