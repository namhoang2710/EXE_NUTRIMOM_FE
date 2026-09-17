import { ArrowRight, BookOpenText, ChatsCircle, HandHeart, ShieldCheck } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { knowledgeApi } from '../api/knowledge-api'
import { ArticleCard } from '../components/ArticleCard'
import { KnowledgeLibrary } from '../components/KnowledgeLibrary'
import { mapArticleSummaryToCard } from '../model/article-adapters'
import type { ArticleCardViewModel } from '../model/article-types'
import { communityPreview, editorialStandards } from '../model/knowledge-static-content'
import { useArticleBookmarks } from '../model/use-article-bookmarks'
import './blog.css'

export function BlogPage({ library = false }: { library?: boolean }) {
  const [notice, setNotice] = useState('')
  const [featuredPost, setFeaturedPost] = useState<ArticleCardViewModel | null>(null)
  const [articleCount, setArticleCount] = useState<number | null>(null)
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const { savedSlugs, toggleBookmark, loading: bookmarksLoading, busySlugs, authenticated } = useArticleBookmarks()
  const toggle = useCallback(async (slug: string) => setNotice(await toggleBookmark(slug)), [toggleBookmark])

  useEffect(() => {
    const controller = new AbortController()
    knowledgeApi.listArticles({ page: 1, pageSize: 1, sort: 'publishedAt:desc' }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setArticleCount(result.totalItems)
        setFeaturedPost(result.items[0] ? mapArticleSummaryToCard(result.items[0]) : null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFeaturedPost(null)
      })
    return () => controller.abort()
  }, [])

  return (
    <main className={`nm-blog${library ? ' nm-blog--library' : ''}`}>
      <section className="nm-blog-hero" aria-labelledby="blog-hero-title">
        <div className="nm-blog-hero-inner landing-section">
          <div className="nm-blog-hero-content">
            <span className="nm-eyebrow"><BookOpenText size={18} /> NutriMom · Kiến thức chính thức</span>
            <h1 id="blog-hero-title">{library ? 'Thư viện nhỏ,' : 'Hiểu thêm một chút,'}<br /><em>an tâm hơn mỗi ngày.</em></h1>
            <p>Kiến thức được biên tập cẩn thận để đồng hành cùng mẹ trước, trong và sau thai kỳ. Mẹ có thể đọc theo nhịp của mình và lưu lại điều hữu ích.</p>
            <div className="nm-blog-hero-actions">
              <a className="nm-button nm-button--primary" href="#bai-viet-moi">Khám phá thư viện <ArrowRight size={18} /></a>
              <a className="nm-text-link" href="#tieu-chuan-bien-tap">Tiêu chuẩn biên tập <ShieldCheck size={18} /></a>
            </div>
            <div className="nm-blog-trust-row"><span><ShieldCheck size={18} /> Do ban biên tập quản lý</span>{articleCount !== null && <span><BookOpenText size={18} /> {articleCount} bài đã xuất bản</span>}</div>
          </div>
          <div className="nm-blog-hero-visual" aria-hidden="true">
            <img src="/benner_blog1.png" alt="" />
            <div className="nm-hero-caption"><HandHeart size={26} weight="duotone" /><span>Mỗi hành trình đều khác nhau.<br /><strong>Mẹ cứ bước theo nhịp của mình.</strong></span></div>
          </div>
        </div>
      </section>

      {featuredPost && <section className="nm-blog-section landing-section" aria-labelledby="featured-heading">
        <div className="nm-section-heading"><div><span>Mới cập nhật</span><h2 id="featured-heading">Bài viết mới nhất từ NutriMom</h2></div><p>Những điều gần gũi, dễ hiểu cho hành trình chăm sóc mẹ và bé.</p></div>
        <ArticleCard post={featuredPost} featured saved={savedSlugs.includes(featuredPost.slug)} bookmarkBusy={bookmarksLoading || busySlugs.includes(featuredPost.slug)} onToggle={() => { void toggle(featuredPost.slug) }} />
      </section>}

      <KnowledgeLibrary savedSlugs={savedSlugs} bookmarksLoading={bookmarksLoading} authenticated={authenticated} />

      <section className="nm-blog-section landing-section" id="cong-dong" aria-labelledby="community-heading">
        <div className="nm-community-preview">
          <span className="nm-community-icon"><ChatsCircle size={32} weight="duotone" /></span>
          <div><div className="nm-community-preview-label"><span>Community · Thành viên chia sẻ</span><span className="nm-coming-soon">Sắp ra mắt</span></div><h2 id="community-heading">{communityPreview.title}</h2><p>{communityPreview.description}</p><div className="nm-community-stages">{communityPreview.stages.map((stage) => <span key={stage}>{stage}</span>)}</div><small>Trải nghiệm cá nhân không thay thế thông tin y tế đã biên tập hoặc tư vấn chuyên môn.</small></div>
        </div>
      </section>

      <section className="nm-editorial-standards" id="tieu-chuan-bien-tap" aria-labelledby="standards-heading">
        <div className="landing-section"><div className="nm-section-heading"><div><span><ShieldCheck size={17} /> Niềm tin & sự an toàn</span><h2 id="standards-heading">Rõ nguồn, rõ người biên tập.</h2></div><p>Mẹ xứng đáng biết thông tin mình đang đọc đến từ đâu và đã được rà soát như thế nào.</p></div><div className="nm-values-grid">{editorialStandards.map((standard, index) => <article className="nm-value-card" key={standard.title}><span className="nm-value-number">0{index + 1}</span><h3>{standard.title}</h3><p>{standard.description}</p></article>)}</div></div>
      </section>
      <div className="nm-bookmark-notice" role="status" aria-live="polite" aria-atomic="true">{notice}</div>
    </main>
  )
}
