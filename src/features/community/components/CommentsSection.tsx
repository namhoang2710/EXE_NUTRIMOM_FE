import { PaperPlaneRight, Trash } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { useComments } from '../hooks/useComments'
import { initial, relativeTime } from '../model/community-time'
import { communityLimits } from '../model/community-topics'
import { RetryButton } from './FeedStatus'
import { brandDisplayName } from '@/shared/model/display-copy'

interface Props {
  postId: string
  onCountChange: (delta: number) => void
  moderator?: boolean
  onDeleteComment?: (commentId: string) => Promise<unknown>
}

export function CommentsSection({ postId, onCountChange, moderator = false, onDeleteComment }: Props) {
  const comments = useComments(postId, true, onCountChange, onDeleteComment)
  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()
  const inputId = useId()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!trimmed || trimmed.length > communityLimits.commentMaxChars) return
    if (await comments.send(trimmed)) setDraft('')
  }

  return <section className="nm-community-comments" aria-label="Bình luận">
    {comments.loading && comments.items.length === 0 && <p className="nm-community-muted" role="status">Đang tải bình luận…</p>}
    {comments.items.length === 0 && !comments.loading && !comments.error && <p className="nm-community-muted">Chưa có bình luận. Hãy là người đầu tiên!</p>}
    <ul>
      {comments.items.map((comment) => <li key={comment.id} className="nm-community-comment">
        <span className="nm-community-avatar is-small" aria-hidden="true">{initial(brandDisplayName(comment.author.display_name))}</span>
        <div>
          <p className="nm-community-comment__meta"><strong>{brandDisplayName(comment.author.display_name)}</strong> · <time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></p>
          <p className="nm-community-text">{comment.content}</p>
        </div>
        {(comment.can_delete || moderator) && <button type="button" className="nm-community-icon-button" aria-label="Xoá bình luận" onClick={() => void comments.remove(comment.id)}><Trash size={16} /></button>}
      </li>)}
    </ul>
    {comments.hasMore && <button type="button" className="nm-community-link" disabled={comments.loading} onClick={comments.loadMore}>{comments.loading ? 'Đang tải…' : 'Xem thêm bình luận'}</button>}
    {comments.error && <div className="nm-community-error" role="alert"><p>{comments.error}</p><RetryButton retryAt={comments.retryAt} onRetry={comments.retry} /></div>}
    <form className="nm-community-comment-form" onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor={inputId}>Viết bình luận</label>
      <textarea id={inputId} rows={1} value={draft} maxLength={communityLimits.commentMaxChars} placeholder="Viết bình luận…" onChange={(event) => setDraft(event.target.value)} />
      <button type="submit" className="nm-community-icon-button is-accent" disabled={!trimmed || comments.sending} aria-label="Gửi bình luận"><PaperPlaneRight size={18} weight="fill" /></button>
    </form>
  </section>
}
