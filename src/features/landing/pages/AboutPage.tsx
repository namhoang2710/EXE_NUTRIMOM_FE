import {
  ArrowRight,
  Baby,
  CalendarCheck,
  Certificate,
  Heart,
  Heartbeat,
  HouseLine,
  ShieldCheck,
  Sparkle,
  Stethoscope,
} from '@phosphor-icons/react'
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const journeyStages = [
  {
    icon: Heart,
    label: 'Trước khi làm mẹ',
    text: 'Chuẩn bị kiến thức, sức khỏe và một tâm thế vững vàng cho hành trình phía trước.',
  },
  {
    icon: CalendarCheck,
    label: 'Trong thai kỳ',
    text: 'Theo dõi từng cột mốc, lắng nghe cơ thể và nhận hỗ trợ đúng lúc mẹ cần.',
  },
  {
    icon: Baby,
    label: 'Sau khi em bé chào đời',
    text: 'Đồng hành cùng mẹ trong những đổi thay mới, từ phục hồi đến chăm sóc bé mỗi ngày.',
  },
]

const perspectives = [
  {
    icon: Heartbeat,
    className: 'is-sage',
    title: 'Sức khỏe thể chất',
    text: 'Giúp mẹ theo dõi hành trình sức khỏe, lưu giữ thông tin cần thiết và tiếp cận kiến thức phù hợp theo từng giai đoạn.',
  },
  {
    icon: Sparkle,
    className: 'is-coral',
    title: 'Sự an tâm tinh thần',
    text: 'Một không gian nhẹ nhàng để mẹ hiểu điều mình đang trải qua, bớt hoang mang và chủ động đặt câu hỏi khi cần.',
  },
  {
    icon: HouseLine,
    className: 'is-warm',
    title: 'Sự đồng hành của gia đình',
    text: 'Đưa người thân đến gần hành trình chăm sóc hơn bằng thông tin rõ ràng, sự chuẩn bị chung và những lựa chọn có thấu hiểu.',
  },
]

const statistics = [
  { value: '01', label: 'nền tảng chăm sóc', note: 'Một nơi để mẹ bắt đầu và tiếp tục hành trình.' },
  { value: '03', label: 'lớp đồng hành', note: 'Sức khỏe, tinh thần và gia đình luôn được kết nối.' },
  { value: '24/7', label: 'kiến thức và hỗ trợ', note: 'Thông tin gần gũi, sẵn sàng khi mẹ cần tham khảo.' },
]

const verificationStandards = [
  {
    icon: Certificate,
    title: 'Xác minh hồ sơ',
    text: 'Đối chiếu thông tin định danh và giấy phép hành nghề trước khi chuyên gia xuất hiện trên nền tảng.',
  },
  {
    icon: Stethoscope,
    title: 'Đúng chuyên môn',
    text: 'Trình bày rõ chuyên khoa và phạm vi tư vấn để gia đình lựa chọn đúng người đồng hành.',
  },
  {
    icon: ShieldCheck,
    title: 'Theo dõi chất lượng',
    text: 'Rà soát tiêu chuẩn chuyên môn, tính minh bạch và trải nghiệm hỗ trợ trong suốt quá trình hoạt động.',
  },
]

export function AboutPage() {
  const pageRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const page = pageRef.current

    if (!page) return

    const revealSections = Array.from(
      page.querySelectorAll<HTMLElement>('[data-about-scroll-reveal]'),
    )

    page.classList.add('has-scroll-reveal')

    if (
      !('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      revealSections.forEach((section) => section.classList.add('is-revealed'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.12,
      },
    )

    revealSections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  return (
    <main ref={pageRef} className="landing-main aboutEditorial">
      <section className="aboutEditorialHero landing-section" aria-labelledby="about-editorial-title">
        <figure className="aboutEditorialHero__visual landing-reveal">
          <img
            src="/register-panel.jpg"
            width="1254"
            height="1254"
            alt="Mẹ dịu dàng ôm em bé giữa những đám mây"
          />
          <figcaption className="aboutEditorialHero__trust">
            <span className="aboutEditorialHero__trustIcon" aria-hidden="true">
              <Stethoscope size={22} weight="duotone" />
            </span>
            <span>
              <strong>Chuyên môn được chọn lọc</strong>
              Đồng hành bằng sự thấu hiểu
            </span>
          </figcaption>
        </figure>

        <div className="aboutEditorialHero__copy landing-reveal landing-reveal-delay">
          <div className="aboutEditorialEyebrow">
            <Heart size={17} weight="fill" aria-hidden="true" /> Về NutriMom
          </div>
          <h1 id="about-editorial-title">Chăm sóc một người mẹ là vun đắp tương lai của cả gia đình.</h1>
          <p>NutriMom được xây dựng từ một niềm tin giản dị: mẹ không chỉ cần công cụ theo dõi, mà còn cần kiến thức dễ hiểu, sự hỗ trợ đúng lúc và một nơi để cả gia đình cùng an tâm bước tiếp.</p>
          <div className="aboutEditorialHero__actions">
            <Link className="landing-primary-button" to="/services">
              Khám phá dịch vụ <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
            <Link className="landing-secondary-button" to="/contact">Kết nối với NutriMom</Link>
          </div>
          <p className="aboutEditorialHero__note">
            <ShieldCheck size={19} weight="fill" aria-hidden="true" />
            Riêng tư, rõ ràng và luôn tôn trọng lựa chọn của mẹ.
          </p>
        </div>
      </section>

      <section
        className="aboutEditorialJourney"
        aria-labelledby="about-journey-title"
        data-about-scroll-reveal="journey"
      >
        <div className="aboutEditorialJourney__inner landing-section">
          <header className="aboutEditorialHeading aboutScrollRevealLead">
            <span>HÀNH TRÌNH LỚN LÊN CÙNG MẸ</span>
            <h2 id="about-journey-title">Mỗi giai đoạn là một câu chuyện. NutriMom ở đó để cùng mẹ đi tiếp.</h2>
            <p>Từ những chuẩn bị đầu tiên đến ngày bé cất tiếng khóc chào đời, sự đồng hành được nối tiếp bằng hiểu biết, lắng nghe và chăm sóc.</p>
          </header>

          <ol className="aboutEditorialJourney__timeline">
            {journeyStages.map(({ icon: Icon, label, text }, index) => (
              <li key={label}>
                <span className="aboutEditorialJourney__number">0{index + 1}</span>
                <span className="aboutEditorialJourney__icon" aria-hidden="true">
                  <Icon size={26} weight="duotone" />
                </span>
                <h3>{label}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="aboutEditorialPerspective landing-section"
        aria-labelledby="about-perspective-title"
        data-about-scroll-reveal="perspective"
      >
        <header className="aboutEditorialHeading aboutEditorialHeading--left aboutScrollRevealLead">
          <span>MỘT GÓC NHÌN BAO QUÁT</span>
          <h2 id="about-perspective-title">Chăm sóc mẹ là nhìn thấy cả những điều đang diễn ra quanh mẹ.</h2>
          <p>Một hành trình khỏe mạnh được tạo nên từ nhiều mảnh ghép. NutriMom kết nối những mảnh ghép ấy thành trải nghiệm liền mạch và gần gũi.</p>
        </header>

        <div className="aboutEditorialPerspective__mosaic">
          {perspectives.map(({ icon: Icon, className, title, text }, index) => (
            <article className={`aboutEditorialPerspective__item ${className}`} key={title}>
              <div className="aboutEditorialPerspective__meta">
                <span aria-hidden="true"><Icon size={28} weight="duotone" /></span>
                <small>0{index + 1}</small>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="aboutEditorialStats" aria-labelledby="about-stats-title">
        <div className="aboutEditorialStats__inner landing-section">
          <header className="aboutEditorialStats__heading landing-reveal">
            <span>NUTRIMOM TRONG MỘT ÁNH NHÌN</span>
            <h2 id="about-stats-title">Một điểm chạm nhỏ, mở ra nhiều lớp an tâm.</h2>
          </header>
          <dl className="aboutEditorialStats__list">
            {statistics.map(({ value, label, note }, index) => (
              <div className="landing-reveal" style={{ animationDelay: `${index * 100}ms` }} key={value}>
                <dt><strong>{value}</strong><span>{label}</span></dt>
                <dd>{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="aboutEditorialCommitment landing-section" aria-labelledby="about-commitment-title">
        <header className="aboutEditorialCommitment__intro landing-reveal">
          <span>CAM KẾT CHUYÊN MÔN</span>
          <h2 id="about-commitment-title">Niềm tin được xây bằng một quy trình rõ ràng.</h2>
          <p>NutriMom hướng tới kết nối gia đình với bác sĩ và chuyên gia có hồ sơ minh bạch, đúng chuyên khoa và phù hợp với từng nhu cầu hỗ trợ.</p>
          <p className="aboutEditorialCommitment__note">
            <ShieldCheck size={19} weight="fill" aria-hidden="true" />
            Tiêu chuẩn vận hành được duy trì trong suốt hành trình kết nối.
          </p>
        </header>

        <ol className="aboutEditorialCommitment__steps">
          {verificationStandards.map(({ icon: Icon, title, text }, index) => (
            <li className="landing-reveal" style={{ animationDelay: `${index * 110}ms` }} key={title}>
              <span className="aboutEditorialCommitment__stepNumber">0{index + 1}</span>
              <span className="aboutEditorialCommitment__stepIcon" aria-hidden="true">
                <Icon size={27} weight="duotone" />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="aboutEditorialStatement" aria-label="Tuyên ngôn thương hiệu NutriMom">
        <div className="aboutEditorialStatement__inner landing-section landing-reveal">
          <Sparkle size={34} weight="fill" aria-hidden="true" />
          <p>“Không để mẹ phải tự mình hiểu mọi thứ.”</p>
          <span>Bởi sự an tâm bắt đầu khi mẹ biết mình luôn có người đồng hành.</span>
        </div>
      </section>

      <section className="aboutEditorialCta landing-section landing-reveal" aria-labelledby="about-cta-title">
        <div className="aboutEditorialCta__copy">
          <span>ĐI CÙNG GIA ĐÌNH VỀ PHÍA TRƯỚC</span>
          <h2 id="about-cta-title">Bắt đầu hành trình chăm sóc bằng một điều thật giản dị: hiểu mẹ hơn.</h2>
          <p>NutriMom mong trở thành người bạn đồng hành lâu dài, giúp cha mẹ chuẩn bị tốt hơn, kết nối đúng hỗ trợ và nuôi dưỡng một nền tảng khỏe mạnh cho thế hệ tiếp theo.</p>
          <Link className="aboutEditorialCta__button" to="/register">
            Bắt đầu cùng NutriMom <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <figure className="aboutEditorialCta__visual">
          <img
            src="/banner2.png"
            width="1931"
            height="814"
            loading="lazy"
            alt="Bàn tay người mẹ nâng niu bàn tay nhỏ của em bé"
          />
        </figure>
      </section>
    </main>
  )
}
