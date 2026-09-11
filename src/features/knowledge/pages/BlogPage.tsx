import {
  ArrowRight,
  Baby,
  BookOpenText,
  BowlFood,
  CalendarBlank,
  ChatsCircle,
  Clock,
  FlowerLotus,
  HandHeart,
  Heartbeat,
  Leaf,
  Moon,
  SealCheck,
  ShieldCheck,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { blogPosts } from '../model/article-content'
import './blog.css'

const communities = [
  {
    title: 'Chuẩn bị mang thai',
    description: 'Cùng nhau chuẩn bị sức khỏe, tinh thần và những câu hỏi đầu tiên cho hành trình mới.',
    meta: '2.480 thành viên',
    activity: '86 chia sẻ tuần này',
    icon: <FlowerLotus size={30} weight="duotone" />,
    tone: 'blush',
  },
  {
    title: 'Mẹ bầu',
    description: 'Không gian đồng hành qua từng tam cá nguyệt, từ dinh dưỡng đến những đổi thay cảm xúc.',
    meta: '8.920 thành viên',
    activity: '214 chia sẻ tuần này',
    icon: <HeartBeatIcon />,
    tone: 'lavender',
  },
  {
    title: 'Chăm sóc sau sinh',
    description: 'Chia sẻ thật về hồi phục, nuôi con và cách chăm sóc chính mình trong những ngày đầu.',
    meta: '4.760 thành viên',
    activity: '132 chia sẻ tuần này',
    icon: <Baby size={31} weight="duotone" />,
    tone: 'sky',
  },
]

const communityValues = [
  { title: 'Kiểm duyệt', description: 'Nội dung cộng đồng được rà soát để giữ không gian an toàn, tôn trọng.', icon: ShieldCheck },
  { title: 'Đáng tin cậy', description: 'Kiến thức được biên tập từ nguồn y khoa và chuyên gia phù hợp.', icon: SealCheck },
  { title: 'Tích hợp sức khỏe', description: 'Kết nối kiến thức với hành trình sức khỏe riêng của từng mẹ.', icon: Heartbeat },
  { title: 'Cam kết', description: 'Bảo vệ riêng tư và luôn đặt sự an tâm của mẹ ở trung tâm.', icon: HandHeart },
]

function HeartBeatIcon() {
  return <Heartbeat size={31} weight="duotone" />
}

function PostIcon({ category }: { category: string }) {
  if (category === 'Dinh dưỡng') return <BowlFood size={25} weight="duotone" />
  if (category === 'Sống khỏe') return <Moon size={25} weight="duotone" />
  if (category === 'Sau sinh') return <Baby size={25} weight="duotone" />
  if (category === 'Chuẩn bị') return <FlowerLotus size={25} weight="duotone" />
  if (category === 'Vận động') return <Leaf size={25} weight="duotone" />
  return <Heartbeat size={25} weight="duotone" />
}

export function BlogPage() {
  const [featuredPost, ...latestPosts] = blogPosts

  return (
    <main className="nm-blog">
      {/* Editorial hero */}
      <section className="nm-blog-hero landing-section landing-reveal" aria-labelledby="blog-hero-title">
        <img src="/benner_blog1.png" alt="Cộng đồng NutriMom đồng hành cùng mẹ trước, trong và sau thai kỳ" />
        <div className="nm-blog-hero-content">
          <div className="nm-eyebrow"><Sparkle size={15} weight="fill" /> NutriMom Journal</div>
          <h1 id="blog-hero-title">Một góc nhỏ để mẹ <em>hiểu mình</em> và vững lòng hơn.</h1>
          <p>Kiến thức được chắt lọc cẩn thận, câu chuyện thật và một cộng đồng luôn sẵn sàng lắng nghe mẹ.</p>
          <div className="nm-blog-hero-actions">
            <a className="nm-button nm-button--primary" href="#bai-viet-moi">
              Khám phá bài viết <ArrowRight size={17} weight="bold" />
            </a>
            <a className="nm-button nm-button--soft" href="#cong-dong">Tìm cộng đồng của mẹ</a>
          </div>
          <div className="nm-blog-trust-row" aria-label="Thông tin nổi bật">
            <span><BookOpenText size={18} weight="duotone" /><strong>{blogPosts.length}</strong> chủ đề chọn lọc</span>
            <span><UsersThree size={18} weight="duotone" /><strong>16K+</strong> mẹ đồng hành</span>
          </div>
        </div>
      </section>

      {/* Featured article */}
      <section className="nm-blog-section landing-section" aria-labelledby="featured-heading">
        <div className="nm-section-heading">
          <div>
            <span>Bài viết nổi bật</span>
            <h2 id="featured-heading">Đọc chậm một chút, hiểu mình nhiều hơn</h2>
          </div>
          <p>Nội dung gần gũi, dễ áp dụng và luôn khuyến khích mẹ trao đổi cùng chuyên gia khi cần.</p>
        </div>

        <Link className="nm-featured-post" to={`/blog/${featuredPost.slug}`}>
          <div className="nm-featured-post-image">
            <img src="/banner2.png" alt="Bàn tay mẹ nâng niu bàn tay em bé" />
            <span className="nm-image-badge"><Sparkle size={14} weight="fill" /> Biên tập chọn</span>
          </div>
          <div className="nm-featured-post-content">
            <span className="nm-category">{featuredPost.category}</span>
            <h3>{featuredPost.title}</h3>
            <p>{featuredPost.excerpt}</p>
            <div className="nm-post-meta">
              <span><CalendarBlank size={16} /> {featuredPost.publishedAt}</span>
              <span><Clock size={16} /> {featuredPost.readTime}</span>
            </div>
            <span className="nm-text-link">Đọc bài viết <ArrowRight size={17} weight="bold" /></span>
          </div>
        </Link>
      </section>

      {/* Latest articles */}
      <section className="nm-blog-section nm-blog-section--tinted" id="bai-viet-moi" aria-labelledby="latest-heading">
        <div className="landing-section">
          <div className="nm-section-heading nm-section-heading--inline">
            <div>
              <span>Góc kiến thức</span>
              <h2 id="latest-heading">Bài viết mới dành cho mẹ</h2>
            </div>
            <span className="nm-section-count">{latestPosts.length} bài viết</span>
          </div>

          <div className="nm-post-grid">
            {latestPosts.map((post, index) => (
              <Link className="nm-post-card" key={post.slug} to={`/blog/${post.slug}`} style={{ '--delay': `${index * 55}ms` } as CSSProperties}>
                <div className="nm-post-card-top">
                  <span className="nm-post-icon"><PostIcon category={post.category} /></span>
                  <span className="nm-category">{post.category}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="nm-post-card-bottom">
                  <div className="nm-post-meta">
                    <span>{post.publishedAt}</span>
                    <span>{post.readTime}</span>
                  </div>
                  <span className="nm-round-arrow" aria-hidden="true"><ArrowRight size={17} weight="bold" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community groups */}
      <section className="nm-blog-section landing-section" id="cong-dong" aria-labelledby="community-heading">
        <div className="nm-section-heading">
          <div>
            <span>Cùng nhau sẻ chia</span>
            <h2 id="community-heading">Luôn có một nhóm đang chờ mẹ</h2>
          </div>
          <p>Hỏi điều mẹ băn khoăn, kể câu chuyện của mình và nhận lại sự đồng cảm từ những người cùng hành trình.</p>
        </div>

        <div className="nm-community-grid">
          {communities.map((community) => (
            <article className={`nm-community-card nm-community-card--${community.tone}`} key={community.title}>
              <div className="nm-community-card-head">
                <span className="nm-community-icon">{community.icon}</span>
                <span className="nm-live-dot"><i /> Đang hoạt động</span>
              </div>
              <h3>{community.title}</h3>
              <p>{community.description}</p>
              <div className="nm-community-meta">
                <span><UsersThree size={17} /> {community.meta}</span>
                <span><ChatsCircle size={17} /> {community.activity}</span>
              </div>
              <Link className="nm-join-button" to="/register">
                Tham gia <ArrowRight size={17} weight="bold" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Community principles */}
      <section className="nm-community-values" aria-labelledby="values-heading">
        <div className="landing-section">
          <div className="nm-values-intro">
            <span className="nm-eyebrow"><HeartBeatIcon /> Cộng đồng của chúng tôi</span>
            <h2 id="values-heading">Một nơi mềm mại cho những câu chuyện thật.</h2>
            <p>NutriMom xây cộng đồng với sự tử tế, kiến thức có trách nhiệm và quyền riêng tư của mẹ làm nền tảng.</p>
          </div>
          <div className="nm-values-grid">
            {communityValues.map(({ title, description, icon: Icon }) => (
              <article className="nm-value-card" key={title}>
                <span><Icon size={25} weight="duotone" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
