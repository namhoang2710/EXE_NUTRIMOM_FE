import { ArrowRight, Briefcase, CalendarBlank, MapPin, Star, UserCircle, WarningCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { StatefulButton } from '@/components/ui/stateful-button'
import { DateStrip } from './DateStrip'
import { TimeSlotGrid, type TimeSlotCell } from './TimeSlotGrid'
import { formatConsultationDate } from '../model/consultation-formatters'
import { SLOT_START_TIMES, slotEndTime } from '../model/slot-grid'
import type { ConsultationExpert, ConsultationSpecialty, DayAvailability } from '../model/consultation-types'
import { consultationSpecialtyLabels } from '../model/consultation-types'

type BookingTab = 'direct' | 'random'

interface BookingPanelProps {
  tab: BookingTab
  onTabChange: (tab: BookingTab) => void
  expertId: string | null
  expert: ConsultationExpert | null
  expertLoading: boolean
  expertError: string | null
  onRetryExpert: () => void
  date: string
  onDateChange: (date: string) => void
  availability: DayAvailability | null
  availabilityLoading: boolean
  availabilityError: string | null
  onRetryAvailability: () => void
  selectedStartTime: string | null
  onSelectTime: (startTime: string) => void
  onClearSelection: () => void
  directNote: string
  onDirectNoteChange: (note: string) => void
  directError: string | null
  directBusy: boolean
  onDirectSubmit: () => Promise<boolean>
  specialty: ConsultationSpecialty | null
  onSpecialtyChange: (specialty: ConsultationSpecialty) => void
  randomNote: string
  onRandomNoteChange: (note: string) => void
  randomError: string | null
  randomBusy: boolean
  onRandomSubmit: () => Promise<boolean>
}

const specialties: Array<{ value: ConsultationSpecialty; description: string }> = [
  { value: 'PSYCHOLOGY', description: 'Đồng hành cùng cảm xúc và sức khỏe tinh thần.' },
  { value: 'OBSTETRICS', description: 'Tư vấn thai kỳ và chăm sóc sản khoa.' },
  { value: 'HEALTH', description: 'Giải đáp về sức khỏe và dinh dưỡng tổng quát.' },
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()
}

function NoteField({ id, value, onChange, label = 'Ghi chú cho chuyên gia' }: { id: string; value: string; onChange: (value: string) => void; label?: string }) {
  return <div className="consultation-field">
    <div className="consultation-field__label"><label htmlFor={id}>{label}</label><span aria-live="polite">{value.length}/2000</span></div>
    <textarea id={id} value={value} maxLength={2000} rows={4} placeholder="Chia sẻ ngắn gọn điều bạn muốn được tư vấn (không bắt buộc)" onChange={(event) => onChange(event.target.value)} />
  </div>
}

function AvailabilitySkeleton() {
  return <div className="consultation-time-grid consultation-time-grid--skeleton" aria-busy="true" aria-label="Đang tải khung giờ">
    {SLOT_START_TIMES.map((time) => <span key={time} />)}
  </div>
}

function AnimatedBookingTime({ value }: { value: string }) {
  const reduceMotion = useReducedMotion()
  return <strong className="consultation-booking-time-value">
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={value}
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0.2, y: 12, filter: 'blur(5px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(5px)' }}
        transition={{ duration: reduceMotion ? 0.01 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      >{value}</motion.span>
    </AnimatePresence>
    <span className="sr-only" aria-live="polite">{value}</span>
  </strong>
}

export function BookingPanel(props: BookingPanelProps) {
  const reduceMotion = useReducedMotion()
  const directTabRef = useRef<HTMLButtonElement>(null)
  const randomTabRef = useRef<HTMLButtonElement>(null)
  const cells = useMemo<TimeSlotCell[]>(() => {
    const slotsByTime = new Map(props.availability?.slots.map((slot) => [slot.startTime, slot]))
    return SLOT_START_TIMES.map((startTime) => {
      const slot = slotsByTime.get(startTime)
      if (!slot) return { startTime, endTime: slotEndTime(startTime), selectable: false, state: 'CLOSED', reason: props.availability?.dayOff ? 'DAY_OFF' : 'CLOSED' }
      return {
        startTime,
        endTime: slot.endTime,
        selectable: slot.available && !props.availability?.dayOff,
        state: slot.available ? 'OPEN' : slot.reason === 'BOOKED' ? 'BOOKED' : 'CLOSED',
        ...(props.availability?.dayOff ? { reason: 'DAY_OFF' as const } : slot.reason ? { reason: slot.reason } : {}),
      }
    })
  }, [props.availability])
  const selectedCell = cells.find((cell) => cell.startTime === props.selectedStartTime && cell.selectable)
  const directReady = Boolean(props.expert && selectedCell && !props.availabilityLoading && !props.directBusy)

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = props.tab === 'direct' ? 'random' : 'direct'
    props.onTabChange(next)
    ;(next === 'direct' ? directTabRef : randomTabRef).current?.focus()
  }

  return <section className="consultation-booking" aria-labelledby="booking-heading">
    <div className="consultation-section-heading">
      <div><h2 id="booking-heading" tabIndex={-1}>Đặt lịch tư vấn</h2></div>
      <p>Chọn trực tiếp một chuyên gia hoặc gửi yêu cầu để NutriMom ghép theo chuyên khoa.</p>
    </div>

    <div className="consultation-tabs" role="tablist" aria-label="Cách đặt lịch tư vấn">
      <button ref={directTabRef} id="direct-tab" type="button" role="tab" aria-selected={props.tab === 'direct'} aria-controls="direct-panel" tabIndex={props.tab === 'direct' ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => props.onTabChange('direct')}>Chọn chuyên gia</button>
      <button ref={randomTabRef} id="random-tab" type="button" role="tab" aria-selected={props.tab === 'random'} aria-controls="random-panel" tabIndex={props.tab === 'random' ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => props.onTabChange('random')}>Ghép theo chuyên khoa</button>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      {props.tab === 'direct' ? (
        <motion.div key="direct" id="direct-panel" role="tabpanel" aria-labelledby="direct-tab" className="consultation-booking-panel" initial={reduceMotion ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 10 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
          {!props.expertId ? <div className="consultation-expert-empty"><UserCircle size={40} weight="duotone" aria-hidden="true" /><div><h3>Chưa chọn chuyên gia</h3><p>Xem hồ sơ và chọn chuyên gia phù hợp trước khi đặt khung giờ.</p></div><Link className="consultation-secondary-button" to="/app/experts">Xem danh sách chuyên gia <ArrowRight size={17} aria-hidden="true" /></Link></div>
            : props.expertLoading ? <div className="consultation-expert-skeleton" aria-busy="true" aria-label="Đang tải thông tin chuyên gia"><span /><div><i /><i /><i /></div></div>
              : props.expertError ? <div className="consultation-inline-state is-error" role="alert"><p>{props.expertError}</p><button type="button" onClick={props.onRetryExpert}>Thử lại</button></div>
                : props.expert && <div className="consultation-expert-card">
                  <div className="consultation-expert-avatar"><span aria-hidden="true">{initials(props.expert.fullName)}</span>{props.expert.avatarUrl && <img src={props.expert.avatarUrl} alt={`Ảnh đại diện của ${props.expert.fullName}`} onError={(event) => { event.currentTarget.hidden = true }} />}</div>
                  <div className="consultation-expert-main"><span className="consultation-specialty-label">{consultationSpecialtyLabels[props.expert.specialty]}</span><h3>{props.expert.fullName}</h3><p>{props.expert.title || 'Chuyên gia NutriMom'}</p>
                    <div className="consultation-expert-meta">
                      <span><MapPin size={17} aria-hidden="true" />{props.expert.workplace || 'Đang cập nhật nơi công tác'}</span>
                      <span><Briefcase size={17} aria-hidden="true" />{props.expert.yearsOfExperience} năm kinh nghiệm</span>
                      <span className="consultation-expert-rating"><Star size={17} weight="fill" aria-hidden="true" />{props.expert.ratingCount > 0 ? `${props.expert.averageRating.toFixed(1)} (${props.expert.ratingCount} đánh giá)` : 'Chưa có đánh giá'}</span>
                    </div>
                  </div>
                  <Link to="/app/experts">Chọn chuyên gia khác</Link>
                </div>}

          {props.expert && <div className="consultation-direct-flow">
            <div className="consultation-slot-block">
              <div className="consultation-slot-heading"><h3><CalendarBlank size={18} aria-hidden="true" /> Chọn ngày</h3><span>Tối đa 30 ngày tới</span></div>
              <DateStrip selectedDate={props.date} onSelect={props.onDateChange} disabled={props.directBusy} />
            </div>
            {props.availability?.dayOff && <div className="consultation-day-off-banner" role="status"><WarningCircle size={20} weight="fill" aria-hidden="true" /><div><strong>Chuyên gia nghỉ ngày này</strong><span>Vui lòng chọn ngày khác để tiếp tục đặt lịch.</span></div></div>}
            <div className="consultation-direct-grid">
              <div className="consultation-slot-column">
                <div className="consultation-slot-heading"><h3>Khung giờ 30 phút</h3><span>08:00 - 20:00</span></div>
                {props.availabilityLoading ? <AvailabilitySkeleton />
                  : props.availabilityError ? <div className="consultation-inline-state is-error" role="alert"><p>{props.availabilityError}</p><button type="button" onClick={props.onRetryAvailability}>Thử lại</button></div>
                    : <TimeSlotGrid cells={cells} selectedStartTime={props.selectedStartTime} onSelect={props.onSelectTime} disabled={props.directBusy} />}
              </div>
              <div className="consultation-note-column"><NoteField id="direct-note" value={props.directNote} onChange={props.onDirectNoteChange} />
                {props.directError && <p className="consultation-form-error" role="alert">{props.directError}</p>}
              </div>
            </div>
            <div className="consultation-booking-bar">
              <div className="consultation-booking-bar__field"><span>Ngày tư vấn</span><strong>{formatConsultationDate(props.date)}</strong></div>
              <div className="consultation-booking-bar__time">
                <div className="consultation-booking-bar__field"><span>Khung giờ</span><AnimatedBookingTime value={selectedCell ? `${selectedCell.startTime} - ${selectedCell.endTime}` : 'Chưa chọn'} /></div>
                <span className="consultation-clear-selection-slot">
                  <AnimatePresence initial={false}>{selectedCell && <motion.button className="consultation-clear-selection" type="button" disabled={props.directBusy} onClick={props.onClearSelection} initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: reduceMotion ? 0.01 : 0.2 }}>Bỏ chọn</motion.button>}</AnimatePresence>
                </span>
              </div>
              <StatefulButton className="consultation-stateful-button" type="button" disabled={!directReady} onAction={props.onDirectSubmit}>Xác nhận đặt lịch</StatefulButton>
            </div>
          </div>}
        </motion.div>
      ) : (
        <motion.div key="random" id="random-panel" role="tabpanel" aria-labelledby="random-tab" className="consultation-booking-panel" initial={reduceMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
          <div className="consultation-random-intro"><h3>Chọn chuyên khoa bạn cần</h3><p>Chuyên gia phù hợp sẽ tiếp nhận yêu cầu và sắp xếp vào khung giờ thuận tiện.</p></div>
          <div className="consultation-specialty-options" role="radiogroup" aria-label="Chuyên khoa tư vấn">{specialties.map((option) => <button key={option.value} type="button" role="radio" aria-checked={props.specialty === option.value} className={props.specialty === option.value ? 'is-selected' : ''} onClick={() => props.onSpecialtyChange(option.value)}><span>{consultationSpecialtyLabels[option.value]}</span><small>{option.description}</small></button>)}</div>
          <NoteField id="random-note" value={props.randomNote} onChange={props.onRandomNoteChange} />
          {props.randomError && <p className="consultation-form-error" role="alert">{props.randomError}</p>}
          <div className="consultation-random-actions"><StatefulButton className="consultation-stateful-button" type="button" disabled={!props.specialty || props.randomBusy} onAction={props.onRandomSubmit}>Gửi yêu cầu tư vấn</StatefulButton></div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
}
