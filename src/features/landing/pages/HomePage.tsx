import {
  ArrowRight,
  CheckCircle,
  Heart,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CareJourney } from '../components/CareJourney'
import { FloatingContactActions } from '../components/FloatingContactActions'
import { HomeBrandStory, HomeCommunityCta, HomeKnowledge } from '../components/HomeFlowSections'
import { TestimonialMarquee } from '../components/TestimonialMarquee'

const heroSlides = [
  {
    imageClassName: 'is-banner-1',
    imageDescription: 'Người mẹ dịu dàng ôm em bé đang ngủ.',
    eyebrow: 'Yêu thương bắt đầu từ sự thấu hiểu',
    title: 'Chăm sóc mẹ dịu dàng, nâng niu từng khởi đầu.',
    description: 'NutriMom giúp mẹ theo dõi hành trình thai kỳ, lưu giữ hồ sơ sức khỏe và kết nối với nguồn hỗ trợ đáng tin cậy trong một không gian an toàn.',
  },
  {
    imageClassName: 'is-banner-2',
    imageDescription: 'Bàn tay bé nhỏ được nâng niu trong vòng tay người thân.',
    eyebrow: 'Bình yên lớn lên từ những điều nhỏ bé',
    title: 'Đồng hành từ thuở con còn non, nâng niu từng ngày khôn lớn.',
    description: 'Mỗi cột mốc đầu đời đều đáng được lắng nghe và gìn giữ, để con lớn lên trong vòng tay yêu thương, an toàn và đầy thấu hiểu.',
  },
  {
    imageClassName: 'is-banner-3',
    imageDescription: 'Người chồng dịu dàng ở bên và chăm sóc vợ trong thai kỳ.',
    eyebrow: 'Cẩm nang dành cho người chồng yêu thương',
    title: 'Hiểu để thương vợ nhiều hơn, sẻ chia để mỗi ngày dịu dàng.',
    description: 'Những gợi ý gần gũi giúp chồng lắng nghe, chăm sóc và cùng vợ đi qua hành trình làm cha mẹ bằng sự hiện diện chân thành mỗi ngày.',
  },
  {
    imageClassName: 'is-banner-4',
    imageDescription: 'Người mẹ nâng niu mầm sống, hướng đến một tương lai khỏe mạnh.',
    eyebrow: 'Ươm mầm tương lai bằng hiểu biết',
    title: 'Nuôi dưỡng chồi non bằng yêu thương và nền tảng khoa học.',
    description: 'Khi tình thương đi cùng kiến thức đáng tin cậy, mỗi lựa chọn hôm nay sẽ trở thành nền móng vững vàng cho tương lai khỏe mạnh của con.',
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

      <FloatingContactActions visible={showContactActions} />

      <CareJourney />

      <HomeBrandStory />
      <HomeKnowledge />

      <div className="homeCommunity">
        <TestimonialMarquee />
        <HomeCommunityCta />
      </div>
    </main>
  )
}
