import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { AdminRealtimeContractError, createAdminSseParser, decodeRealtimeEvent, newerRevision, optionalRealtimeRevision, realtimeRevision } from '../src/features/admin/model/admin-realtime-contract.ts'
import { createAdminRealtimeSync, type RealtimeState } from '../src/features/admin/model/admin-realtime-sync.ts'
import { createAdminRealtimeConnection } from '../src/features/admin/model/admin-realtime-connection.ts'
import { createAdminReadCoordinator } from '../src/features/admin/model/admin-read-coordinator.ts'
import { normalizeAdminNotificationCount, normalizeAdminNotificationPage } from '../src/features/admin/model/admin-notifications.ts'

const userId = '11111111-1111-4111-8111-111111111111'
const snapshot = (d='17',n='8',count=3) => ({ protocol_version:1 as const,admin_user_id:userId,dashboard_revision:d,notifications_revision:n,unread_count:count })
const tick = async () => { for (let i=0;i<15;i++) await Promise.resolve() }
function fakeClock() {
  let now=0,id=0
  const tasks=new Map<number,{at:number;fn:()=>void}>()
  return {
    now:()=>now,
    set:(fn:()=>void,ms:number)=>{tasks.set(++id,{at:now+ms,fn});return id as unknown as ReturnType<typeof setTimeout>},
    clear:(id:ReturnType<typeof setTimeout>)=>{tasks.delete(id as unknown as number)},
    async advance(ms:number) {
      const end=now+ms
      while (true) { const task=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;now=task[1].at;tasks.delete(task[0]);task[1].fn();await tick() }
      now=end;await tick()
    },
    size:()=>tasks.size,
  }
}
test('SSE handles every byte boundary, UTF-8, LF/CRLF/CR, comments, multi-data and incomplete EOF',()=>{
  const input=': ignored\r\nevent: update\r\ndata: tiếng Việt 🌿\r\ndata: second\r\n\r\nevent: heartbeat\ndata: {}\n\nevent: ready\rdata: {}\r\ndata: incomplete'
  const bytes=new TextEncoder().encode(input)
  for(let split=0;split<=bytes.length;split++) {
    const events:string[][]=[],p=createAdminSseParser((e,d)=>events.push([e,d]))
    p.push(bytes.slice(0,split));p.push(bytes.slice(split));p.end()
    assert.deepEqual(events,[['update','tiếng Việt 🌿\nsecond'],['heartbeat','{}']])
  }
})
test('SSE is bounded per frame including comments; invalid UTF-8 is rejected',()=>{
  for(const wire of ['data: '+ 'a'.repeat(65536),':'+ 'x'.repeat(65536)]) assert.throws(()=>createAdminSseParser(()=>{}).push(new TextEncoder().encode(wire)),AdminRealtimeContractError)
  const p=createAdminSseParser(()=>{});for(let i=0;i<1000;i++)p.push(new TextEncoder().encode('data: ok\n\n'))
  assert.throws(()=>p.push(new Uint8Array([255])),AdminRealtimeContractError)
})
test('adapter validates principal, protocol, revisions and safe counts; unknown events are ignored',()=>{
  assert.equal(decodeRealtimeEvent('unknown','not JSON',userId),undefined)
  assert.equal(decodeRealtimeEvent('heartbeat','{"protocol_version":1}',userId)?.type,'heartbeat')
  assert.equal(decodeRealtimeEvent('access_revoked','{"protocol_version":1,"reason":"ADMIN_ACCESS_REVOKED"}',userId)?.type,'access_revoked')
  for(const p of [{...snapshot(),protocol_version:2},{...snapshot(),admin_user_id:'other'},{...snapshot(),unread_count:-1},{...snapshot(),unread_count:Number.MAX_SAFE_INTEGER+1},{...snapshot(),notifications_revision:8},null]) assert.throws(()=>decodeRealtimeEvent('ready',JSON.stringify(p),userId),AdminRealtimeContractError)
  assert.throws(()=>decodeRealtimeEvent('update','bad',userId),AdminRealtimeContractError)
})
test('revision strings preserve Long precision, normalize leading zeroes and remain optional on legacy GET',()=>{
  assert.equal(realtimeRevision('00017'),'17');assert.equal(newerRevision('9223372036854775807','9223372036854775806'),true)
  assert.equal(newerRevision('10','9'),true);assert.equal(newerRevision('9','10'),false)
  for(const v of [-1,0,'-1','1.1','1e3','',null]) assert.throws(()=>realtimeRevision(v))
  assert.equal(optionalRealtimeRevision({}),undefined)
  assert.deepEqual(normalizeAdminNotificationCount({count:4}),{count:4})
  assert.deepEqual(normalizeAdminNotificationPage({items:[],has_more:false,realtime_revision:'9007199254740993'},{unreadOnly:false}),{items:[],has_more:false,realtime_revision:'9007199254740993'})
  assert.throws(()=>normalizeAdminNotificationCount({count:4,realtime_revision:null}))
})
function syncFixture() {
  const clock=fakeClock(),expired:string[]=[]
  const sync=createAdminRealtimeSync({expire:p=>expired.push(p),now:clock.now,schedule:clock.set,cancel:clock.clear})
  sync.setState('connected')
  return {sync,clock,expired}
}
test('ten events use one fixed 2s window per visible canonical query; no off-page request',async()=>{
  const {sync,clock,expired}=syncFixture();let dashboard=0,list=0
  sync.begin('d','dashboard')('17');sync.begin('n','notifications')('8')
  sync.register('d','dashboard',()=>{dashboard++;sync.begin('d','dashboard')('27');return true})
  sync.register('n','notifications',()=>{list++;sync.begin('n','notifications')('18');return true})
  sync.snapshot(snapshot(),true)
  for(let i=1;i<=10;i++){sync.snapshot(snapshot(String(17+i),String(8+i)),false);await clock.advance(190)}
  assert.equal(dashboard,0);await clock.advance(100);assert.equal(dashboard,1);assert.equal(list,1)
  await clock.advance(60000);assert.equal(dashboard,1);assert.equal(list,1)
  assert.ok(expired.includes('GET:/admin/dashboard'));assert.ok(expired.includes('GET:/notifications?'))
  sync.dispose();assert.equal(clock.size(),0)
})
test('same/older revisions and ready reconnect do not reload confirmed data',async()=>{
  const {sync,clock}=syncFixture();let calls=0
  sync.begin('d','dashboard')('9223372036854775807');sync.register('d','dashboard',()=>{calls++;return true})
  for(const rev of ['9223372036854775807','9223372036854775806','9223372036854775807'])sync.snapshot(snapshot(rev),true)
  await clock.advance(60000);assert.equal(calls,0)
})
test('an event during GET causes one catch-up; revision coverage avoids unnecessary catch-up',async()=>{
  for(const covers of [false,true]) {
    const {sync,clock}=syncFixture();let calls=0
    const finish=sync.begin('d','dashboard');sync.register('d','dashboard',()=>{calls++;sync.begin('d','dashboard')('18');return true})
    sync.snapshot(snapshot('18'),true);await clock.advance(2000);assert.equal(calls,0)
    finish(covers?'18':'17');await clock.advance(2000);assert.equal(calls,covers?0:1)
    await clock.advance(60000);assert.equal(calls,covers?0:1)
  }
})
test('legacy GET covers only events seen before it started; unrelated events do not dirty Dashboard',async()=>{
  const {sync,clock}=syncFixture();let calls=0
  sync.snapshot(snapshot(),true)
  sync.begin('d','dashboard')();sync.register('d','dashboard',()=>{calls++;sync.begin('d','dashboard')();return true})
  sync.snapshot(snapshot('17','9'),false);await clock.advance(2000);assert.equal(calls,0)
  const finish=sync.begin('d','dashboard');sync.snapshot(snapshot('18','9'),false);finish();await clock.advance(2000);assert.equal(calls,1)
})
test('hidden/offline pauses pending dirty work, family cooldown retains work, paginated feeds defer',async()=>{
  const {sync,clock}=syncFixture();let calls=0,paused=true
  sync.register('n','notifications',()=>{if(paused)return false;calls++;return true});sync.snapshot(snapshot(),true)
  sync.setActive(false);await clock.advance(10000);assert.equal(calls,0);assert.equal(clock.size(),0)
  sync.block(clock.now()+10000);sync.setActive(true);paused=false;await clock.advance(9999);assert.equal(calls,0);await clock.advance(1);assert.equal(calls,1)
  sync.dispose();assert.equal(clock.size(),0)
})
test('cache expiration during GET preserves its lease and leaves the completed entry stale',async()=>{
  const c=createAdminReadCoordinator();let resolve!:(v:number)=>void,calls=0
  const pending=c.read('GET:/admin/dashboard',()=>{calls++;return new Promise<number>(r=>resolve=r)})
  await tick();c.expire('GET:/admin/dashboard');assert.equal(c.hasFlight('GET:/admin/dashboard'),true);resolve(1);assert.equal(await pending,1)
  assert.equal(c.isStale('GET:/admin/dashboard'),true);assert.equal(await c.read('GET:/admin/dashboard',async()=>++calls),2)
})
function connectionFixture(status=200,retryAfterMs?:number) {
  const clock=fakeClock(),states:RealtimeState[]=[],streams:ReadableStreamDefaultController<Uint8Array>[]=[]
  let calls=0,denied=0,unauthorized=0,blocked=0,events=0,diagnostics=0,current=true
  const connection=createAdminRealtimeConnection({userId,clock,random:()=>0,current:()=>current,
    open:async signal=>{calls++;if(status!==200)throw new ApiClientError(status,{code:'QA',message:'QA'},retryAfterMs)
      return new Response(new ReadableStream<Uint8Array>({start(c){streams.push(c);signal.addEventListener('abort',()=>{try{c.error(new DOMException('Aborted','AbortError'))}catch{}},{once:true})}}),{headers:{'Content-Type':'text/event-stream'}})},
    state:s=>states.push(s),snapshot:()=>events++,forbidden:()=>denied++,unauthorized:()=>unauthorized++,block:until=>blocked=until,diagnostic:()=>diagnostics++,
  })
  const send=(type='ready',data:unknown=snapshot())=>streams.at(-1)!.enqueue(new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`))
  return {connection,clock,states,streams,send,calls:()=>calls,denied:()=>denied,unauthorized:()=>unauthorized,blocked:()=>blocked,events:()=>events,diagnostics:()=>diagnostics,changeScope:()=>{current=false}}
}
test('StrictMode start/stop microtask opens only one stream; pause cancels deadline and suppresses old callbacks',async()=>{
  const f=connectionFixture();f.connection.start();f.connection.pause();f.connection.start();await tick();assert.equal(f.calls(),1)
  f.send();await tick();assert.equal(f.states.at(-1),'connected');f.connection.pause();await tick();assert.equal(f.clock.size(),0)
  f.connection.start();await tick();assert.equal(f.calls(),2);f.changeScope();f.send();await tick();assert.equal(f.events(),1);f.connection.stop();assert.equal(f.clock.size(),0)
})
test('healthy stream heartbeats produce no data work and watchdog restarts after 45s',async()=>{
  const f=connectionFixture();f.connection.start();await tick();f.send();await tick()
  for(let i=0;i<4;i++){await f.clock.advance(15000);f.send('heartbeat',{protocol_version:1});await tick()}
  assert.equal(f.events(),1);assert.equal(f.calls(),1)
  await f.clock.advance(45000);assert.equal(f.states.at(-1),'reconnecting');await f.clock.advance(1000);assert.equal(f.calls(),2);f.connection.stop()
})
test('rapid ready/EOF cycles preserve 1,2,4,8,16,30s backoff and reset only after stable 30s',async()=>{
  const f=connectionFixture();f.connection.start();await tick()
  for(const ms of [1000,2000,4000,8000,16000,30000,30000]) {
    f.send();await tick();f.streams.at(-1)!.close();await tick();const calls=f.calls()
    await f.clock.advance(ms-1);assert.equal(f.calls(),calls);await f.clock.advance(1);assert.equal(f.calls(),calls+1)
  }
  f.send();await tick();await f.clock.advance(30000);f.streams.at(-1)!.close();await tick();const calls=f.calls();await f.clock.advance(1000);assert.equal(f.calls(),calls+1);f.connection.stop()
})
test('401/403 and access_revoked terminate, while 404/405/501 never probe again in the workspace',async()=>{
  for(const status of [401,403,404,405,501]) {
    const f=connectionFixture(status);f.connection.start();await tick();await f.clock.advance(300000);f.connection.pause();f.connection.start();await tick()
    assert.equal(f.calls(),1);assert.equal(f.denied(),status===403?1:0);assert.equal(f.unauthorized(),status===401?1:0);f.connection.stop()
  }
  const f=connectionFixture();f.connection.start();await tick();f.send('access_revoked',{protocol_version:1,reason:'ADMIN_ACCESS_REVOKED'});await tick();assert.equal(f.denied(),1);assert.equal(f.clock.size(),0)
})
test('429 respects Retry-After across pause/resume; missing header waits at least 30s',async()=>{
  for(const retry of [undefined,90000]) {
    const f=connectionFixture(429,retry);f.connection.start();await tick();const wait=retry??30000
    assert.equal(f.blocked(),wait);f.connection.pause();f.connection.start();await tick();await f.clock.advance(wait-1);assert.equal(f.calls(),1);await f.clock.advance(1);assert.equal(f.calls(),2);f.connection.stop()
  }
})
test('malformed known events and update before ready stop realtime; unknown frames cannot reset the handshake timeout',async()=>{
  for(const [type,data] of [['update',snapshot()],['ready',{...snapshot(),protocol_version:2}]] as const) {
    const f=connectionFixture();f.connection.start();await tick();f.send(type,data);await tick();assert.equal(f.states.at(-1),'fallback');assert.equal(f.diagnostics(),1);assert.equal(f.clock.size(),0)
  }
  const f=connectionFixture();f.connection.start();await tick();f.send('unknown',{});await tick();await f.clock.advance(15000);assert.equal(f.events(),0);assert.equal(f.states.at(-1),'reconnecting');f.connection.stop()
})
test('stream 429 cooldown blocks API reads and writes and resets on account change',async()=>{
  let now=0,calls=0;const c=createAdminReadCoordinator(()=>now);c.setScope('A');c.blockRealtime(30000)
  await assert.rejects(c.read('GET:/notifications',async()=>++calls));assert.throws(()=>c.assertAvailable('POST:/notifications/read-all'))
  await assert.rejects(c.read('GET:/admin/dashboard',async()=>++calls));assert.equal(calls,0)
  now=30000;assert.equal(await c.read('GET:/admin/dashboard',async()=>++calls),1);c.blockRealtime(90000);c.setScope('B');assert.equal(c.cooldownUntil(),0)
})
test('5xx uses bounded backoff without changing to terminal fallback',async()=>{
  const f=connectionFixture(503);f.connection.start();await tick()
  for(const wait of [1000,2000,4000,8000,16000,30000,30000]) { const calls=f.calls();await f.clock.advance(wait);assert.equal(f.calls(),calls+1);assert.equal(f.states.at(-1),'reconnecting') }
  f.connection.stop();assert.equal(f.clock.size(),0)
})
test('a 429 during a dirty refresh retries once after cooldown without needing another event',async()=>{
  const {sync,clock}=syncFixture();let calls=0,cooldown=0
  sync.begin('n','notifications')('8')
  sync.register('n','notifications',()=>{
    if(clock.now()<cooldown)return false
    calls++;const finish=sync.begin('n','notifications')
    queueMicrotask(()=>{if(calls===1){cooldown=clock.now()+5000;finish(undefined,false,true)}else finish('9')})
    return true
  })
  sync.snapshot(snapshot('17','9'),true);await clock.advance(2000);assert.equal(calls,1)
  await clock.advance(4000);assert.equal(calls,1);await clock.advance(2000);assert.equal(calls,2);await clock.advance(20000);assert.equal(calls,2)
})
test('a valid count-only snapshot refreshes the visible inbox once, without refreshing Dashboard',async()=>{
  const {sync,clock}=syncFixture();let lists=0,dashboard=0
  sync.begin('n','notifications')('8');sync.begin('d','dashboard')('17')
  sync.register('n','notifications',()=>{lists++;sync.begin('n','notifications')('8');return true})
  sync.register('d','dashboard',()=>{dashboard++;return true})
  sync.snapshot(snapshot(),true);sync.snapshot(snapshot('17','8',4),false);await clock.advance(2000)
  assert.equal(lists,1);assert.equal(dashboard,0);sync.snapshot(snapshot('17','8',4),false);await clock.advance(20000);assert.equal(lists,1)
})
