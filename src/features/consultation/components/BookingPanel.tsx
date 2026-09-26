import { ArrowRight, Briefcase, CalendarBlank, Clock, MapPin, Star, UserCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatConsultationTime, isPastConsultationSlot, isSelectableConsultationSlot } from '../model/consultation-formatters'
import type { ConsultationExpert, ConsultationSlot, ConsultationSpecialty } from '../model/consultation-types'
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
  minDate: string
  onDateChange: (date: string) => void
  slots: ConsultationSlot[]
  slotsLoading: boolean
  slotsError: string | null
  onRetrySlots: () => void
  selectedSlotId: string | null
  onSelectSlot: (id: string) => void
  directNote: string
  onDirectNoteChange: (note: string) => void
  directError: string | null
  directBusy: boolean
  onDirectSubmit: () => void
  specialty: ConsultationSpecialty | null
  onSpecialtyChange: (specialty: ConsultationSpecialty) => void
  randomNote: string
  onRandomNoteChange: (note: string) => void
  randomError: string | null
  randomBusy: boolean
  onRandomSubmit: () => void
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

export function BookingPanel(props: BookingPanelProps) {
  const reduceMotion = useReducedMotion()
  const directTabRef = useRef<HTMLButtonElement>(null)
  const randomTabRef = useRef<HTMLButtonElement>(null)
  const selectedSlot = props.slots.find((slot) => slot.id === props.selectedSlotId)
  const directReady = Boolean(props.expert && selectedSlot && isSelectableConsultationSlot(selectedSlot))
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

          {props.expert && <div className="consultation-direct-grid">
            <div className="consultation-slot-column">
              <div className="consultation-field consultation-date-field"><label htmlFor="consultation-date">Ngày tư vấn</label><div><CalendarBlank size={19} aria-hidden="true" /><input id="consultation-date" type="date" min={props.minDate} value={props.date} onChange={(event) => props.onDateChange(event.target.value)} /></div></div>
              <div className="consultation-slot-block"><div className="consultation-slot-heading"><h3>Khung giờ</h3><span>{props.slots.length} khung giờ</span></div>
                {props.slotsLoading ? <div className="consultation-slot-skeleton" aria-busy="true" aria-label="Đang tải khung giờ">{[0, 1, 2, 3].map((key) => <span key={key} />)}</div>
                  : props.slotsError ? <div className="consultation-inline-state is-error" role="alert"><p>{props.slotsError}</p><button type="button" onClick={props.onRetrySlots}>Thử lại</button></div>
                    : props.slots.length === 0 ? <div className="consultation-inline-state"><Clock size={24} aria-hidden="true" /><p>Chuyên gia chưa có khung giờ trong ngày này.</p></div>
                      : <div className="consultation-slots" role="group" aria-label="Chọn khung giờ tư vấn">{props.slots.map((slot) => {
                        const past = isPastConsultationSlot(slot)
                        const selectable = isSelectableConsultationSlot(slot)
                        const selected = slot.id === props.selectedSlotId
                        return <motion.button key={slot.id} type="button" disabled={!selectable || props.directBusy} aria-pressed={selected} className={selected ? 'is-selected' : ''} onClick={() => props.onSelectSlot(slot.id)} whileTap={reduceMotion || !selectable ? undefined : { scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
                          <span>{formatConsultationTime(slot.startTime)} - {formatConsultationTime(slot.endTime)}</span>
                          {!selectable && <small>{slot.status === 'BOOKED' ? 'Đã đặt' : past ? 'Đã qua' : 'Không khả dụng'}</small>}
                        </motion.button>
                      })}</div>}
              </div>
            </div>
            <div className="consultation-note-column"><NoteField id="direct-note" value={props.directNote} onChange={props.onDirectNoteChange} />
              {props.directError && <p className="consultation-form-error" role="alert">{props.directError}</p>}
              <button className="consultation-primary-button" type="button" disabled={!directReady || props.directBusy} onClick={props.onDirectSubmit}>{props.directBusy ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}</button>
            </div>
          </div>}
        </motion.div>
      ) : (
        <motion.div key="random" id="random-panel" role="tabpanel" aria-labelledby="random-tab" className="consultation-booking-panel" initial={reduceMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
          <div className="consultation-random-intro"><h3>Chọn chuyên khoa bạn cần</h3><p>Chuyên gia phù hợp sẽ tiếp nhận yêu cầu và sắp xếp vào khung giờ thuận tiện.</p></div>
          <div className="consultation-specialty-options" role="radiogroup" aria-label="Chuyên khoa tư vấn">{specialties.map((option) => <button key={option.value} type="button" role="radio" aria-checked={props.specialty === option.value} className={props.specialty === option.value ? 'is-selected' : ''} onClick={() => props.onSpecialtyChange(option.value)}><span>{consultationSpecialtyLabels[option.value]}</span><small>{option.description}</small></button>)}</div>
          <NoteField id="random-note" value={props.randomNote} onChange={props.onRandomNoteChange} />
          {props.randomError && <p className="consultation-form-error" role="alert">{props.randomError}</p>}
          <div className="consultation-random-actions"><button className="consultation-primary-button" type="button" disabled={!props.specialty || props.randomBusy} onClick={props.onRandomSubmit}>{props.randomBusy ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu tư vấn'}</button></div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
}
