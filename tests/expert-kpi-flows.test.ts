import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { createExpertReadCoordinator } from '../src/features/expert-console/model/expert-read-coordinator.ts'
import { mapAcceptanceTiming, resetConsultationClock, observeConsultationServerTime, consultationServerNow, acceptanceDeadlineLabel, acceptanceOverdue, defaultPreferredDate } from '../src/features/consultation/model/consultation-timing.ts'
import { adaptExpertDeepLink } from '../src/features/notifications/model/notification-helpers.ts'
import { mapExpertPerformance, performanceQuery, initialPerformanceFilters } from '../src/features/admin/model/admin-expert-performance.ts'
import { mapExpertReport } from '../src/features/admin/model/admin-expert-report.ts'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'
import { mapAppointment, mapDashboard } from '../src/features/admin/model/admin-workspace-contract.ts'
import { appointment, fixtureResponse } from './admin-workspace-fixtures.mjs'

test('deadlines use server VN date, strict greater-than cutoff and no fabricated legacy deadline',()=>{
  resetConsultationClock();assert.equal(consultationServerNow(),null)
  const t=mapAcceptanceTiming({preferred_date:'2026-10-18',acceptance_deadline_at:'2026-10-15T08:30:00+07:00',acceptance_status:'WAITING'})
  assert.match(acceptanceDeadlineLabel(t,Date.parse('2026-10-15T02:00:00+07:00')),/hôm nay/)
  assert.match(acceptanceDeadlineLabel(t,Date.parse('2026-10-14T19:50:00+07:00')),/ngày mai/)
  assert.equal(acceptanceOverdue(t,Date.parse(t.acceptanceDeadlineAt!)),false)
  assert.equal(acceptanceOverdue(t,Date.parse(t.acceptanceDeadlineAt!)+1),true)
  assert.equal(mapAcceptanceTiming({}).acceptanceDeadlineAt,null)
  assert.throws(()=>mapAcceptanceTiming({preferred_date:'2026-02-30'}))
  observeConsultationServerTime('2026-10-15T02:00:00+07:00',1000)
  observeConsultationServerTime('2026-10-14T02:00:00+07:00',2000)
  assert.equal(consultationServerNow(1100),Date.parse('2026-10-15T02:00:00+07:00')+100)
  assert.equal(defaultPreferredDate(new Date('2026-10-15T18:59:00+07:00')),'2026-10-15')
  assert.equal(defaultPreferredDate(new Date('2026-10-15T19:00:00+07:00')),'2026-10-16')
  resetConsultationClock()
})

test('dedup, TTL, mutation invalidation and session generations reject stale responses',async()=>{
  let now=1000,calls=0,release!:(n:number)=>void
  const c=createExpertReadCoordinator(30000,()=>now);c.setScope('expert-a')
  const load=()=>{calls++;return new Promise<number>(resolve=>{release=resolve})}
  const a=c.run('schedule',load,undefined,20000),b=c.run('schedule',load,undefined,20000)
  await Promise.resolve();assert.equal(calls,1);release(7);assert.deepEqual(await Promise.all([a,b]),[7,7])
  assert.equal(await c.run('schedule',load,undefined,20000),7);assert.equal(calls,1)
  now+=21000;const stale=c.run('schedule',load,undefined,20000);await Promise.resolve();c.invalidate('schedule');release(8)
  await assert.rejects(stale,{name:'AbortError'})
  const old=c.run('profile',load);await Promise.resolve();c.setScope('expert-b');release(9);await assert.rejects(old,{name:'AbortError'})
})

test('one 429 blocks subsequent family reads and writes despite another in-flight success',async()=>{
  let now=0,resolve!:(n:number)=>void
  const c=createExpertReadCoordinator(30000,()=>now)
  const success=c.run('a',()=>new Promise<number>(r=>{resolve=r}))
  const limited=new ApiClientError(429,{code:'RATE_LIMITED',message:'Wait'},60000)
  await assert.rejects(c.run('b',()=>Promise.reject(limited)));resolve(1);await success
  assert.throws(()=>c.assertAvailable(),e=>e===limited)
  let calls=0;await assert.rejects(c.run('c',async()=>++calls));assert.equal(calls,0)
  now=60001;assert.equal(await c.run('c',async()=>++calls),1)
})

test('expert notification links stay inside console and reject malformed identifiers',()=>{
  assert.equal(adaptExpertDeepLink('nutrimom://expert/consultations').path,'/expert?section=requests&request_type=pool')
  assert.match(adaptExpertDeepLink('nutrimom://expert/consultations/11111111-1111-4111-8111-111111111111').path!,/^\/expert\?/)
  assert.equal(adaptExpertDeepLink('nutrimom://expert/consultations/'+'-'.repeat(36)).path,undefined)
  assert.equal(adaptExpertDeepLink('nutrimom://admin/appointments/x').path,undefined)
})

test('KPI v3 uses full calendar month and does not reuse the scheduled-appointment data boundary',()=>{
  const raw=expertPerformanceFixture();assert.equal(mapExpertPerformance(raw).axes.length,6)
  raw.calculation_version=2;assert.throws(()=>mapExpertPerformance(raw))
  const f=initialPerformanceFilters()
  assert.equal(performanceQuery({...f,preset:'30days'},'2026-10-15').fromDate,'2026-09-16')
  assert.equal(performanceQuery(f,'2026-10-15').toDate,'2026-10-31')
})

test('expert report validates individual rows without summing distinct team customer counts',()=>{
  const snapshot=expertPerformanceFixture(new URLSearchParams('expertUserId=11111111-1111-4111-8111-111111111111'))
  const report={type:'EXPERT_PERFORMANCE',generated_at:snapshot.snapshot_at,timezone:snapshot.timezone,period:snapshot.period,summary:{snapshot},items:[{expert:snapshot.expert,summary:snapshot.summary,axes:snapshot.axes,schedule_summary:snapshot.schedule_summary,checkin_summary:snapshot.checkin_summary,data_coverage:snapshot.data_coverage}],page:1,page_size:20,total_items:1,total_pages:1}
  assert.equal(mapExpertReport(report).items[0].axes.length,6)
  report.items[0].checkin_summary={...snapshot.checkin_summary,late_consultations:999};assert.throws(()=>mapExpertReport(report))
})

test('admin accepts overdue attention and validates deadline metadata before rendering',()=>{
  const row={...appointment,assignment_type:'RANDOM',status:'PENDING_EXPERT',slot:null,attention_reason:'ACCEPTANCE_OVERDUE',preferred_date:'2026-10-18',acceptance_deadline_at:'2026-10-16T08:30:00+07:00',accepted_at:null,acceptance_policy_version:2,server_time:'2026-10-16T09:00:00+07:00'}
  assert.equal(mapAppointment(row).attention_reason,'ACCEPTANCE_OVERDUE')
  assert.throws(()=>mapAppointment({...row,preferred_date:'2026-02-30'}))
  assert.throws(()=>mapAppointment({...row,acceptance_deadline_at:'bad-time'}))
  const dashboard=fixtureResponse('/admin/dashboard',new URLSearchParams())
  dashboard.attention.items[0].kind='ACCEPTANCE_OVERDUE'
  assert.equal(mapDashboard(dashboard).attention.items[0].kind,'ACCEPTANCE_OVERDUE')
})
