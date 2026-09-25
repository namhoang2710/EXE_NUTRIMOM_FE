const testimonials = [
  { image: '/rate1.png', alt: 'Đánh giá của Nguyễn Minh Anh về đội ngũ bác sĩ của NutriMom.' },
  { image: '/rate2.png', alt: 'Đánh giá của Trần Ngọc Hân về trải nghiệm đồng hành cùng NutriMom.' },
  { image: '/rate3.png', alt: 'Đánh giá của Lê Hoàng Yến về kiến thức chăm sóc mẹ và bé.' },
  { image: '/rate4.png', alt: 'Đánh giá của Phạm Thùy Dương về dịch vụ của NutriMom.' },
  { image: '/rate5.png', alt: 'Đánh giá của Đỗ Quốc Bảo về hành trình chăm sóc gia đình cùng NutriMom.' },
  { image: '/rate6.png', alt: 'Đánh giá của Nguyễn Thị Mai về sự hỗ trợ từ NutriMom.' },
  { image: '/rate7.png', alt: 'Đánh giá của Emily Carter về trải nghiệm sử dụng NutriMom.' },
  { image: '/rate8.png', alt: 'Đánh giá của Min-jun Park về thông tin và trải nghiệm tại NutriMom.' },
  { image: '/rate9.png', alt: 'Đánh giá ngắn của Min-jun Park dành cho NutriMom.' },
] as const

interface TestimonialGroupProps {
  duplicate?: boolean
}

function TestimonialGroup({ duplicate = false }: TestimonialGroupProps) {
  return (
    <div
      className="testimonial-marquee-group"
      role={duplicate ? undefined : 'list'}
      aria-hidden={duplicate || undefined}
    >
      {testimonials.map((testimonial) => (
        <figure
          className="testimonial-marquee-card"
          role={duplicate ? undefined : 'listitem'}
          tabIndex={duplicate ? -1 : 0}
          aria-label={duplicate ? undefined : testimonial.alt}
          key={`${duplicate ? 'duplicate' : 'original'}-${testimonial.image}`}
        >
          <img
            className="testimonial-marquee-image"
            src={testimonial.image}
            alt={duplicate ? '' : testimonial.alt}
            width="1122"
            height="1402"
            loading="lazy"
            decoding="async"
          />
        </figure>
      ))}
    </div>
  )
}

export function TestimonialMarquee() {
  return (
    <section
      className="testimonial-marquee-section"
      aria-labelledby="testimonial-marquee-title"
      aria-label="Đánh giá từ cộng đồng NutriMom"
    >
      <div className="testimonial-marquee-heading">
        <span className="testimonial-marquee-eyebrow">CÂU CHUYỆN TỪ CỘNG ĐỒNG NUTRIMOM</span>
        <h2 id="testimonial-marquee-title">
          <span>Yêu thương được kể lại</span>
          <em>qua từng trải nghiệm thật.</em>
        </h2>
        <p>Những chia sẻ từ các gia đình đã đồng hành cùng NutriMom trên hành trình chăm sóc mẹ và bé.</p>
      </div>

      <div className="testimonial-marquee-divider" aria-hidden="true" />

      <div
        className="testimonial-marquee-viewport"
        aria-label="Danh sách đánh giá tự động chuyển động từ phải sang trái"
      >
        <div className="testimonial-marquee-track">
          <TestimonialGroup />
          <TestimonialGroup duplicate />
        </div>
      </div>
    </section>
  )
}
