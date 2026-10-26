import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'
import { fixtureResponse } from './admin-workspace-fixtures.mjs'
import { mapDashboardRedesign, adoptionTrend } from '../src/features/admin/model/admin-dashboard-overview.ts'
import type { MonthlyRevenue, PlanAdoption } from '../src/features/admin/model/admin-dashboard-overview.ts'
import { adminGreeting, formatAdminGreeting } from '../src/features/admin/model/admin-clock.ts'
import { parseWorkspaceQuery } from '../src/features/admin/model/admin-workspace-query.ts'
import { createAdminReadCoordinator } from '../src/features/admin/model/admin-read-coordinator.ts'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { bookingSparkline } from '../src/features/admin/model/admin-dashboard-stat-cards.ts'

const payload=(mode='up')=>enrichDashboard(fixtureResponse('/admin/dashboard',new URLSearchParams()),mode)
test('Vietnam greeting boundaries are independent of the machine timezone',()=>{
  for(const [time,expected] of [['04:59','Chào buổi tối'],['05:00','Chào buổi sáng'],['11:59','Chào buổi sáng'],['12:00','Chào buổi chiều'],['17:59','Chào buổi chiều'],['18:00','Chào buổi tối']]) assert.equal(adminGreeting(new Date(`2026-10-13T${time}:00+07:00`)),expected)
  assert.equal(formatAdminGreeting(new Date('2026-12-31T17:00:00Z')),'Chào buổi tối | Hôm nay 01/01/27 | 00:00')
})
test('overview uses complete real monthly data and a single customer snapshot',()=>{
  const raw=payload(),p=mapDashboardRedesign(raw);assert.equal(p.overview!.lifetime_real_collected_amount,123456789);assert.equal(p.customer_snapshot!.total_customers,100)
  assert.equal(p.customer_snapshot!.free_users+p.customer_snapshot!.plan_99k_users+p.customer_snapshot!.plan_399k_users,100)
  const missingDay=raw.plan_399k_adoption.daily_series.find((row:PlanAdoption['daily_series'][number])=>row.as_of===null)
  assert.ok(missingDay)
  assert.equal(p.plan_399k_adoption!.daily_series.find(row=>row.date===missingDay.date)?.ratio_percent,null);assert.equal(Object.keys(p.unavailable).length,0)
})

test('adoption fixture preserves missing days and month-end comparisons across calendar boundaries',()=>{
  const legacy=fixtureResponse('/admin/dashboard',new URLSearchParams())
  for(const date of ['2026-10-24','2026-10-25','2026-10-26','2027-01-25','2028-03-25']) {
    const data=enrichDashboard({...legacy,snapshot_at:`${date}T10:00:00+07:00`})
    const adoption=data.plan_399k_adoption
    const gaps=adoption.daily_series.filter((row:PlanAdoption['daily_series'][number])=>row.as_of===null)
    assert.equal(gaps.length,1,`${date}: preserve one missing-day sample`)
    assert.equal(gaps[0].ratio_percent,null)
    const comparison=adoption.daily_series.find((row:PlanAdoption['daily_series'][number])=>row.as_of===adoption.previous_as_of)
    assert.ok(comparison,`${date}: preserve month-end comparison`)
    assert.equal(comparison.ratio_percent,adoption.previous_ratio_percent)
    assert.notEqual(gaps[0].date,comparison.date)
  }
})
test('up/down/flat/insufficient history and zero customers preserve legitimate semantics',()=>{
  for(const [mode,expected] of [['up','up'],['down','down'],['flat','flat'],['insufficient','unknown'],['zero','unknown']]){const p=mapDashboardRedesign(payload(mode));assert.ok(p.plan_399k_adoption);assert.equal(adoptionTrend(p.plan_399k_adoption),expected)}
  assert.equal(mapDashboardRedesign(payload('zero')).plan_399k_adoption!.current_ratio_percent,null)
  assert.equal(mapDashboardRedesign(payload('insufficient')).plan_399k_adoption!.daily_series.filter(x=>x.ratio_percent!==null).length,1)
})
test('missing new fields cannot become fake zero and preserve valid legacy operations',()=>{
  const p=mapDashboardRedesign(fixtureResponse('/admin/dashboard',new URLSearchParams()));assert.equal(p.overview,null);assert.equal(p.customer_snapshot,null);assert.equal(p.monthly_revenue,null);assert.equal(p.plan_399k_adoption,null);assert.equal(p.attention.items.length,2)
})
test('booking sparkline uses all hourly aggregates and rejects missing or inconsistent preview data',()=>{
  const data=mapDashboardRedesign(payload());delete data.today_schedule.hourly_bookings;assert.equal(bookingSparkline(data),null)
  data.today_schedule.hourly_bookings=Array.from({length:24},(_,hour)=>({hour:`${String(hour).padStart(2,'0')}:00`,count:hour===9?3:hour===14?1:0}))
  const points=bookingSparkline(data);assert.equal(points!.length,24);assert.equal(points![9].value,3)
  data.today_schedule.items=[];assert.equal(bookingSparkline(data)![14].value,1)
  data.today_schedule.hourly_bookings[0].count=1;assert.equal(bookingSparkline(data),null)
  data.today_schedule.hourly_bookings[0].count=0;data.today_schedule.hourly_bookings[0].hour='bad';assert.equal(bookingSparkline(data),null)
})
test('real zero revenue is preserved and inconsistent historical comparisons are unavailable',()=>{
  const zero=mapDashboardRedesign(payload('no-revenue'));assert.equal(zero.overview!.lifetime_real_collected_amount,0);assert.ok(zero.monthly_revenue!.items.every((r: MonthlyRevenue['items'][number])=>r.amount===0&&r.paid_orders===0))
  const bad=payload();const previous=bad.plan_399k_adoption.daily_series.find((r: PlanAdoption['daily_series'][number])=>r.as_of===bad.plan_399k_adoption.previous_as_of);assert.ok(previous);previous.ratio_percent=80;assert.equal(mapDashboardRedesign(bad).plan_399k_adoption,null)
})
test('invalid extension fields fail locally rather than dropping financial data',()=>{
  const a=payload();a.overview.lifetime_real_collected_amount='bad';const mapped=mapDashboardRedesign(a);assert.equal(mapped.overview,null);assert.ok(mapped.customer_snapshot)
  const b=payload();b.customer_snapshot.free_users=900;assert.equal(mapDashboardRedesign(b).customer_snapshot,null)
  const c=payload();c.monthly_revenue.items.pop();assert.equal(mapDashboardRedesign(c).monthly_revenue,null)
  const d=payload();d.plan_399k_adoption.current_ratio_percent=110;assert.equal(mapDashboardRedesign(d).plan_399k_adoption,null)
  const e=payload();e.overview.lifetime_real_collected_amount=Number.MAX_SAFE_INTEGER;assert.equal(mapDashboardRedesign(e).overview!.lifetime_real_collected_amount,Number.MAX_SAFE_INTEGER)
})
test('ALL_TIME never injects a month filter or accepts conflicting date filters',()=>{
  const p=parseWorkspaceQuery('range=ALL_TIME&source=REAL&status=PAID&dateBasis=PAID','payments','2026-10-13');assert.equal(p.valid,true);assert.equal(p.query.has('fromDate'),false);assert.equal(p.query.has('toDate'),false)
  assert.equal(parseWorkspaceQuery('range=ALL_TIME&fromDate=2026-10-01&toDate=2026-10-13','payments','2026-10-13').valid,false)
})
test('429 shared Admin cooldown cannot be bypassed by changing query, but does not block notifications',async()=>{
  let now=0,calls=0;const c=createAdminReadCoordinator(()=>now);c.setScope('A');const rate=new ApiClientError(429,{code:'TOO_MANY_REQUESTS',message:'Wait'},10000)
  await assert.rejects(c.read('GET:/admin/dashboard?fromDate=one',async()=>{calls++;throw rate}))
  await assert.rejects(c.read('GET:/admin/dashboard?fromDate=two',async()=>++calls));await assert.rejects(c.read('GET:/admin/users',async()=>++calls));assert.equal(calls,1)
  assert.equal(await c.read('GET:/notifications/unread-count',async()=>3),3);now=10001;assert.equal(await c.read('GET:/admin/dashboard?fromDate=two',async()=>++calls),2)
  c.setScope('B');assert.equal(c.cooldownUntil(),0)
})


test('unified monthly revenue and old revenue bookmarks include all activation entries',()=>{
  const data=payload();data.monthly_revenue.source='ALL';
  assert.equal(mapDashboardRedesign(data).monthly_revenue?.source,'ALL');
  const query=parseWorkspaceQuery('source=REAL&range=ALL_TIME','payments','2026-10-13');
  assert.equal(query.query.get('source'),'ALL');
})
