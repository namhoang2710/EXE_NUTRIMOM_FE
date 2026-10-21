import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'
import { initialPerformanceFilters, mapExpertPerformance, performanceComparisonReason, performanceDescription, performancePercent, performanceQuery } from '../src/features/admin/model/admin-expert-performance.ts'
import { createAdminRealtimeSync, realtimeGroup } from '../src/features/admin/model/admin-realtime-sync.ts'
import { kpiDateRangeError,kpiMonthEnd,kpiPeriod,parseWorkspaceQuery } from '../src/features/admin/model/admin-workspace-query.ts'
import { optionalRealtimeRevision } from '../src/features/admin/model/admin-realtime-contract.ts'

test('KPI contract keeps real rates, null missing values and large revision strings',()=>{
  const data=mapExpertPerformance(expertPerformanceFixture())
  assert.equal(data.axes[0].current.percent,95.83);assert.equal(data.summary.average_rating,4.6)
  assert.equal(data.realtime_revision,'9007199254740993');assert.equal(data.calculation_version,3)
  assert.equal(data.axes[0].current.denominator,data.schedule_summary.standard_slots)
  assert.equal(data.axes[1].current.denominator,100);assert.equal(data.axes[3].current.denominator,96)
  for(const mode of ['partial','missing','empty','zero']){
    const p=mapExpertPerformance(expertPerformanceFixture(new URLSearchParams(),mode))
    if(mode==='partial'){assert.equal(p.axes[1].current.status,'PARTIAL_DATA');assert.equal(p.axes[1].current.denominator,80);assert.equal(p.axes[1].current.percent,75);assert.match(performanceDescription(p.axes[1]),/60\/80/)}
    if(mode==='missing'){assert.equal(p.axes[0].current.percent,95.83);assert.equal(p.axes[1].current.percent,null);assert.equal(p.checkin_summary.unknown_consultations,100)}
    if(mode==='zero'){assert.equal(p.axes[0].current.percent,0);assert.equal(performancePercent(0),'0%')}
  }
})
test('KPI rejects fabricated ratios, wrong schedule/checkin cohorts and mismatched selected scope',()=>{
  for(const mutate of [
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.axes[0].current.percent=99},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.axes[0].current.denominator=12},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.summary.rating_count=1000},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.axes.reverse()},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.checkin_summary.late_consultations=999},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.schedule_summary.off_slots=0},
    (p:ReturnType<typeof expertPerformanceFixture>)=>{p.axes[0].change_percentage_points=500},
  ]){const p=expertPerformanceFixture();mutate(p);assert.throws(()=>mapExpertPerformance(p))}
  const raw=expertPerformanceFixture();assert.throws(()=>mapExpertPerformance(raw,{fromDate:raw.period.from_date,toDate:raw.period.to_date,specialty:'',expertUserId:'11111111-1111-4111-8111-111111111111'}))
  const missing=expertPerformanceFixture(new URLSearchParams(),'missing');missing.axes[1].current.percent=0;assert.throws(()=>mapExpertPerformance(missing))
  const partial=expertPerformanceFixture(new URLSearchParams(),'partial');partial.axes[1].current.status='AVAILABLE';assert.throws(()=>mapExpertPerformance(partial))
})
test('independent KPI date presets are bounded, explicit and do not modify dashboard filters',()=>{
  const f=initialPerformanceFilters();assert.equal(performanceQuery(f,'2026-03-01').fromDate,'2026-03-01')
  assert.equal(performanceQuery({...f,preset:'30days'},'2026-03-01').fromDate,'2026-01-31')
  assert.equal(performanceQuery({...f,preset:'custom',fromDate:'2026-02-30',toDate:'2026-03-01'},'2026-03-01').path,null)
  assert.ok(performanceQuery({...f,preset:'custom',fromDate:'2026-03-01',toDate:'2026-03-31'},'2026-03-01').path)
  assert.equal(performanceQuery({...f,preset:'custom',fromDate:'2026-03-01',toDate:'2026-04-01'},'2026-03-01').path,null)
  assert.equal(performanceQuery({...f,preset:'custom',fromDate:'2024-01-01',toDate:'2026-03-01'},'2026-03-01').path,null)
  assert.equal(performanceQuery({...f,specialty:'fake'},'2026-03-01').path,null)
  assert.equal(performanceQuery({...f,expertUserId:'../x'},'2026-03-01').path,null)
  assert.equal(performanceQuery(f,'2026-03-01').path,'/admin/experts/performance?calculationVersion=3&includeExtendedMetrics=true')
})
test('expert KPI shares dashboard SSE invalidation and coalesces event bursts into one window',()=>{
  const expired:string[]=[],tasks:(()=>void)[]=[]
  const sync=createAdminRealtimeSync({expire:p=>expired.push(p),schedule:fn=>{tasks.push(fn);return 1 as unknown as ReturnType<typeof setTimeout>},cancel:()=>{}})
  assert.equal(realtimeGroup('/admin/experts/performance?fromDate=2026-10-01'),'dashboard')
  assert.equal(realtimeGroup('/admin/experts/page'),undefined)
  assert.equal(realtimeGroup('/admin/reports/EXPERT_PERFORMANCE?page=2'),'dashboard')
  sync.setState('connected');let calls=0
  sync.begin('GET:/admin/experts/performance?one','dashboard')('1')
  sync.register('GET:/admin/experts/performance?one','dashboard',()=>{calls++;return true})
  for(let i=2;i<30;i++)sync.snapshot({protocol_version:1,admin_user_id:'a',dashboard_revision:String(i),notifications_revision:'0',unread_count:0},false)
  assert.equal(tasks.length,1);tasks.shift()!();assert.equal(calls,1)
  assert.ok(expired.includes('GET:/admin/experts/performance'));sync.dispose()
})

test('calendar periods handle real month lengths and previous calendar month instead of equal-day subtraction',()=>{
  for(const [today,last,previousStart,previousEnd] of [
    ['2026-10-15','2026-10-31','2026-09-01','2026-09-30'],['2026-04-15','2026-04-30','2026-03-01','2026-03-31'],
    ['2026-02-15','2026-02-28','2026-01-01','2026-01-31'],['2028-02-15','2028-02-29','2028-01-01','2028-01-31'],
    ['2027-01-15','2027-01-31','2026-12-01','2026-12-31']]) {
    const q=performanceQuery(initialPerformanceFilters(),today),raw=expertPerformanceFixture(new URLSearchParams(),'full',new Date(`${today}T05:00:00Z`))
    assert.equal(q.toDate,last);assert.equal(kpiMonthEnd(today),last)
    const data=mapExpertPerformance(raw);assert.equal(data.period.previous_from_date,previousStart);assert.equal(data.period.previous_to_date,previousEnd)
    assert.equal(data.schedule_summary.standard_slots,8*24*Number(last.slice(8)))
    assert.equal(kpiDateRangeError(q.fromDate,q.toDate,today),'')
  }
  assert.equal(kpiPeriod('2026-10-01','2026-10-15').previous_from_date,'2026-09-16')
  assert.ok(kpiDateRangeError('2026-10-16','2026-10-31','2026-10-15'))
  assert.equal(parseWorkspaceQuery('type=EXPERT_PERFORMANCE&fromDate=2026-10-01&toDate=2026-10-31','reports','2026-10-15').valid,true)
  assert.equal(parseWorkspaceQuery('type=REVENUE&fromDate=2026-10-01&toDate=2026-10-31','reports','2026-10-15').valid,false)
})

test('v3 rejects older rules and periods while preserving empty scope and nullable tracking start',()=>{
  for(const version of [1,2,4]){const p=expertPerformanceFixture();p.calculation_version=version;assert.throws(()=>mapExpertPerformance(p))}
  const p=expertPerformanceFixture();p.rules.punctuality_evidence='VERIFIED_FIRST_ROOM_JOIN';assert.throws(()=>mapExpertPerformance(p))
  const wrongPeriod=expertPerformanceFixture();wrongPeriod.period.previous_from_date=wrongPeriod.period.previous_to_date;assert.throws(()=>mapExpertPerformance(wrongPeriod))
  const empty=expertPerformanceFixture(new URLSearchParams(),'empty');Object.assign(empty.data_coverage,{checkin_tracking_started_at:null})
  assert.equal(mapExpertPerformance(empty).schedule_summary.standard_slots,0)
})

test('partial checkin coverage never creates a comparison and does not change schedule attendance',()=>{
  const p=expertPerformanceFixture(new URLSearchParams(),'partial'),data=mapExpertPerformance(p)
  assert.equal(data.axes[0].current.status,'AVAILABLE');assert.equal(data.axes[1].change_percentage_points,null)
  p.axes[1].change_percentage_points=0;assert.throws(()=>mapExpertPerformance(p))
  assert.match(performanceDescription(data.axes[0]),/khung làm việc/)
})

test('report realtime revision comes from its shared snapshot and keeps integer precision',()=>{
  assert.equal(optionalRealtimeRevision({type:'EXPERT_PERFORMANCE',summary:{snapshot:{realtime_revision:'9007199254740993'}}}),'9007199254740993')
  assert.equal(optionalRealtimeRevision({type:'REVENUE',summary:{snapshot:{realtime_revision:'1'}}}),undefined)
  assert.throws(()=>optionalRealtimeRevision({type:'EXPERT_PERFORMANCE',summary:{snapshot:{realtime_revision:Number.MAX_SAFE_INTEGER+1}}}))
})

test('actual BE v3 PostgreSQL DTOs map without hand-authored frontend response assumptions',async()=>{
  // Generated from the current BE service + Jackson SNAKE_CASE against disposable PostgreSQL; all fixtures rolled back.
  const payload=JSON.parse(await readFile(new URL('./fixtures/admin-expert-performance-v3-be.json',import.meta.url),'utf8')) as Record<string,unknown>
  for(const key of ['team','expert','emptySpecialty','custom'])assert.equal(mapExpertPerformance(payload[key]).calculation_version,3)
  const expert=mapExpertPerformance(payload.expert)
  assert.equal(expert.schedule_summary.standard_slots,744);assert.equal(expert.schedule_summary.off_slots,24)
  assert.equal(expert.checkin_summary.on_time_consultations,2);assert.equal(expert.checkin_summary.late_consultations,2)
  assert.equal(expert.axes[1].current.percent,50)
  const {mapExpertReport}=await import('../src/features/admin/model/admin-expert-report.ts')
  assert.equal(mapExpertReport(payload.report).items.length,1)
})

test('new expert contributes only its calendar days and has no fabricated prior-month 100%',()=>{
  const p=expertPerformanceFixture(new URLSearchParams('expertUserId=11111111-1111-4111-8111-111111111111'),'full',new Date('2026-10-15T05:00:00Z'))
  p.expert!.profile_created_at='2026-10-15T00:00:00+07:00'
  Object.assign(p.data_coverage,{earliest_expert_date:'2026-10-15',current_effective_from_date:'2026-10-15',previous_effective_from_date:null,current_period_complete:false,previous_period_complete:false,comparison_status:'PARTIAL_CURRENT_PERIOD'})
  for(const axis of p.axes)axis.change_percentage_points=null
  p.schedule_summary={unit:'HALF_HOUR_SLOTS',standard_slots:408,available_slots:408,off_slots:0,day_off_days:0,closed_slots:0}
  p.axes[0].current={numerator:408,denominator:408,percent:100,status:'AVAILABLE',missing_evidence:0}
  p.axes[0].previous={numerator:0,denominator:0,percent:null,status:'NO_WORK_SCHEDULE',missing_evidence:0}
  p.axes[0].change_percentage_points=null
  assert.equal(mapExpertPerformance(p).axes[0].current.percent,100)
  p.schedule_summary.standard_slots=744;assert.throws(()=>mapExpertPerformance(p))
})

test('runtime data minimum bounds custom filters and clamps the rolling preset without hardcoding a launch day',()=>{
  const f=initialPerformanceFilters(),minimum='2026-09-22'
  assert.equal(performanceQuery({...f,preset:'custom',fromDate:'2026-09-21',toDate:'2026-09-30'},'2026-10-16',minimum).path,null)
  assert.ok(performanceQuery({...f,preset:'custom',fromDate:minimum,toDate:'2026-09-30'},'2026-10-16',minimum).path)
  assert.equal(performanceQuery({...f,preset:'30days'},'2026-10-16',minimum).fromDate,minimum)
  assert.equal(performanceQuery(f,'2026-10-16',minimum).fromDate,'2026-10-01')
  assert.match(kpiDateRangeError('2026-09-21','2026-09-30','2026-10-16',minimum),/22\/09\/2026/)
})

test('a 216-slot first month stays partial; larger volume does not manufacture a rate increase',()=>{
  const raw=expertPerformanceFixture(new URLSearchParams('expertUserId=11111111-1111-4111-8111-111111111111'),'partial-period',new Date('2026-10-16T05:00:00Z'))
  raw.schedule_summary={unit:'HALF_HOUR_SLOTS',standard_slots:744,available_slots:720,off_slots:24,day_off_days:1,closed_slots:0}
  raw.axes[0].current={numerator:720,denominator:744,percent:96.77,status:'AVAILABLE',missing_evidence:0}
  raw.axes[0].previous={numerator:213,denominator:216,percent:98.61,status:'AVAILABLE',missing_evidence:0}
  const data=mapExpertPerformance(raw)
  assert.equal(data.data_coverage.previous_effective_from_date,'2026-09-22')
  assert.equal(data.axes[0].change_percentage_points,null)
  assert.match(performanceComparisonReason(data),/kỳ trước.*22\/09\/2026.*chưa đủ kỳ/)
  raw.axes[0].change_percentage_points=-1.84;assert.throws(()=>mapExpertPerformance(raw))
})

test('ten satisfied out of twelve is lower than three out of three when both periods are covered',()=>{
  const raw=expertPerformanceFixture()
  raw.axes[2].current={numerator:10,denominator:12,percent:83.33,status:'AVAILABLE',missing_evidence:80}
  raw.axes[2].previous={numerator:3,denominator:3,percent:100,status:'AVAILABLE',missing_evidence:83}
  raw.axes[2].change_percentage_points=-16.67;raw.summary.rating_count=12
  const axis=mapExpertPerformance(raw).axes[2]
  assert.ok(axis.current.numerator>axis.previous.numerator)
  assert.equal(axis.change_percentage_points,-16.67)
})
