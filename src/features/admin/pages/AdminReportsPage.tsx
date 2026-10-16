import { useSearchParams } from 'react-router-dom'
import { AdminExpertPerformanceReport } from '../components/AdminExpertPerformanceReport'
import { useEffect, useRef, useState } from 'react'
import { ChartBar, CheckCircle, ClipboardText, Clock, Crown, Receipt, UserPlus, UsersThree, Wallet, WarningCircle, XCircle, type Icon } from '@phosphor-icons/react'
import { apiClient } from '@/core/api/api-client'
import { ApiClientError } from '@/core/api/api-error'
import { clearSession, getSessionScope } from '@/core/auth/token-store'
import { downloadFilename } from '@/core/api/download-filename'
import { requireAdmin, adminReads } from '../api/admin-read'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { useAdminCooldown } from '../hooks/useAdminCooldown'
import { mapReport, AdminContractError, assertPaymentSource, type AppointmentDto, type PaymentOrderDto, type UserCohortDto } from '../model/admin-workspace-contract'
import { reportTypes } from '../model/admin-workspace-query'
import { AdminSelect, DataState, PeriodFilter, QueryErrors, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { dateTime, money } from '../model/admin-workspace-formatters'
import { AppointmentTable, PaymentsTable, UserCohortTable } from '../components/AdminOperationalTable'
import { AppointmentDrawer, PaymentDrawer } from '../components/AdminOperationalDrawer'
const labels: Record<string,string> = {
  created_requests:'Yêu cầu đã tạo',
  pending_expert:'Đang chờ chuyên gia',
  pending_consultation:'Đang chờ tư vấn',
  completed_in_cohort:'Đã hoàn tất',
  cancelled_in_cohort:'Đã hủy',
  past_end_uncompleted:'Đã quá giờ, chưa hoàn tất',
  new_users:'Người dùng đăng ký mới',
  current_free_users:'Đang dùng gói miễn phí',
  current_plan_99k_users:'Đang dùng gói 99K',
  current_plan_399k_users:'Đang dùng gói 399K',
  collected_amount:'Tiền đã thu',
  paid_orders:'Đơn đã thanh toán',
  average_paid_amount:'Tiền thu trung bình mỗi đơn',
}
const metricIcons: Record<string,Icon> = { created_requests:ClipboardText, pending_expert:Clock, pending_consultation:UsersThree, completed_in_cohort:CheckCircle, cancelled_in_cohort:XCircle, past_end_uncompleted:WarningCircle, new_users:UserPlus, current_free_users:UsersThree, current_plan_99k_users:Crown, current_plan_399k_users:Crown, collected_amount:Wallet, paid_orders:Receipt, average_paid_amount:ChartBar }
const exportCooldownKey = 'EXPORT:/admin/reports'
export function AdminReportsPage(){
  const [params]=useSearchParams()
  return params.get('type')==='EXPERT_PERFORMANCE'?<AdminExpertPerformanceReport/>:<StandardReportsPage/>
}
function StandardReportsPage() {
  const f = useAdminFilters('reports')
  const type = f.params.get('type') || 'OPERATIONS'
  const query = new URLSearchParams(f.query)
  if (type !== 'REVENUE') query.delete('source')
  const resource = useAdminResource(f.valid ? `/admin/reports/${type}?${query}` : null, (p) => { const report = mapReport(p); if (report.type !== type) throw new AdminContractError('report.type.request'); if (type === 'REVENUE') { if (report.summary.source !== query.get('source')) throw new AdminContractError('report.source.filter'); assertPaymentSource(report.items as PaymentOrderDto[],query.get('source')!) } return report })
  const [exporting,setExporting] = useState(false)
  const [exportError,setExportError] = useState('')
  const exportLock = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const objectUrl = useRef('')
  const { seconds: exportCooldown } = useAdminCooldown(exportCooldownKey)
  useEffect(() => () => { controller.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])
  async function download() {
    if (exportLock.current || !f.valid || adminReads.cooldownUntil(exportCooldownKey) > Date.now()) return
    exportLock.current = true; setExporting(true); setExportError('')
    const scope = getSessionScope()
    const c = new AbortController(); controller.current = c
    try {
      requireAdmin()
      const exportQuery = new URLSearchParams(query); exportQuery.delete('page'); exportQuery.delete('pageSize')
      const { blob, contentDisposition } = await apiClient.download(`/admin/reports/${type}/export?${exportQuery}`, { signal:c.signal })
      requireAdmin()
      if (scope !== getSessionScope() || c.signal.aborted) return
      if (!blob.size || !blob.type.toLowerCase().startsWith('text/csv')) throw new Error('Server chưa trả về tệp CSV hợp lệ.')
      const filename = downloadFilename(contentDisposition)
      if (!filename || !filename.toLowerCase().endsWith('.csv')) throw new Error('Server chưa trả tên tệp CSV hợp lệ.')
      objectUrl.current = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = objectUrl.current; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove()
      // Give the browser a task to accept the download before releasing the URL.
      window.setTimeout(() => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = '' }, 0)
    } catch (reason) {
      if (!c.signal.aborted && scope === getSessionScope()) {
        if (reason instanceof ApiClientError && reason.status === 401) clearSession()
        if (reason instanceof ApiClientError && reason.status === 403) { adminReads.deny(); window.dispatchEvent(new Event('nutrimom:admin-denied')) }
        if (reason instanceof ApiClientError && reason.status === 429) adminReads.recordFailure(exportCooldownKey, reason)
        setExportError(reason instanceof ApiClientError && reason.status === 422 ? 'Báo cáo vượt giới hạn 10.000 dòng. Hãy thu hẹp khoảng ngày rồi tải lại.' : reason instanceof ApiClientError && reason.status === 429 ? 'Tải báo cáo quá thường xuyên. Vui lòng chờ trước khi thử lại.' : reason instanceof Error ? reason.message : 'Không thể tải CSV.')
      }
    } finally { exportLock.current = false; if (!c.signal.aborted) setExporting(false) }
  }
  const report = resource.data
  return <div className="admin-page"><h1 className="sr-only">Báo cáo</h1>
    <section className="admin-card"><div className="admin-workspace-filters"><AdminSelect label="Mẫu báo cáo" name="type" value={type} options={reportTypes} all={false} onChange={(next) => f.commit({ type:next, requestId:null, orderCode:null })} /><PeriodFilter from={f.query.get('fromDate') || ''} to={f.query.get('toDate') || ''} presets onChange={(fromDate,toDate) => f.commit({ fromDate,toDate })} actions={<button type="button" className="admin-button primary compact" disabled={exporting || exportCooldown > 0 || !f.valid || resource.loading || !report} onClick={() => void download()}>{exporting ? 'Đang tải…' : exportCooldown > 0 ? `Chờ ${exportCooldown}s` : 'Tải CSV'}</button>} /></div><QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} />
      <p className="admin-reference-notice">{type === 'OPERATIONS' ? 'Các yêu cầu được tạo trong khoảng thời gian đã chọn. Trạng thái được ghi nhận khi lập báo cáo.' : type === 'USERS_SUBSCRIPTIONS' ? 'Người dùng đăng ký trong khoảng thời gian đã chọn và gói đang sử dụng khi lập báo cáo. Không bao gồm quản trị viên và chuyên gia.' : 'Các đơn đã thanh toán trong khoảng thời gian đã chọn, theo bộ lọc hiện tại.'}{report && ` Thời điểm lập báo cáo: ${dateTime(report.generated_at)}`}</p>
      {exportError && <p className="admin-query-error" role="alert">{exportError}</p>}
      {f.valid && <><DataState loading={resource.loading} error={resource.error} empty={!report} retry={resource.retry}>{report && <><div className="admin-report-summary" data-report-type={type} role="group" aria-label="Số liệu tổng hợp báo cáo">{Object.entries(report.summary).filter(([key]) => key !== 'source').map(([key,value]) => {
        const MetricIcon = metricIcons[key] || ChartBar
        return <div className="admin-report-metric" key={key}><div className="admin-report-metric-heading"><span className="admin-report-metric-label">{labels[key] || key}</span><span className="admin-report-metric-icon" aria-hidden="true"><MetricIcon size={19} weight="duotone" /></span></div><strong>{key.includes('amount') ? money(value as number) : typeof value === 'number' ? new Intl.NumberFormat('vi-VN').format(value) : value}</strong></div>
      })}</div>{!report.items.length ? <p className="admin-inline-empty">Chưa có dữ liệu trong khoảng thời gian đã chọn.</p> : type === 'OPERATIONS' ? <AppointmentTable items={report.items as AppointmentDto[]} onView={(requestId) => f.commit({ requestId },false)} /> : type === 'REVENUE' ? <PaymentsTable items={report.items as PaymentOrderDto[]} onView={(orderCode) => f.commit({ orderCode },false)} /> : <UserCohortTable items={report.items as UserCohortDto[]} />}</>}</DataState><WorkspacePagination data={report} page={f.page} pageSize={f.pageSize} busy={resource.loading} commit={f.commit} /></>}
    </section>{f.valid && f.params.get('requestId') && <AppointmentDrawer id={f.params.get('requestId')!} onClose={() => f.commit({ requestId:null },false)} />}{f.valid && f.params.get('orderCode') && <PaymentDrawer code={f.params.get('orderCode')!} onClose={() => f.commit({ orderCode:null },false)} />}
  </div>
}
