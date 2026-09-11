import {
  ArrowRight,
  CalendarCheck,
  CaretDown,
  ChatCircleDots,
  Check,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FacebookLogo,
  Heart,
  MapPin,
  PaperPlaneTilt,
  Phone,
  ShieldCheck,
} from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './contact-premium.css'

const contactChannels = [
  {
    icon: Phone,
    label: 'Hotline tư vấn',
    value: '1900 1234',
    description: 'Trao đổi trực tiếp cùng đội ngũ NutriMom',
    href: 'tel:19001234',
  },
  {
    icon: EnvelopeSimple,
    label: 'Email',
    value: 'hello@nutrimom.vn',
    description: 'Phù hợp với câu hỏi cần chia sẻ chi tiết',
    href: 'mailto:hello@nutrimom.vn',
  },
  {
    icon: MapPin,
    label: 'Văn phòng NutriMom',
    value: 'Thành phố Hồ Chí Minh',
    description: 'Hỗ trợ trực tuyến cho gia đình trên toàn quốc',
  },
] as const

const quickActions = [
  {
    icon: Phone,
    label: 'Gọi ngay',
    note: '1900 1234',
    href: 'tel:19001234',
    className: 'is-phone',
  },
  {
    icon: ChatCircleDots,
    label: 'Chat Zalo',
    note: 'Phản hồi nhanh',
    href: 'https://zalo.me/19001234',
    className: 'is-zalo',
    external: true,
  },
] as const

const contactTopics = [
  { value: 'nutrition', label: 'Dinh dưỡng thai kỳ' },
  { value: 'consultation', label: 'Tư vấn cùng chuyên gia' },
  { value: 'product', label: 'Sử dụng ứng dụng' },
  { value: 'other', label: 'Nội dung khác' },
] as const

const vietnamTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const vietnamWeekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
})

const vietnamDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('vi-VN') + value.slice(1)
}

function getVietnamClock(date: Date) {
  const timeParts = vietnamTimeFormatter.formatToParts(date)
  const getPart = (type: Intl.DateTimeFormatPartTypes) => (
    timeParts.find((part) => part.type === type)?.value ?? '00'
  )

  return {
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
    weekday: capitalize(vietnamWeekdayFormatter.format(date)),
    date: vietnamDateFormatter.format(date),
  }
}

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [selectedTopic, setSelectedTopic] = useState('')
  const [topicOpen, setTopicOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const vietnamClock = getVietnamClock(currentTime)
  const currentVietnamHour = Number(vietnamClock.hour)
  const isAcceptingRequests = currentVietnamHour >= 8 && currentVietnamHour < 20
  const selectedTopicLabel = contactTopics.find((topic) => topic.value === selectedTopic)?.label

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="landing-main contactPremium">
      <section className="contactHero" aria-labelledby="contact-page-title">
        <div className="contactHero__inner landing-section">
          <div className="contactHero__copy landing-reveal">
            <span className="contactEyebrow">
              <Heart size={15} weight="fill" aria-hidden="true" />
              LUÔN Ở ĐÂY KHI MẸ CẦN
            </span>
            <h1 id="contact-page-title">
              Một cuộc trò chuyện nhỏ,<br />
              <em>thêm thật nhiều an tâm.</em>
            </h1>
            <p>
              Dù là câu hỏi về dinh dưỡng, thai kỳ hay cách sử dụng NutriMom,
              đội ngũ của chúng tôi luôn sẵn lòng lắng nghe và cùng bạn tìm bước tiếp theo phù hợp.
            </p>

            <div className="contactHero__actions">
              <a className="landing-primary-button" href="tel:19001234">
                <Phone size={18} weight="bold" aria-hidden="true" />
                Gọi 1900 1234
              </a>
              <a
                className="landing-secondary-button"
                href="https://zalo.me/19001234"
                target="_blank"
                rel="noreferrer"
              >
                Chat cùng NutriMom
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </a>
            </div>

            <div className="contactHero__trust" aria-label="Cam kết hỗ trợ">
              <span><CheckCircle size={17} weight="fill" /> Tận tâm lắng nghe</span>
              <span><ShieldCheck size={17} weight="fill" /> Thông tin riêng tư</span>
              <span><Clock size={17} weight="fill" /> Phản hồi trong 24 giờ</span>
            </div>
          </div>

          <aside className="contactHero__careCard landing-reveal" aria-label="Thời gian tư vấn">
            <div className="contactHero__careTop">
              <div
                className="contactHero__liveClock"
                aria-label={`Giờ Việt Nam hiện tại ${vietnamTimeFormatter.format(currentTime)}, ${vietnamClock.weekday}, ${vietnamClock.date}`}
              >
                <strong>
                  {vietnamClock.hour}:{vietnamClock.minute}
                  <small>:{vietnamClock.second}</small>
                </strong>
                <span>{vietnamClock.weekday}</span>
                <time dateTime={currentTime.toISOString()}>{vietnamClock.date}</time>
              </div>
              <span
                className={`contactHero__online ${isAcceptingRequests ? 'is-open' : 'is-closed'}`}
                aria-live="polite"
              >
                <i aria-hidden="true" />
                <span>
                  <strong>{isAcceptingRequests ? 'Đang tiếp nhận yêu cầu' : 'Đã đóng tiếp nhận yêu cầu'}</strong>
                  <small>{isAcceptingRequests ? 'Hỗ trợ đến 20:00 hôm nay' : 'Mở lại lúc 08:00 mỗi ngày'}</small>
                </span>
              </span>
            </div>
            <span className="contactHero__careLabel">GIỜ TƯ VẤN</span>
            <strong>08:00 — 20:00</strong>
            <p>Thứ Hai đến Chủ Nhật</p>
            <div className="contactHero__careDivider" />
            <div className="contactHero__carePromise">
              <div className="contactHero__avatars" aria-hidden="true">
                <img src="/bsi_PHAT.jpg" width="36" height="36" alt="" />
                <img src="/bsi_PHU.jpg" width="36" height="36" alt="" />
                <img src="/bsi_THANH.jpg" width="36" height="36" alt="" />
                <img src="/bsi_HAI.jpg" width="36" height="36" alt="" />
                <span className="contactHero__avatarMore">10+</span>
              </div>
              <p><strong>Đội ngũ chăm sóc</strong><br />sẵn sàng đồng hành cùng mẹ.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="contactWorkspace landing-section" aria-labelledby="contact-form-title">
        <div className="contactWorkspace__details">
          <header className="contactSectionHeading">
            <span className="contactEyebrow">KẾT NỐI VỚI NUTRIMOM</span>
            <h2>Chọn cách thuận tiện nhất cho bạn.</h2>
            <p>Mỗi câu hỏi đều được tiếp nhận cẩn thận và chuyển đến đúng người có thể hỗ trợ.</p>
          </header>

          <div className="contactChannelList">
            {contactChannels.map(({ icon: Icon, label, value, description, ...channel }) => {
              const content = (
                <>
                  <span className="contactChannel__icon"><Icon size={22} weight="duotone" /></span>
                  <span className="contactChannel__copy">
                    <small>{label}</small>
                    <strong>{value}</strong>
                    <span>{description}</span>
                  </span>
                  {'href' in channel && <ArrowRight className="contactChannel__arrow" size={18} weight="bold" />}
                </>
              )

              return 'href' in channel ? (
                <a className="contactChannel" href={channel.href} key={label}>{content}</a>
              ) : (
                <div className="contactChannel" key={label}>{content}</div>
              )
            })}
          </div>

          <div className="contactSocials">
            <span>Theo dõi và trò chuyện cùng chúng tôi</span>
            <div>
              <a href="https://zalo.me/19001234" target="_blank" rel="noreferrer">
                <ChatCircleDots size={18} weight="fill" /> Zalo
              </a>
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                <FacebookLogo size={18} weight="fill" /> Facebook
              </a>
            </div>
          </div>
        </div>

        <form className="contactForm" onSubmit={handleSubmit}>
          <header className="contactForm__heading">
            <span className="contactEyebrow">GỬI LỜI NHẮN</span>
            <h2 id="contact-form-title">NutriMom có thể giúp gì cho bạn?</h2>
            <p>Hãy để lại thông tin, chúng tôi sẽ chủ động liên hệ trong thời gian sớm nhất.</p>
          </header>

          <div className="contactForm__grid">
            <label>
              <span>Họ và tên <i>*</i></span>
              <input name="fullName" autoComplete="name" placeholder="Nguyễn Minh Anh" required />
            </label>
            <label>
              <span>Số điện thoại <i>*</i></span>
              <input name="phone" type="tel" autoComplete="tel" placeholder="0901 234 567" required />
            </label>
          </div>

          <div className="contactForm__grid">
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" placeholder="ban@example.com" />
            </label>
            <div className="contactForm__field">
              <span>Bạn cần hỗ trợ về</span>
              <input name="topic" type="hidden" value={selectedTopic} />
              <div
                className={`contactTopicSelect${topicOpen ? ' is-open' : ''}`}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setTopicOpen(false)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setTopicOpen(false)
                }}
              >
                <button
                  className={`contactTopicSelect__trigger${selectedTopicLabel ? ' has-value' : ''}`}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={topicOpen}
                  aria-controls="contact-topic-options"
                  onClick={() => setTopicOpen((current) => !current)}
                >
                  <span>{selectedTopicLabel ?? 'Chọn chủ đề'}</span>
                  <CaretDown size={17} weight="bold" aria-hidden="true" />
                </button>

                <div className="contactTopicSelect__menu" aria-hidden={!topicOpen}>
                  <div className="contactTopicSelect__menuInner" id="contact-topic-options" role="listbox">
                    {contactTopics.map((topic) => (
                      <button
                        className={selectedTopic === topic.value ? 'is-selected' : undefined}
                        type="button"
                        role="option"
                        aria-selected={selectedTopic === topic.value}
                        tabIndex={topicOpen ? 0 : -1}
                        key={topic.value}
                        onClick={() => {
                          setSelectedTopic(topic.value)
                          setTopicOpen(false)
                        }}
                      >
                        <span>{topic.label}</span>
                        <Check size={16} weight="bold" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label>
            <span>Nội dung <i>*</i></span>
            <textarea
              name="message"
              rows={5}
              placeholder="Chia sẻ ngắn gọn điều bạn đang quan tâm..."
              required
            />
          </label>

          <label className="contactForm__consent">
            <input name="consent" type="checkbox" required />
            <span>Tôi đồng ý để NutriMom liên hệ và hỗ trợ theo thông tin đã cung cấp.</span>
          </label>

          <button className="contactForm__submit" type="submit">
            Gửi lời nhắn
            <PaperPlaneTilt size={19} weight="bold" aria-hidden="true" />
          </button>

          {submitted && (
            <p className="contactForm__status" role="status">
              <CheckCircle size={18} weight="fill" />
              Bản demo đã ghi nhận thao tác. Biểu mẫu chưa kết nối hệ thống gửi dữ liệu.
            </p>
          )}
          <p className="contactForm__privacy">
            <ShieldCheck size={16} weight="fill" /> Thông tin của bạn được tôn trọng và bảo mật.
          </p>
        </form>
      </section>

      <section className="contactConsultation landing-section" aria-labelledby="contact-consultation-title">
        <div>
          <span className="contactEyebrow">CẦN MỘT CUỘC TRAO ĐỔI SÂU HƠN?</span>
          <h2 id="contact-consultation-title">Đặt lịch tư vấn, để hành trình của mẹ có thêm một người đồng hành.</h2>
        </div>
        <Link className="contactConsultation__button" to="/register">
          <CalendarCheck size={20} weight="bold" aria-hidden="true" />
          Đặt lịch tư vấn
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </section>

      <nav className="contactQuickActions" aria-label="Liên hệ nhanh">
        {quickActions.map(({ icon: Icon, label, note, href, className, ...action }) => (
          <a
            className={`contactQuickAction ${className}`}
            href={href}
            key={label}
            target={'external' in action ? '_blank' : undefined}
            rel={'external' in action ? 'noreferrer' : undefined}
          >
            <Icon size={19} weight="fill" aria-hidden="true" />
            <span><strong>{label}</strong><small>{note}</small></span>
          </a>
        ))}
      </nav>
    </main>
  )
}
