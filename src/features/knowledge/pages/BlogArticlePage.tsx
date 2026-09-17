import { ArrowLeft, ArrowRight, BookOpenText, Heart, Info } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { knowledgeApi } from '../api/knowledge-api'
import { ArticleCard, ArticleMeta, BookmarkButton, EditorialBadges } from '../components/ArticleCard'
import { mapArticleDetailToViewModel, mapArticleSummaryToCard } from '../model/article-adapters'
import type { ArticleCardViewModel, ArticleDetailViewModel } from '../model/article-types'
import { useArticleBookmarks } from '../model/use-article-bookmarks'
import { sanitizeInlineHtml } from '../model/rich-text'
import './blog.css'

export function BlogArticlePage() {
  const { articleSlug } = useParams()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const [post, setPost] = useState<ArticleDetailViewModel | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<ArticleCardViewModel[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'not-found' | 'error'>('loading')
  const [error, setError] = useState('')
  const { savedSlugs, toggleBookmark, busySlugs, loading: bookmarksLoading } = useArticleBookmarks()
  const returnTo = (location.state as { knowledgeReturnTo?: unknown } | null)?.knowledgeReturnTo
  const backTo = typeof returnTo === 'string' && /^\/(blog(?:[?#]|$)|app\/knowledge(?:[?#]|$))/.test(returnTo) ? returnTo : '/blog'

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!articleSlug) { setState('not-found'); return }
    const controller = new AbortController()
    setState('loading')
    setError('')
    knowledgeApi.getArticle(articleSlug, controller.signal).then(async (detail) => {
      if (controller.signal.aborted) return
      const article = mapArticleDetailToViewModel(detail)
      setPost(article)
      setState('success')
      try {
        const related = await knowledgeApi.listArticles({
          page: 1,
          pageSize: 3,
          category: detail.category,
          sort: 'publishedAt:desc',
        }, controller.signal)
        if (!controller.signal.aborted) {
          setRelatedPosts(related.items.filter((item) => item.slug !== detail.slug).slice(0, 2).map(mapArticleSummaryToCard))
        }
      } catch {
        if (!controller.signal.aborted) setRelatedPosts([])
      }
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      const notFound = reason instanceof ApiClientError && (reason.status === 404 || reason.code === 'ARTICLE_NOT_FOUND')
      setState(notFound ? 'not-found' : 'error')
      setError(reason instanceof Error ? reason.message : 'Chưa thể tải bài viết.')
    })
    return () => controller.abort()
  }, [articleSlug])

  async function bookmark(slug: string) {
    setNotice(await toggleBookmark(slug))
  }

  if (state === 'loading') return <main className="nm-article-state" aria-busy="true"><span className="nm-article-loader" /><h1>Đang mở bài viết…</h1><p>NutriMom đang chuẩn bị nội dung cho mẹ.</p></main>
  if (state === 'not-found') return <main className="nm-article-state"><BookOpenText size={42} weight="duotone" /><h1>Không tìm thấy bài viết</h1><p>Bài viết có thể chưa xuất bản, đã được lưu trữ hoặc đường dẫn không còn tồn tại.</p><Link className="nm-button nm-button--primary" to="/blog"><ArrowLeft size={17} /> Về thư viện</Link></main>
  if (state === 'error' || !post) return <main className="nm-article-state"><Info size={42} weight="duotone" /><h1>Chưa thể tải bài viết</h1><p>{error}</p><button className="nm-button nm-button--soft" type="button" onClick={() => window.location.reload()}>Thử lại</button></main>

  return <main className="nm-article-page">
    <article>
      <header className="nm-article-hero">
        <div className="landing-section">
          <Link className="nm-article-back" to={backTo}><ArrowLeft size={17} weight="bold" /> Về thư viện kiến thức</Link>
          <div className="nm-article-kicker"><span>{post.category}</span>{post.stage} · Nội dung chính thức</div>
          <h1>{post.title}</h1>
          <p>{post.lead || post.excerpt}</p>
          <div className="nm-article-meta"><ArticleMeta post={post} /><span>{post.editorial.author}</span><BookmarkButton post={post} saved={savedSlugs.includes(post.slug)} busy={bookmarksLoading || busySlugs.includes(post.slug)} onToggle={() => { void bookmark(post.slug) }} /></div>
          <EditorialBadges post={post} />
          {post.coverImage && <figure className="nm-article-cover"><img src={post.coverImage.url} alt={post.coverImage.alt} />{post.coverImage.caption && <figcaption>{post.coverImage.caption}</figcaption>}</figure>}
        </div>
      </header>

      <div className="nm-article-layout landing-section">
        <div className="nm-article-content">
          {post.sections.map((section, sectionIndex) => <section id={`muc-${sectionIndex + 1}`} key={section.id}>
            <span className="nm-article-index">{String(sectionIndex + 1).padStart(2, '0')}</span><h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => <p key={`${section.id}-p-${index}`} dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(paragraph) }} />)}
            {section.bullets.length > 0 && <ul>{section.bullets.map((bullet, index) => <li key={`${section.id}-b-${index}`} dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(bullet) }} />)}</ul>}
            {section.image && <figure className="nm-section-image"><img src={section.image.url} alt={section.image.alt} loading="lazy" />{section.image.caption && <figcaption>{section.image.caption}</figcaption>}</figure>}
          </section>)}
          {post.youtubeVideoId && <div className="nm-article-video"><iframe src={`https://www.youtube-nocookie.com/embed/${post.youtubeVideoId}`} title={`Video YouTube cho bài viết ${post.title}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
          <div className="nm-medical-note"><Info size={23} weight="fill" /><div><strong>Một lời nhắc dịu dàng</strong><p>Thông tin trong bài không thay thế tư vấn y tế cá nhân. Nếu có triệu chứng bất thường hoặc câu hỏi về tình trạng riêng, mẹ hãy liên hệ bác sĩ hoặc cơ sở y tế.</p></div></div>
        </div>

        <aside className="nm-article-aside">
          {post.sections.length > 0 && <nav className="nm-source-card nm-article-toc" aria-labelledby="article-toc-heading"><h2 id="article-toc-heading">Trong bài viết này</h2><ol>{post.sections.map((section, index) => <li key={section.id}><a href={`#muc-${index + 1}`}>{section.heading}</a></li>)}</ol></nav>}
          <div className="nm-source-card nm-review-card"><h2>Thông tin biên tập</h2><p>{post.editorial.author}</p><p>Trạng thái: Đã xuất bản</p><p>Quy trình reviewer lâm sàng chưa thuộc phạm vi CMS hiện tại.</p></div>
          {post.source && <div className="nm-source-card"><span className="nm-source-icon"><BookOpenText size={25} weight="duotone" /></span><small>Nguồn tham khảo</small><h2>Đọc thêm từ nguồn của bài viết.</h2><a href={post.source.href} target="_blank" rel="noreferrer">{post.source.label} <ArrowRight size={16} weight="bold" /></a></div>}
          <div className="nm-kindness-card"><Heart size={21} weight="fill" /><p>Mẹ không cần ghi nhớ tất cả. Hãy lưu lại điều hữu ích và hỏi chuyên gia khi còn băn khoăn.</p></div>
        </aside>
      </div>
    </article>

    {relatedPosts.length > 0 && <section className="nm-related-section" aria-labelledby="related-heading"><div className="landing-section"><div className="nm-section-heading nm-section-heading--inline"><div><span>Đọc tiếp</span><h2 id="related-heading">Có thể mẹ cũng quan tâm</h2></div><Link className="nm-text-link nm-related-link" to="/blog">Xem tất cả <ArrowRight size={17} weight="bold" /></Link></div><div className="nm-related-grid">{relatedPosts.map((item) => <ArticleCard key={item.id} post={item} saved={savedSlugs.includes(item.slug)} bookmarkBusy={bookmarksLoading || busySlugs.includes(item.slug)} onToggle={() => { void bookmark(item.slug) }} />)}</div></div></section>}
    <div className="nm-bookmark-notice" role="status" aria-live="polite" aria-atomic="true">{notice}</div>
  </main>
}
