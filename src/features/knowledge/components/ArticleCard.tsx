import { ArrowRight, BookmarkSimple, CalendarBlank, Check, Clock, SealCheck, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import type { ArticleCardViewModel } from '../model/article-types'

export function EditorialBadges({ post }: { post: ArticleCardViewModel }) {
  return <div className="nm-editorial-badges">
    {post.editorial.selected && <span className="nm-editorial-badge--selected"><Sparkle size={14} weight="fill" /> Biên tập chọn</span>}
    {post.editorial.moderation === 'approved' && <span><ShieldCheck size={14} /> Đã kiểm duyệt</span>}
    {post.editorial.reviewer && <span><SealCheck size={14} /> Reviewer xác nhận</span>}
  </div>
}

export function ArticleMeta({ post }: { post: ArticleCardViewModel }) {
  return <div className="nm-post-meta">
    <span><CalendarBlank size={15} /><time dateTime={post.publishedAtIso}>{post.publishedAt}</time></span>
    <span><Clock size={15} />{post.readTime}</span>
  </div>
}

export function BookmarkButton({ post, saved, onToggle, animated = false, busy = false }: { post: ArticleCardViewModel; saved: boolean; onToggle: () => void; animated?: boolean; busy?: boolean }) {
  return <button className={`nm-bookmark-button${animated ? ' nm-library-bookmark' : ''}`} type="button" aria-pressed={saved} aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} bài: ${post.title}`} disabled={busy} onClick={onToggle}>{animated ? <span className="nm-library-bookmark-icon" aria-hidden="true"><BookmarkSimple size={19} /><Check size={19} weight="bold" /></span> : <BookmarkSimple size={19} weight={saved ? 'fill' : 'regular'} />}<span>{busy ? 'Đang lưu…' : saved ? 'Đã lưu' : 'Lưu bài'}</span></button>
}

export function ArticleCard({ post, saved, onToggle, featured = false, libraryControls = false, returnTo, bookmarkBusy = false }: { post: ArticleCardViewModel; saved: boolean; onToggle: () => void; featured?: boolean; libraryControls?: boolean; returnTo?: string; bookmarkBusy?: boolean }) {
  const location = useLocation()
  const returnState = { knowledgeReturnTo: returnTo ?? location.pathname + location.search + location.hash }
  return <article className={featured ? 'nm-featured-post' : 'nm-post-card'}>
    {featured && <div className="nm-featured-post-image"><img src={post.coverImage?.url ?? '/banner2.png'} alt={post.coverImage?.alt ?? ''} loading="lazy" /></div>}
    {!featured && post.coverImage && <div className="nm-post-card-image"><img src={post.coverImage.url} alt={post.coverImage.alt} loading="lazy" /></div>}
    <div className={featured ? 'nm-featured-post-content' : 'nm-post-card-content'}>
      <div className="nm-post-card-top"><span className="nm-category">{post.category}</span><span className="nm-post-stage">{post.stage}</span></div>
      <EditorialBadges post={post} />
      <h3><Link to={`/blog/${post.slug}`} state={returnState}>{post.title}</Link></h3>
      <p>{post.excerpt}</p>
      <span className="nm-post-author">{post.editorial.author}</span>
      <ArticleMeta post={post} />
      <div className="nm-post-card-bottom"><Link className="nm-text-link" to={`/blog/${post.slug}`} state={returnState}>Đọc bài viết <ArrowRight size={17} /></Link><BookmarkButton post={post} saved={saved} onToggle={onToggle} animated={libraryControls} busy={bookmarkBusy} /></div>
    </div>
  </article>
}
