import { PaperPlaneRight, Trash } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useComments } from '../hooks/useComments'
import { initial, relativeTime } from '../model/community-time'
import { communityLimits } from '../model/community-topics'

interface Props {
  postId: string
  onCountChange: (delta: number) => void
}

export function CommentsSection({ postId, onCountChange }: Props) {
  const comments = useComments(postId, true, onCountChange)
  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()

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
        <span className="nm-community-avatar is-small" aria-hidden="true">{initial(comment.author.display_name)}</span>
        <div>
          <p className="nm-community-comment__meta"><strong>{comment.author.display_name}</strong> · <time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></p>
          <p className="nm-community-text">{comment.content}</p>
        </div>
        {comment.can_delete && <button type="button" className="nm-community-icon-button" aria-label="Xoá bình luận" onClick={() => void comments.remove(comment.id)}><Trash size={16} /></button>}
      </li>)}
    </ul>
    {comments.hasMore && <button type="button" className="nm-community-link" disabled={comments.loading} onClick={comments.loadMore}>{comments.loading ? 'Đang tải…' : 'Xem thêm bình luận'}</button>}
    {comments.error && <p className="nm-community-error" role="alert">{comments.error} <button type="button" className="nm-community-link" onClick={comments.retry}>Thử lại</button></p>}
    <form className="nm-community-comment-form" onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor={`comment-${postId}`}>Viết bình luận</label>
      <textarea id={`comment-${postId}`} rows={1} value={draft} maxLength={communityLimits.commentMaxChars} placeholder="Viết bình luận…" onChange={(event) => setDraft(event.target.value)} />
      <button type="submit" className="nm-community-icon-button is-accent" disabled={!trimmed || comments.sending} aria-label="Gửi bình luận"><PaperPlaneRight size={18} weight="fill" /></button>
    </form>
  </section>
}
