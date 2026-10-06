import {
  ArrowRight,
  CheckCircle,
  Heart,
  Sparkle,
} from '@phosphor-icons/react'
import { useEffect } from 'react'
import type { MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSubscription } from '@/features/payment/hooks/useSubscription'
import { PublicPricingSection } from '../components/PublicPricingSection'
import { ServiceIcon } from '../components/ServiceIcon'
import { services, type ServiceContent } from '../model/service-content'
import './services-premium.css'

function includesSearch(values: string[], search: string) {
  return values.join(' ').toLocaleLowerCase('vi-VN').includes(search)
}

function ServiceCard({ service, featured = false }: { service: ServiceContent; featured?: boolean }) {
  return (
    <article
      className={`premiumServiceCardShell${featured ? ' premiumServiceCardShell--featured' : ''}`}
      data-services-reveal
    >
      <Link
        className={`premiumServiceCard premiumServiceCard--${service.tone}${featured ? ' premiumServiceCard--featured' : ''}`}
        state={{ fromServices: true }}
        to={`/services/${service.slug}`}
      >
        <div className="premiumServiceCard__top">
          <span className="premiumServiceCard__icon"><ServiceIcon name={service.icon} size={featured ? 32 : 27} /></span>
          <span className="premiumServiceCard__tag">{service.tag}</span>
        </div>
        <div className="premiumServiceCard__copy">
          {featured && <span className="premiumServiceCard__spotlight"><Sparkle size={14} weight="fill" /> AI DINH DƯỠNG NỔI BẬT</span>}
          <h2>{service.title}</h2>
          <p>{service.summary}</p>
        </div>
        {featured && (
          <div className="premiumServiceCard__flow" aria-label="Ba bước sử dụng AI scan món ăn">
            <span>Chụp món ăn</span><ArrowRight size={15} /><span>AI phân tích</span><ArrowRight size={15} /><span>Gợi ý bổ sung</span>
          </div>
        )}
        <span className="premiumServiceCard__action">Khám phá dịch vụ <ArrowRight size={17} weight="bold" /></span>
      </Link>
    </article>
  )
}

export function ServicesPage() {
  const { status } = useAuth()
  const { subscription } = useSubscription(status === 'authenticated')

  const [searchParams] = useSearchParams()
  const searchTerm = searchParams.get('search')?.trim() || ''
  const normalizedSearch = searchTerm.toLocaleLowerCase('vi-VN')
  const filteredServices = normalizedSearch
    ? services.filter((service) => includesSearch([
      service.title,
      service.summary,
      service.tag,
      service.description,
      service.promise,
      ...service.highlights,
    ], normalizedSearch))
    : services
  const featuredService = !normalizedSearch ? services.find((service) => service.slug === 'food-scan-ai') : undefined
  const standardServices = featuredService
    ? filteredServices.filter((service) => service.slug !== featuredService.slug)
    : filteredServices

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-services-reveal]'))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })

    revealItems.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [normalizedSearch])

  function scrollToPricing(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('pricing')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <main className="landing-main nutrimomServices">
      <section className="servicesHero landing-section">
        <div className="servicesHero__copy">
          <span className="premiumEyebrow"><Heart size={15} weight="fill" /> HỆ SINH THÁI CHĂM SÓC</span>
          <h1>Ít công cụ hơn.<br /><em>Đúng điều mẹ cần hơn.</em></h1>
          <p>Sáu dịch vụ được kết nối quanh một mục tiêu: giúp mẹ hiểu thai kỳ, chăm sóc dinh dưỡng và chủ động cùng gia đình trong từng giai đoạn.</p>
          <div className="servicesHero__actions">
            <a className="landing-primary-button" href="#pricing" onClick={scrollToPricing}>Xem gói phù hợp <ArrowRight size={18} weight="bold" /></a>
            <Link
              className="landing-secondary-button"
              to={status === 'authenticated' ? '/app' : '/login'}
              state={status === 'authenticated' ? undefined : { from: '/app' }}
            >
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
        <aside className="servicesHero__summary" aria-label="Tổng quan hệ sinh thái NutriMom">
          <div className="servicesHero__summaryTop">
            <span>NutriMom care system</span>
            <strong>06</strong>
          </div>
          <p>Một hành trình xuyên suốt từ theo dõi, lưu trữ đến phân tích và gợi ý.</p>
          <div className="servicesHero__summaryGrid">
            <span><CheckCircle size={18} weight="fill" /> Thai kỳ</span>
            <span><CheckCircle size={18} weight="fill" /> Dinh dưỡng</span>
            <span><CheckCircle size={18} weight="fill" /> Hồ sơ</span>
            <span><CheckCircle size={18} weight="fill" /> Gia đình</span>
          </div>
        </aside>
        <div className="servicesHero__trust" aria-label="Giá trị của hệ sinh thái NutriMom">
          <div><strong>06</strong><span>dịch vụ kết nối</span></div>
          <div><CheckCircle size={18} weight="fill" /><span>Dữ liệu xuyên suốt</span></div>
          <div><Heart size={18} weight="fill" /><span>Chăm sóc theo từng giai đoạn</span></div>
        </div>
      </section>

      <section className="serviceCollectionBand" aria-labelledby="service-list-title">
        <div className="serviceCollection landing-section">
          <div className="servicesTransition" data-services-reveal>
            <span className="servicesTransition__accent" aria-hidden="true" />
            <span>KHÁM PHÁ HỆ SINH THÁI</span>
            <span className="servicesTransition__line" aria-hidden="true" />
          </div>

          <div className="serviceCollection__heading" data-services-reveal>
            <div>
              <span className="premiumEyebrow">6 DỊCH VỤ TRỌNG TÂM</span>
              <h2 id="service-list-title">Hữu ích trong đời sống thật của mẹ.</h2>
            </div>
            <p>Mỗi dịch vụ giải quyết một nhu cầu rõ ràng và cùng chia sẻ dữ liệu để trải nghiệm không bị rời rạc.</p>
          </div>

          {searchTerm && (
            <div className="premiumSearchNote" role="status" data-services-reveal>
              <span>Kết quả cho “{searchTerm}”</span>
              <strong>{filteredServices.length} dịch vụ phù hợp</strong>
            </div>
          )}

          {filteredServices.length > 0 ? (
            <div className="premiumServicesGrid">
              {featuredService && <ServiceCard service={featuredService} featured />}
              {standardServices.map((service) => <ServiceCard key={service.slug} service={service} />)}
            </div>
          ) : (
            <div className="premiumEmptyState" data-services-reveal>
              <Sparkle size={30} weight="duotone" />
              <h2>Chưa tìm thấy dịch vụ phù hợp</h2>
              <p>Thử một từ khóa khác hoặc quay lại toàn bộ sáu dịch vụ của NutriMom.</p>
              <Link className="landing-secondary-button" to="/services">Xem tất cả dịch vụ</Link>
            </div>
          )}
        </div>
      </section>

      <PublicPricingSection
        isAuthenticated={status === 'authenticated'}
        currentPlanTier={subscription?.active ? subscription.plan_tier : undefined}
      />

    </main>
  )
}
