import { Clock, EnvelopeSimple, MapPin, PaperPlaneTilt, Phone } from '@phosphor-icons/react'
import type { FormEvent } from 'react'

const contactItems = [
  { icon: Phone, label: 'Điện thoại', value: '1900 1234', href: 'tel:19001234' },
  { icon: EnvelopeSimple, label: 'Email', value: 'hello@nutrimom.vn', href: 'mailto:hello@nutrimom.vn' },
  { icon: MapPin, label: 'Văn phòng', value: 'Thành phố Hồ Chí Minh', href: undefined },
  { icon: Clock, label: 'Thời gian hỗ trợ', value: 'Thứ Hai – Thứ Bảy, 08:00–20:00', href: undefined },
]

export function ContactPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <main className="landing-main">
      <section className="page-heading landing-section landing-reveal">
        <span>Liên hệ NutriMom</span>
        <h1>Chúng tôi luôn sẵn lòng lắng nghe bạn.</h1>
        <p>Gửi câu hỏi hoặc lời nhắn, đội ngũ NutriMom sẽ đồng hành và phản hồi trong thời gian sớm nhất.</p>
      </section>

      <section className="contact-section landing-section landing-section--compact">
        <div className="contact-info-panel">
          <span>Kết nối với chúng tôi</span>
          <h2>Mỗi câu hỏi của mẹ đều xứng đáng được lắng nghe.</h2>
          <p>Bạn có thể liên hệ qua các kênh dưới đây hoặc để lại lời nhắn ngay bên cạnh.</p>
          <div className="contact-list">
            {contactItems.map(({ icon: Icon, label, value, href }) => (
              <div className="contact-item" key={label}>
                <Icon size={23} weight="duotone" />
                <div>
                  <span>{label}</span>
                  {href ? <a href={href}>{value}</a> : <strong>{value}</strong>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-heading">
            <span>Gửi lời nhắn</span>
            <h2>NutriMom có thể giúp gì cho bạn?</h2>
          </div>
          <div className="contact-form-grid">
            <label>
              <span>Họ và tên</span>
              <input name="fullName" autoComplete="name" placeholder="Nhập họ và tên" required />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input name="phone" type="tel" autoComplete="tel" placeholder="0901 234 567" required />
            </label>
          </div>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="ban@example.com" />
          </label>
          <label>
            <span>Nội dung</span>
            <textarea name="message" rows={5} placeholder="Chia sẻ điều bạn đang quan tâm..." required />
          </label>
          <button className="landing-primary-button" type="submit">
            Gửi lời nhắn
            <PaperPlaneTilt size={19} weight="bold" />
          </button>
          <p className="contact-form-note">Biểu mẫu hiện là giao diện minh họa và chưa kết nối hệ thống gửi dữ liệu.</p>
        </form>
      </section>
    </main>
  )
}
