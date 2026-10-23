import { useReducedMotion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { ArrowClockwise, ChartLineUp, Clock, Crown, Receipt, Wallet } from '@phosphor-icons/react'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapPaymentsPage, mapSubscriptionsPage, mapRevenueSummary, assertPaymentSource, AdminContractError } from '../model/admin-workspace-contract'
import { adminLabel, paymentStatuses } from '../model/admin-workspace-query'
import { AdminSelect, DataState, PeriodFilter, QueryErrors, SearchFilter, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { comparison, dateTime, money } from '../model/admin-workspace-formatters'
import { PaymentsTable, SubscriptionsTable } from '../components/AdminOperationalTable'
import { PaymentDrawer } from '../components/AdminOperationalDrawer'
import '../styles/admin-revenue.css'
const CollectionChart = lazy(() => import('../components/AdminDashboardCharts').then((m) => ({ default: m.CollectionChart })))
const integer = new Intl.NumberFormat('vi-VN')
function TransactionPanel() {
  const reduceMotion = useReducedMotion()
  const f = useAdminFilters('payments')
  const allTime = f.query.get('range') === 'ALL_TIME'
  const summaryQuery = new URLSearchParams()
  for (const key of ['fromDate','toDate','source','range']) { const value=f.query.get(key);if(value)summaryQuery.set(key,value) }
  const summary = useAdminResource(f.valid ? `/admin/revenue/summary?${summaryQuery}` : null, (p) => { const result = mapRevenueSummary(p,allTime); if (result.source !== f.query.get('source')) throw new AdminContractError('revenue.source.filter'); return result })
  const list = useAdminResource(f.valid ? `/admin/payment-orders?${f.queryString}` : null, (p) => { const result = mapPaymentsPage(p); assertPaymentSource(result.items,f.query.get('source')!); return result })
  const s = summary.data
  return <>
    <section className="admin-card admin-revenue-overview"><header className="admin-revenue-section-heading"><div><h2>Tổng quan doanh thu</h2><p>Số tiền từ các đơn đã thanh toán, tính theo ngày thanh toán.</p></div><div className="admin-revenue-heading-actions">{s && <span className="admin-revenue-updated"><Clock size={14} aria-hidden="true" />Cập nhật lúc {dateTime(s.snapshot_at)}</span>}<button type="button" className="admin-button secondary" disabled={summary.loading || list.loading || !f.valid} onClick={() => { summary.retry(); list.retry() }}><ArrowClockwise size={16} aria-hidden="true" />Làm mới</button></div></header>
      <div className="admin-revenue-period-controls"><button type="button" className="admin-button secondary admin-revenue-all-time" data-active={allTime} aria-pressed={allTime} onClick={() => f.commit({ range: allTime ? null : 'ALL_TIME', fromDate:null, toDate:null })}>Toàn bộ</button>{allTime ? <p>Đang xem doanh thu từ tất cả các đơn đã thanh toán.</p> : <PeriodFilter from={f.query.get('fromDate') || ''} to={f.query.get('toDate') || ''} presets onChange={(fromDate,toDate) => f.commit({ fromDate,toDate })} />}</div>
      <QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].filter((k) => k !== 'tab').map((k) => [k,null])))} />
      {f.valid && <DataState loading={summary.loading} error={summary.error} empty={!s} retry={summary.retry}>{s && <>
        <div className="admin-revenue-summary" role="group" aria-label="Số liệu doanh thu">
          <div className="admin-revenue-metric is-primary"><div className="admin-revenue-metric-heading"><span>Tổng tiền đã thu</span><span className="admin-revenue-metric-icon"><Wallet size={21} weight="duotone" aria-hidden="true" /></span></div><strong>{money(s.summary.collected_amount)}</strong><small>{allTime ? 'Tổng tiền trong toàn bộ thời gian' : comparison(s.summary.collected_amount,s.summary.previous_collected_amount)}</small></div>
          <div className="admin-revenue-metric"><div className="admin-revenue-metric-heading"><span>Đơn đã thanh toán</span><span className="admin-revenue-metric-icon"><Receipt size={21} weight="duotone" aria-hidden="true" /></span></div><strong>{integer.format(s.summary.paid_orders)}</strong><small>Số đơn thanh toán thành công</small></div>
          <div className="admin-revenue-metric"><div className="admin-revenue-metric-heading"><span>Tiền thu trung bình mỗi đơn</span><span className="admin-revenue-metric-icon"><ChartLineUp size={21} weight="duotone" aria-hidden="true" /></span></div><strong>{money(s.summary.average_paid_amount)}</strong><small>Tính trên các đơn đã thanh toán</small></div>
        </div>
        <div className="admin-revenue-insights"><section className="admin-revenue-chart"><header><h3>Tiền thu theo ngày</h3><p>{allTime ? 'Diễn biến doanh thu trong toàn bộ thời gian' : 'Diễn biến doanh thu trong khoảng ngày đã chọn'}</p></header>{s.daily_series.length ? <Suspense fallback={<div className="admin-live-chart">Đang tải biểu đồ…</div>}><CollectionChart items={s.daily_series} animate={!reduceMotion} /></Suspense> : <div className="admin-revenue-chart-empty">Chưa có dữ liệu để hiển thị biểu đồ.</div>}</section>
          <section className="admin-revenue-plans"><header><h3>Doanh thu theo gói</h3><p>Số tiền và số đơn đã thanh toán</p></header>{s.by_plan.length ? <ul>{s.by_plan.map((p) => <li key={p.plan_tier}><span className="admin-revenue-plan-icon"><Crown size={19} weight="duotone" aria-hidden="true" /></span><div><strong>{adminLabel(p.plan_tier)}</strong><span>{integer.format(p.paid_orders)} đơn đã thanh toán</span></div><strong className="admin-revenue-plan-amount">{money(p.amount)}</strong></li>)}</ul> : <p className="admin-inline-empty">Chưa có doanh thu từ các gói dịch vụ.</p>}</section>
        </div>
      </>}</DataState>}
    </section>
    <section className="admin-card admin-revenue-list"><header className="admin-revenue-section-heading"><div><h2>Danh sách giao dịch</h2><p>Tra cứu theo người dùng, gói dịch vụ và trạng thái thanh toán.</p></div></header><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Gói dịch vụ" name="planTier" value={f.query.get('planTier') || ''} options={['PLAN_99K','PLAN_399K']} onChange={(planTier) => f.commit({ planTier })} /><AdminSelect label="Trạng thái" name="status" value={f.query.get('status') || ''} options={paymentStatuses} onChange={(status) => f.commit({ status })} /><AdminSelect label="Lọc ngày theo" name="dateBasis" value={f.query.get('dateBasis') || 'CREATED'} options={['CREATED','PAID']} all={false} onChange={(dateBasis) => f.commit({ dateBasis })} /></div>
    {f.valid && <><DataState loading={list.loading} error={list.error} empty={!list.data?.items.length} retry={list.retry}><PaymentsTable animationKey={f.queryString} items={list.data?.items || []} onView={(orderCode) => f.commit({ orderCode },false)} /></DataState><WorkspacePagination data={list.data} page={f.page} pageSize={f.pageSize} busy={list.loading} commit={f.commit} /></>}</section>
    {f.valid && f.params.get('orderCode') && <PaymentDrawer key={f.params.get('orderCode')} code={f.params.get('orderCode')!} onClose={() => f.commit({ orderCode: null },false)} />}
  </>
}
function SubscriptionPanel() {
  const f = useAdminFilters('subscriptions')
  const list = useAdminResource(f.valid ? `/admin/subscriptions?${f.queryString}` : null, mapSubscriptionsPage)
  return <section className="admin-card admin-revenue-list admin-revenue-subscriptions"><header className="admin-revenue-section-heading"><div><h2>Gói đang sử dụng</h2><p>Theo dõi gói dịch vụ và thời hạn sử dụng của khách hàng.</p></div><button type="button" className="admin-button secondary" disabled={list.loading || !f.valid} onClick={list.retry}><ArrowClockwise size={16} aria-hidden="true" />Làm mới</button></header><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Gói dịch vụ" name="planTier" value={f.query.get('planTier') || ''} options={['PLAN_99K','PLAN_399K']} onChange={(planTier) => f.commit({ planTier })} /><AdminSelect label="Trạng thái sử dụng" name="effectiveStatus" value={f.query.get('effectiveStatus') || ''} options={['ACTIVE','EXPIRED','CANCELLED','NOT_STARTED']} onChange={(effectiveStatus) => f.commit({ effectiveStatus })} /><label className="admin-checkbox"><input type="checkbox" checked={f.query.get('expiringWithinDays') === '7'} onChange={(e) => f.commit({ expiringWithinDays: e.target.checked ? '7' : null, effectiveStatus: e.target.checked ? 'ACTIVE' : null })} />Sắp hết hạn trong 7 ngày</label></div><p className="admin-reference-notice">Trạng thái sử dụng được ghi nhận khi tải dữ liệu. Xem tài khoản dùng gói miễn phí tại mục Người dùng.</p><QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].filter((k) => k !== 'tab').map((k) => [k,null])))} />{f.valid && <><DataState loading={list.loading} error={list.error} empty={!list.data?.items.length} retry={list.retry}><SubscriptionsTable animationKey={f.queryString} items={list.data?.items || []} /></DataState><WorkspacePagination data={list.data} page={f.page} pageSize={f.pageSize} busy={list.loading} commit={f.commit} /></>}</section>
}
export function AdminRevenuePage() {
  const f = useAdminFilters('payments')
  const subscriptions = f.params.get('tab') === 'subscriptions'
  return <div className="admin-page admin-revenue-page"><h1 className="sr-only">Doanh thu &amp; Gói dịch vụ</h1><nav className="admin-management-tabs" aria-label="Doanh thu và gói"><button type="button" data-active={!subscriptions} onClick={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))}>Giao dịch</button><button type="button" data-active={subscriptions} onClick={() => f.commit({ ...Object.fromEntries([...f.params.keys()].map((k) => [k,null])), tab: 'subscriptions' })}>Gói đang sử dụng</button></nav>{subscriptions ? <SubscriptionPanel /> : <TransactionPanel />}</div>
}
