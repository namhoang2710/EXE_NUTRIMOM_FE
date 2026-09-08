import { ArrowRight, BookOpenText, Sparkle } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router-dom'
import { blogPosts } from '@/features/knowledge/model/article-content'
import { ServiceIcon } from '../components/ServiceIcon'
import { services } from '../model/service-content'

function includesSearch(values: string[], search: string) {
  return values.join(' ').toLocaleLowerCase('vi-VN').includes(search)
}

export function ServicesPage() {
  const [searchParams] = useSearchParams()
  const searchTerm = searchParams.get('search')?.trim() || ''
  const normalizedSearch = searchTerm.toLocaleLowerCase('vi-VN')
  const filteredServices = normalizedSearch
    ? services.filter((service) => includesSearch([
      service.title,
      service.summary,
      service.tag,
      service.description,
      ...service.highlights,
    ], normalizedSearch))
    : services
  const filteredPosts = normalizedSearch
    ? blogPosts.filter((post) => includesSearch([post.title, post.excerpt, post.category, post.lead], normalizedSearch))
    : blogPosts
  const resultCount = filteredServices.length + filteredPosts.length

  return (
    <main className="landing-main">
      <section className="page-heading landing-section landing-reveal">
        <span>Dịch vụ NutriMom</span>
        <h1>Mọi hỗ trợ mẹ cần, được sắp xếp thật nhẹ nhàng.</h1>
        <p>Khám phá từng dịch vụ, tìm hiểu cách sử dụng và đọc thêm nội dung giúp hành trình chăm sóc mẹ và bé chủ động hơn.</p>
      </section>

      <section className="services-section landing-section landing-section--compact">
        {searchTerm && (
          <div className="search-result-note" role="status">
            <span>Kết quả cho “{searchTerm}”</span>
            <strong>{resultCount} nội dung phù hợp</strong>
          </div>
        )}

        {resultCount > 0 ? (
          <>
            {filteredServices.length > 0 && (
              <div className="service-result-group">
                <div className="service-group-heading">
                  <div><span>Dịch vụ</span><h2>Chọn nội dung bạn muốn tìm hiểu</h2></div>
                  <strong>{filteredServices.length} dịch vụ</strong>
                </div>
                <div className="services-grid">
                  {filteredServices.map((service) => (
                    <Link className="service-card" key={service.slug} to={`/services/${service.slug}`}>
                      <div className="service-card-top">
                        <div className="service-icon"><ServiceIcon name={service.icon} /></div>
                        <span>{service.tag}</span>
                      </div>
                      <h2>{service.title}</h2>
                      <p>{service.summary}</p>
                      <span className="service-card-action">Xem chi tiết <ArrowRight size={16} weight="bold" /></span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filteredPosts.length > 0 && (
              <div className="service-result-group service-result-group--articles">
                <div className="service-group-heading">
                  <div><span>Góc kiến thức</span><h2>Bài viết hữu ích cho mẹ</h2></div>
                  <Link to="/blog">Xem tất cả <ArrowRight size={16} weight="bold" /></Link>
                </div>
                <div className="blog-card-grid">
                  {filteredPosts.map((post) => (
                    <Link className="blog-card" key={post.slug} to={`/blog/${post.slug}`}>
                      <div className="blog-card-icon"><BookOpenText size={26} weight="duotone" /></div>
                      <div className="blog-card-meta"><span>{post.category}</span><span>{post.readTime}</span></div>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                      <span className="blog-card-action">Đọc bài viết <ArrowRight size={16} weight="bold" /></span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-search-state">
            <div className="empty-search-icon" aria-hidden="true"><Sparkle size={30} weight="duotone" /></div>
            <h2>Chưa tìm thấy nội dung phù hợp</h2>
            <p>Hãy thử một từ khóa khác hoặc xem toàn bộ dịch vụ của NutriMom.</p>
            <Link className="landing-secondary-button" to="/services">Xem tất cả dịch vụ</Link>
          </div>
        )}
      </section>
    </main>
  )
}
