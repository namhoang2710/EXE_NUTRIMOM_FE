import { ArrowRight } from '@phosphor-icons/react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import {
  HeroParallax,
  type HeroParallaxItem,
} from '@/components/ui/hero-parallax'

const heroShowcaseItems: HeroParallaxItem[] = [
  {
    title: 'Chăm sóc mẹ qua từng khoảnh khắc',
    link: '/about',
    thumbnail: '/banner1.png',
    alt: 'Người mẹ dịu dàng ôm em bé đang ngủ.',
    position: '72% center',
    priority: true,
  },
  {
    title: 'AI dinh dưỡng hiểu mẹ cần gì',
    link: '/services/food-scan-ai',
    thumbnail: '/hero-showcase/AI.jpg',
    alt: 'Giao diện AI dinh dưỡng hỗ trợ mẹ lựa chọn bữa ăn phù hợp.',
    position: 'center',
  },
  {
    title: 'Tư vấn tận tâm cùng chuyên gia',
    link: '/experts',
    thumbnail: '/hero-showcase/assistant-prenatal-ai.png',
    alt: 'Trợ lý sức khỏe và dinh dưỡng tiền sản AI đồng hành cùng mẹ và gia đình.',
    fit: 'contain',
  },
  {
    title: 'Gia đình cùng đồng hành',
    link: '/about',
    thumbnail: '/hero-showcase/growing-with-baby.png',
    alt: 'Những thay đổi của cơ thể mẹ khi em bé lớn lên trong thai kỳ.',
    fit: 'contain',
  },
  {
    title: 'Chuyên gia được xác minh',
    link: '/experts',
    thumbnail: '/hero-showcase/GT1.jpg',
    alt: 'Quy trình xác minh hồ sơ chuyên gia sức khỏe của NutriMom.',
    position: 'center',
  },
  {
    title: 'Kiến thức để mẹ an tâm hơn',
    link: '/blog',
    thumbnail: '/hero-showcase/blog.jpg',
    alt: 'Thư viện kiến thức giúp mẹ chăm sóc thai kỳ an tâm hơn.',
    position: 'center',
    priority: true,
  },
  {
    title: 'Nâng niu những khởi đầu nhỏ bé',
    link: '/about',
    thumbnail: '/hero-showcase/sleep-nutrition.png',
    alt: 'Gợi ý món ăn giúp mẹ bầu ngủ ngon hơn.',
    fit: 'contain',
  },
  {
    title: 'Đặt lịch khám trực tuyến',
    link: '/experts',
    thumbnail: '/hero-showcase/bannerQC.png',
    alt: 'Gia đình đặt lịch khám trực tuyến cùng chuyên gia NutriMom.',
    fit: 'contain',
  },
  {
    title: 'Hệ sinh thái chăm sóc toàn diện',
    link: '/services',
    thumbnail: '/hero-showcase/ND.jpg',
    alt: 'Các dịch vụ theo dõi thai kỳ, hồ sơ sức khỏe và tư vấn của NutriMom.',
    position: 'center',
  },
  {
    title: 'Hỗ trợ gần gũi sau sinh',
    link: '/about',
    thumbnail: '/hero-showcase/care-plans-overview.png',
    alt: 'Các gói đồng hành Miễn phí, Toàn diện và Cơ bản cho hành trình của mẹ.',
    fit: 'contain',
  },
  {
    title: 'Theo dõi hành trình thai kỳ',
    link: '/services',
    thumbnail: '/banner4.png',
    alt: 'Người mẹ mang thai nâng niu em bé trong hình ảnh minh họa ấm áp.',
    position: '72% center',
    priority: true,
  },
  {
    title: 'Đồng hành qua từng giai đoạn',
    link: '/about',
    thumbnail: '/hero-showcase/GT.jpg',
    alt: 'Hành trình NutriMom đồng hành cùng mẹ trước, trong và sau thai kỳ.',
    position: 'center',
  },
  {
    title: 'Trải nghiệm Premium dễ dùng',
    link: '/services',
    thumbnail: '/hero-showcase/pregnancy-stage-week-26.png',
    alt: 'Theo dõi chặng thai kỳ hiện tại ở tuần 26, ngày 2.',
    fit: 'contain',
  },
  {
    title: 'Gói chăm sóc cho cả gia đình',
    link: '/services',
    thumbnail: '/hero-showcase/knowledge-library.png',
    alt: 'Thư viện kiến thức NutriMom đồng hành cùng mẹ trước, trong và sau thai kỳ.',
    fit: 'contain',
  },
  {
    title: 'Một gia đình, một hành trình',
    link: '/about',
    thumbnail: '/hero-showcase/family-hubs.png',
    alt: 'Family Hubs giúp gia đình chia sẻ thông tin, phối hợp công việc và theo dõi hoạt động.',
    fit: 'contain',
  },
]

export const NutriMomHero = forwardRef<HTMLElement>(function NutriMomHero(_, ref) {
  return (
    <HeroParallax
      ref={ref}
      items={heroShowcaseItems}
      className="home-hero"
      labelledBy="home-hero-title"
    >
      <div className="home-hero-copy">
        <h1 id="home-hero-title">
          <span className="home-hero-title__brand">NutriMom</span>{' '}
          <span className="home-hero-title__accent">The Future of Maternal Wellness</span>
        </h1>
        <p>
          NutriMom kết nối theo dõi thai kỳ, hồ sơ sức khỏe, dinh dưỡng AI và sự đồng hành
          của gia đình trong một trải nghiệm ấm áp, dễ dùng.
        </p>
        <div className="home-hero-actions">
          <Link className="landing-primary-button" to="/register">
            <span>Bắt đầu cùng NutriMom</span>
            <span className="home-hero-button__icon" aria-hidden="true">
              <ArrowRight size={17} weight="bold" />
            </span>
          </Link>
          <Link className="landing-secondary-button" to="/services">
            Khám phá dịch vụ
          </Link>
        </div>
      </div>
    </HeroParallax>
  )
})
