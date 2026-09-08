import { ArrowRight, BookOpenText, Info } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { blogPosts } from '../model/article-content'

export function BlogPage() {
  return (
    <main className="landing-main">
      <section className="page-heading landing-section landing-reveal">
        <span>Góc kiến thức NutriMom</span>
        <h1>Thông tin gần gũi để mẹ chủ động đặt câu hỏi.</h1>
        <p>Các bài viết được tổng hợp từ nguồn y tế chính thống và trình bày theo cách dễ đọc, giúp mẹ chuẩn bị tốt hơn cho việc trao đổi với chuyên gia.</p>
      </section>

      <section className="blog-page-section landing-section landing-section--compact">
        <div className="health-content-note">
          <Info size={22} weight="fill" />
          <p>Nội dung chỉ nhằm cung cấp thông tin phổ thông, không thay thế chẩn đoán hoặc tư vấn từ bác sĩ đang theo dõi thai kỳ của bạn.</p>
        </div>

        <div className="blog-feature-grid">
          {blogPosts.map((post, index) => (
            <Link className={`blog-feature-card${index === 0 ? ' is-featured' : ''}`} key={post.slug} to={`/blog/${post.slug}`}>
              <div className="blog-feature-visual">
                <BookOpenText size={index === 0 ? 46 : 34} weight="duotone" />
                <span>{post.category}</span>
              </div>
              <div className="blog-feature-content">
                <div className="blog-card-meta"><span>{post.publishedAt}</span><span>{post.readTime}</span></div>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <span className="blog-card-action">Đọc bài viết <ArrowRight size={16} weight="bold" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
