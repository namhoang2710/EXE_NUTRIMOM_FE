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
    thumbnail: '/rate1.png',
    alt: 'Thẻ đánh giá tích cực về đội ngũ bác sĩ NutriMom.',
    fit: 'contain',
  },
  {
    title: 'Gia đình cùng đồng hành',
    link: '/about',
    thumbnail: '/banner3.png',
    alt: 'Người chồng ở bên chăm sóc vợ trong thai kỳ.',
    position: '70% center',
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
    thumbnail: '/banner2.png',
    alt: 'Bàn tay em bé được nâng niu trong đôi tay người lớn.',
    position: '72% center',
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
    thumbnail: '/rate2.png',
    alt: 'Thẻ đánh giá tích cực về đội ngũ chăm sóc khách hàng NutriMom.',
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
    thumbnail: '/rate3.png',
    alt: 'Thẻ đánh giá về trải nghiệm gói Premium của NutriMom.',
    fit: 'contain',
  },
  {
    title: 'Gói chăm sóc cho cả gia đình',
    link: '/services',
    thumbnail: '/hero-showcase/gia.jpg',
    alt: 'Các gói chăm sóc NutriMom dành cho mẹ và gia đình.',
    position: 'center',
  },
  {
    title: 'Một gia đình, một hành trình',
    link: '/about',
    thumbnail: '/banner5.png',
    alt: 'Cha mẹ cùng ôm em bé trong khung cảnh dịu dàng.',
    position: '28% center',
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
