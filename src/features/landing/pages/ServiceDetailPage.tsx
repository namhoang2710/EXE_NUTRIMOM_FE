import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Heart,
  Sparkle,
} from '@phosphor-icons/react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ServiceIcon } from '../components/ServiceIcon'
import { findService, services } from '../model/service-content'
import './services-premium.css'

export function ServiceDetailPage() {
  const { serviceSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const service = findService(serviceSlug)

  if (!service) return <Navigate to="/services" replace />

  const relatedServices = services.filter((item) => item.slug !== service.slug).slice(0, 3)
  const openedFromServices = Boolean((location.state as { fromServices?: boolean } | null)?.fromServices)

  function returnToServices() {
    if (openedFromServices) {
      navigate(-1)
      return
    }

    navigate('/services')
  }

  return (
    <main className={`landing-main serviceExperience serviceExperience--${service.tone}`}>
      <section className="serviceExperienceHero landing-section">
        <div className="serviceExperienceHero__copy landing-reveal">
          <div className="serviceExperience__breadcrumb">
            <div className="serviceExperience__breadcrumbTrail">
              <button type="button" onClick={returnToServices}><ArrowLeft size={15} weight="bold" /> Dịch vụ</button>
              <span>/</span>
              <strong>{service.title}</strong>
            </div>
            <span>06 / {String(services.findIndex((item) => item.slug === service.slug) + 1).padStart(2, '0')}</span>
          </div>
          <div className="serviceExperience__identity">
            <span className="serviceExperience__icon"><ServiceIcon name={service.icon} size={29} /></span>
            <span>{service.tag}</span>
          </div>
          <h1>{service.title}</h1>
          <p className="serviceExperienceHero__description">{service.description}</p>
          <blockquote>{service.promise}</blockquote>
          <div className="serviceExperienceHero__actions">
            <Link className="landing-primary-button" to="/register">Trải nghiệm miễn phí <ArrowRight size={18} weight="bold" /></Link>
            <Link className="landing-secondary-button" to="/services#pricing">Xem bảng giá</Link>
          </div>
        </div>

        <aside className="serviceProductPreview" aria-label={`Minh họa trải nghiệm ${service.title}`}>
          <div className="serviceProductPreview__bar">
            <span className="serviceProductPreview__brand"><Heart size={15} weight="fill" /> NutriMom</span>
            <span className="serviceProductPreview__status">Đã cá nhân hóa</span>
          </div>
          <div className="serviceProductPreview__heading">
            <span>Hôm nay của mẹ</span>
            <h2>{service.title}</h2>
          </div>
          <div className="serviceProductPreview__focus">
            <div className="serviceProductPreview__focusIcon"><ServiceIcon name={service.icon} size={32} /></div>
            <div><span>{service.snapshot[0].label}</span><strong>{service.snapshot[0].value}</strong></div>
            <CheckCircle size={24} weight="fill" />
          </div>
          <dl className="serviceProductPreview__stats">
            {service.snapshot.slice(1).map((item) => (
              <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
          <div className="serviceProductPreview__next">
            <Sparkle size={18} weight="fill" />
            <div><span>Gợi ý tiếp theo</span><strong>{service.steps[2].title}</strong></div>
            <ArrowRight size={17} weight="bold" />
          </div>
        </aside>
      </section>

      <section className="serviceBenefits landing-section" aria-labelledby="benefits-title">
        <div className="serviceBenefits__intro">
          <span className="premiumEyebrow">GIÁ TRỊ THỰC TẾ</span>
          <h2 id="benefits-title">Mọi chi tiết đều giúp mẹ <em>an tâm và chủ động hơn.</em></h2>
        </div>
        <div className="serviceBenefits__grid">
          {service.highlights.map((highlight, index) => (
            <article key={highlight}>
              <span>0{index + 1}</span>
              <CheckCircle size={25} weight="duotone" />
              <h3>{highlight}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="serviceHow" aria-labelledby="how-title">
        <div className="serviceHow__inner landing-section">
          <div className="serviceHow__heading">
            <span className="premiumEyebrow">TIẾN TRÌNH SỬ DỤNG</span>
            <h2 id="how-title">Bắt đầu đơn giản.<br />Giá trị rõ qua từng bước.</h2>
            <p>NutriMom giảm thao tác không cần thiết để mẹ tập trung vào điều đang quan trọng nhất.</p>
          </div>
          <ol className="serviceHow__steps">
            {service.steps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
                <Check size={18} weight="bold" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="serviceTimeline landing-section" aria-labelledby="timeline-title">
        <div className="serviceTimeline__heading">
          <span className="premiumEyebrow">TRẢI NGHIỆM THEO GIAI ĐOẠN</span>
          <h2 id="timeline-title">Luôn phù hợp với nơi mẹ đang đứng.</h2>
        </div>
        <ol className="serviceTimeline__list">
          {service.timeline.map((stage, index) => (
            <li key={stage.label}>
              <span className="serviceTimeline__marker">{index + 1}</span>
              <span className="serviceTimeline__label">{stage.label}</span>
              <div><h3>{stage.title}</h3><p>{stage.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="serviceRelated landing-section" aria-labelledby="related-title">
        <div className="serviceRelated__heading">
          <div><span className="premiumEyebrow">CÙNG NHAU TỐT HƠN</span><h2 id="related-title">Kết nối thêm dịch vụ</h2></div>
          <Link to="/services">Xem cả 6 dịch vụ <ArrowRight size={16} weight="bold" /></Link>
        </div>
        <div className="serviceRelated__grid">
          {relatedServices.map((item) => (
            <Link className={`serviceRelated__card serviceRelated__card--${item.tone}`} key={item.slug} to={`/services/${item.slug}`}>
              <span><ServiceIcon name={item.icon} size={25} /></span>
              <div><small>{item.tag}</small><h3>{item.title}</h3><p>{item.summary}</p></div>
              <ArrowRight size={18} weight="bold" />
            </Link>
          ))}
        </div>
      </section>

      <section className="serviceClosing">
        <div className="serviceClosing__inner landing-section">
          <span><Heart size={17} weight="fill" /> NutriMom đồng hành cùng gia đình</span>
          <h2>Một nơi đủ gần gũi để mẹ dùng mỗi ngày,<br />đủ rõ ràng để gia đình cùng chăm sóc.</h2>
          <Link to="/register">Bắt đầu cùng NutriMom <ArrowRight size={18} weight="bold" /></Link>
        </div>
      </section>
    </main>
  )
}
