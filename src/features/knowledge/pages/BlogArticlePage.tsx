import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarBlank,
  Clock,
  Heart,
  Info,
  SealCheck,
  Sparkle,
} from '@phosphor-icons/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { blogPosts, findBlogPost } from '../model/article-content'
import './blog.css'

export function BlogArticlePage() {
  const { articleSlug } = useParams()
  const post = findBlogPost(articleSlug)

  if (!post) return <Navigate to="/blog" replace />

  const relatedPosts = blogPosts.filter((item) => item.slug !== post.slug).slice(0, 2)

  return (
    <main className="nm-article-page">
      <article>
        <header className="nm-article-hero">
          <div className="landing-section">
            <Link className="nm-article-back" to="/blog"><ArrowLeft size={17} weight="bold" /> NutriMom Journal</Link>
            <div className="nm-article-kicker"><span>{post.category}</span><Sparkle size={13} weight="fill" /> Bài đọc cho mẹ</div>
            <h1>{post.title}</h1>
            <p>{post.lead}</p>
            <div className="nm-article-meta">
              <span><CalendarBlank size={17} /> {post.publishedAt}</span>
              <span><Clock size={17} /> {post.readTime}</span>
              <span><SealCheck size={17} /> Nội dung đã biên tập</span>
            </div>
          </div>
        </header>

        <div className="nm-article-layout landing-section">
          <div className="nm-article-content">
            {post.sections.map((section, sectionIndex) => (
              <section key={section.heading}>
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
            <div className="nm-source-card">
              <span className="nm-source-icon"><BookOpenText size={25} weight="duotone" /></span>
              <small>Nguồn tham khảo</small>
              <h2>Thông tin được đối chiếu từ nguồn y tế chính thống.</h2>
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
          <div className="nm-related-grid">
            {relatedPosts.map((item) => (
              <Link className="nm-related-card" key={item.slug} to={`/blog/${item.slug}`}>
                <span className="nm-category">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="nm-post-meta"><span>{item.publishedAt}</span><span>{item.readTime}</span></div>
                <span className="nm-round-arrow"><ArrowRight size={17} weight="bold" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
