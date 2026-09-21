import {
  ArrowRight,
  Check,
  CheckCircle,
  Heart,
  ShieldCheck,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import type { MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ServiceIcon } from '../components/ServiceIcon'
import { services, type ServiceContent } from '../model/service-content'
import './services-premium.css'

function includesSearch(values: string[], search: string) {
  return values.join(' ').toLocaleLowerCase('vi-VN').includes(search)
}

const pricingPlans = [
  {
    name: 'Free',
    price: '0đ',
    cadence: 'mãi mãi',
    description: 'Đủ để mẹ bắt đầu lưu lại hành trình của mình.',
    featured: false,
    features: [
      { label: 'Không liên kết gia đình', included: false },
      { label: 'Không tính ngày thụ thai', included: false },
      { label: 'Có lưu hồ sơ sức khỏe', included: true },
      { label: 'AI scan', included: true },
    ],
  },
  {
    name: '99K',
    price: '99.000đ',
    cadence: 'mỗi tháng',
    description: 'Thêm công cụ chủ động cho hành trình thai kỳ.',
    featured: false,
    features: [
      { label: 'Không liên kết gia đình', included: false },
      { label: 'Có tính ngày thụ thai', included: true },
      { label: 'Không lưu hồ sơ nâng cao', included: false },
      { label: 'Dùng AI scan 2 lần / ngày', included: true },
    ],
  },
  {
    name: '399K',
    price: '399.000đ',
    cadence: 'mỗi tháng',
    description: 'Trọn vẹn trải nghiệm chăm sóc cho cả gia đình.',
    featured: true,
    features: [
      { label: 'Được tất cả tính năng', included: true },
      { label: 'Liên kết gia đình', included: true },
      { label: 'Tính ngày thụ thai', included: true },
      { label: 'Lưu hồ sơ trọn đời', included: true },
      { label: 'AI scan không giới hạn', included: true },
      { label: 'Gợi ý cá nhân hóa toàn diện', included: true },
    ],
  },
] as const

function ServiceCard({ service, featured = false }: { service: ServiceContent; featured?: boolean }) {
  return (
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
  )
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
      service.promise,
      ...service.highlights,
    ], normalizedSearch))
    : services
  const featuredService = !normalizedSearch ? services.find((service) => service.slug === 'food-scan-ai') : undefined
  const standardServices = featuredService
    ? filteredServices.filter((service) => service.slug !== featuredService.slug)
    : filteredServices

  function scrollToPricing(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="landing-main nutrimomServices">
      <section className="servicesHero landing-section">
        <div className="servicesHero__copy landing-reveal">
          <span className="premiumEyebrow"><Heart size={15} weight="fill" /> HỆ SINH THÁI CHĂM SÓC</span>
          <h1>Ít công cụ hơn.<br /><em>Đúng điều mẹ cần hơn.</em></h1>
          <p>Sáu dịch vụ được kết nối quanh một mục tiêu: giúp mẹ hiểu thai kỳ, chăm sóc dinh dưỡng và chủ động cùng gia đình trong từng giai đoạn.</p>
          <div className="servicesHero__actions">
            <a className="landing-primary-button" href="#pricing" onClick={scrollToPricing}>Xem gói phù hợp <ArrowRight size={18} weight="bold" /></a>
            <Link className="landing-secondary-button" to="/register">Bắt đầu miễn phí</Link>
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
      </section>

      <section className="serviceCollection landing-section" aria-labelledby="service-list-title">
        <div className="serviceCollection__heading">
          <div>
            <span className="premiumEyebrow">6 DỊCH VỤ TRỌNG TÂM</span>
            <h2 id="service-list-title">Hữu ích trong đời sống thật của mẹ.</h2>
          </div>
          <p>Mỗi dịch vụ giải quyết một nhu cầu rõ ràng và cùng chia sẻ dữ liệu để trải nghiệm không bị rời rạc.</p>
        </div>

        {searchTerm && (
          <div className="premiumSearchNote" role="status">
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
          <div className="premiumEmptyState">
            <Sparkle size={30} weight="duotone" />
            <h2>Chưa tìm thấy dịch vụ phù hợp</h2>
            <p>Thử một từ khóa khác hoặc quay lại toàn bộ sáu dịch vụ của NutriMom.</p>
            <Link className="landing-secondary-button" to="/services">Xem tất cả dịch vụ</Link>
          </div>
        )}
      </section>

      <section className="premiumPricing" id="pricing" aria-labelledby="pricing-title">
        <div className="premiumPricing__inner landing-section">
          <div className="premiumPricing__heading">
            <span className="premiumEyebrow">GÓI ĐỒNG HÀNH</span>
            <h2 id="pricing-title">Chọn mức chăm sóc<br /><em>vừa vặn với gia đình.</em></h2>
            <p>Quyền lợi rõ ràng, không điều khoản mơ hồ. Mẹ có thể bắt đầu miễn phí và nâng cấp khi cần.</p>
          </div>

          <div className="premiumPricing__grid">
            {pricingPlans.map((plan) => (
              <article className={`premiumPlan${plan.featured ? ' premiumPlan--featured' : ''}`} key={plan.name}>
                {plan.featured && <span className="premiumPlan__badge"><Sparkle size={13} weight="fill" /> TOÀN DIỆN NHẤT</span>}
                <div className="premiumPlan__nameRow">
                  <h3>{plan.name}</h3>
                  {plan.featured ? <Heart size={24} weight="fill" /> : <ShieldCheck size={24} weight="duotone" />}
                </div>
                <p className="premiumPlan__description">{plan.description}</p>
                <div className="premiumPlan__price"><strong>{plan.price}</strong><span>/ {plan.cadence}</span></div>
                <div className="premiumPlan__divider" />
                <ul>
                  {plan.features.map((feature) => (
                    <li className={feature.included ? '' : 'is-muted'} key={feature.label}>
                      {feature.included ? <Check size={17} weight="bold" /> : <X size={17} weight="bold" />}
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
                <Link className="premiumPlan__button" to="/register">
                  {plan.name === 'Free' ? 'Bắt đầu miễn phí' : `Chọn gói ${plan.name}`}
                  <ArrowRight size={17} weight="bold" />
                </Link>
              </article>
            ))}
          </div>
          <p className="premiumPricing__note"><ShieldCheck size={17} weight="fill" /> Thông tin sức khỏe được quản lý riêng tư và minh bạch theo lựa chọn của bạn.</p>
        </div>
      </section>
    </main>
  )
}
