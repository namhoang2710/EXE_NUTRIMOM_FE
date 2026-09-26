import { CalendarPlus, PhoneCall, Stethoscope } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface ConsultationBannerActionsProps {
  onRandomBooking?: () => void
  randomBookingTo?: string
  expertsTo?: string
}

const bookingActionContent = <>
  <CalendarPlus size={29} weight="regular" aria-hidden="true" />
  <strong>Đặt lịch tư vấn</strong>
</>

export function ConsultationBannerActions({ onRandomBooking, randomBookingTo, expertsTo = '/app/experts#expert-directory' }: ConsultationBannerActionsProps) {
  return <div className="consultation-banner-actions" aria-label="Lựa chọn dịch vụ tư vấn">
    <div className="consultation-banner-action is-phone" aria-label="Gọi điện tổng đài">
      <PhoneCall size={29} weight="regular" aria-hidden="true" />
      <strong>Gọi điện tổng đài</strong>
    </div>
    {randomBookingTo
      ? <Link className="consultation-banner-action is-booking" to={randomBookingTo}>{bookingActionContent}</Link>
      : <button className="consultation-banner-action is-booking" type="button" aria-controls="consultation-booking-form" onClick={onRandomBooking}>{bookingActionContent}</button>}
    <Link className="consultation-banner-action is-experts" to={expertsTo}>
      <Stethoscope size={29} weight="regular" aria-hidden="true" />
      <strong>Tìm bác sĩ</strong>
    </Link>
  </div>
}
