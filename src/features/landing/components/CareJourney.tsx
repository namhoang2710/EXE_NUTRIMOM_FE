import {
  ArrowRight,
  CheckCircle,
  Cloud,
  Sparkle,
  StarFour,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ServiceIcon } from './ServiceIcon'
import type { ServiceIconName } from '../model/service-content'
import './care-journey.css'

interface CareJourneyStep {
  number: string
  title: string
  description: string
  benefits: readonly [string, string]
  href: string
  icon: ServiceIconName
  accent: 'peach' | 'lavender' | 'champagne'
}

const careJourneySteps: CareJourneyStep[] = [
  {
    number: '01',
    title: 'Theo dõi hành trình thai kỳ',
    description: 'Ghi lại từng cột mốc, lịch khám và thay đổi quan trọng trong suốt thai kỳ.',
    benefits: ['Nhắc lịch đúng thời điểm', 'Theo dõi theo từng tuần thai'],
    href: '/services/pregnancy-tracking',
    icon: 'calendar',
    accent: 'peach',
  },
  {
    number: '02',
    title: 'Hồ sơ sức khỏe cá nhân',
    description: 'Sắp xếp giấy khám và dữ liệu sức khỏe của mẹ trong một không gian rõ ràng, bảo mật.',
    benefits: ['Lưu trữ thông tin tập trung', 'Dễ dàng xem lại từng lần khám'],
    href: '/services/personal-health-records',
    icon: 'notebook',
    accent: 'lavender',
  },
  {
    number: '03',
    title: 'Tư vấn và kết nối',
    description: 'Tiếp cận nguồn hỗ trợ phù hợp để giải đáp những băn khoăn trong hành trình làm mẹ.',
    benefits: ['Kết nối hỗ trợ phù hợp', 'Đồng hành cùng cả gia đình'],
    href: '/services/expert-connection',
    icon: 'chat',
    accent: 'champagne',
  },
]

export function CareJourney() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.16,
    })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className={`careJourney${visible ? ' careJourney--visible' : ''}`}
      ref={sectionRef}
      aria-labelledby="careJourney-title"
    >
      <div className="careJourney__decorations" aria-hidden="true">
        <Cloud className="careJourney__cloud" size={106} weight="duotone" />
        <StarFour className="careJourney__star careJourney__star--one" size={19} weight="fill" />
        <Sparkle className="careJourney__star careJourney__star--two" size={13} weight="fill" />
        <span className="careJourney__glow" />
      </div>

      <div className="careJourney__heading">
        <span className="careJourney__eyebrow">NUTRIMOM Ở BÊN BẠN</span>
        <h2 className="careJourney__title" id="careJourney-title">
          <span className="careJourney__titleMain">Từng chăm sóc nhỏ,</span>
          <em className="careJourney__titleAccent">ươm nên một hành trình khỏe mạnh.</em>
        </h2>
        <p className="careJourney__description">
          Từ theo dõi thai kỳ, lưu giữ hồ sơ đến kết nối hỗ trợ — mọi trải nghiệm đều được thiết kế để mẹ luôn an tâm và chủ động.
        </p>
      </div>

      <div className="careJourney__stage">
        <div className="careJourney__path" aria-hidden="true">
          <svg className="careJourney__pathSvg" viewBox="0 0 1000 150" preserveAspectRatio="none">
            <path className="careJourney__pathShadow" d="M 55 92 C 245 12, 350 138, 500 74 S 760 16, 945 86" />
            <path className="careJourney__pathLine" d="M 55 92 C 245 12, 350 138, 500 74 S 760 16, 945 86" />
          </svg>
          <span className="careJourney__milestone careJourney__milestone--one" />
          <span className="careJourney__milestone careJourney__milestone--two" />
          <span className="careJourney__milestone careJourney__milestone--three" />
        </div>

        <div className="careJourney__grid">
          {careJourneySteps.map((step) => (
            <div className="careJourney__cardReveal" key={step.number}>
              <article className={`careJourney__card careJourney__card--${step.accent}`}>
                <span className="careJourney__number" aria-hidden="true">{step.number}</span>
                <div className="careJourney__icon" aria-hidden="true">
                  <ServiceIcon name={step.icon} size={30} />
                </div>
                <h3 className="careJourney__cardTitle">{step.title}</h3>
                <p className="careJourney__cardDescription">{step.description}</p>
                <ul className="careJourney__benefits">
                  {step.benefits.map((benefit) => (
                    <li className="careJourney__benefit" key={benefit}>
                      <CheckCircle className="careJourney__benefitIcon" size={17} weight="fill" aria-hidden="true" />
                      <span className="careJourney__benefitText">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link className="careJourney__link" to={step.href}>
                  Khám phá
                  <span className="careJourney__linkIcon" aria-hidden="true">
                    <ArrowRight size={15} weight="bold" />
                  </span>
                </Link>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
