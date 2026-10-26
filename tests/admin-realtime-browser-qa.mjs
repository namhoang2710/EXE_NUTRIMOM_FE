import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { fixtureResponse,qaId,qaUser } from './admin-workspace-fixtures.mjs'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'

const origin=process.env.NUTRIMOM_QA_ORIGIN||'http://127.0.0.1:5175'
const output=new URL('../qa-artifacts/admin-realtime/',import.meta.url);await mkdir(output,{recursive:true})
const target=(await fetch('http://127.0.0.1:9223/json').then(r=>r.json())).find(t=>t.type==='page')
assert.ok(target,'Start isolated headless QA Chrome at CDP 9223')
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}))
let serial=0,revision=17,notificationRevision=8,count=35,mode='',delayList=0,delayDashboard=0,writeDelay=0,accountId=qaId,business=0
const pending=new Map(),requests=[],errors=[],results=[]
let items=[]
const stamp='2026-10-14T01:00:00Z'
function reset(){revision=17;notificationRevision=8;count=35;business=0;mode='';delayList=delayDashboard=writeDelay=0;items=Array.from({length:35},(_,i)=>({id:`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,type:'SYSTEM',audience:'ADMIN',category:'PAYMENT',title:`QA gói thay đổi ${i+1}`,body:'Dữ liệu fixture',created_at:stamp}))}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
function command(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
socket.addEventListener('message',async event=>{
  const m=JSON.parse(event.data)
  if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result)};return}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)
  if(m.method!=='Fetch.requestPaused')return
  const {requestId,request}=m.params,url=new URL(request.url),path=url.pathname.replace('/api/v1',''),q=url.searchParams
  const row={path,query:url.search,method:request.method};requests.push(row)
  let data,status=200,wait=0;const headers=[{name:'Content-Type',value:'application/json'}]
  if(path==='/notifications/unread-count'){data={count,realtime_revision:String(notificationRevision)};if(mode==='lateCount'){data={count:1,realtime_revision:'1'};wait=1200}}
  else if(path==='/notifications'){
    wait=delayList
    if(mode==='list429'){status=429;headers.push({name:'Retry-After',value:'5'});data={error:{code:'TOO_MANY_REQUESTS',message:'QA'}}}
    else {const rows=items.filter(i=>q.get('unreadOnly')!=='true'||!i.read_at),offset=q.has('cursor')?20:0;data={items:rows.slice(offset,offset+20).map(i=>({...i})),has_more:rows.length>offset+20,...(rows.length>offset+20?{next_cursor:'opaque-cursor'}:{}),realtime_revision:String(notificationRevision)}}
  } else if(path.endsWith('/read')) {wait=writeDelay;const id=path.split('/')[2];items=items.map(i=>i.id===id?{...i,read_at:stamp}:i);notificationRevision++;count--;data=items.find(i=>i.id===id)}
  else if(path==='/notifications/read-all'){wait=writeDelay;let updated=0;items=items.map(i=>{if(i.read_at)return i;updated++;return {...i,read_at:stamp}});count=0;notificationRevision++;data={updated}}
  else {data=fixtureResponse(path,q,request.method,request.postData);if(path==='/admin/dashboard'){
    wait=delayDashboard;data={...enrichDashboard(data),realtime_revision:String(revision)}
    if(business){
      data.overview.lifetime_real_collected_amount+=399000;data.customer_snapshot.total_customers++;data.customer_snapshot.free_users++
      data.metric_comparisons.revenue.current_value=data.overview.lifetime_real_collected_amount;data.metric_comparisons.customers.current_value++
      const ratio=data.customer_snapshot.plan_399k_users/data.customer_snapshot.total_customers*100
      data.plan_399k_adoption.current_ratio_percent=ratio;data.plan_399k_adoption.change_percentage_points=ratio-data.plan_399k_adoption.previous_ratio_percent;data.plan_399k_adoption.daily_series.at(-1).ratio_percent=ratio;data.metric_comparisons.plan_399k.current_value=ratio
      data.attention.items[0].title='Lịch và hỗ trợ đã cập nhật QA';data.recent_activity[0].title='Thanh toán và gói PostgreSQL QA'
    }
  }}
  if(path==='/auth/me')data={...qaUser,id:accountId}
  if(data===undefined){status=404;data={error:{code:'NOT_FOUND',message:'QA fixture unavailable'}}}
  if(wait)await delay(wait)
  try{await command('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from(JSON.stringify(status===200?{data}:data)).toString('base64')})}catch{/* scoped abort */}
})
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function until(expression,ms=15000){const end=Date.now()+ms;while(Date.now()<end){if(await evaluate(`(()=>{try{return Boolean(${expression})}catch{return false}})()`))return;await delay(80)}throw Error('Timed out: '+expression)}
async function navigate(path){await command('Page.navigate',{url:origin+path});await until("document.readyState==='complete'");await until("!!document.querySelector('.admin-shell')");await delay(300)}
async function click(selector){assert.equal(await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true})()`),true,'Missing '+selector);await delay(150)}
async function button(text){assert.equal(await evaluate(`(()=>{const b=[...document.querySelectorAll('.admin-page button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)return false;b.click();return true})()`),true,'Missing '+text);await delay(200)}
async function spa(path){await evaluate(`history.pushState({},'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'))`);await delay(300)}
const getCount=(path,from=0)=>requests.slice(from).filter(r=>r.path===path&&r.method==='GET').length
async function record(name,fn){const from=requests.length;await fn(from);results.push({name,status:'PASS',requests:requests.slice(from)});console.log('PASS '+name)}
async function emit(type='update',changes={}){await evaluate(`__rt.emit(${JSON.stringify(type)},${JSON.stringify({protocol_version:1,admin_user_id:accountId,dashboard_revision:String(revision),notifications_revision:String(notificationRevision),unread_count:count,...changes})})`)}
async function fresh(path='/admin',streamMode='ok'){reset();await evaluate(`sessionStorage.setItem('qa-stream-mode',${JSON.stringify(streamMode)})`);await navigate(path);await until("__rt.requests.length===1");await until("!!document.querySelector('.nm-notification-badge')");await delay(500)}
await command('Page.enable');await command('Page.navigate',{url:'about:blank'});await delay(200);await command('Runtime.enable');await command('Network.enable');await command('Page.bringToFront')
await command('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/*',requestStage:'Request'}]})
await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
const injected=await command('Page.addScriptToEvaluateOnNewDocument',{source:`
(()=>{
 const original=window.fetch.bind(window),streams=[],requests=[];let live=0,max=0;
 window.__rt={requests,emit(type,data){const c=streams.at(-1);if(c)c.enqueue(new TextEncoder().encode('event: '+type+'\\r\\ndata: '+JSON.stringify(data)+'\\r\\n\\r\\n'))},close(){streams.at(-1)?.close()},get live(){return live},get max(){return max}};
 window.fetch=async(input,init)=>{
  if(!String(input).endsWith('/admin/realtime/stream'))return original(input,init);
  const h=new Headers(init?.headers);requests.push({path:String(input),accept:h.get('Accept'),authorized:!!h.get('Authorization')});
  const mode=sessionStorage.getItem('qa-stream-mode')||'ok';
  if(mode==='404'||mode==='429')return new Response(JSON.stringify({error:{code:'QA',message:'QA'}}),{status:Number(mode),headers:{'Content-Type':'application/json',...(mode==='429'?{'Retry-After':'4'}:{})}});
  let done=false;const finish=()=>{if(!done){done=true;live--}};
  return new Response(new ReadableStream({start(c){live++;max=Math.max(max,live);streams.push(c);init.signal.addEventListener('abort',()=>{finish();try{c.error(new DOMException('Aborted','AbortError'))}catch{}},{once:true});setTimeout(()=>{if(done)return;const user=JSON.parse(sessionStorage.getItem('nutrimom.auth-session')).user;__rt.emit('ready',{protocol_version:1,admin_user_id:user.id,dashboard_revision:'17',notifications_revision:'8',unread_count:35})},80)},cancel(){finish()}}),{headers:{'Content-Type':'text/event-stream'}});
 };
})();`})
try{
  reset();await command('Page.navigate',{url:origin+'/login'});await until("document.readyState==='complete'")
  const session={accessToken:'qa-fixture-token',refreshToken:'',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000,tokenType:'Bearer',user:{id:qaId,phone:'0900000001',displayName:'QA session',roles:['ADMIN'],status:'ACTIVE',createdAt:stamp}}
  await evaluate(`sessionStorage.setItem('nutrimom.auth-session',${JSON.stringify(JSON.stringify(session))})`)
  await record('StrictMode initial: stream=1 dashboard=1 count<=1 list=0; correct headers',async from=>{
    await fresh();assert.equal(await evaluate('__rt.requests.length'),1);assert.equal(await evaluate('__rt.max'),1)
    assert.equal(getCount('/admin/dashboard',from),1);assert.ok(getCount('/notifications/unread-count',from)<=1);assert.equal(getCount('/notifications',from),0)
    assert.deepEqual(await evaluate('__rt.requests[0]'),{path:'/api/v1/admin/realtime/stream',accept:'text/event-stream',authorized:true})
  })
  if(!process.argv.includes('--skip-idle'))await record('healthy 61 seconds: heartbeat causes zero polling GET',async from=>{
    for(let i=0;i<5;i++){await delay(12500);await emit('heartbeat',{protocol_version:1})}
    assert.equal(getCount('/admin/dashboard',from),0);assert.equal(getCount('/notifications/unread-count',from),0);assert.equal(getCount('/notifications',from),0)
  })
  await record('burst 10: one Dashboard GET, zero closed-list/count GET',async from=>{
    for(let i=0;i<10;i++){revision++;notificationRevision++;count++;await emit()}
    await delay(2500);assert.equal(getCount('/admin/dashboard',from),1);assert.equal(getCount('/notifications',from),0);assert.equal(getCount('/notifications/unread-count',from),0);assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'45')
  })
  await record('payment/new user/schedule/support/subscription fixture updates UI in 3-5 seconds from one snapshot',async from=>{
    business=1;revision++;await emit();await until("document.querySelector('[data-dashboard-metric=customers] .admin-animated-number [aria-hidden=true]')?.textContent==='101'",5000)
    assert.equal(await evaluate("document.querySelector('.admin-page').textContent.includes('Lịch và hỗ trợ đã cập nhật QA')"),true)
    assert.equal(getCount('/admin/dashboard',from),1)
  })
  await record('event during a Dashboard GET adds at most one follow-up without abort/restart',async from=>{
    delayDashboard=1200;await click('.admin-dashboard-refresh');await delay(150);revision++;await emit();await delay(3800);delayDashboard=0
    assert.equal(getCount('/admin/dashboard',from),2)
  })
  await record('same revisions and heartbeat: zero GET',async from=>{await emit();await emit('heartbeat',{protocol_version:1});await delay(2200);assert.equal(requests.length-from,0)})
  await click('.nm-notification-trigger');await until("document.querySelectorAll('.nm-notification-item').length===20")
  await record('visible bell burst: one canonical list GET and one Dashboard GET',async from=>{for(let i=0;i<10;i++){revision++;notificationRevision++;await emit()};await delay(2600);assert.equal(getCount('/notifications',from),1);assert.equal(getCount('/admin/dashboard',from),1);assert.equal(getCount('/notifications/unread-count',from),0)})
  await record('off Dashboard and same page/bell query: one list GET, no Dashboard GET',async from=>{
    await spa('/admin/notifications');await until("document.querySelectorAll('.admin-notification-list li').length===20");await click('.nm-notification-trigger');notificationRevision++;revision++;await emit();await delay(2600)
    assert.equal(getCount('/admin/dashboard',from),0);assert.equal(getCount('/notifications',from),1)
  })
  await click('.nm-notification-trigger');await button('Tải thêm');await until("document.querySelectorAll('.admin-notification-list li').length===35")
  await record('paginated feed retains items/cursor and shows new button with no list GET',async from=>{
    notificationRevision++;count++;items.unshift({...items[0],id:'30000000-0000-4000-8000-000000000001',title:'Thông báo mới QA'});await emit();await delay(2400)
    assert.equal(getCount('/notifications',from),0);assert.equal(await evaluate("document.querySelectorAll('.admin-notification-list li').length"),35)
    await button('Có thông báo mới');await until("document.querySelectorAll('.admin-notification-list li').length===20");assert.equal(getCount('/notifications',from),1);assert.equal(await evaluate("document.querySelector('.admin-notification-list li strong').textContent"),'Thông báo mới QA')
  })
  await record('read with crossing event: one POST and zero count GET; item stays read',async from=>{
    writeDelay=600;await evaluate("document.querySelector('.admin-notification-list li button').click()");await delay(100);await emit();await delay(900);await emit();await delay(2300);writeDelay=0
    assert.equal(requests.slice(from).filter(r=>r.method==='POST').length,1);assert.equal(getCount('/notifications/unread-count',from),0)
    assert.equal(await evaluate("document.querySelector('.admin-notification-list li').classList.contains('is-read')"),true)
  })
  await record('notification family 429 retains dirty work and blocks retry until cooldown',async from=>{
    mode='list429';notificationRevision++;await emit();await delay(2400);assert.equal(getCount('/notifications',from),1)
    await button('Làm mới');await delay(2200);assert.equal(getCount('/notifications',from),1)
    mode='';await delay(4500);assert.equal(getCount('/notifications',from),2)
  })
  await record('offline stops stream and queued work; online restores exactly one stream',async from=>{
    await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,value:false});dispatchEvent(new Event('offline'))");await delay(100);assert.equal(await evaluate('__rt.live'),0)
    const before=await evaluate('__rt.requests.length');await delay(2300);assert.equal(requests.length-from,0)
    await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,value:true});dispatchEvent(new Event('online'))");await delay(500);assert.equal(await evaluate('__rt.requests.length'),before+1);assert.equal(await evaluate('__rt.max'),1)
  })
  await record('hidden pauses stream; visible bursts never duplicate a stream',async()=>{
    await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))");await delay(150);assert.equal(await evaluate('__rt.live'),0)
    const before=await evaluate('__rt.requests.length');await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});for(let i=0;i<5;i++)document.dispatchEvent(new Event('visibilitychange'))");await delay(500);assert.equal(await evaluate('__rt.requests.length'),before+1);assert.equal(await evaluate('__rt.max'),1)
  })
  await record('late count GET cannot overwrite the SSE snapshot',async()=>{
    mode='lateCount';await evaluate("sessionStorage.setItem('qa-stream-mode','ok')");await navigate('/admin');await delay(1600);assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'35');mode=''
  })
  await record('404 terminal fallback: no stream reprobe on focus/offline/online/route changes',async()=>{
    await fresh('/admin','404');await evaluate("dispatchEvent(new Event('focus'));dispatchEvent(new Event('offline'));dispatchEvent(new Event('online'))");await spa('/admin/notifications');await delay(2500);assert.equal(await evaluate('__rt.requests.length'),1)
  })
  if(!process.argv.includes('--skip-idle'))await record('404 fallback over 60 seconds: Dashboard=1 count=1 closed-list=0 stream stays at one attempt',async()=>{
    await fresh('/admin','404');const from=requests.length;await delay(61000)
    assert.equal(getCount('/admin/dashboard',from),1);assert.equal(getCount('/notifications/unread-count',from),1);assert.equal(getCount('/notifications',from),0);assert.equal(await evaluate('__rt.requests.length'),1)
  })
  await record('stream 429 blocks fallback, then schedules one reconnect after Retry-After',async from=>{
    await fresh('/admin','429');const before=requests.length;await click('.admin-dashboard-refresh');await delay(2200);assert.equal(await evaluate('__rt.requests.length'),1);assert.equal(requests.length,before)
    await evaluate("sessionStorage.setItem('qa-stream-mode','ok')");await delay(2100);assert.equal(await evaluate('__rt.requests.length'),2);assert.equal(await evaluate('__rt.max'),1)
    assert.ok(getCount('/admin/dashboard',from)<=1)
  })
  await record('access_revoked clears Admin data and stops stream',async()=>{
    await emit('access_revoked',{protocol_version:1,reason:'ADMIN_ACCESS_REVOKED'});await until("document.querySelector('.admin-content').textContent.includes('Bạn không đủ quyền truy cập Admin')");assert.equal(await evaluate('__rt.live'),0);assert.equal(await evaluate("!!document.querySelector('.nm-notification-badge')"),false)
  })
  await fresh('/admin/notifications')
  await record('responsive light/dark reduced motion and notification Escape focus',async()=>{
    for(const [name,width,dark] of [['desktop-light',1440,false],['mobile-dark',390,true]]){
      await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(dark?'dark':'light')}`);await delay(250)
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
      const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(new URL(name+'.png',output),Buffer.from(shot.data,'base64'))
    }
    await click('.nm-notification-trigger');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate("document.activeElement===document.querySelector('.nm-notification-trigger')"),true)
  })
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,runtimeErrors:errors.length}))
}finally{
  await writeFile(new URL('browser-results.json',output),JSON.stringify({results,errors,requests},null,2))
  await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier});await command('Fetch.disable');socket.close()
}
