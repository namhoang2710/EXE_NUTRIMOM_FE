import { ArrowLeft, ArrowRight, Info } from '@phosphor-icons/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { blogPosts, findBlogPost } from '../model/article-content'

export function BlogArticlePage() {
  const { articleSlug } = useParams()
  const post = findBlogPost(articleSlug)

  if (!post) return <Navigate to="/blog" replace />

  const relatedPosts = blogPosts.filter((item) => item.slug !== post.slug).slice(0, 2)

  return (
    <main className="landing-main">
      <article className="article-shell landing-section landing-reveal">
        <header className="article-header">
          <Link className="article-back-link" to="/blog"><ArrowLeft size={16} weight="bold" /> Góc kiến thức</Link>
          <div className="article-meta"><span>{post.category}</span><span>{post.publishedAt}</span><span>{post.readTime}</span></div>
          <h1>{post.title}</h1>
          <p>{post.lead}</p>
        </header>

        <div className="article-layout">
          <div className="article-content">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                )}
              </section>
            ))}

            <div className="health-content-note">
              <Info size={22} weight="fill" />
              <p>Thông tin trong bài không thay thế tư vấn y tế cá nhân. Nếu có triệu chứng bất thường hoặc câu hỏi về tình trạng riêng, hãy liên hệ bác sĩ hoặc cơ sở y tế.</p>
            </div>
          </div>

          <aside className="article-source-card">
            <span>Nguồn tham khảo</span>
            <h2>Thông tin được đối chiếu từ nguồn y tế chính thống.</h2>
            <a href={post.source.href} target="_blank" rel="noreferrer">
              {post.source.label} <ArrowRight size={16} weight="bold" />
            </a>
          </aside>
        </div>
      </article>

      <section className="related-articles landing-section landing-section--compact">
        <div className="service-group-heading">
          <div><span>Đọc tiếp</span><h2>Bài viết liên quan</h2></div>
          <Link to="/blog">Tất cả bài viết <ArrowRight size={16} weight="bold" /></Link>
        </div>
        <div className="blog-card-grid blog-card-grid--two">
          {relatedPosts.map((item) => (
            <Link className="blog-card" key={item.slug} to={`/blog/${item.slug}`}>
              <div className="blog-card-meta"><span>{item.category}</span><span>{item.readTime}</span></div>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
              <span className="blog-card-action">Đọc bài viết <ArrowRight size={16} weight="bold" /></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
