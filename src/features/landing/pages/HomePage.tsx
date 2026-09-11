import {
  ArrowRight,
  CheckCircle,
  Heart,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CareJourney } from '../components/CareJourney'
import { FloatingContactActions } from '../components/FloatingContactActions'
import {
  HomeBrandStory,
  HomeCommunityCta,
  HomeIntelligence,
  HomeTrustImpactBar,
} from '../components/HomeFlowSections'
import { TestimonialMarquee } from '../components/TestimonialMarquee'

const heroSlides = [
  {
    imageClassName: 'is-banner-1',
    imageDescription: 'Người mẹ dịu dàng ôm em bé đang ngủ.',
    eyebrow: 'Một hành trình được thiết kế quanh mẹ',
    title: 'Mỗi tuần thai rõ ràng. Mỗi lựa chọn thêm an tâm.',
    description: 'NutriMom kết nối theo dõi thai kỳ, hồ sơ sức khỏe, dinh dưỡng AI và sự đồng hành của gia đình trong một trải nghiệm ấm áp, dễ dùng.',
  },
  {
    imageClassName: 'is-banner-2',
    imageDescription: 'Bàn tay bé nhỏ được nâng niu trong vòng tay người thân.',
    eyebrow: 'Theo dõi thai kỳ không còn rời rạc',
    title: 'Biết mình đang ở đâu, hiểu điều gì sắp đến.',
    description: 'Tuần thai, lịch khám, triệu chứng, ghi chú và nhắc việc được sắp xếp theo một tiến trình dễ xem lại và dễ chuẩn bị.',
  },
  {
    imageClassName: 'is-banner-3',
    imageDescription: 'Người chồng dịu dàng ở bên và chăm sóc vợ trong thai kỳ.',
    eyebrow: 'Cả gia đình cùng biết cách đồng hành',
    title: 'Chăm sóc mẹ không còn là hành trình của một người.',
    description: 'Người chồng nhận được gợi ý cụ thể để nấu ăn, sẻ chia, hỗ trợ tinh thần và cùng mẹ chuẩn bị cho từng giai đoạn.',
  },
  {
    imageClassName: 'is-banner-4',
    imageDescription: 'Người mẹ nâng niu mầm sống, hướng đến một tương lai khỏe mạnh.',
    eyebrow: 'AI dinh dưỡng gần gũi và hữu ích',
    title: 'Một bức ảnh bữa ăn, thêm một lựa chọn phù hợp.',
    description: 'AI scan món ăn giúp mẹ hiểu chất, lượng, điểm thiếu hoặc thừa và nhận gợi ý bổ sung theo đúng giai đoạn thai kỳ.',
  },
] as const

export function HomePage() {
  const heroRef = useRef<HTMLElement>(null)
  const [showContactActions, setShowContactActions] = useState(false)
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)

  useEffect(() => {
    let rotationTimer: number | undefined
    const firstTransitionTimer = window.setTimeout(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length)
      rotationTimer = window.setInterval(() => {
        setActiveHeroSlide((current) => (current + 1) % heroSlides.length)
      }, 4_000)
    }, 3_000)

    return () => {
      window.clearTimeout(firstTransitionTimer)
      if (rotationTimer) window.clearInterval(rotationTimer)
    }
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const headerHeight = document.querySelector<HTMLElement>('.landing-header')?.offsetHeight ?? 0
    const observer = new IntersectionObserver(([entry]) => {
      setShowContactActions(entry.intersectionRatio < 0.5)
    }, {
      rootMargin: `-${headerHeight}px 0px 0px 0px`,
      threshold: [0, 0.5, 1],
    })

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="landing-main homeFlow">
      <section className="home-hero landing-section" ref={heroRef}>
        {heroSlides.map((slide, index) => (
          <div
            className={`home-hero-backdrop ${slide.imageClassName}${index === activeHeroSlide ? ' is-active' : ''}`}
            key={slide.imageClassName}
            aria-hidden="true"
          />
        ))}

        <span className="sr-only">{heroSlides[activeHeroSlide].imageDescription}</span>
        <div className="home-hero-copy-stack landing-reveal">
          {heroSlides.map((slide, index) => {
            const isActive = index === activeHeroSlide
            return (
              <article className={`home-hero-copy${isActive ? ' is-active' : ''}`} key={slide.imageClassName} aria-hidden={!isActive}>
                <div className="landing-eyebrow">
                  <Heart size={17} weight="fill" aria-hidden="true" />
                  {slide.eyebrow}
                </div>
                <h1>{slide.title}</h1>
                <p>{slide.description}</p>
                {index === 0 && (
                  <>
                    <div className="home-hero-actions">
                      <Link className="landing-primary-button" to="/register" tabIndex={isActive ? undefined : -1}>
                        Bắt đầu cùng NutriMom
                        <ArrowRight size={20} weight="bold" />
                      </Link>
                      <Link className="landing-secondary-button" to="/services" tabIndex={isActive ? undefined : -1}>Khám phá dịch vụ</Link>
                    </div>
                    <div className="home-trust-row">
                      <span><CheckCircle size={18} weight="fill" /> Cá nhân hóa</span>
                      <span><CheckCircle size={18} weight="fill" /> Riêng tư</span>
                      <span><CheckCircle size={18} weight="fill" /> Dễ sử dụng</span>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <HomeTrustImpactBar />

      <FloatingContactActions visible={showContactActions} />

      <CareJourney />

      <HomeBrandStory />
      <HomeIntelligence />

      <div className="homeCommunity">
        <TestimonialMarquee />
        <HomeCommunityCta />
      </div>
    </main>
  )
}
