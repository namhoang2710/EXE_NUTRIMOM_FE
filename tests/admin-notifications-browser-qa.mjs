import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fixtureResponse, qaId, qaUser } from './admin-workspace-fixtures.mjs'

// Transport fixtures only, in an isolated headless Chrome profile. Production UI is untouched.
const origin=process.env.NUTRIMOM_QA_ORIGIN || 'http://127.0.0.1:5174'
const output=new URL('../qa-artifacts/admin-notifications/',import.meta.url)
await mkdir(output,{recursive:true})
const target=(await fetch('http://127.0.0.1:9223/json').then(r=>r.json())).find(t=>t.type==='page')
assert.ok(target,'Start isolated QA Chrome on port 9223')
const socket=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0, fault='', listDelay=0, writeDelay=0, extraCount=0, accountId=qaId
const pending=new Map(),requests=[],results=[],errors=[]
const stamp='2026-10-14T01:00:00Z'
const categories=['ACCOUNT','PAYMENT','APPOINTMENT','SUPPORT','GENERAL']
let items=[]
function reset() {
  items=Array.from({length:35},(_,i)=>{
    const category=categories[i%5],id=`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`
    const kind={ACCOUNT:'users',PAYMENT:'payment-orders',APPOINTMENT:'appointments',SUPPORT:'contact-requests'}[category]
    return {id,type:category==='APPOINTMENT'?'CONSULTATION':category==='SUPPORT'?'CONTACT':'SYSTEM',audience:'ADMIN',category,title:`QA ${category} ${i+1}`,body:'Nội dung từ API fixture',created_at:stamp,...(kind?{deep_link:`nutrimom://admin/${kind}/${category==='PAYMENT'?'9223372036854775807':qaId}`}:{})}
  });fault='';extraCount=0;listDelay=0;writeDelay=0
}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
function command(method,params={}) {const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
socket.addEventListener('message',async event=>{
  const message=JSON.parse(event.data)
  if(message.id){const task=pending.get(message.id);if(task){pending.delete(message.id);if(message.error)task.reject(new Error(message.error.message));else task.resolve(message.result)};return}
  if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description || ''))
  if(message.method!=='Fetch.requestPaused') return
  const {requestId,request}=message.params,url=new URL(request.url),path=url.pathname.replace('/api/v1',''),q=url.searchParams
  const row={method:request.method,path,query:url.search,status:200};requests.push(row)
  let data,wait=0
  const headers=[{name:'Content-Type',value:'application/json'}]
  const failed=(status)=>{row.status=status;data={error:{code:status===429?'TOO_MANY_REQUESTS':status===403?'FORBIDDEN':status===401?'UNAUTHORIZED':'VALIDATION_ERROR',message:'QA response '+status,retryable:status===429}};if(status===429)headers.push({name:'Retry-After',value:'90'})}
  if(path==='/notifications') {
    assert.equal(q.get('audience'),'ADMIN');wait=listDelay
    if(fault==='429' || fault==='403' || fault==='401') failed(Number(fault))
    else if(fault==='cursor422' && q.has('cursor')) failed(422)
    else {
      const filtered=items.filter(i=>(!q.get('category') || i.category===q.get('category')) && (q.get('unreadOnly')!=='true' || !i.read_at))
      const offset=q.has('cursor')?20:0
      data={items:filtered.slice(offset,offset+20).map(i=>({...i})),has_more:filtered.length>offset+20,...(filtered.length>offset+20?{next_cursor:'opaque+/=?&next'}:{})}
      if(fault==='metadata')data.items=data.items.map(({audience:_a,category:_c,...i})=>i)
    }
  } else if(path==='/notifications/unread-count') {assert.equal(q.get('audience'),'ADMIN');data={count:items.filter(i=>!i.read_at).length+extraCount}}
  else if(path==='/notifications/read-all') {
    assert.equal(q.get('audience'),'ADMIN');wait=writeDelay
    if(fault==='write429')failed(429)
    else {let updated=0;items=items.map(i=>{if(!i.read_at && (!q.get('category') || i.category===q.get('category'))){updated++;return {...i,read_at:stamp}}return i});data={updated}}
  } else if(path.startsWith('/notifications/') && path.endsWith('/read')) {
    wait=writeDelay
    if(fault==='read404')failed(404)
    else {const id=path.split('/')[2];items=items.map(i=>i.id===id?{...i,read_at:i.read_at || stamp}:i);data=items.find(i=>i.id===id)}
  } else data=fixtureResponse(path,q,request.method,request.postData)
  if(path==='/auth/me')data={...qaUser,id:accountId}
  if(path==='/auth/login')data={...data,user:{...qaUser,id:accountId}}
  if(data===undefined){row.status=404;data={error:{code:'NOT_FOUND',message:'QA fixture unavailable'}}}
  if(wait)await delay(wait)
  try {await command('Fetch.fulfillRequest',{requestId,responseCode:row.status,responseHeaders:headers,body:Buffer.from(JSON.stringify(row.status===200?{data}:data)).toString('base64')})}catch{/* request canceled by a generation/session change */}
})
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);return result.result.value}
async function until(expression,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(`(()=>{try{return Boolean(${expression})}catch{return false}})()`))return;await delay(100)}throw new Error('Timed out: '+expression)}
async function navigate(path){await command('Page.navigate',{url:origin+path});await until("document.readyState==='complete'");await delay(400)}
async function spa(path){await evaluate(`(()=>{const a=document.createElement('a');a.href=${JSON.stringify(path)};a.addEventListener('click',e=>{e.preventDefault();history.pushState({},'',a.href);dispatchEvent(new PopStateEvent('popstate'))});a.click()})()`);await delay(250)}
async function click(selector){assert.equal(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;e.click();return true})()`),true,'Missing '+selector);await delay(200)}
async function button(text,root='.admin-page'){assert.equal(await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(root+' button')})].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e)return false;e.click();return true})()`),true,'Missing '+text);await delay(200)}
async function category(label){await click('[data-admin-select=category]');await until("!!document.querySelector('.admin-select-popup [role=option]')");await evaluate(`(()=>{const e=[...document.querySelectorAll('.admin-select-popup [role=option]')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e)throw Error('Missing category');e.click()})()`);await delay(250)}
const count=(path,from=0,method='GET')=>requests.slice(from).filter(r=>r.path===path&&r.method===method).length
const notifications=(from=0)=>requests.slice(from).filter(r=>r.path.startsWith('/notifications'))
async function record(name,run){const from=requests.length;await run(from);results.push({name,status:'PASS',requests:requests.slice(from)});console.log('PASS '+name)}
async function loaded(){await until("document.querySelector('.admin-notification-list li')?.offsetParent !== null && !!document.querySelector('.admin-notification-list li') && !document.querySelector('.admin-refresh-label') && !document.querySelector('.page-skeleton')")}
async function fresh(path='/admin/notifications'){reset();await navigate(path);await until("!!document.querySelector('.admin-shell')");if(path==='/admin/notifications')await loaded()}
async function loginAccount(id) {
  accountId=id
  await until("!!document.querySelector('input[name=identifier]')")
  for(const [name,value] of [['identifier','0900000001'],['password','QaPassword123!']]) {await evaluate(`document.querySelector('input[name=${name}]').focus()`);await command('Input.insertText',{text:value})}
  await click('button[type=submit]');await until("!!document.querySelector('.nm-notification-badge')")
}
async function screenshot(name,width=1440,dark=false){await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(dark?'dark':'light')}`);await delay(400);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Horizontal overflow');const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(new URL(name+'.png',output),Buffer.from(shot.data,'base64'))}

await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Page.bringToFront')
await command('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/*',requestStage:'Request'}]})
await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
try {
  await navigate('/login')
  const session={accessToken:'qa-fixture-token',refreshToken:'',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000,tokenType:'Bearer',user:{id:qaId,phone:'0900000001',displayName:'QA session',roles:['ADMIN'],status:'ACTIVE',createdAt:stamp}}
  await evaluate(`sessionStorage.setItem('nutrimom.auth-session',${JSON.stringify(JSON.stringify(session))})`)
  reset()
  await record('StrictMode mount closed: count=1 list=0',async from=>{await navigate('/admin');await until("!!document.querySelector('.nm-notification-badge')");assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),0)})
  await record('first open=1 list; reopen fresh=0; focus burst=0 count',async from=>{
    await click('.nm-notification-trigger');await until("document.querySelectorAll('.nm-notification-item').length===20");assert.equal(count('/notifications',from),1);assert.equal(count('/notifications/unread-count',from),0)
    const start=requests.length;await click('.nm-notification-trigger');await click('.nm-notification-trigger');await evaluate("for(let i=0;i<5;i++){window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))}");await delay(250);assert.equal(notifications(start).length,0)
  })
  await record('Xem tất cả navigates without owner remount or login animation; shared query cache',async from=>{
    await button('Xem tất cả','.nm-notification-panel');await loaded();assert.equal(await evaluate('location.pathname'),'/admin/notifications');assert.equal(notifications(from).length,0)
    assert.equal(await evaluate("document.querySelector('.admin-shell').classList.contains('admin-login-enter')"),false)
    await click('.nm-notification-trigger');assert.equal(count('/notifications',from),0);await click('.nm-notification-trigger')
  })
  await record('category/unread URL preserves other filter; badge total and dropdown remain all',async from=>{
    await category('Thanh toán & gói');await loaded();assert.equal(count('/notifications',from),1);assert.equal(count('/notifications/unread-count',from),0)
    assert.equal(await evaluate("[...document.querySelectorAll('.admin-notification-list li')].every(i=>i.textContent.includes('QA PAYMENT'))"),true)
    assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'35')
    await click('.admin-checkbox input');await loaded();assert.equal(await evaluate("new URLSearchParams(location.search).get('category')"),'PAYMENT')
    await category('Tài khoản');await loaded();assert.equal(await evaluate("new URLSearchParams(location.search).get('unreadOnly')"),'true')
    await click('.nm-notification-trigger');await until("document.querySelectorAll('.nm-notification-item').length===20");assert.equal(await evaluate("document.querySelector('.nm-notification-list').textContent.includes('QA PAYMENT')"),true);await click('.nm-notification-trigger')
  })
  await record('read-all captured category during filter change; reconciles count once and current query once',async from=>{
    writeDelay=700;await button('Đọc tất cả trong nhóm');await category('Thanh toán & gói');await delay(1000);writeDelay=0
    assert.equal(count('/notifications/read-all',from,'POST'),1);assert.ok(notifications(from).find(r=>r.path==='/notifications/read-all').query.includes('category=ACCOUNT'))
    assert.equal(count('/notifications/unread-count',from),1);assert.equal(await evaluate("document.querySelector('.admin-notification-list').textContent.includes('QA PAYMENT')"),true)
    assert.equal(items.filter(i=>i.category==='ACCOUNT'&&!i.read_at).length,0);assert.equal(items.filter(i=>i.category==='PAYMENT'&&!i.read_at).length,7)
    await category('Tài khoản');await until("!!document.querySelector('.admin-state')");assert.equal(await evaluate("!!document.querySelector('.admin-notification-list li')"),false)
  })
  await fresh()
  await record('double-click read=1 POST, count=1, reconcile list=1; read item opens without another POST',async from=>{
    // GENERAL has no deep link, allowing mutation assertions without leaving the page.
    await evaluate("(()=>{const b=[...document.querySelectorAll('.admin-notification-list li')].find(li=>li.textContent.includes('QA GENERAL')).querySelector('button');b.click();b.click()})()");await delay(700)
    assert.equal(requests.slice(from).filter(r=>r.method==='POST'&&r.path.endsWith('/read')).length,1);assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),1)
  })
  await record('already-read link only opens the existing drawer; order code remains a string',async from=>{
    items=items.map(i=>i.category==='PAYMENT'?{...i,read_at:stamp}:i);await button('Làm mới');await loaded();const start=requests.length
    await evaluate("[...document.querySelectorAll('.admin-notification-list li')].find(li=>li.textContent.includes('QA PAYMENT')).querySelector('button').click()");await until("location.pathname==='/admin/revenue'")
    await until("document.querySelector('.admin-revenue-page h1')?.textContent.includes('Doanh thu')")
    await until("document.querySelector('.admin-operational-detail')?.textContent.includes('9223372036854775807')")
    assert.equal(await evaluate("new URLSearchParams(location.search).get('orderCode')"),'9223372036854775807');assert.equal(requests.slice(start).filter(r=>r.path.startsWith('/notifications/')&&r.method==='POST').length,0)
    await spa('/admin/notifications');await loaded();assert.equal(count('/notifications/unread-count',from),0)
  })
  await record('same-filter refresh preserves items without skeleton',async from=>{listDelay=700;await button('Làm mới');assert.equal(await evaluate("document.querySelectorAll('.admin-notification-list li').length"),20);assert.equal(await evaluate("!!document.querySelector('.admin-loading')"),false);await delay(800);listDelay=0;assert.equal(count('/notifications',from),1)})
  await record('404 read gives a generic unavailable notice and does not navigate or reconcile',async from=>{fault='read404';await evaluate("document.querySelector('.admin-notification-list li button').click()");await until("document.querySelector('.admin-reference-notice')?.textContent.includes('không còn khả dụng')");assert.equal(await evaluate('location.pathname'),'/admin/notifications');assert.equal(count('/notifications/unread-count',from),0);assert.equal(count('/notifications',from),0);fault=''})
  await record('cursor page one request; malformed cursor recovers first page once',async from=>{
    fault='cursor422';await button('Tải thêm');await delay(500);assert.equal(count('/notifications',from),2);assert.equal(notifications(from).filter(r=>r.status===422).length,1);fault=''
    const start=requests.length;await button('Tải thêm');await until("document.querySelectorAll('.admin-notification-list li').length===35");assert.equal(count('/notifications',start),1)
  })
  await record('back/forward filters and invalid URLs issue no invalid API list',async()=>{
    await category('Tài khoản');await loaded();await category('Thanh toán & gói');await loaded();await evaluate('history.back()');await loaded();assert.equal(await evaluate("new URLSearchParams(location.search).get('category')"),'ACCOUNT');await evaluate('history.forward()');await loaded();assert.equal(await evaluate("new URLSearchParams(location.search).get('category')"),'PAYMENT')
    for(const query of ['category=','category=ALL','category=PAYMENT&category=ACCOUNT','unreadOnly=','unreadOnly=true&unreadOnly=false']){const from=requests.length;await spa('/admin/notifications?'+query);await until("!!document.querySelector('.admin-query-error')");assert.equal(count('/notifications',from),0)}
  })
  await fresh()
  await record('out-of-order filter responses cannot overwrite new feed or unlock old pagination',async from=>{listDelay=600;await category('Tài khoản');listDelay=0;await category('Thanh toán & gói');await loaded();await delay(800);assert.equal(await evaluate("[...document.querySelectorAll('.admin-notification-list li')].every(li=>li.textContent.includes('QA PAYMENT'))"),true);assert.equal(count('/notifications',from),2)})
  await fresh()
  await record('GET 429 preserves items and blocks retry, category, reopen, focus and read-all for family',async from=>{
    fault='429';await button('Làm mới');await until("document.querySelector('.admin-reference-notice')?.textContent.includes('QA response 429')");assert.equal(await evaluate("document.querySelectorAll('.admin-notification-list li').length"),20)
    const start=requests.length;await button('Làm mới');await category('Tài khoản');await click('.nm-notification-trigger');await click('.nm-notification-trigger');await evaluate("window.dispatchEvent(new Event('focus'))");await button('Đọc tất cả trong nhóm');await delay(300);assert.equal(notifications(start).length,0);assert.equal(notifications(from).length,1)
  })
  await fresh()
  await record('POST 429 blocks new GET filter and subsequent writes without dropping old data',async from=>{fault='write429';await button('Đọc tất cả');await until("document.querySelector('.admin-reference-notice')?.textContent.includes('QA response 429')");const start=requests.length;await category('Thanh toán & gói');await button('Đọc tất cả trong nhóm');await delay(300);assert.equal(notifications(start).length,0);assert.equal(count('/notifications/read-all',from,'POST'),1)})
  for(const status of ['401','403']) {
    await fresh();await record('terminal '+status+' clears sensitive feeds and closes/disables bell',async from=>{await click('.nm-notification-trigger');fault=status;await button('Làm mới');await until(status==='401'?"location.pathname==='/login'":"document.querySelector('.admin-content').textContent.includes('Bạn không đủ quyền')");assert.equal(await evaluate("!!document.querySelector('.admin-notification-list')"),false);if(status==='403'){assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').disabled"),true);assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').getAttribute('aria-expanded')"),'false')}else{assert.equal(await evaluate("sessionStorage.getItem('nutrimom.auth-session')"),null)}const start=requests.length;await evaluate("window.dispatchEvent(new Event('focus'))");await delay(250);assert.equal(notifications(start).length,0);assert.equal(count('/notifications',from),1)})
    if(status==='401')await evaluate(`sessionStorage.setItem('nutrimom.auth-session',${JSON.stringify(JSON.stringify(session))})`)
  }
  await fresh()
  await record('metadata contract failure stays visible; no fake Admin values or automatic invalid retry',async from=>{fault='metadata';await button('Làm mới');await until("document.querySelector('.admin-reference-notice')?.textContent.includes('hợp lệ')");const start=requests.length;await evaluate("window.dispatchEvent(new Event('focus'))");await delay(250);assert.equal(notifications(start).length,0);assert.equal(count('/notifications',from),1)})
  await fresh()
  await record('new-count pulse only after baseline; >99 badge; stale focus and offline use the single clock',async from=>{
    assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').classList.contains('is-new')"),false)
    await evaluate("window.qaOriginalNow=Date.now;window.qaOffset=0;Date.now=()=>window.qaOriginalNow()+window.qaOffset;window.qaOffset=61000")
    extraCount=80
    await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));window.dispatchEvent(new Event('focus'))");await delay(250);assert.equal(notifications(from).length,0)
    await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});window.dispatchEvent(new Event('online'))");await until("document.querySelector('.nm-notification-badge')?.textContent==='99+'");assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),1)
    assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').classList.contains('is-new')"),true)
    await evaluate("for(let i=0;i<5;i++)window.dispatchEvent(new Event('focus'))");await delay(250);assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),1)
    await evaluate('Date.now=window.qaOriginalNow');extraCount=0
  })
  await fresh('/admin')
  await record('hidden and closed feeds never poll list; returning visible stale reconciles count once',async from=>{
    await evaluate("window.qaOriginalNow=Date.now;window.qaOffset=61000;Date.now=()=>window.qaOriginalNow()+window.qaOffset;Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))")
    await delay(200);assert.equal(notifications(from).length,0)
    await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))")
    await delay(300);assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),0);await evaluate('Date.now=window.qaOriginalNow')
  })
  await fresh()
  await record('GET/POST from old account cannot restore badge or data after session switch',async()=>{
    writeDelay=2500;const from=requests.length;await button('Đọc tất cả');await evaluate("import('/src/core/auth/token-store.ts').then(m=>m.clearSession())");await until("location.pathname==='/login'")
    reset();items=items.slice(0,4).map(i=>({...i,title:'QB '+i.category}));await loginAccount('30000000-0000-4000-8000-000000000001')
    assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'4');const start=requests.length;await delay(2700)
    assert.equal(notifications(start).length,0);assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'4');assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').classList.contains('is-new')"),false);assert.equal(count('/notifications/read-all',from,'POST'),1)
    await spa('/admin/notifications');await loaded();listDelay=2500;await button('Làm mới');await evaluate("import('/src/core/auth/token-store.ts').then(m=>m.clearSession())");await until("location.pathname==='/login'")
    reset();await loginAccount(qaId);await spa('/admin/notifications');await loaded();await delay(2700)
    assert.equal(await evaluate("document.querySelector('.nm-notification-badge').textContent"),'35');assert.equal(await evaluate("document.querySelector('.admin-notification-list').textContent.includes('QB ')"),false)
  })
  await fresh()
  await record('read-all includes pages not loaded and dropdown uses whole Admin scope',async from=>{
    assert.equal(await evaluate("document.querySelectorAll('.admin-notification-list li').length"),20)
    await click('.nm-notification-trigger');await button('Đánh dấu tất cả đã đọc','.nm-notification-panel');await delay(600)
    assert.equal(items.filter(i=>!i.read_at).length,0);assert.equal(count('/notifications/read-all',from,'POST'),1)
    const request=notifications(from).find(r=>r.path==='/notifications/read-all');assert.equal(new URLSearchParams(request.query).has('category'),false)
    assert.equal(count('/notifications',from),1);assert.equal(count('/notifications/unread-count',from),1);assert.equal(await evaluate("!!document.querySelector('.nm-notification-badge')"),false);await click('.nm-notification-trigger')
  })
  await fresh()
  await record('mobile/dark/reduced motion, Escape/click outside and focus restore',async()=>{
    await screenshot('page-desktop');await screenshot('page-mobile-dark',390,true)
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
    await click('.nm-notification-trigger');await screenshot('bell-mobile-dark',390,true)
    assert.equal(await evaluate("(()=>{const panel=document.querySelector('.nm-notification-panel'),all=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Xem tất cả');return all.getBoundingClientRect().bottom<=panel.getBoundingClientRect().bottom})()"),true,'Xem tất cả must be visible in the panel')
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(100);assert.equal(await evaluate("document.activeElement.classList.contains('nm-notification-trigger')"),true)
    await click('.nm-notification-trigger');await evaluate("document.querySelector('.admin-page-heading').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");await delay(200);assert.equal(await evaluate("document.querySelector('.nm-notification-trigger').getAttribute('aria-expanded')"),'false')
  })
  await fresh('/admin')
  await record('actual timeout polling over 60 seconds: count=1 list=0 when bell closed',async from=>{await delay(61_000);assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),0)})
  assert.equal(errors.length,0,errors.join('\n'))
} catch(error) {results.push({name:'failure',status:'FAIL',reason:error.message});process.exitCode=1;console.error(error.stack);console.log(await evaluate("JSON.stringify({path:location.pathname,heading:document.querySelector('.admin-page-heading')?.textContent,buttons:[...document.querySelectorAll('.admin-page-heading button')].map(b=>({text:b.textContent,disabled:b.disabled}))})"))}
finally {await writeFile(new URL('browser-results.json',output),JSON.stringify({mode:'fixture',results,requests,errors},null,2));await command('Fetch.disable');socket.close()}
