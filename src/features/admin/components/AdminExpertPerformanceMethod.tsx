import { performanceComparisonReason, performanceDescription, performancePercent, type ExpertPerformance } from '../model/admin-expert-performance'
import { adminLabel } from '../model/admin-workspace-query'

const date=(s:string)=>`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`
export function AdminExpertPerformanceMethod({data}:{data:ExpertPerformance}) {
  return <details className="admin-performance-method"><summary>Cách tính & so sánh kỳ trước</summary>
    <p>Kỳ này: {date(data.period.from_date)} – {date(data.period.to_date)} · {data.expert?.full_name??(data.specialty?`Khoa ${adminLabel(data.specialty)}`:'Toàn đội ngũ')}.
      {' '}Kỳ trước: {date(data.period.previous_from_date)} – {date(data.period.previous_to_date)}.
      {' '}{data.rules.comparison_basis==='PREVIOUS_CALENDAR_MONTH'?'So với tháng lịch trước, số ngày có thể khác nhau.':'So với khoảng liền trước có cùng số ngày.'}</p>
    <ul>{data.axes.map(a=><li key={a.key}><strong>{a.label}</strong>
      <span>Kỳ này: {performanceDescription(a)} → {performancePercent(a.current.percent)}.</span>
      <span>Kỳ trước: {performanceDescription(a,'previous')} → {performancePercent(a.previous.percent)}.</span>
      <span>{a.change_percentage_points===null?performanceComparisonReason(data):
        `${a.change_percentage_points>0?'Tăng':a.change_percentage_points<0?'Giảm':'Không đổi'} ${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Math.abs(a.change_percentage_points))} điểm phần trăm (${performancePercent(a.current.percent)} − ${performancePercent(a.previous.percent)}).`}</span>
    </li>)}</ul>
    <p><strong>Chuyên cần:</strong> khung làm việc / khung chuẩn × 100. Mỗi ngày 24 khung 30 phút trong 08:00–20:00, gồm cuối tuần.
      Tính đúng 28/29/30/31 ngày của tháng; expert mới tính từ ngày tạo hồ sơ. Nghỉ cả ngày không trừ trùng giờ đóng;
      giờ đã có lịch đặt vẫn được giữ là giờ làm việc. Cả khoa/toàn đội lấy tổng khung làm việc chia tổng khung chuẩn, không cộng các tỷ lệ.</p>
    <p>Chuyên cần là lịch đang lưu, gồm ngày nghỉ dự kiến trong phần còn lại của kỳ; lịch tương lai chưa bị tính là chưa hoàn thành hay trễ.</p>
    <p><strong>Đúng giờ:</strong> giờ server nhận lần bấm Vào phòng tư vấn đầu tiên, từ trước 5 phút đến sau giờ bắt đầu 3 phút, bao gồm đúng +3 phút.
      Bấm sau đó vẫn là trễ dù buổi tư vấn hoàn thành. Chỉ xét các buổi đã hết 3 phút cho phép; lịch cũ thiếu lần bấm được ghi chưa rõ, không tự tính là trễ.</p>
    <p><strong>Hài lòng:</strong> số đánh giá 4–5 sao / toàn bộ đánh giá 1–5 sao. Đánh giá 3 sao vẫn được tính trong mẫu số.
      {' '}<strong>Hoàn thành:</strong> buổi đã hoàn thành / buổi đến hạn kết thúc.</p>
    <p>Random tạo trước 08:00: hạn 08:30 hôm nay; 08:00–trước 19:00: 30 phút; từ 19:00: 08:30 hôm sau.
      Ngày mong muốn không đổi hạn nhận. Khách quay lại là người đã hoàn thành buổi trước cùng expert.</p>
    <p>Chênh lệch là tỷ lệ kỳ này trừ kỳ trước, tính bằng điểm phần trăm, không lấy 100% làm chuẩn mặc định.
      Số lượt tăng không đồng nghĩa tỷ lệ tăng. Chỉ kết luận tăng/giảm khi cả hai kỳ có đủ thời gian dữ liệu.
      Chấm rỗng và dấu — là chưa có mẫu/dữ liệu, khác với 0%.</p>
  </details>
}
