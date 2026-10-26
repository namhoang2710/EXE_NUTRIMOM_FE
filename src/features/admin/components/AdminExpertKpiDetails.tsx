import { Dialog } from '@base-ui/react/dialog'
import { X } from '@phosphor-icons/react'
import { performanceComparisonReason, performanceDescription, performancePercent, type ExpertPerformance } from '../model/admin-expert-performance'
import { adminLabel } from '../model/admin-workspace-query'
import { dateTime } from '../model/admin-workspace-formatters'

const date=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`
const decimal=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2})

export function AdminExpertKpiDetails({data}:{data:ExpertPerformance}) {
  const {period,expert}=data
  return <Dialog.Root>
    <Dialog.Trigger className="admin-text-button admin-kpi-details-trigger">Xem chi tiết</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="admin-kpi-details-backdrop"/>
      <Dialog.Popup className="admin-kpi-details">
        <header className="admin-kpi-details-header">
          <div><span>Hiệu suất chuyên gia</span><Dialog.Title>Chi tiết KPI · {expert?.full_name}</Dialog.Title><Dialog.Description>{expert?adminLabel(expert.specialty):'Toàn đội ngũ'} · Cập nhật {dateTime(data.snapshot_at)}</Dialog.Description></div>
          <Dialog.Close className="admin-editor-close" aria-label="Đóng chi tiết KPI"><X size={18}/></Dialog.Close>
        </header>
        <div className="admin-kpi-details-body">
          <div className="admin-kpi-details-periods"><div><span>Kỳ này</span><strong>{date(period.from_date)} – {date(period.to_date)}</strong>{!data.data_coverage.current_period_complete&&<small>{data.data_coverage.current_effective_from_date?`Có dữ liệu từ ${date(data.data_coverage.current_effective_from_date)} · chưa đủ kỳ`:'Chưa có dữ liệu trong kỳ'}</small>}</div><div><span>Kỳ trước</span><strong>{date(period.previous_from_date)} – {date(period.previous_to_date)}</strong>{!data.data_coverage.previous_period_complete&&<small>{data.data_coverage.previous_effective_from_date?`Có dữ liệu từ ${date(data.data_coverage.previous_effective_from_date)} · chưa đủ kỳ`:'Chưa có dữ liệu trong kỳ'}</small>}</div></div>
          <div className="admin-kpi-details-grid">{data.axes.map(axis=>{
            const delta=axis.change_percentage_points
            return <section className="admin-kpi-details-metric" key={axis.key} aria-label={axis.label}>
              <h3>{axis.label}</h3>
              <dl>{(['current','previous'] as const).map(side=><div key={side}><dt>{side==='current'?'Kỳ này':'Kỳ trước'}</dt><dd><strong>{performancePercent(axis[side].percent)}</strong><span>{performanceDescription(axis,side)}</span></dd></div>)}</dl>
              <p className="admin-kpi-details-change" data-direction={delta===null?'unknown':delta>0?'up':delta<0?'down':'same'}>{delta===null?performanceComparisonReason(data):delta===0?'Tỷ lệ không đổi · 0 điểm phần trăm':`Tỷ lệ ${delta>0?'tăng':'giảm'} ${decimal.format(Math.abs(delta))} điểm phần trăm`}</p>
            </section>
          })}</div>
          <p className="admin-kpi-details-note">So sánh tỷ lệ, không so tổng số lượt: số đánh giá tốt có thể tăng nhưng tỷ lệ hài lòng vẫn giảm nếu số đánh giá chưa hài lòng tăng. Mức thay đổi = tỷ lệ kỳ này − tỷ lệ kỳ trước, tính bằng điểm phần trăm. Kỳ thiếu thời gian dữ liệu không kết luận tăng/giảm. Dấu — nghĩa là chưa đủ dữ liệu, không phải 0%.</p>
        </div>
        <footer className="admin-kpi-details-footer"><Dialog.Close className="admin-button secondary">Đóng</Dialog.Close></footer>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
