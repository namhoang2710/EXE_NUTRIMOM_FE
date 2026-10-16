import { AdminContractError, count, mapDashboard, object, type DashboardDto } from './admin-workspace-contract.ts'
import { realDate, vietnamToday } from './admin-workspace-query.ts'
import { optionalRealtimeRevision } from './admin-realtime-contract.ts'

export interface DashboardOverview { lifetime_real_collected_amount: number; today_booked_appointments: number; today_booking_users: number }
export interface CustomerSnapshot { as_of: string; total_customers: number; free_users: number; plan_99k_users: number; plan_399k_users: number }
export interface MonthlyRevenue { year: number; source: 'REAL' | 'ALL'; items: { month: string; amount: number; paid_orders: number }[] }
export interface ComparisonValues { current_value:number|null; previous_value:number|null }
export interface MetricComparisons {
  previous_month:string; booking_baseline_days:number;
  revenue:ComparisonValues; customers:ComparisonValues; appointments:ComparisonValues; plan_399k:ComparisonValues;
}
export interface PlanAdoption {
  current_ratio_percent: number | null; previous_ratio_percent: number | null; change_percentage_points: number | null;
  previous_as_of: string | null; history_started_at: string | null; comparison_status: 'AVAILABLE' | 'INSUFFICIENT_HISTORY' | 'NO_CUSTOMERS';
  daily_series: { date: string; as_of: string | null; ratio_percent: number | null }[];
}
export interface RedesignedDashboard extends DashboardDto {
  realtime_revision?: string;
  overview: DashboardOverview | null; customer_snapshot: CustomerSnapshot | null; monthly_revenue: MonthlyRevenue | null; plan_399k_adoption: PlanAdoption | null;
  metric_comparisons:MetricComparisons|null;
  unavailable: Partial<Record<'overview' | 'customer_snapshot' | 'monthly_revenue' | 'plan_399k_adoption' | 'metric_comparisons', string>>;
}
export function dayOffset(day: string, offset: number) { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10) }
function stamp(value: unknown): asserts value is string { if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !realDate(value.slice(0,10)) || !Number.isFinite(Date.parse(value))) throw new AdminContractError('overview.timestamp') }
function ratio(value: unknown): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new AdminContractError('adoption.ratio') }
function close(a: number, b: number) { return Math.abs(a - b) <= .051 }

/** New fields fail independently: never turn missing or malformed business data into zero. */
export function mapDashboardRedesign(payload: unknown): RedesignedDashboard {
  const legacy = mapDashboard(payload), p = object(payload, 'dashboard'), unavailable: RedesignedDashboard['unavailable'] = {}
  function read<T>(key: keyof RedesignedDashboard['unavailable'], validate: (r: Record<string, unknown>) => T): T | null {
    try { return validate(object(p[key], key)) } catch (error) { unavailable[key] = error instanceof Error ? error.message : 'Dữ liệu chưa khả dụng'; return null }
  }
  const overview = read<DashboardOverview>('overview', r => {
    for (const k of ['lifetime_real_collected_amount', 'today_booked_appointments', 'today_booking_users']) count(r[k], k)
    if ((r.today_booking_users as number) > (r.today_booked_appointments as number)) throw new AdminContractError('overview.bookings')
    return r as unknown as DashboardOverview
  })
  const customer_snapshot = read<CustomerSnapshot>('customer_snapshot', r => {
    stamp(r.as_of); if (Date.parse(r.as_of) !== Date.parse(legacy.snapshot_at)) throw new AdminContractError('customer_snapshot.as_of')
    for (const k of ['total_customers', 'free_users', 'plan_99k_users', 'plan_399k_users']) count(r[k], k)
    if ((r.free_users as number) + (r.plan_99k_users as number) + (r.plan_399k_users as number) !== r.total_customers) throw new AdminContractError('customer_snapshot.total')
    return r as unknown as CustomerSnapshot
  })
  const today = vietnamToday(new Date(legacy.snapshot_at)), year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7))
  const monthly_revenue = read<MonthlyRevenue>('monthly_revenue', r => {
    if (r.year !== year || !['REAL','ALL'].includes(String(r.source)) || !Array.isArray(r.items) || r.items.length !== month) throw new AdminContractError('monthly_revenue.period')
    r.items.forEach((item, i) => { const row = object(item, 'monthly_revenue.item'); if (row.month !== `${year}-${String(i + 1).padStart(2, '0')}`) throw new AdminContractError('monthly_revenue.month'); count(row.amount, 'monthly_revenue.amount'); count(row.paid_orders, 'monthly_revenue.paid_orders') })
    if (overview && r.items.reduce((sum, item) => sum + item.amount, 0) > overview.lifetime_real_collected_amount) throw new AdminContractError('monthly_revenue.lifetime')
    return r as unknown as MonthlyRevenue
  })
  const plan_399k_adoption = read<PlanAdoption>('plan_399k_adoption', r => {
    if (!customer_snapshot) throw new AdminContractError('adoption.customer_snapshot')
    const total = customer_snapshot.total_customers
    if (total === 0) { if (r.current_ratio_percent !== null || r.change_percentage_points !== null || r.comparison_status !== 'NO_CUSTOMERS') throw new AdminContractError('adoption.no_customers') }
    else { ratio(r.current_ratio_percent); if (r.comparison_status==='NO_CUSTOMERS' || !close(r.current_ratio_percent, customer_snapshot.plan_399k_users / total * 100)) throw new AdminContractError('adoption.current_ratio') }
    if (r.previous_ratio_percent !== null) ratio(r.previous_ratio_percent)
    for (const field of ['previous_as_of', 'history_started_at']) if (r[field] !== null) { stamp(r[field]); if (Date.parse(r[field] as string) > Date.parse(legacy.snapshot_at)) throw new AdminContractError(field) }
    if (!['AVAILABLE', 'INSUFFICIENT_HISTORY', 'NO_CUSTOMERS'].includes(r.comparison_status as string)) throw new AdminContractError('adoption.comparison_status')
    if (r.comparison_status === 'AVAILABLE') {
      ratio(r.previous_ratio_percent); ratio(r.current_ratio_percent); stamp(r.previous_as_of)
      const previousMonthEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10)
      if (vietnamToday(new Date(r.previous_as_of)) !== previousMonthEnd || typeof r.change_percentage_points !== 'number' || !close(r.change_percentage_points, r.current_ratio_percent - r.previous_ratio_percent)) throw new AdminContractError('adoption.comparison')
    } else if (r.comparison_status === 'INSUFFICIENT_HISTORY' && (r.previous_ratio_percent !== null || r.change_percentage_points !== null || r.previous_as_of !== null)) throw new AdminContractError('adoption.missing_history')
    if (!Array.isArray(r.daily_series) || r.daily_series.length !== 30) throw new AdminContractError('adoption.daily_series')
    r.daily_series.forEach((item, i) => {
      const row = object(item, 'adoption.day'); if (row.date !== dayOffset(today, i - 29)) throw new AdminContractError('adoption.date')
      if (row.ratio_percent !== null) ratio(row.ratio_percent)
      if (row.as_of === null) { if (row.ratio_percent !== null) throw new AdminContractError('adoption.missing_day') }
      else { stamp(row.as_of); if (vietnamToday(new Date(row.as_of)) !== row.date || Date.parse(row.as_of) > Date.parse(legacy.snapshot_at)) throw new AdminContractError('adoption.day_snapshot') }
      if (i === 29 && (row.ratio_percent !== r.current_ratio_percent || Date.parse(String(row.as_of)) !== Date.parse(legacy.snapshot_at))) throw new AdminContractError('adoption.live_point')
    })
    if (r.comparison_status === 'AVAILABLE') {
      const previousDay = vietnamToday(new Date(r.previous_as_of as string))
      const point = r.daily_series.find(item => item.date === previousDay)
      if (point && (point.ratio_percent === null || !close(point.ratio_percent, r.previous_ratio_percent as number) || Date.parse(String(point.as_of)) !== Date.parse(r.previous_as_of as string))) throw new AdminContractError('adoption.previous_snapshot')
    }
    return r as unknown as PlanAdoption
  })
  const metric_comparisons=read<MetricComparisons>('metric_comparisons',r=>{
    const previousMonth=new Date(Date.UTC(year,month-1,0)).toISOString().slice(0,7)
    if(r.previous_month!==previousMonth || r.booking_baseline_days!==30)throw new AdminContractError('metric_comparisons.period')
    for(const key of ['revenue','customers','appointments','plan_399k']) {
      const row=object(r[key],`metric_comparisons.${key}`)
      for(const field of ['current_value','previous_value']) {
        const value=row[field]
        if(key==='plan_399k' && value===null)continue
        if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)throw new AdminContractError(`metric_comparisons.${key}.${field}`)
        if(key==='plan_399k')ratio(value)
        else if(key!=='appointments'||field==='current_value')count(value,field)
      }
    }
    const result=r as unknown as MetricComparisons
    if(overview&&(result.revenue.current_value!==overview.lifetime_real_collected_amount||result.appointments.current_value!==overview.today_booked_appointments))throw new AdminContractError('metric_comparisons.overview')
    if(customer_snapshot&&result.customers.current_value! > customer_snapshot.total_customers)throw new AdminContractError('metric_comparisons.customers')
    if(plan_399k_adoption&&(result.plan_399k.current_value!==plan_399k_adoption.current_ratio_percent||result.plan_399k.previous_value!==plan_399k_adoption.previous_ratio_percent))throw new AdminContractError('metric_comparisons.adoption')
    return result
  })
  const revision = optionalRealtimeRevision(payload)
  return { ...legacy, ...(revision === undefined ? {} : { realtime_revision: revision }), overview, customer_snapshot, monthly_revenue, plan_399k_adoption,metric_comparisons, unavailable }
}
export function adoptionTrend(adoption: PlanAdoption | null) { return adoption?.comparison_status === 'AVAILABLE' ? adoption.change_percentage_points! > 0 ? 'up' : adoption.change_percentage_points! < 0 ? 'down' : 'flat' : 'unknown' }
