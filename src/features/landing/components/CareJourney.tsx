import { ArrowRight, CheckCircle, Sparkle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { services } from '../model/service-content'
import { ServiceIcon } from './ServiceIcon'
import './care-journey.css'

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
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section className={`careJourney${visible ? ' careJourney--visible' : ''}`} ref={sectionRef} aria-labelledby="careJourney-title">
      <div className="careJourney__heading">
        <div>
          <span className="careJourney__eyebrow"><Sparkle size={14} weight="fill" /> 6 DỊCH VỤ, MỘT HÀNH TRÌNH</span>
          <h2 id="careJourney-title">Chăm sóc có hệ thống,<br /><em>nhưng luôn thật dịu dàng.</em></h2>
        </div>
        <p>Từ tuần thai đầu tiên đến từng bữa ăn và sự đồng hành của gia đình, mỗi công cụ đều giải quyết một nhu cầu rõ ràng của mẹ.</p>
      </div>

      <div className="careJourney__grid">
        {services.map((service, index) => (
          <article className={`careJourney__card careJourney__card--${service.tone}`} key={service.slug}>
            <div className="careJourney__cardTop">
              <span className="careJourney__icon"><ServiceIcon name={service.icon} size={27} /></span>
              <span className="careJourney__number">0{index + 1}</span>
            </div>
            <span className="careJourney__tag">{service.tag}</span>
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
            <div className="careJourney__benefit"><CheckCircle size={17} weight="fill" /> {service.highlights[0]}</div>
            <Link className="careJourney__link" to={`/services/${service.slug}`}>
              Xem trải nghiệm <ArrowRight size={16} weight="bold" />
            </Link>
          </article>
        ))}
      </div>

      <div className="careJourney__footer">
        <p>Không thêm chức năng cho thật nhiều. Chỉ tập trung vào những điều giúp thai kỳ dễ theo dõi và chăm sóc hơn.</p>
        <Link to="/services">Khám phá hệ sinh thái NutriMom <ArrowRight size={17} weight="bold" /></Link>
      </div>
    </section>
  )
}
