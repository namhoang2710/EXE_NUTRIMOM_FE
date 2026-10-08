import { ArrowLeft, ClockCounterClockwise } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ConsultationHistorySection } from '../components/ConsultationHistorySection'
import '../styles/consultation.css'

export function ConsultationHistoryPage() {
  return <main className="consultation-page consultation-history-page">
    <section className="consultation-history-shell" aria-labelledby="consultation-history-title">
      <header className="consultation-history-hero"><span><ClockCounterClockwise size={30} weight="duotone" aria-hidden="true" /></span><div><p>Không gian cá nhân</p><h1 id="consultation-history-title">Lịch sử tư vấn</h1><small>Theo dõi, hủy lịch và gửi đánh giá sau buổi tư vấn.</small></div></header>
      <nav className="consultation-back-nav" aria-label="Điều hướng quay lại"><Link to="/app/consultations"><ArrowLeft size={19} weight="bold" aria-hidden="true" />Đặt lịch tư vấn</Link></nav>
      <ConsultationHistorySection showHeading={false} />
    </section>
  </main>
}
