import { ArrowLeft, ArrowRight, CheckCircle, Heart } from '@phosphor-icons/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ServiceIcon } from '../components/ServiceIcon'
import { findService, services } from '../model/service-content'

export function ServiceDetailPage() {
  const { serviceSlug } = useParams()
  const service = findService(serviceSlug)

  if (!service) return <Navigate to="/services" replace />

  const relatedServices = services.filter((item) => item.slug !== service.slug).slice(0, 3)

  return (
    <main className="landing-main">
      <section className="service-detail-hero landing-section landing-reveal">
        <div className="service-detail-copy">
          <div className="service-breadcrumb">
            <Link to="/services"><ArrowLeft size={16} weight="bold" /> Dịch vụ</Link>
            <span>/</span>
            <span>{service.tag}</span>
          </div>
          <div className="service-detail-icon"><ServiceIcon name={service.icon} size={34} /></div>
          <span>{service.tag}</span>
          <h1>{service.title}</h1>
          <p>{service.description}</p>
          <div className="home-hero-actions">
            <Link className="landing-primary-button" to="/register">Bắt đầu trải nghiệm <ArrowRight size={18} weight="bold" /></Link>
            {service.slug === 'care-knowledge' && <Link className="landing-secondary-button" to="/blog">Đọc góc kiến thức</Link>}
          </div>
        </div>

        <aside className="service-highlight-panel" aria-label="Điểm nổi bật">
          <div className="landing-eyebrow"><Heart size={16} weight="fill" /> Điều mẹ nhận được</div>
          <h2>Rõ ràng hơn trong từng bước chăm sóc.</h2>
          <ul>
            {service.highlights.map((highlight) => (
              <li key={highlight}><CheckCircle size={20} weight="fill" /> {highlight}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="service-process landing-section landing-section--compact">
        <div className="landing-section-heading">
          <span>Cách dịch vụ đồng hành</span>
          <h2>Mọi thông tin được sắp xếp theo một tiến trình dễ theo dõi.</h2>
        </div>
        <div className="service-step-grid">
          {service.steps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="related-services landing-section landing-section--compact">
        <div className="service-group-heading">
          <div><span>Khám phá thêm</span><h2>Các dịch vụ liên quan</h2></div>
          <Link to="/services">Tất cả dịch vụ <ArrowRight size={16} weight="bold" /></Link>
        </div>
        <div className="services-grid">
          {relatedServices.map((item) => (
            <Link className="service-card" key={item.slug} to={`/services/${item.slug}`}>
              <div className="service-icon"><ServiceIcon name={item.icon} /></div>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <span className="service-card-action">Xem chi tiết <ArrowRight size={16} weight="bold" /></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
