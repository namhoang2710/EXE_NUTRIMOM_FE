import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminReadCoordinator, canonicalAdminPath } from '../src/features/admin/model/admin-read-coordinator.ts'
import { parseWorkspaceQuery, vietnamToday, validOrderCode, dateRangeError } from '../src/features/admin/model/admin-workspace-query.ts'
import { mapAdminPage, mapPayment, mapSubscription, mapAppointment, mapReport, AdminContractError, assertPaymentSource } from '../src/features/admin/model/admin-workspace-contract.ts'
import { adaptAdminNotificationLink } from '../src/features/admin/model/admin-notification-link.ts'
import { createAdminLoginAnimation } from '../src/features/admin/model/admin-login-animation.ts'
import { activityPath } from '../src/features/admin/model/admin-dashboard-links.ts'
import { comparison } from '../src/features/admin/model/admin-workspace-formatters.ts'
import { downloadFilename } from '../src/core/api/download-filename.ts'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { mapExpertFieldErrors, validateCreateExpert } from '../src/features/admin/model/admin-experts.ts'

const id = '11111111-1111-4111-8111-111111111111'
const deferred = <T>() => { let resolve!: (value:T) => void; let reject!: (reason:unknown) => void; const promise = new Promise<T>((r,j) => { resolve=r; reject=j }); return { promise,resolve,reject } }
const tick = () => Promise.resolve()
test('canonical read keys sort queries, trim q and omit empty parameters', () => {
  assert.equal(canonicalAdminPath('/admin/users?q=%20Lan%20&page=1&status='),'/admin/users?page=1&q=Lan')
})
test('multiple consumers share a flight; releasing one cannot abort the other',async () => {
  const c=createAdminReadCoordinator(); c.setScope('A'); const d=deferred<number>(); let calls=0; let shared!:AbortSignal
  const first=new AbortController(); const p=c.read('GET:/a',signal=>{ calls++; shared=signal; return d.promise },first.signal)
  const rejected=assert.rejects(p,{name:'AbortError'})
  const second=c.read('GET:/a',()=>{ throw new Error('duplicate') })
  await tick(); first.abort(); await tick(); assert.equal(shared.aborted,false); assert.equal(calls,1)
  d.resolve(9); assert.equal(await second,9); await rejected
})
test('StrictMode cleanup/setup reuses the flight through deferred release',async () => {
  const c=createAdminReadCoordinator(); const d=deferred<number>(); let calls=0; const a=new AbortController()
  const old=c.read('GET:/a',()=>{ calls++; return d.promise },a.signal); const rejected=assert.rejects(old,{name:'AbortError'})
  a.abort(); const fresh=c.read('GET:/a',()=>{ calls++; return d.promise }); await tick(); d.resolve(1); assert.equal(await fresh,1); await rejected; assert.equal(calls,1)
})
test('the last consumer release aborts and removes the flight',async () => {
  const c=createAdminReadCoordinator(); let shared!:AbortSignal; const a=new AbortController(); const d=deferred<number>()
  const p=c.read('x',signal=>{ shared=signal; return d.promise },a.signal); const rejected=assert.rejects(p,{name:'AbortError'})
  await tick(); a.abort(); await tick(); assert.equal(shared.aborted,true); assert.equal(c.inspect().inFlight,0); d.resolve(1); await rejected
})
test('successful cache obeys TTL, LRU capacity, and specialties lifetime',async () => {
  let now=0; const c=createAdminReadCoordinator(()=>now,20); let calls=0
  const loader=async()=>++calls; await c.read('a',loader); await c.read('a',loader); assert.equal(calls,1)
  now=30_000; await c.read('a',loader); assert.equal(calls,2)
  await c.read('specialties',loader,undefined,300_000); now=60_000; await c.read('specialties',loader,undefined,300_000); assert.equal(calls,3)
  for(let i=0;i<25;i++) await c.read('key'+i,async()=>i)
  assert.equal(c.inspect().cached,20); assert.equal(c.isStale('a'),true)
})
test('failed reads never retain a rejected promise or payload',async () => {
  const c=createAdminReadCoordinator(); await assert.rejects(c.read('a',async()=>{throw new Error('failed')})); assert.equal(c.inspect().cached,0)
  assert.equal(await c.read('a',async()=>4),4)
})
test('different keys and session changes isolate data and reject late results',async () => {
  const c=createAdminReadCoordinator(); c.setScope('A'); const d=deferred<number>()
  const old=c.read('a',()=>d.promise); const rejected=assert.rejects(old,{name:'AbortError'}); await tick(); c.setScope('B'); d.resolve(8); await rejected
  assert.equal(await c.read('a',async()=>2),2); assert.equal(await c.read('b',async()=>3),3); assert.equal(c.inspect().cached,2)
})
test('403 clears all admin payloads, aborts siblings, and prevents retry in that scope',async () => {
  const c=createAdminReadCoordinator(); c.setScope('A'); await c.read('a',async()=>1)
  await assert.rejects(c.read('b',async()=>{throw new ApiClientError(403,{code:'FORBIDDEN',message:'Denied'})})); assert.equal(c.inspect().cached,0); assert.equal(c.isDenied(),true)
  let calls=0; await assert.rejects(c.read('a',async()=>++calls)); assert.equal(calls,0); c.setScope('B'); assert.equal(await c.read('a',async()=>++calls),1)
})
test('429 respects Retry-After without an automatic retry',async () => {
  let now=0,calls=0; const c=createAdminReadCoordinator(()=>now)
  const rate=new ApiClientError(429,{code:'TOO_MANY_REQUESTS',message:'Wait'},10_000)
  await assert.rejects(c.read('a',async()=>{calls++;throw rate})); await assert.rejects(c.read('a',async()=>++calls)); assert.equal(calls,1)
  now=10_001; assert.equal(await c.read('a',async()=>++calls),2)
})
test('targeted invalidation preserves unrelated resources',async () => {
  const c=createAdminReadCoordinator(); await c.read('GET:/admin/users',async()=>1); await c.read('GET:/admin/dashboard',async()=>2)
  c.invalidate('GET:/admin/dashboard'); assert.equal(c.isStale('GET:/admin/users'),false); assert.equal(c.isStale('GET:/admin/dashboard'),true)
})
test('invalid URLs retain validation errors rather than broadening the backend request',()=>{
  for(const raw of ['page=-1','page=2.5','page=','pageSize=101','status=NO_SHOW','specialty=UNKNOWN','expertUserId=not-uuid','q='+ 'a'.repeat(101),'fromDate=2026-02-30&toDate=2026-03-02','fromDate=2026-10-12','page=1&page=2']) assert.equal(parseWorkspaceQuery(raw,'appointments','2026-10-12').valid,false,raw)
  assert.equal(parseWorkspaceQuery('source=UNKNOWN','payments','2026-10-12').valid,false)
  assert.equal(parseWorkspaceQuery('toDate=2026-10-13&fromDate=2026-10-01','reports','2026-10-12').valid,false)
})
test('date ranges validate real dates, both boundaries, inclusive maximum and future rules',()=>{
  assert.equal(dateRangeError('2024-01-01','2024-12-31'), '')
  assert.ok(dateRangeError('2024-01-01','2025-01-01'))
  assert.ok(dateRangeError('2026-03-01','2026-02-28'))
  assert.equal(vietnamToday(new Date('2026-10-11T18:00:00Z')),'2026-10-12')
})
test('defaults are server pagination, current-month period, unified source, and uncompleted requests',()=>{
  const p=parseWorkspaceQuery('','payments','2026-10-12'); assert.equal(p.query.get('source'),'ALL'); assert.equal(p.query.get('fromDate'),'2026-10-01'); assert.equal(p.query.get('toDate'),'2026-10-12'); assert.equal(p.query.get('page'),'1')
  assert.equal(parseWorkspaceQuery('','appointments').query.get('status'),'PENDING_CONSULTATION,PENDING_EXPERT')
  assert.equal(parseWorkspaceQuery('view=all','appointments').query.has('status'),false)
  assert.equal(parseWorkspaceQuery('status=PENDING_EXPERT,PENDING_EXPERT','appointments').query.get('status'),'PENDING_EXPERT')
})
test('query canonicalization separates page and business filters',()=>{
  const a=parseWorkspaceQuery('q=%20Lan%20&source=REAL&page=2','payments','2026-10-12')
  assert.equal(a.query.get('q'),'Lan'); assert.equal(a.query.get('page'),'2'); assert.ok(a.valid)
})
const payment={id,order_code:'9223372036854775807',user_id:id,user_display_name:'An',plan_tier:'PLAN_99K',plan_name:'99K',amount:99_000,currency:'VND',source:'REAL',status:'PAID',created_at:'2026-10-01T00:00:00Z',paid_at:'2026-10-02T00:00:00Z'}
test('order codes remain strings up to Long max, without Number precision loss',()=>{
  assert.equal(validOrderCode(payment.order_code),true); assert.equal(mapPayment(payment).order_code,payment.order_code)
  for(const code of ['0','01','-1','9223372036854775808','1e4']) assert.equal(validOrderCode(code),false)
})
test('financial contracts reject undefined, formatted, fractional, unsafe money and unknown statuses/sources',()=>{
  for(const amount of [undefined,'99.000',1.5,Number.MAX_SAFE_INTEGER+1,-1]) assert.throws(()=>mapPayment({...payment,amount}),AdminContractError)
  assert.throws(()=>mapPayment({...payment,status:'REFUNDED'}),AdminContractError); assert.throws(()=>mapPayment({...payment,source:'ALL'}),AdminContractError)
  assert.equal(mapPayment({...payment,paid_at:null}).paid_at,null)
})
test('REAL, DEMO and unknown-source lists cannot silently mix sources outside ALL',()=>{
  assert.doesNotThrow(()=>assertPaymentSource([payment],'REAL'))
  assert.throws(()=>assertPaymentSource([{...payment,source:'DEMO'}],'REAL'),AdminContractError)
  assert.throws(()=>assertPaymentSource([{...payment,source:'LEGACY_UNKNOWN'}],'DEMO'),AdminContractError)
  assert.doesNotThrow(()=>assertPaymentSource([payment,{...payment,source:'DEMO'}],'ALL'))
})
test('pagination errors surface rather than silently skipping rows',()=>{
  assert.throws(()=>mapAdminPage({items:[payment],page:0,page_size:20,total_items:1,total_pages:1},mapPayment),AdminContractError)
  assert.throws(()=>mapAdminPage({items:[{...payment,amount:'bad'}],page:1,page_size:20,total_items:1,total_pages:1},mapPayment),AdminContractError)
})
test('effective subscription status comes from the server, including raw ACTIVE expired',()=>{
  const p=mapSubscription({id,user_id:id,user_display_name:'An',plan_tier:'PLAN_99K',status:'ACTIVE',effective_status:'EXPIRED',start_date:'2026-08-01T00:00:00+07:00',end_date:'2026-09-01T00:00:00+07:00',days_remaining:0}); assert.equal(p.effective_status,'EXPIRED')
  assert.throws(()=>mapSubscription({...p,plan_tier:'FREE'}),AdminContractError)
})
test('appointments have their own statuses and reject invented no-show states',()=>{
  const a={id,user_id:id,user_display_name:null,expert_user_id:null,expert_name:null,specialty:'HEALTH',assignment_type:'RANDOM',status:'PENDING_EXPERT',slot:null,created_at:'2026-10-01T00:00:00Z',completed_at:null,waiting_hours:24.5,needs_attention:true,attention_reason:'WAITING_EXPERT'}
  assert.equal(mapAppointment(a).waiting_hours,24.5); assert.throws(()=>mapAppointment({...a,status:'NO_SHOW'}),AdminContractError)
})
test('revenue report rejects PAID rows without timestamp instead of subtracting them silently',()=>{
  const period={from_date:'2026-10-01',to_date:'2026-10-12',previous_from_date:'2026-09-19',previous_to_date:'2026-09-30'}
  assert.throws(()=>mapReport({type:'REVENUE',generated_at:'2026-10-12T12:00:00+07:00',timezone:'Asia/Ho_Chi_Minh',period,summary:{source:'REAL',collected_amount:99000,paid_orders:1,average_paid_amount:99000},items:[{...payment,paid_at:null}],page:1,page_size:20,total_items:1,total_pages:1}),AdminContractError)
})
test('notification deep links require ADMIN and whitelist strict UUID internal routes',()=>{
  assert.deepEqual(adaptAdminNotificationLink('nutrimom://admin/contact-requests/'+id,true),{path:'/admin/support/'+id})
  assert.deepEqual(adaptAdminNotificationLink('nutrimom://admin/appointments/'+id,true),{path:'/admin/appointments?requestId='+id})
  for(const link of ['https://evil.example','nutrimom://admin/appointments/../../x','nutrimom://admin/appointments/'+id+'?next=https://evil']) assert.equal(adaptAdminNotificationLink(link,true).path,undefined)
  assert.equal(adaptAdminNotificationLink('nutrimom://admin/appointments/'+id,false).path,undefined)
})
test('dashboard activities use source_id and payment order_code directly',()=>{
  const event={id:'event',kind:'PAYMENT_PAID' as const,source_id:id,title:'Paid',occurred_at:'2026-10-12T00:00:00Z',order_code:payment.order_code}
  assert.equal(activityPath(event),'/admin/revenue?orderCode='+payment.order_code); assert.equal(activityPath({...event,kind:'USER_REGISTERED',order_code:null}),'/admin/users?userId='+id)
})
test('credential-login animation tokens expire, are session-bound and consumed once',()=>{
  let now=0; const token=createAdminLoginAnimation(()=>now); assert.equal(token.consume('A'),false); token.arm('A'); assert.equal(token.consume('A'),true); assert.equal(token.consume('A'),false); token.arm('A'); assert.equal(token.consume('B'),false); token.arm('A'); now=10_000; assert.equal(token.consume('A'),false); token.arm('A'); token.clear(); assert.equal(token.consume('A'),false)
})
test('CSV filenames accept BE UTF-8 metadata and reject path/control injection',()=>{
  assert.equal(downloadFilename('attachment; filename*=UTF-8\'\'Bao%20cao.csv'),'Bao cao.csv'); assert.equal(downloadFilename('attachment; filename="../../secret.csv"'),null); assert.equal(downloadFilename(null),null)
})
test('expert server field errors map to form keys and invalid phones block creation',()=>{
  assert.deepEqual(mapExpertFieldErrors({full_name:'Name',years_of_experience:'Experience',file:'Image',unrelated:'Ignore'}),{fullName:'Name',yearsOfExperience:'Experience',avatar:'Image'})
  assert.ok(validateCreateExpert({phone:'abc',password:'QaAdminStrong123!',fullName:'An',specialty:'HEALTH',title:'',workplace:'',yearsOfExperience:'3',bio:''}).phone)
})
test('a zero previous period has no invented percentage comparison',()=>assert.equal(comparison(99000,0),'Chưa có dữ liệu so sánh'))
