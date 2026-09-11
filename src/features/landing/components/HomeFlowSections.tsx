import {
  ArrowRight,
  BookOpenText,
  Camera,
  CheckCircle,
  ForkKnife,
  Sparkle,
  StarFour,
  UsersThree,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { blogPosts } from '@/features/knowledge/model/article-content'
import './home-flow.css'

function useRevealOnView() {
  const elementRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.12,
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { elementRef, visible }
}

const storyValues = [
  'Nội dung được chọn lọc cẩn thận',
  'Thông tin rõ ràng, dễ tiếp cận',
  'Tôn trọng sự riêng tư của mỗi gia đình',
] as const

const ctaPromises = [
  'Miễn phí để bắt đầu',
  'Thông tin được bảo mật',
  'Dễ dàng sử dụng',
] as const

const impactMetrics = [
  {
    value: '40',
    label: 'Tuần thai rõ ràng',
    detail: 'Theo dõi theo từng giai đoạn',
  },
  {
    value: '06',
    label: 'Dịch vụ trọng tâm',
    detail: 'Ít hơn nhưng hữu ích hơn',
  },
  {
    value: 'AI',
    label: 'Hiểu từng bữa ăn',
    detail: 'Nhận diện và gợi ý bổ sung',
  },
  {
    value: '02',
    label: 'Người cùng đồng hành',
    detail: 'Gợi ý cho mẹ và người chồng',
  },
] as const

export function HomeTrustImpactBar() {
  const { elementRef, visible } = useRevealOnView()

  return (
    <section
      className={`homeImpact${visible ? ' homeImpact--visible' : ''}`}
      ref={elementRef}
      aria-labelledby="homeImpact-title"
    >
      <h2 className="sr-only" id="homeImpact-title">
        Những con số tạo nên niềm tin với NutriMom
      </h2>
      <div className="homeImpact__inner">
        <dl className="homeImpact__grid">
          {impactMetrics.map((metric) => (
            <div className="homeImpact__item" key={metric.value}>
              <dt className="homeImpact__value">{metric.value}</dt>
              <dd className="homeImpact__copy">
                <strong>{metric.label}</strong>
                <span>{metric.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function HomeBrandStory() {
  const { elementRef, visible } = useRevealOnView()

  return (
    <section
      className={`homeStory${visible ? ' homeStory--visible' : ''}`}
      ref={elementRef}
      aria-labelledby="homeStory-title"
    >
      <div className="homeStory__inner">
        <figure className="homeStory__visual">
          <img
            className="homeStory__image"
            src="/banner5.png"
            width="1919"
            height="820"
            loading="lazy"
            decoding="async"
            alt="Gia đình dịu dàng ôm em bé trong vòng tay yêu thương."
          />
          <figcaption className="homeStory__caption">
            <Sparkle size={15} weight="fill" aria-hidden="true" />
            Đồng hành bằng sự thấu hiểu
          </figcaption>
        </figure>

        <div className="homeStory__content">
          <div className="homeStory__eyebrow">
            <StarFour size={17} weight="fill" aria-hidden="true" />
            CHĂM SÓC CÓ CHIỀU SÂU
          </div>
          <h2 className="homeStory__title" id="homeStory-title">
            Hiểu điều mẹ cần, <em className="homeStory__titleAccent">trân trọng điều mẹ cảm nhận.</em>
          </h2>
          <p className="homeStory__description">
            NutriMom không gom thật nhiều nội dung. Nền tảng kết nối đúng dữ liệu, đúng công cụ và đúng gợi ý để mẹ luôn hiểu điều quan trọng nhất ở mỗi giai đoạn.
          </p>
          <ul className="homeStory__values">
            {storyValues.map((value) => (
              <li className="homeStory__value" key={value}>
                <CheckCircle className="homeStory__valueIcon" size={18} weight="fill" aria-hidden="true" />
                <span className="homeStory__valueText">{value}</span>
              </li>
            ))}
          </ul>
          <Link className="homeStory__link" to="/about">
            Câu chuyện của NutriMom
            <ArrowRight className="homeStory__linkArrow" size={17} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function HomeIntelligence() {
  const { elementRef, visible } = useRevealOnView()

  return (
    <section
      className={`homeIntelligence${visible ? ' homeIntelligence--visible' : ''}`}
      ref={elementRef}
      aria-labelledby="homeIntelligence-title"
    >
      <div className="homeIntelligence__inner">
        <div className="homeIntelligence__copy">
          <span className="homeIntelligence__eyebrow"><Sparkle size={14} weight="fill" /> AI DINH DƯỠNG CÓ BỐI CẢNH</span>
          <h2 id="homeIntelligence-title">Không chỉ nhận diện món ăn.<br /><em>AI hiểu mẹ đang cần gì.</em></h2>
          <p>NutriMom đặt kết quả phân tích bữa ăn bên cạnh tuần thai và hồ sơ cá nhân để gợi ý gần với nhu cầu thực tế hơn.</p>
          <ol>
            <li><span>01</span><div><strong>Chụp hoặc tải ảnh</strong><small>Ghi nhận bữa ăn trong vài giây.</small></div></li>
            <li><span>02</span><div><strong>Hiểu chất và lượng</strong><small>Nhìn rõ nhóm chất, phần thiếu và xu hướng dư.</small></div></li>
            <li><span>03</span><div><strong>Nhận gợi ý tiếp theo</strong><small>Điều chỉnh bữa sau nhẹ nhàng, không áp đặt.</small></div></li>
          </ol>
          <Link className="homeIntelligence__link" to="/services/food-scan-ai">Khám phá AI scan món ăn <ArrowRight size={17} weight="bold" /></Link>
        </div>

        <div className="homeIntelligence__visual" aria-label="Minh họa luồng phân tích món ăn bằng AI">
          <div className="homeIntelligence__visualTop"><span><HeartMark /> NutriMom AI</span><small>Thai tuần 24</small></div>
          <div className="homeIntelligence__meal">
            <span className="homeIntelligence__camera"><Camera size={31} weight="duotone" /></span>
            <div><small>BỮA TRƯA HÔM NAY</small><strong>Cơm gạo lứt · Cá hồi · Rau xanh</strong></div>
            <span className="homeIntelligence__score">8.6</span>
          </div>
          <div className="homeIntelligence__nutrients">
            <div><span>Protein</span><i><b style={{ width: '82%' }} /></i><strong>Tốt</strong></div>
            <div><span>Chất xơ</span><i><b style={{ width: '56%' }} /></i><strong>Cần thêm</strong></div>
            <div><span>Sắt</span><i><b style={{ width: '48%' }} /></i><strong>Cần thêm</strong></div>
          </div>
          <div className="homeIntelligence__suggestion">
            <ForkKnife size={21} weight="duotone" />
            <div><small>GỢI Ý BỔ SUNG</small><strong>Thêm một phần rau lá xanh hoặc đậu lăng</strong></div>
          </div>
          <div className="homeIntelligence__family"><UsersThree size={18} weight="fill" /> Đã thêm gợi ý bữa tối cho người đồng hành</div>
        </div>
      </div>
    </section>
  )
}

function HeartMark() {
  return <span aria-hidden="true">♥</span>
}

export function HomeKnowledge() {
  const { elementRef, visible } = useRevealOnView()
  const [featuredPost, ...supportingPosts] = blogPosts

  if (!featuredPost) return null

  return (
    <section
      className={`homeKnowledge${visible ? ' homeKnowledge--visible' : ''}`}
      ref={elementRef}
      aria-labelledby="homeKnowledge-title"
    >
      <div className="homeKnowledge__inner">
        <div className="homeKnowledge__heading">
          <div className="homeKnowledge__headingCopy">
            <span className="homeKnowledge__eyebrow">GÓC KIẾN THỨC</span>
            <h2 className="homeKnowledge__title" id="homeKnowledge-title">
              Nội dung hữu ích, <em className="homeKnowledge__titleAccent">được chọn lọc cho mẹ.</em>
            </h2>
          </div>
          <Link className="homeKnowledge__allLink" to="/blog">
            Xem tất cả bài viết
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>

        <div className="homeKnowledge__layout">
          <Link className="homeKnowledge__featured" to={`/blog/${featuredPost.slug}`}>
            <div className="homeKnowledge__featuredVisual" aria-hidden="true">
              <span className="homeKnowledge__featuredHalo" />
              <BookOpenText className="homeKnowledge__featuredIcon" size={64} weight="duotone" />
              <StarFour className="homeKnowledge__featuredStar" size={20} weight="fill" />
            </div>
            <div className="homeKnowledge__featuredContent">
              <div className="homeKnowledge__meta">
                <span className="homeKnowledge__category">{featuredPost.category}</span>
                <span className="homeKnowledge__readTime">{featuredPost.readTime}</span>
              </div>
              <h3 className="homeKnowledge__featuredTitle">{featuredPost.title}</h3>
              <p className="homeKnowledge__featuredExcerpt">{featuredPost.excerpt}</p>
              <span className="homeKnowledge__readLink">
                Đọc bài viết
                <span className="homeKnowledge__readIcon" aria-hidden="true">
                  <ArrowRight size={15} weight="bold" />
                </span>
              </span>
            </div>
          </Link>

          <div className="homeKnowledge__supporting">
            {supportingPosts.slice(0, 2).map((post) => (
              <Link className="homeKnowledge__supportingPost" key={post.slug} to={`/blog/${post.slug}`}>
                <div className="homeKnowledge__meta">
                  <span className="homeKnowledge__category">{post.category}</span>
                  <span className="homeKnowledge__readTime">{post.readTime}</span>
                </div>
                <h3 className="homeKnowledge__supportingTitle">{post.title}</h3>
                <ArrowRight className="homeKnowledge__supportingArrow" size={22} weight="bold" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function HomeCommunityCta() {
  return (
    <section className="homeCta" aria-labelledby="homeCta-title">
      <StarFour className="homeCta__decoration" size={116} weight="fill" aria-hidden="true" />
      <div className="homeCta__inner">
        <div className="homeCta__copy">
          <span className="homeCta__eyebrow">BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</span>
          <h2 className="homeCta__title" id="homeCta-title">
            Mẹ an tâm hơn khi luôn có một người bạn đồng hành.
          </h2>
          <div className="homeCta__promises">
            {ctaPromises.map((promise) => (
              <span className="homeCta__promise" key={promise}>
                <CheckCircle className="homeCta__promiseIcon" size={17} weight="fill" aria-hidden="true" />
                {promise}
              </span>
            ))}
          </div>
        </div>

        <div className="homeCta__actions">
          <Link className="homeCta__primary" to="/register">
            Tạo tài khoản miễn phí
            <ArrowRight className="homeCta__primaryArrow" size={18} weight="bold" aria-hidden="true" />
          </Link>
          <Link className="homeCta__secondary" to="/about">Khám phá NutriMom</Link>
        </div>
      </div>
    </section>
  )
}
