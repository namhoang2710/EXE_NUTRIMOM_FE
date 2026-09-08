import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  Sparkle,
  StarFour,
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
            NutriMom hướng đến một không gian nơi kiến thức sức khỏe trở nên gần gũi, thông tin được trình bày rõ ràng và mỗi người mẹ đều được lắng nghe.
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
