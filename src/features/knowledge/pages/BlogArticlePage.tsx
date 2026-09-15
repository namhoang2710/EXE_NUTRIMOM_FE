import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Heart,
  Info,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { ArticleCard, ArticleMeta, BookmarkButton, EditorialBadges } from '../components/ArticleCard'
import { publishedBlogPosts, findBlogPost } from '../model/article-content'
import { useArticleBookmarks } from '../model/use-article-bookmarks'
import './blog.css'

export function BlogArticlePage() {
  const { articleSlug } = useParams()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const { savedSlugs, toggleBookmark } = useArticleBookmarks()
  const post = findBlogPost(articleSlug)
  const returnTo = location.state?.knowledgeReturnTo
  const backTo = typeof returnTo === 'string' && /^\/(blog(?:[?#]|$)|app\/knowledge(?:[?#]|$))/.test(returnTo) ? returnTo : '/blog'

  if (!post) return <Navigate to="/blog" replace />

  const relatedPosts = publishedBlogPosts.filter((item) => item.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category || b.stage === post.stage) - Number(a.category === post.category || a.stage === post.stage))
    .slice(0, 2)

  return (
    <main className="nm-article-page">
      <article>
        <header className="nm-article-hero">
          <div className="landing-section">
            <Link className="nm-article-back" to={backTo}><ArrowLeft size={17} weight="bold" /> Về thư viện kiến thức</Link>
            <div className="nm-article-kicker"><span>{post.category}</span>{post.stage} · Nội dung chính thức</div>
            <h1>{post.title}</h1>
            <p>{post.lead}</p>
            <div className="nm-article-meta">
              <ArticleMeta post={post} />
              <span>{post.editorial.author}</span>
              <BookmarkButton post={post} saved={savedSlugs.includes(post.slug)} onToggle={() => setNotice(toggleBookmark(post.slug))} />
            </div>
            <EditorialBadges post={post} />
            <div className="nm-demo-note"><span>Dữ liệu minh họa</span> Nội dung và xác nhận reviewer trong bản xem trước này là minh họa.</div>
          </div>
        </header>

        <div className="nm-article-layout landing-section">
          <div className="nm-article-content">
            {post.sections.map((section, sectionIndex) => (
              <section id={`muc-${sectionIndex + 1}`} key={section.heading}>
                <span className="nm-article-index">0{sectionIndex + 1}</span>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                )}
              </section>
            ))}

            <div className="nm-medical-note">
              <Info size={23} weight="fill" />
              <div>
                <strong>Một lời nhắc dịu dàng</strong>
                <p>Thông tin trong bài không thay thế tư vấn y tế cá nhân. Nếu có triệu chứng bất thường hoặc câu hỏi về tình trạng riêng, mẹ hãy liên hệ bác sĩ hoặc cơ sở y tế.</p>
              </div>
            </div>
          </div>

          <aside className="nm-article-aside">
            <nav className="nm-source-card nm-article-toc" aria-labelledby="article-toc-heading"><h2 id="article-toc-heading">Trong bài viết này</h2><ol>{post.sections.map((section, index) => <li key={section.heading}><a href={`#muc-${index + 1}`}>{section.heading}</a></li>)}</ol></nav>
            <div className="nm-source-card nm-review-card"><h2>Thông tin biên tập</h2><p>{post.editorial.author}</p><p>Trạng thái: Đã kiểm duyệt</p>{post.editorial.reviewer ? <><p>Reviewer: {post.editorial.reviewer.name}</p><p>Xác nhận: <time dateTime={post.editorial.reviewer.confirmedAt.split('.').reverse().join('-')}>{post.editorial.reviewer.confirmedAt}</time></p></> : <p>Bài này chưa có xác nhận từ reviewer.</p>}</div>
            <div className="nm-source-card">
              <span className="nm-source-icon"><BookOpenText size={25} weight="duotone" /></span>
              <small>Nguồn tham khảo</small>
              <h2>Đọc thêm từ nguồn của bài viết.</h2>
              <a href={post.source.href} target="_blank" rel="noreferrer">
                {post.source.label} <ArrowRight size={16} weight="bold" />
              </a>
            </div>
            <div className="nm-kindness-card">
              <Heart size={21} weight="fill" />
              <p>Mẹ không cần ghi nhớ tất cả. Hãy lưu lại điều hữu ích và hỏi chuyên gia khi còn băn khoăn.</p>
            </div>
          </aside>
        </div>
      </article>

      <section className="nm-related-section" aria-labelledby="related-heading">
        <div className="landing-section">
          <div className="nm-section-heading nm-section-heading--inline">
            <div><span>Đọc tiếp</span><h2 id="related-heading">Có thể mẹ cũng quan tâm</h2></div>
            <Link className="nm-text-link nm-related-link" to="/blog">Xem tất cả <ArrowRight size={17} weight="bold" /></Link>
          </div>
          <div className="nm-related-grid">{relatedPosts.map((item) => <ArticleCard key={item.slug} post={item} saved={savedSlugs.includes(item.slug)} onToggle={() => setNotice(toggleBookmark(item.slug))} />)}</div>
        </div>
      </section>
      <div className="nm-bookmark-notice" role="status" aria-live="polite" aria-atomic="true">{notice}</div>
    </main>
  )
}
