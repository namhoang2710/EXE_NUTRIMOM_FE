import { Baby, CalendarHeart, Calculator, FloppyDisk, Heartbeat } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { DateField } from '../components/DateField'
import { StatusMessage } from '../components/StatusMessage'
import { ApiClientError } from '../lib/api'
import { formatDate, isDateOnly, todayDate } from '../lib/date'
import { pregnancyApi } from '../lib/domain-api'
import type { Pregnancy, PregnancyCalculation, WeekContent } from '../types/domain'

type Method = 'LAST_MENSTRUAL_PERIOD' | 'CONCEPTION_DATE' | 'MANUAL'

export function HealthPage() {
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null)
  const [content, setContent] = useState<WeekContent | null>(null)
  const [method, setMethod] = useState<Method>('LAST_MENSTRUAL_PERIOD')
  const [date, setDate] = useState('')
  const [week, setWeek] = useState('')
  const [day, setDay] = useState('0')
  const [preview, setPreview] = useState<PregnancyCalculation | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const current = await pregnancyApi.current()
      setPregnancy(current)
      try { setContent(await pregnancyApi.weekContent(current.gestational_week)) } catch { setContent(null) }
    } catch (reason) {
      if (reason instanceof ApiClientError && (reason.code === 'RESOURCE_NOT_FOUND' || reason.code === 'ACTIVE_PREGNANCY_NOT_FOUND')) setPregnancy(null)
      else setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ thai kỳ.')
    }
  }, [])
  useEffect(() => { void load() }, [load])

  async function calculate() {
    setError(''); setMessage(''); setPreview(null)
    if (method !== 'MANUAL' && (!isDateOnly(date) || date > todayDate())) { setError('Vui lòng nhập ngày hợp lệ, không ở tương lai (YYYY-MM-DD).'); return }
    if (method === 'MANUAL' && (!week || Number(week) < 0 || Number(day) < 0 || Number(day) > 6)) { setError('Tuần thai phải từ 0; ngày thai trong khoảng 0 đến 6.'); return }
    setBusy(true)
    try {
      const payload = method === 'MANUAL' ? { method, gestational_week: Number(week), gestational_day: Number(day), timezone: 'Asia/Ho_Chi_Minh' } : { method, date, timezone: 'Asia/Ho_Chi_Minh' }
      setPreview(await pregnancyApi.calculate(payload))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tính tuổi thai.') } finally { setBusy(false) }
  }

  async function applyPreview() {
    if (!preview) return
    setBusy(true); setError(''); setMessage('')
    const body = method === 'MANUAL'
      ? { calculation_source: method, gestational_week: Number(week), gestational_day: Number(day), timezone: 'Asia/Ho_Chi_Minh' }
      : { calculation_source: method, [method === 'CONCEPTION_DATE' ? 'conception_date' : 'last_menstrual_period']: date, timezone: 'Asia/Ho_Chi_Minh' }
    try {
      const saved = pregnancy ? await pregnancyApi.update(pregnancy.id, { ...body, version: pregnancy.version }) : await pregnancyApi.create(body)
      setPregnancy(saved); setPreview(null); setMessage('Đã cập nhật hành trình thai kỳ của bạn.')
      try { setContent(await pregnancyApi.weekContent(saved.gestational_week)) } catch { setContent(null) }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ thai kỳ.') } finally { setBusy(false) }
  }

  return <AppShell><div className="page-heading"><p className="welcome-kicker">Sức khỏe và hành trình</p><h1>Thai kỳ của bạn</h1><p>Theo dõi mốc thai kỳ và nội dung chăm sóc phù hợp với từng tuần.</p></div>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}
    {pregnancy ? <><section className="pregnancy-hero"><div><p className="card-kicker">Tuần thai hiện tại</p><h2>Tuần {pregnancy.gestational_week} · Ngày {pregnancy.gestational_day}</h2><p>Tam cá nguyệt {pregnancy.trimester} · còn {pregnancy.days_until_due} ngày đến dự sinh.</p></div><Heartbeat size={64} weight="duotone" /></section><div className="dashboard-grid"><section className="app-card"><CalendarHeart size={27} weight="duotone" /><p className="card-kicker">Ngày dự sinh</p><h2>{formatDate(pregnancy.estimated_due_date)}</h2><p>Nguồn tính: {pregnancy.calculation_source}</p></section><section className="app-card"><Baby size={27} weight="duotone" /><p className="card-kicker">Thông tin bé</p><h2>{content?.baby?.comparison_label || `Bé yêu tuần ${pregnancy.gestational_week}`}</h2><p>{content?.development_summary || content?.summary || 'Nội dung đang được cập nhật.'}</p></section></div>{content && <section className="app-card content-card"><h2>{content.title || `Phát triển tuần ${content.week}`}</h2><p>{content.baby_development || content.development_summary}</p><div className="content-columns"><div><h3>Thay đổi của mẹ</h3><p>{content.maternal_changes?.join(' ') || content.mother_changes}</p></div><div><h3>Gợi ý chăm sóc</h3><p>{content.care_topics?.join(' ') || content.care_tips}</p></div></div><p className="disclaimer">{content.disclaimer || 'Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y khoa.'}</p></section>}</> : <section className="empty-state"><Heartbeat size={42} weight="duotone" /><h2>Chưa có hồ sơ thai kỳ</h2><p>Bạn vẫn có thể tính thử tuổi thai bên dưới. Hệ thống chỉ lưu khi bạn xác nhận.</p></section>}
    <section className="app-card calculator-card"><div className="section-title-row"><div><p className="card-kicker">Cập nhật tuổi thai</p><h2>Tính thử trước khi lưu</h2></div><Calculator size={30} weight="duotone" /></div><div className="method-tabs">{([{ value: 'LAST_MENSTRUAL_PERIOD', label: 'Kỳ kinh cuối' }, { value: 'CONCEPTION_DATE', label: 'Ngày thụ thai' }, { value: 'MANUAL', label: 'Nhập thủ công' }] as const).map((item) => <button key={item.value} type="button" className={method === item.value ? 'active' : ''} onClick={() => { setMethod(item.value); setPreview(null); setError('') }}>{item.label}</button>)}</div>{method === 'MANUAL' ? <div className="inline-fields"><label className="field-group"><span>Tuần thai</span><div className="input-shell"><input type="number" min="0" value={week} onChange={(e) => setWeek(e.target.value)} /></div></label><label className="field-group"><span>Ngày thai</span><div className="input-shell"><input type="number" min="0" max="6" value={day} onChange={(e) => setDay(e.target.value)} /></div></label></div> : <DateField label={method === 'CONCEPTION_DATE' ? 'Ngày thụ thai ước tính' : 'Ngày đầu kỳ kinh cuối'} value={date} onChange={(e) => setDate(e.target.value)} hint="Nhập theo định dạng YYYY-MM-DD." />}<button className="secondary-button" type="button" onClick={() => void calculate()} disabled={busy}>Tính kết quả</button>{preview && <div className="calculation-result"><strong>Dự sinh {formatDate(preview.estimated_due_date)}</strong><span>Tuần {preview.gestational_week}, ngày {preview.gestational_day} · Tam cá nguyệt {preview.trimester}</span><button className="primary-button" type="button" onClick={() => void applyPreview()} disabled={busy}><FloppyDisk size={20} />Dùng kết quả này</button></div>}</section>
  </AppShell>
}
