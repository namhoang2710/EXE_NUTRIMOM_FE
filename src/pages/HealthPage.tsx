import { Baby, CalendarHeart, Calculator, FloppyDisk, Heartbeat } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { FeaturePage as AppShell } from '@/shared/layouts/FeaturePage'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { ApiClientError } from '@/core/api/api-error'
import { formatDate, isDateOnly, todayDate } from '@/core/auth/date'
import { pregnancyApi } from '@/features/maternity/api/domain-api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Pregnancy, PregnancyCalculation, WeekContent } from '@/types/domain'

type Method = 'LAST_MENSTRUAL_PERIOD' | 'CONCEPTION_DATE' | 'MANUAL'
type ContentStatus = { tone: 'info' | 'error'; message: string } | null
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'

function weeklyContentStatus(reason: unknown, week: number): ContentStatus {
  if (reason instanceof ApiClientError && reason.code === 'CONTENT_NOT_REVIEWED') {
    return { tone: 'info', message: `Nội dung chăm sóc tuần ${week} đang chờ thẩm định y khoa. Hồ sơ thai kỳ của bạn vẫn được lưu bình thường.` }
  }
  if (reason instanceof ApiClientError && reason.code === 'RESOURCE_NOT_FOUND') {
    return { tone: 'info', message: `Chưa có nội dung chăm sóc cho tuần ${week}. Hồ sơ thai kỳ của bạn vẫn được lưu bình thường.` }
  }
  return { tone: 'error', message: `Không tải được nội dung chăm sóc tuần ${week}. Hãy thử tải lại sau.` }
}

function calculationSourceLabel(source: string) {
  const labels: Record<string, string> = {
    LMP: 'Ngày đầu tiên của kỳ kinh cuối',
    LAST_MENSTRUAL_PERIOD: 'Ngày đầu tiên của kỳ kinh cuối',
    CONCEPTION_DATE: 'Ngày thụ thai ước tính',
    MANUAL: 'Tuổi thai nhập thủ công',
    EDD: 'Ngày dự sinh',
    ESTIMATED_DUE_DATE: 'Ngày dự sinh',
    ULTRASOUND: 'Kết quả siêu âm',
    IVF: 'Thụ tinh trong ống nghiệm',
  }
  return labels[source] ?? 'Chưa xác định'
}

function calculationNote(method: Method) {
  if (method === 'LAST_MENSTRUAL_PERIOD') return 'Kết quả dựa trên kỳ kinh nguyệt đều khoảng 28 ngày và chỉ mang tính tham khảo.'
  if (method === 'CONCEPTION_DATE') return 'Ngày thụ thai là ngày ước tính. Tuổi thai hiển thị theo cách tính sản khoa, thường cộng thêm 14 ngày.'
  return 'Tuổi thai nhập tay được neo tại ngày hôm nay và sẽ tăng theo thời gian. Bác sĩ có thể điều chỉnh ngày dự sinh dựa trên siêu âm.'
}

export function HealthPage() {
  const { reloadProfile } = useAuth()
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null)
  const [content, setContent] = useState<WeekContent | null>(null)
  const [method, setMethod] = useState<Method>('LAST_MENSTRUAL_PERIOD')
  const [date, setDate] = useState('')
  const [week, setWeek] = useState('')
  const [day, setDay] = useState('0')
  const [preview, setPreview] = useState<PregnancyCalculation | null>(null)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [warning, setWarning] = useState('')
  const [contentStatus, setContentStatus] = useState<ContentStatus>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conflict, setConflict] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setContentStatus(null)
    try {
      const current = await pregnancyApi.current()
      setPregnancy(current)
      try {
        setContent(await pregnancyApi.weekContent(current.gestational_week))
      } catch (reason) {
        setContent(null)
        setContentStatus(weeklyContentStatus(reason, current.gestational_week))
      }
    } catch (reason) {
      if (reason instanceof ApiClientError && (reason.code === 'RESOURCE_NOT_FOUND' || reason.code === 'ACTIVE_PREGNANCY_NOT_FOUND')) setPregnancy(null)
      else setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ thai kỳ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function calculate() {
    setError(''); setFieldError(''); setWarning(''); setMessage(''); setPreview(null)
    if (method !== 'MANUAL') {
      if (!date) { setFieldError('Hãy chọn ngày trên lịch trước khi tính.'); return }
      if (!isDateOnly(date) || date > todayDate()) { setFieldError('Ngày đã chọn không hợp lệ. Hãy chọn ngày hôm nay hoặc trước đó.'); return }
      const ageDays = Math.floor((new Date(`${todayDate()}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000) + (method === 'CONCEPTION_DATE' ? 14 : 0)
      if (ageDays > 42 * 7 + 6) { setFieldError('Mốc này cho tuổi thai trên 42 tuần 6 ngày. Hãy kiểm tra lại ngày hoặc hỏi nhân viên y tế.'); return }
      if (ageDays > 40 * 7) setWarning('Mốc này cho tuổi thai trên 40 tuần. Hãy kiểm tra lại ngày với bác sĩ hoặc kết quả siêu âm.')
    }
    if (method === 'MANUAL' && (!/^\d+$/.test(week) || !/^\d+$/.test(day) || Number(week) > 42 || Number(day) > 6)) { setError('Hãy nhập tuần thai từ 0 đến 42 và ngày thai từ 0 đến 6 bằng số nguyên.'); return }
    if (method === 'MANUAL' && Number(week) > 40) setWarning('Tuổi thai trên 40 tuần. Hãy kiểm tra lại với bác sĩ hoặc kết quả siêu âm.')
    setBusy(true)
    try {
      const payload = method === 'MANUAL'
        ? { method, gestational_week: Number(week), gestational_day: Number(day), timezone: browserTimezone }
        : { method, date, timezone: browserTimezone }
      setPreview(await pregnancyApi.calculate(payload))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tính tuổi thai.') }
    finally { setBusy(false) }
  }

  async function applyPreview() {
    if (!preview) return
    setBusy(true); setError(''); setMessage(''); setConflict(false)
    const body = method === 'MANUAL'
      ? { calculation_source: method, gestational_week: Number(week), gestational_day: Number(day), timezone: browserTimezone }
      : { calculation_source: method, [method === 'CONCEPTION_DATE' ? 'conception_date' : 'last_menstrual_period']: date, timezone: browserTimezone }
    try {
      const saved = pregnancy ? await pregnancyApi.update(pregnancy.id, { ...body, version: pregnancy.version }) : await pregnancyApi.create(body)
      await reloadProfile().catch(() => undefined)
      setPregnancy(saved); setPreview(null); setMessage('Đã cập nhật hành trình thai kỳ của bạn.')
      try { setContent(await pregnancyApi.weekContent(saved.gestational_week)); setContentStatus(null) }
      catch (reason) { setContent(null); setContentStatus(weeklyContentStatus(reason, saved.gestational_week)) }
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setConflict(true); setError('Hồ sơ thai kỳ đã thay đổi ở nơi khác. Hãy tải lại dữ liệu mới nhất trước khi lưu lại.')
      } else setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ thai kỳ.')
    } finally { setBusy(false) }
  }

  async function retryWeeklyContent() {
    if (!pregnancy) return
    setContentStatus(null)
    try { setContent(await pregnancyApi.weekContent(pregnancy.gestational_week)) }
    catch (reason) { setContent(null); setContentStatus(weeklyContentStatus(reason, pregnancy.gestational_week)) }
  }

  return <AppShell>
    <div className="page-heading"><p className="welcome-kicker">Sức khỏe và hành trình</p><h1>Thai kỳ của bạn</h1><p>Theo dõi mốc thai kỳ và nội dung chăm sóc phù hợp với từng tuần.</p></div>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}
    {conflict && <button className="secondary-button" type="button" onClick={() => void load()}>Tải lại hồ sơ thai kỳ</button>}
    {loading ? <section className="empty-state"><Heartbeat size={42} weight="duotone" /><h2>Đang tải hồ sơ thai kỳ</h2><p>NutriMom đang lấy dữ liệu mới nhất của bạn.</p></section> : pregnancy ? <>
      <section className="pregnancy-hero"><div><p className="card-kicker">Tuần thai hiện tại</p><h2>Tuần {pregnancy.gestational_week} · Ngày {pregnancy.gestational_day}</h2><p>Tam cá nguyệt {pregnancy.trimester} · còn {pregnancy.days_until_due} ngày đến dự sinh.</p></div><Heartbeat size={64} weight="duotone" /></section>
      <div className="dashboard-grid"><section className="app-card"><CalendarHeart size={27} weight="duotone" /><p className="card-kicker">Ngày dự sinh</p><h2>{formatDate(pregnancy.estimated_due_date)}</h2><p>Nguồn tính: {calculationSourceLabel(pregnancy.calculation_source)}</p></section><section className="app-card"><Baby size={27} weight="duotone" /><p className="card-kicker">Thông tin bé</p><h2>{content?.baby?.comparison_label || `Bé yêu tuần ${pregnancy.gestational_week}`}</h2><p>{content?.development_summary || content?.summary || 'Nội dung đang được cập nhật.'}</p></section></div>
      {contentStatus && <div className="weekly-content-status"><StatusMessage tone={contentStatus.tone}>{contentStatus.message}</StatusMessage>{contentStatus.tone === 'error' && <button className="secondary-button" type="button" onClick={() => void retryWeeklyContent()}>Tải lại nội dung tuần thai</button>}</div>}
      {content && <section className="app-card content-card"><h2>{content.title || `Phát triển tuần ${content.week}`}</h2><p>{content.baby_development || content.development_summary}</p><div className="content-columns"><div><h3>Thay đổi của mẹ</h3><p>{content.maternal_changes?.join(' ') || content.mother_changes}</p></div><div><h3>Gợi ý chăm sóc</h3><p>{content.care_topics?.join(' ') || content.care_tips}</p></div></div><div className="content-columns"><div><h3>Dấu hiệu cần lưu ý</h3><p>{content.warning_signs || 'Chưa có thông tin riêng cho tuần này.'}</p></div><div><h3>Nguồn và kiểm duyệt</h3><p>{content.sources || 'Nguồn đang được cập nhật.'}{content.reviewed_by ? ` · ${content.reviewed_by}` : ''}{content.reviewed_at ? ` · Cập nhật ${formatDate(content.reviewed_at)}` : ''}{content.content_version ? ` · v${content.content_version}` : ''}</p></div></div><p className="disclaimer">{content.disclaimer || 'Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y khoa.'}</p></section>}
    </> : <section className="empty-state"><Heartbeat size={42} weight="duotone" /><h2>Chưa có hồ sơ thai kỳ</h2><p>Bạn vẫn có thể tính thử tuổi thai bên dưới. Hệ thống chỉ lưu khi bạn xác nhận.</p></section>}
    <section className="app-card calculator-card"><div className="section-title-row"><div><p className="card-kicker">Cập nhật tuổi thai</p><h2>Tính thử trước khi lưu</h2></div><Calculator size={30} weight="duotone" /></div><div className="method-tabs">{([{ value: 'LAST_MENSTRUAL_PERIOD', label: 'Kỳ kinh cuối' }, { value: 'CONCEPTION_DATE', label: 'Ngày thụ thai' }, { value: 'MANUAL', label: 'Nhập thủ công' }] as const).map((item) => <button key={item.value} type="button" className={method === item.value ? 'active' : ''} onClick={() => { setMethod(item.value); setPreview(null); setError(''); setFieldError(''); setWarning('') }}>{item.label}</button>)}</div>{method === 'MANUAL' ? <div className="inline-fields"><label className="field-group"><span>Tuần thai</span><div className="input-shell"><input type="number" min="0" max="42" value={week} onChange={(event) => { setWeek(event.target.value); setPreview(null); setWarning('') }} /></div></label><label className="field-group"><span>Ngày thai</span><div className="input-shell"><input type="number" min="0" max="6" value={day} onChange={(event) => { setDay(event.target.value); setPreview(null); setWarning('') }} /></div></label></div> : <CalendarDatePicker label={method === 'CONCEPTION_DATE' ? 'Ngày thụ thai ước tính' : 'Ngày đầu tiên của kỳ kinh cuối'} value={date} onChange={(value) => { setDate(value); setFieldError(''); setPreview(null); setWarning('') }} error={fieldError} />}{warning && <p className="calculation-warning" role="status">{warning}</p>}<p className="disclaimer">{calculationNote(method)}</p><button className="secondary-button" type="button" onClick={() => void calculate()} disabled={busy}>Tính kết quả</button>{preview && <div className="calculation-result"><strong>Dự sinh {formatDate(preview.estimated_due_date)}</strong><span>Tuần {preview.gestational_week}, ngày {preview.gestational_day} · Tam cá nguyệt {preview.trimester}</span><button className="primary-button" type="button" onClick={() => void applyPreview()} disabled={busy}><FloppyDisk size={20} />Dùng kết quả này</button></div>}</section>
  </AppShell>
}
