import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ApiClientError } from '@/core/api/api-error'
import { useAdminResource } from '../hooks/useAdminResource'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useDashboardTimeline } from '../hooks/useDashboardTimeline'
import { invalidateAdmin } from '../api/admin-read'
import { mapDashboardRedesign } from '../model/admin-dashboard-overview'
import { metricComparison, signedMetric, currentPlanShare } from '../model/admin-metric-comparison'
import { dashboardKpiFrameMs } from '../model/admin-dashboard-timeline'
import { attentionPath, activityPath } from '../model/admin-dashboard-links'
import { vietnamToday } from '../model/admin-workspace-query'
import { PeriodFilter, QueryErrors } from '../components/AdminWorkspaceUI'
import { comparison, dateTime, money } from '../model/admin-workspace-formatters'
import { AdminDashboardActions } from '../components/AdminDashboardActions'
import { AdminDashboardNumber } from '../components/AdminDashboardNumber'
import { AdminStatsCard } from '../components/AdminStatsCard'
import { AdminChartSlot } from '../components/AdminChartSlot'
import { AdminExpertPerformance } from '../components/AdminExpertPerformance'
import { preloadDashboardCharts } from '../components/admin-dashboard-chart-module'

const MonthlyChart=lazy(()=>preloadDashboardCharts().then(m=>({default:m.RevenueOverview})))
const PlanRing=lazy(()=>preloadDashboardCharts().then(m=>({default:m.PlanRing})))
const CollectionChart=lazy(()=>preloadDashboardCharts().then(m=>({default:m.CollectionChart})))
const RegistrationChart=lazy(()=>preloadDashboardCharts().then(m=>({default:m.RegistrationChart})))
const integer=(value:number)=>new Intl.NumberFormat('vi-VN').format(value)
const percent=(value:number)=>`${new Intl.NumberFormat('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1}).format(value)}%`
function Missing() { return <span className="admin-metric-unavailable">Dữ liệu chưa khả dụng</span> }
function Skeleton({ chart=false }: { chart?:boolean }) { return <span role="status" className={chart?'admin-chart-skeleton':'admin-metric-skeleton'} aria-label="Đang tải dữ liệu"/> }

export function AdminDashboardPage() {
  const filters=useAdminFilters('dashboard'), resource=useAdminResource(filters.valid?`/admin/dashboard?${filters.queryString}`:null,mapDashboardRedesign)
  const [previousSnapshot,setPreviousSnapshot]=useState<ReturnType<typeof mapDashboardRedesign>|null>(null)
  useEffect(()=>{if(resource.data)setPreviousSnapshot(resource.data)},[resource.data])
  const data=resource.data??previousSnapshot, periodData=resource.data, loading=!data&&resource.loading, timeline=useDashboardTimeline()
  const initialPeriod=useRef(filters.queryString),periodChanged=useRef(false)
  useEffect(()=>{if(filters.queryString!==initialPeriod.current)periodChanged.current=true},[filters.queryString])
  const [moduleReady,setModuleReady]=useState(false),[moduleError,setModuleError]=useState(false)
  useEffect(()=>{let alive=true;void preloadDashboardCharts().then(()=>{if(alive)setModuleReady(true)}).catch(()=>{if(alive)setModuleError(true)});return()=>{alive=false}},[])
  useEffect(()=>{const midnight=()=>invalidateAdmin('/admin/dashboard');window.addEventListener('nutrimom:admin-vietnam-day',midnight);return()=>window.removeEventListener('nutrimom:admin-vietnam-day',midnight)},[])
  const today=vietnamToday(new Date(data?.snapshot_at||Date.now())), overview=data?.overview, customers=data?.customer_snapshot
  const todayLink=`/admin/appointments?view=calendar&dateBasis=SCHEDULED&fromDate=${today}&toDate=${today}`
  const comparisons=data?.metric_comparisons
  const previousMonth=comparisons?.previous_month??new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,0)).toISOString().slice(0,7)
  const previousLabel=`T${Number(previousMonth.slice(5))}/${previousMonth.slice(0,4)}`
  const currentMonthAmount=data?.monthly_revenue?.items.at(-1)?.amount
  const revenueValues=comparisons?.revenue??(overview&&currentMonthAmount!=null?{current_value:overview.lifetime_real_collected_amount,previous_value:overview.lifetime_real_collected_amount-currentMonthAmount}:null)
  const revenueComparison=metricComparison(revenueValues),customerComparison=metricComparison(comparisons?.customers)
  const bookingComparison=metricComparison(comparisons?.appointments)
  const planShare=currentPlanShare(customers)
  const metrics=[
    {id:'lifetime',title:'Total revenue',value:overview?.lifetime_real_collected_amount,path:'/admin/revenue?source=ALL&range=ALL_TIME&status=PAID&dateBasis=PAID',formatter:money,
      subtitle:`Lũy kế đến T${Number(today.slice(5,7))}/${today.slice(0,4)}`,comparison:revenueComparison,
      difference:revenueComparison.difference==null?null:signedMetric(revenueComparison.difference,money),caption:revenueComparison.known?`so với cuối ${previousLabel}`:'Chưa có dữ liệu so sánh',detail:'Doanh thu gói dịch vụ lũy kế'},
    {id:'customers',title:'Khách hàng',value:customers?.total_customers,path:'/admin/users',formatter:integer,
      subtitle:'Tổng tài khoản đã đăng ký',comparison:customerComparison,
      difference:customerComparison.difference==null?null:signedMetric(customerComparison.difference,integer),caption:customerComparison.known?`đăng ký mới so với ${previousLabel}`:'Chưa có dữ liệu tháng trước',detail:comparisons?`Tháng này ${comparisons.customers.current_value} đăng ký mới, tháng trước ${comparisons.customers.previous_value}`:'Tổng khách hàng đã đăng ký'},
    {id:'today',title:'Lịch hôm nay',value:overview?.today_booked_appointments,path:todayLink,formatter:integer,
      subtitle:overview?`${integer(overview.today_booking_users)} khách đặt chuyên gia`:'Lịch tư vấn trong ngày',comparison:bookingComparison,
      difference:bookingComparison.difference==null?null:signedMetric(bookingComparison.difference,n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n)),caption:bookingComparison.known?'lịch so với TB 30 ngày':'Chưa có dữ liệu so sánh',detail:comparisons?`Hôm nay ${comparisons.appointments.current_value} lịch; trung bình ${comparisons.appointments.previous_value} lịch/ngày trong 30 ngày trước`:'Lịch đặt hôm nay'},
    {id:'adoption',title:'Tỷ lệ gói 399K',value:planShare.value,path:'/admin/revenue?tab=subscriptions&planTier=PLAN_399K&effectiveStatus=ACTIVE',formatter:percent,
      subtitle:customers?`${customers.plan_399k_users}/${customers.total_customers} khách đang dùng`:'Gói hiện tại của khách hàng',comparison:planShare.indicator,
      difference:null,caption:customers?.total_customers?'Trên tổng khách hàng hiện tại':customers?'Chưa có khách hàng':'Dữ liệu chưa khả dụng',detail:'Khách dùng gói 399K còn hiệu lực / tổng khách hàng × 100'},
  ]
  const slotProps={allowed:timeline.charts,login:timeline.login,reduced:timeline.reduced}
  const filterFailure=resource.errorDetail instanceof ApiClientError && [400,422].includes(resource.errorDetail.status)?resource.errorDetail:null
  const filterErrors={...filters.errors,...(filterFailure?Object.keys(filterFailure.fields).length?filterFailure.fields:{filters:filterFailure.message}:{})}
  const dailySlotProps={...slotProps,login:timeline.login&&!periodChanged.current}
  const entranceKey=timeline.runId??'restored'
  return <div className="admin-page admin-workspace-page admin-dashboard-redesign">
    <h1 className="sr-only">Dashboard quản trị NutriMom</h1>
    {resource.error&&<div className="admin-dashboard-error" role="alert"><strong>Chưa thể tải Dashboard</strong><p>{resource.error}</p><AdminDashboardActions busy={resource.loading} valid={filters.valid} retry={resource.retry}/></div>}
    <div key={`kpi-${entranceKey}`} className={`admin-workspace-kpis admin-kpi-strip ${timeline.login&&!timeline.reduced?'admin-dashboard-kpi-enter':''}`} data-dashboard-phase="kpi" style={{'--dashboard-frame-delay':`${timeline.frameDelay}s`,'--dashboard-kpi-frame-duration':`${dashboardKpiFrameMs}ms`} as CSSProperties}>
      {metrics.map(({id,title,value,path,formatter,subtitle,comparison,difference,caption,detail})=><AdminStatsCard key={id} id={id} title={title} path={path} subtitle={subtitle} detail={detail}
        comparison={timeline.numbers&&!loading?comparison:null} difference={timeline.numbers&&!loading?difference:null} caption={!timeline.numbers||loading?'Đang tải thống kê…':caption} longValue={value!=null&&formatter(value).length>14}
        value={loading||!timeline.numbers?<Skeleton/>:id==='adoption'&&customers?.total_customers===0?<span className="admin-no-customers">Chưa có khách hàng</span>:value==null?<Missing/>:<AdminDashboardNumber id={id} value={value} formatter={formatter} decimals={id==='adoption'?1:0} start={timeline.numbers} login={timeline.login}/>}/>)}

    </div>
    <div key={`sections-${entranceKey}`} className={`admin-dashboard-sections ${timeline.login&&!timeline.reduced?'admin-dashboard-sections-enter':''}`} data-dashboard-phase="sections" data-content-ready={timeline.charts&&(!loading||!!resource.error)} inert={!timeline.charts||loading} style={{'--dashboard-section-delay':`${timeline.sectionDelay}s`} as CSSProperties}>
      <div className="admin-primary-charts">
        <Card className="admin-card admin-overview-card"><CardHeader><CardTitle>Revenue Overview</CardTitle><CardDescription>Doanh thu gói dịch vụ theo tháng · năm {data?.monthly_revenue?.year??today.slice(0,4)}</CardDescription></CardHeader><CardContent>
          {data?.monthly_revenue&&!moduleError?<AdminChartSlot id="monthly" duration={900} begin={180} height={236} ready={moduleReady} {...slotProps}>{props=><Suspense fallback={<Skeleton chart/>}><MonthlyChart data={data.monthly_revenue!} {...props}/></Suspense>}</AdminChartSlot>:<div className="admin-monthly-placeholder">{resource.loading?<Skeleton chart/>:<Missing/>}</div>}
        </CardContent></Card>
        <Card className="admin-card admin-overview-card admin-plan-card"><CardHeader><CardTitle>Cơ cấu gói</CardTitle><CardDescription>Gói hiện tại của khách hàng</CardDescription></CardHeader><CardContent>
          {customers&&!moduleError?<><AdminChartSlot id="plans" duration={900} begin={180} height={156} ready={moduleReady} {...slotProps}>{props=><Suspense fallback={<Skeleton chart/>}><PlanRing data={customers} {...props}/></Suspense>}</AdminChartSlot><ul className="admin-plan-legend">{[{name:'399K',value:customers.plan_399k_users,key:'399',path:'/admin/revenue?tab=subscriptions&planTier=PLAN_399K&effectiveStatus=ACTIVE'},{name:'99K',value:customers.plan_99k_users,key:'99',path:'/admin/revenue?tab=subscriptions&planTier=PLAN_99K&effectiveStatus=ACTIVE'},{name:'FREE',value:customers.free_users,key:'free',path:'/admin/users'}].map(item=><li key={item.key}><Link to={item.path}><span className={`admin-ring-dot plan-${item.key}`}/><span>{item.name}</span><strong>{integer(item.value)}</strong><small>{percent(customers.total_customers?item.value/customers.total_customers*100:0)}</small></Link></li>)}</ul></>:<div className="admin-ring-placeholder">{resource.loading?<Skeleton chart/>:<Missing/>}</div>}
        </CardContent></Card>
      </div>
      <div className="admin-operations-grid">
        <section className="admin-card admin-live-section"><header><div><h2>Việc cần xử lý</h2><p>Ưu tiên yêu cầu quá giờ và chờ lâu</p></div><Link to="/admin/appointments?attentionOnly=true">Xem lịch cần xử lý</Link></header>
          {data?<><div className="admin-attention-totals"><Link to="/admin/appointments?status=PENDING_CONSULTATION&attentionOnly=true">{data.attention.totals.past_end_uncompleted} lịch quá giờ</Link><Link to="/admin/appointments?status=PENDING_EXPERT&dateBasis=CREATED">{data.attention.totals.waiting_expert} chờ chuyên gia</Link><Link to="/admin/support?status=PENDING">{data.attention.totals.support_pending} hỗ trợ</Link></div>{data.attention.items.length?<ul className="admin-live-list">{data.attention.items.map(item=><li key={item.id}><Link to={attentionPath(item)}><span className={item.overdue?'admin-attention-dot overdue':'admin-attention-dot'}/><div><strong>{item.title}</strong><small>{item.display_name||'Chưa có tên'} · {item.age_hours.toFixed(1)} giờ{item.overdue?' · Cần ưu tiên':''}</small></div><span>→</span></Link></li>)}</ul>:<p className="admin-inline-empty">Chưa có việc cần xử lý.</p>}</>:loading?<Skeleton chart/>:<Missing/>}
        </section>
        <section className="admin-card admin-live-section"><header><div><h2>Lịch hôm nay</h2><p>{data?`${data.today_schedule.total_items} lịch · giờ Việt Nam`:'Giờ Việt Nam'}</p></div><Link to={todayLink}>Xem tất cả</Link></header>
          {data?data.today_schedule.items.length?<ul className="admin-live-list">{data.today_schedule.items.map(item=><li key={item.id}><Link to={`/admin/appointments?requestId=${item.id}`}><span className="admin-schedule-time">{item.slot?.start_time.slice(0,5)||'—'}</span><div><strong>{item.user_display_name||'Chưa có tên'}</strong><small>{item.expert_name||'Chưa có chuyên gia'} · {item.status==='COMPLETED'?'Hoàn tất':item.status==='CANCELLED'?'Đã hủy':'Chờ tư vấn'}</small></div></Link></li>)}</ul>:<p className="admin-inline-empty">Hôm nay chưa có lịch tư vấn.</p>:loading?<Skeleton chart/>:<Missing/>}
        </section>
      </div>
      <AdminExpertPerformance {...slotProps}/>
      <section className="admin-card admin-live-section admin-period-card"><header><div><h2>Kỳ thống kê</h2><p>Bộ lọc chỉ áp dụng cho tiền thu/ngày và người dùng mới/ngày</p></div><AdminDashboardActions busy={resource.loading} valid={filters.valid} retry={resource.retry}/></header>
        <PeriodFilter from={filters.query.get('fromDate')||''} to={filters.query.get('toDate')||''} presets onChange={(fromDate,toDate)=>filters.commit({fromDate,toDate})}/>
        <QueryErrors errors={filterErrors} onReset={()=>{filters.commit({fromDate:null,toDate:null});resource.retry()}}/>
        <div className="admin-period-charts"><div><h3>Tiền thu / ngày</h3><p>Total revenue · {periodData?comparison(periodData.kpis.real_collected_amount,periodData.kpis.previous_real_collected_amount):'Theo kỳ đã chọn'}</p>
          {periodData&&!moduleError?<AdminChartSlot id="collections" height={260} ready={moduleReady} {...dailySlotProps}>{props=><Suspense fallback={<Skeleton chart/>}><CollectionChart items={periodData!.series.collections} previous {...props}/></Suspense>}</AdminChartSlot>:resource.loading?<Skeleton chart/>:<Missing/>}</div>
          <div><h3>Người dùng mới / ngày</h3><p>Tài khoản người dùng, loại nhân sự quản trị và chuyên gia</p>{periodData&&!moduleError?<AdminChartSlot id="registrations" height={260} ready={moduleReady} {...dailySlotProps}>{props=><Suspense fallback={<Skeleton chart/>}><RegistrationChart items={periodData!.series.registrations} {...props}/></Suspense>}</AdminChartSlot>:resource.loading?<Skeleton chart/>:<Missing/>}</div>
        </div>
      </section>
      <div className="admin-operations-grid"><section className="admin-card admin-live-section"><header><div><h2>Hoạt động gần đây</h2><p>Tối đa 8 hoạt động gần đây</p></div></header>{data?data.recent_activity.length?<ul className="admin-live-list">{data.recent_activity.map(item=><li key={item.id}><Link to={activityPath(item)}><div><strong>{item.title}</strong><small>{dateTime(item.occurred_at)}</small></div><span>→</span></Link></li>)}</ul>:<p className="admin-inline-empty">Chưa có hoạt động.</p>:loading?<Skeleton chart/>:<Missing/>}</section>
        <section className="admin-card admin-live-section"><header><div><h2>Gói đang hoạt động</h2><p>{customers?`Tại ${dateTime(customers.as_of)} · cùng snapshot cơ cấu gói`:'Snapshot khách hàng'}</p></div></header>{customers?<><Link className="admin-plan-link" to="/admin/revenue?tab=subscriptions&planTier=PLAN_99K&effectiveStatus=ACTIVE"><span>Gói 99K</span><strong>{integer(customers.plan_99k_users)}</strong></Link><Link className="admin-plan-link" to="/admin/revenue?tab=subscriptions&planTier=PLAN_399K&effectiveStatus=ACTIVE"><span>Gói 399K</span><strong>{integer(customers.plan_399k_users)}</strong></Link></>:loading?<Skeleton chart/>:<Missing/>}</section>
      </div>
    </div>
  </div>
}
