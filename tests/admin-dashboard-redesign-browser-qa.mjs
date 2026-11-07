import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { fixtureResponse,resetQaNotifications } from './admin-workspace-fixtures.mjs'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'

const output=new URL('../qa/admin-workspace/redesign/',import.meta.url),origin=process.env.NUTRIMOM_QA_ORIGIN||'http://127.0.0.1:5174'
await mkdir(output,{recursive:true})
const target=(await fetch('http://127.0.0.1:9223/json').then(r=>r.json())).find(t=>t.type==='page'),socket=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})})
let sequence=0,mode='up',fault=0,delayDashboard=0,fixtures=true,serverStamp=null
let reviewsFault=0, emptyReviews=false, reviewDelay=0
const pending=new Map(),requests=[],results=[],errors=[]
socket.addEventListener('message',async event=>{
  const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result)}return}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)
  if(m.method!=='Fetch.requestPaused')return
  const {requestId,request}=m.params,u=new URL(request.url),path=u.pathname.replace(/^\/api\/v1/,'')
  requests.push({path,query:u.search,method:request.method,authenticated:Boolean(request.headers.Authorization||request.headers.authorization)})
  if(!fixtures){await cmd('Fetch.continueRequest',{requestId});return}
  if(path==='/admin/dashboard'&&delayDashboard)await wait(delayDashboard)
  let status=200,data=fixtureResponse(path,u.searchParams,request.method,request.postData)
  const headers=[{name:'Content-Type',value:'application/json'}]
  if(path==='/reviews/summary'){
    if(reviewDelay)await wait(reviewDelay)
    data=emptyReviews
      ? {total:0,by_rating:{1:0,2:0,3:0,4:0,5:0}}
      : {total:10,average:3.8,by_rating:{1:1,2:1,3:1,4:3,5:4}}
    if(reviewsFault){
      status=reviewsFault
      data={error:{code:status===429?'TOO_MANY_REQUESTS':'SERVER_ERROR',message:'QA reviews error',retryable:status===429}}
      if(status===429)headers.push({name:'Retry-After',value:'6'})
    }
  }
  if(path==='/admin/reviews')data={items:[],has_more:false}
  if(path==='/admin/reviews/pending-count')data={count:0}
  if(path==='/admin/analytics/traffic-summary')data={by_source:[]}
  if(path==='/admin/dashboard'){
    if(serverStamp)data.snapshot_at=serverStamp
    if(mode!=='legacy')data=enrichDashboard(data,mode)
    if(mode==='invalid'){data.overview.lifetime_real_collected_amount='bad';data.customer_snapshot.free_users=999}
    if(mode==='large')data.overview.lifetime_real_collected_amount=Number.MAX_SAFE_INTEGER
    if(fault){status=fault;data={error:{code:fault===429?'TOO_MANY_REQUESTS':'SERVER_ERROR',message:'QA controlled error',retryable:false}};if(fault===429)headers.push({name:'Retry-After',value:'3'})}
  }
  if(path==='/admin/revenue/summary'&&u.searchParams.get('range')==='ALL_TIME'){data.range='ALL_TIME';data.period=null}
  if(data===undefined){status=404;data={error:{code:'NOT_FOUND',message:'Fixture unavailable'}}}
  await cmd('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from(JSON.stringify(status===200?{data}:data)).toString('base64')})
})
function cmd(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function until(expression,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(`(()=>{try{return Boolean(${expression})}catch{return false}})()`))return;await wait(80)}throw new Error('Timeout '+expression)}
async function navigate(path){await cmd('Page.navigate',{url:origin+path});await until("document.readyState==='complete'");await wait(250)}
async function click(text,selector='button'){assert.equal(await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.includes(${JSON.stringify(text)})||e.getAttribute('aria-label')?.includes(${JSON.stringify(text)}));if(!e)return false;e.click();return true})()`),true,'Missing '+text);await wait(100)}
async function input(name,value){await evaluate(`document.querySelector('input[name=${name}]').focus()`);await cmd('Input.insertText',{text:value})}
const count=(path,from=0)=>requests.slice(from).filter(r=>r.path===path&&r.method==='GET').length
async function record(name,task){const from=requests.length;await task(from);results.push({name,status:'passed',requests:requests.slice(from)});console.log('PASS '+name)}
async function screenshot(name,width=1440,height=1000,captureBeyondViewport=true){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await cmd('Page.bringToFront');await wait(700);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Overflow '+width);const r=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport,fromSurface:true});await writeFile(new URL(name+'.png',output),Buffer.from(r.data,'base64'))}
async function login(){if(await evaluate('location.origin')!==origin)await navigate('/login');await evaluate("sessionStorage.removeItem('nutrimom.auth-session')");await navigate('/login');await until("!!document.querySelector('input[name=identifier]')");await input('identifier',fixtures?'0900000001':process.env.NUTRIMOM_ADMIN_PHONE);await input('password',fixtures?'QaPassword123!':process.env.NUTRIMOM_ADMIN_PASSWORD);await click('Đăng nhập','button[type=submit]');await until("!!document.querySelector('.admin-dashboard-redesign')")}
async function loaded(){await until("!document.querySelector('.admin-login-enter') && !document.querySelector('.admin-metric-skeleton')");await wait(300)}
async function key(key,windowsVirtualKeyCode){
  const text=key==='Enter'?'\r':undefined
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode,text,unmodifiedText:text})
  await cmd('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode})
}
async function revealAllCharts(){for(const id of ['adoption','monthly','plans','collections','registrations']){if(await evaluate(`!!document.querySelector('[data-admin-chart=${id}]')`)){await evaluate(`document.querySelector('[data-admin-chart=${id}]').scrollIntoView({block:'center'})`);await until(`!!document.querySelector('[data-admin-chart=${id}] svg')`);await wait(700)}}await evaluate('scrollTo(0,0)');await wait(150)}
await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Page.bringToFront');await cmd('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/*',requestStage:'Request'}]});await cmd('Emulation.setEmulatedMedia',{features:[]});await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
try{
  await record('reviews link and keyboard-operated plan breakdown share existing data',async from=>{
    await login();await loaded()
    const paid='[data-dashboard-metric=paid-plans]'
    const reviews='[data-dashboard-metric=reviews]'
    const popup='.admin-paid-plans-dialog'
    await until(`document.querySelector('${reviews} .admin-animated-number [aria-hidden=true]').textContent==='70,0%'`)
    assert.ok((await evaluate(`document.querySelector('${reviews}').textContent`)).includes('10 lượt đánh giá'))
    assert.ok((await evaluate(`document.querySelector('${paid}').textContent`)).includes('30 người'))
    await evaluate(`document.querySelector('${paid}').focus()`)
    assert.equal(await evaluate(`document.activeElement.matches('${paid}')`),true)
    await key('Enter',13)
    await until(`!!document.querySelector('${popup}[role=dialog]')`)
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${popup} li')].map(e=>e.textContent)`),['Gói 399K10 người','Gói 99K20 người'])
    const widths=await evaluate(`[...document.querySelectorAll('${popup} .admin-paid-plan-track > span')].map(e=>parseFloat(e.style.width))`)
    assert.ok(Math.abs(widths[0]-100/3)<0.001&&Math.abs(widths[1]-200/3)<0.001)
    assert.equal(count('/admin/subscriptions',from),0)
    assert.equal(count('/admin/dashboard',from),1)
    assert.equal(count('/reviews/summary',from),1)
    await screenshot('paid-plans-desktop',1440,1000,false)
    await key('Escape',27)
    await until(`!document.querySelector('${popup}') && document.activeElement.matches('${paid}')`)
    await click('Xem đánh giá',reviews)
    await until("location.pathname==='/admin/reviews' && !!document.querySelector('.nm-review-score')")
    assert.equal(count('/reviews/summary',from),1,'The reviews page should reuse the Dashboard summary')
    await evaluate("document.querySelector('.admin-nav-link[href=\"/admin\"]').click()")
    await until(`!!document.querySelector('${paid}')`)
    await click('Xem theo gói',paid)
    await click('Xem chi tiết',`${popup} a`)
    await until("location.pathname==='/admin/revenue' && !!document.querySelector('.admin-revenue-subscriptions')")
    assert.deepEqual(await evaluate("Object.fromEntries(new URLSearchParams(location.search))"),{tab:'subscriptions',effectiveStatus:'ACTIVE'})
    await until("!!document.querySelector('.admin-revenue-subscriptions .admin-table')")
    assert.equal(count('/admin/subscriptions',from),1)
    const subscriptionRequest=requests.slice(from).find(r=>r.path==='/admin/subscriptions')
    const subscriptionQuery=new URLSearchParams(subscriptionRequest.query)
    assert.equal(subscriptionQuery.get('effectiveStatus'),'ACTIVE')
    assert.equal(subscriptionQuery.has('planTier'),false)
  })
  await record('review loading, empty data and zero paid plans on mobile dark with reduced motion',async()=>{
    emptyReviews=true;reviewDelay=1800;mode='zero'
    await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
    await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
    await navigate('/admin')
    await until("!!document.querySelector('[data-dashboard-metric=reviews] .admin-metric-skeleton')")
    await until("document.querySelector('[data-dashboard-metric=reviews]').textContent.includes('Chưa có đánh giá')")
    assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=paid-plans]').textContent")).includes('0 người'))
    await evaluate("document.documentElement.dataset.theme='dark'")
    assert.equal(await evaluate('document.documentElement.scrollWidth'),390)
    await click('Xem theo gói','[data-dashboard-metric=paid-plans]')
    assert.ok(await evaluate("getComputedStyle(document.querySelector('.admin-paid-plans-dialog')).transitionDuration.split(',').every(value=>parseFloat(value)<0.001)"))
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.admin-paid-plans-dialog li')].map(e=>e.textContent)"),['Gói 399K0 người','Gói 99K0 người'])
    const modalBounds=await evaluate("(()=>{const r=document.querySelector('.admin-paid-plans-dialog').getBoundingClientRect();const v=visualViewport;return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,x:v.offsetLeft,y:v.offsetTop,width:v.width,height:v.height}})()")
    assert.ok(modalBounds.left>=modalBounds.x && modalBounds.right<=modalBounds.x+modalBounds.width
      && modalBounds.top>=modalBounds.y && modalBounds.bottom<=modalBounds.y+modalBounds.height,JSON.stringify(modalBounds))
    await screenshot('paid-plans-mobile-dark',390,844,false)
    await click('Đóng chi tiết gói','.admin-paid-plans-dialog button')
    await until("!document.querySelector('.admin-paid-plans-dialog')")
    await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
    emptyReviews=false;reviewDelay=0;mode='up'
  })
  await record('review 429 is isolated, respects Retry-After across navigation and does not retry in a loop',async from=>{
    reviewsFault=429
    await navigate('/admin')
    const unavailable="document.querySelector('[data-dashboard-metric=reviews]').textContent.includes('Dữ liệu chưa khả dụng')"
    await until(unavailable)
    assert.equal(count('/reviews/summary',from),1)
    assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=paid-plans]').textContent")).includes('30 người'))
    assert.equal(await evaluate("!!document.querySelector('.admin-dashboard-error[role=alert]')"),false)
    await click('Xem theo gói','[data-dashboard-metric=paid-plans]')
    await key('Escape',27)
    await click('Xem đánh giá','[data-dashboard-metric=reviews]')
    await until("location.pathname==='/admin/reviews'")
    await evaluate("document.querySelector('.admin-nav-link[href=\"/admin\"]').click()")
    await until(unavailable)
    await evaluate("window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange'))")
    await wait(350)
    assert.equal(count('/reviews/summary',from),1)
    reviewsFault=0
    await wait(6100)
    assert.equal(count('/reviews/summary',from),1)
    await click('Xem đánh giá','[data-dashboard-metric=reviews]')
    await until("location.pathname==='/admin/reviews' && !!document.querySelector('.nm-review-score')")
    assert.equal(count('/reviews/summary',from),2)
    await cmd('Emulation.setEmulatedMedia',{features:[]})
  })
  await record('one snapshot GET, KPI frames together then counts/sections/charts; greeting replaces search',async from=>{
    await login();await wait(250);assert.equal(count('/admin/dashboard',from),1);assert.equal(count('/notifications/unread-count',from),1);assert.equal(count('/notifications',from),0)
    assert.equal(await evaluate("!!document.querySelector('.admin-topbar input[type=search]')"),false)
    assert.equal(await evaluate("!!document.querySelector('.admin-page-heading')"),false)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.admin-workspace-kpis')).opacity==='0'"),true)
    assert.equal(await evaluate("document.querySelectorAll('[data-dashboard-metric]').length"),4)
    await until("getComputedStyle(document.querySelector('.admin-workspace-kpis')).opacity==='1'")
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.admin-topbar')).opacity==='1'"),true)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.admin-dashboard-sections')).opacity==='0'"),true)
    assert.equal(await evaluate("document.querySelectorAll('[data-slot=chart]').length"),0)
    await loaded();await revealAllCharts()
    assert.equal(count('/reviews/summary',from),1)
    await until("['monthly','plans'].every(id=>document.querySelector('[data-admin-chart='+id+']')?.dataset.drawing==='static')")
    assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=lifetime]').textContent")).includes('123.456.789'))
    assert.equal(await evaluate("document.querySelectorAll('.admin-period-card .admin-card').length"),0)
    const grid=await evaluate("(()=>{const a=document.querySelectorAll('.admin-primary-charts > *');return {left:a[0].getBoundingClientRect().width,right:a[1].getBoundingClientRect().width,heights:[...a].map(e=>e.getBoundingClientRect().height)}})()")
    assert.ok(grid.left/grid.right>1.5&&grid.left/grid.right<2.5);assert.equal(grid.heights[0],grid.heights[1])
    for(const path of ['/admin/users/summary','/admin/revenue/summary','/admin/subscriptions','/admin/appointments'])assert.equal(count(path,from),0)
    console.log('Monthly geometry '+JSON.stringify(await evaluate("(()=>{const e=document.querySelector('[data-admin-chart=monthly]');return {slot:e.getBoundingClientRect().width,chart:e.querySelector('[data-slot=chart]').getBoundingClientRect().width,wrapper:e.querySelector('.recharts-wrapper').getAttribute('style'),svg:e.querySelector('svg').getAttribute('viewBox'),grid:[...e.querySelectorAll('.recharts-cartesian-grid-horizontal line')].map(n=>n.getAttribute('x2'))}})()")))
    const physical=await evaluate("(()=>{const e=document.querySelector('[data-admin-chart=monthly]');return {wrapper:e.querySelector('.recharts-wrapper').getBoundingClientRect().width,svg:e.querySelector('.recharts-surface').getBoundingClientRect().width,grid:e.querySelector('.recharts-cartesian-grid-horizontal line').getBoundingClientRect().width}})()")
    assert.ok(Math.abs(physical.svg-physical.wrapper)<1)
    assert.ok(physical.grid>physical.wrapper*.75,'The revenue plot must fill its available width')
  })
  await wait(700)
  await record('theme, clock minute and hover make zero business GETs; clock does not mutate charts',async from=>{
    await evaluate("window.__chartChanges=0;window.__chartRecords=[];window.__chartObserver=new MutationObserver(records=>{window.__chartChanges++;window.__chartRecords.push(...records.map(r=>({type:r.type,name:r.attributeName,target:r.target.getAttribute?.('class')})))});document.querySelectorAll('[data-slot=chart]').forEach(e=>window.__chartObserver.observe(e,{subtree:true,childList:true,attributes:true}));window.__realDate=Date;window.__clockOffset=60000;window.Date=class extends window.__realDate{constructor(...args){super(...(args.length?args:[window.__realDate.now()+window.__clockOffset]))}static now(){return window.__realDate.now()}};document.dispatchEvent(new Event('visibilitychange'))")
    await wait(150);console.log('Clock chart mutations '+JSON.stringify(await evaluate('window.__chartRecords')));assert.equal(await evaluate('window.__chartChanges'),0)
    await evaluate("window.__chartObserver.disconnect();window.Date=window.__realDate;document.dispatchEvent(new Event('visibilitychange'))")
    await screenshot('desktop-light')
    await evaluate("document.querySelector('.theme-toggle').click()");await wait(150);assert.equal(count('/admin/dashboard',from),0)
    const point=await evaluate("(()=>{const e=document.querySelector('[data-admin-chart=monthly] .recharts-bar-rectangle');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()")
    await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await until("!!document.querySelector('.admin-chart-tooltip')");assert.ok((await evaluate("document.querySelector('.admin-chart-tooltip').textContent")).includes('đơn đã thanh toán'))
    await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});await screenshot('desktop-dark');await evaluate("document.documentElement.dataset.theme='light'")
    assert.equal(count('/admin/dashboard',from),0)
  })
  await record('draft dates zero GET; Apply one GET; same period zero; KPI live snapshot unchanged',async()=>{
    const metrics=await evaluate("[...document.querySelectorAll('[data-dashboard-metric] strong')].map(e=>e.textContent)")
    const from=requests.length;await evaluate("document.querySelector('.admin-date-trigger').click()");await until("!!document.querySelector('.admin-calendar')")
    await evaluate("[...document.querySelectorAll('.admin-calendar button[data-day]')].find(e=>e.textContent==='4'&&!e.closest('.rdp-outside')).click()")
    await wait(350);assert.equal(count('/admin/dashboard',from),0);await click('Áp dụng','.admin-period-filter button');await wait(400);assert.equal(count('/admin/dashboard',from),1)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-dashboard-metric] strong')].map(e=>e.textContent)"),metrics)
    const again=requests.length;await click('Áp dụng','.admin-period-filter button');await wait(250);assert.equal(count('/admin/dashboard',again),0)
  })
  await record('double Refresh one GET; cached internal return zero GET and no number replay',async()=>{
    const from=requests.length;await evaluate("document.querySelector('.admin-dashboard-refresh').click();document.querySelector('.admin-dashboard-refresh').click()");await wait(400);assert.equal(count('/admin/dashboard',from),1)
    await click('Người dùng','.admin-nav-link');await until("!!document.querySelector('.admin-users-table')");const back=requests.length;await click('Tổng quan','.admin-nav-link');await until("!!document.querySelector('.admin-dashboard-redesign')");await wait(400);assert.equal(count('/admin/dashboard',back),0);assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=lifetime] strong').textContent")).includes('123.456.789'))
  })
  await record('1440/1024/768/390/360, light/dark, keyboard and reduced motion',async()=>{
    for(const width of [1024,768,390,360]){await revealAllCharts();await screenshot('viewport-'+width,width,width<768?844:1000)}
    await evaluate("document.documentElement.dataset.theme='dark'");await screenshot('mobile-dark',390,844)
    await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await login();await loaded();await revealAllCharts();assert.equal(await evaluate("getComputedStyle(document.querySelector('.admin-metric-skeleton')||document.querySelector('.admin-workspace-kpis')).animationName"),'none');await screenshot('reduced-motion',390,844)
    await evaluate("document.querySelector('.admin-date-trigger').scrollIntoView({block:'center'});document.querySelector('.admin-date-trigger').focus()");await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await until("!!document.querySelector('.admin-date-popup')");await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await wait(250);assert.equal(await evaluate("document.activeElement.classList.contains('admin-date-trigger')"),true)
    await cmd('Emulation.setEmulatedMedia',{features:[]});await evaluate("document.documentElement.dataset.theme='light'");await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  })
  await record('slow API keeps geometry skeletons; late data does not replay frame; chart waits for readiness',async()=>{
    delayDashboard=6000;await login();await until("getComputedStyle(document.querySelector('.admin-dashboard-sections')).opacity==='1'")
    assert.equal(await evaluate("!!document.querySelector('.admin-metric-skeleton')"),true);assert.equal(await evaluate("document.querySelectorAll('[data-slot=chart]').length"),0);await screenshot('loading-desktop')
    const before=await evaluate("document.querySelector('.admin-primary-charts').getBoundingClientRect().height")
    await until("!document.querySelector('.admin-metric-skeleton')",12000);assert.equal(await evaluate("document.querySelector('.admin-primary-charts').getBoundingClientRect().height"),before);assert.equal(await evaluate("getComputedStyle(document.querySelector('.admin-workspace-kpis')).opacity"),'1')
    await revealAllCharts();delayDashboard=0
  })
  await record('zero/no history/up/down/flat/large and invalid/missing fields never invent metrics',async()=>{
    for(const next of ['zero','no-revenue','insufficient','up','down','flat','large','invalid','legacy']){
      mode=next;await navigate('/admin');await loaded()
      const text=await evaluate("document.querySelector('[data-dashboard-metric=adoption]').textContent")
      if(next==='zero')assert.ok(text.includes('Chưa có khách hàng'))
      if(['insufficient','up','down','flat'].includes(next)) {
        assert.ok(text.includes('10,0%'))
        assert.equal(await evaluate("document.querySelector('[data-dashboard-metric=adoption]').classList.contains('admin-stat-up')"),true)
      }
      if(next==='invalid'||next==='legacy'){
        for(const id of ['lifetime','paid-plans'])assert.ok((await evaluate(`document.querySelector('[data-dashboard-metric=${id}]').textContent`)).includes('Dữ liệu chưa khả dụng'))
      }
      if(next==='large')assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
    }
    mode='up'
  })
  await record('422/500 manual retry; shared 429 query cooldown with no automatic retry',async()=>{
    for(const status of [422,500]){fault=status;await navigate('/admin');await until("!!document.querySelector('.admin-dashboard-error')");const from=requests.length;await wait(250);assert.equal(count('/admin/dashboard',from),0);fault=0;await click('Làm mới','.admin-dashboard-error button');await until("!document.querySelector('.admin-dashboard-error')")}
    fault=429;await navigate('/admin');await until("!!document.querySelector('.admin-dashboard-error')");assert.equal(await evaluate("document.querySelector('.admin-dashboard-refresh').disabled"),true)
    const from=requests.length;await click('7 ngày','.admin-period-filter button');await wait(300);assert.equal(count('/admin/dashboard',from),0)
    fault=0;await wait(3300);assert.equal(count('/admin/dashboard',from),0);await click('Làm mới','.admin-dashboard-error button');await until("!document.querySelector('.admin-dashboard-error')");assert.equal(count('/admin/dashboard',from),1)
  })
  await record('Vietnam midnight invalidates active dashboard once without resetting selected period',async from=>{
    serverStamp='2027-01-01T00:00:00+07:00'
    await evaluate("window.__realDate=Date;window.__clockOffset=window.__realDate.parse('2027-01-01T00:00:00+07:00')-window.__realDate.now();window.Date=class extends window.__realDate{constructor(...args){super(...(args.length?args:[window.__realDate.now()+window.__clockOffset]))}static now(){return window.__realDate.now()}};document.dispatchEvent(new Event('visibilitychange'))")
    await wait(400);assert.equal(count('/admin/dashboard',from),1);const again=requests.length;await evaluate("document.dispatchEvent(new Event('visibilitychange'))");await wait(150);assert.equal(count('/admin/dashboard',again),0)
    await evaluate("window.Date=window.__realDate");serverStamp=null
  })
  await record('403 clears dashboard and prevents retries',async from=>{fault=403;await navigate('/admin');await until("document.querySelector('.admin-content').textContent.includes('Bạn không đủ quyền')");assert.equal(count('/admin/dashboard',from),1);assert.equal(await evaluate("!!document.querySelector('[data-dashboard-metric]')"),false);fault=0})
  if(process.env.NUTRIMOM_ADMIN_PHONE&&process.env.NUTRIMOM_ADMIN_PASSWORD){fixtures=false;await record('actual local BE legacy fields: no fabricated new KPI or ring',async()=>{await login();await loaded();assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=lifetime]').textContent")).includes('Dữ liệu chưa khả dụng'));await screenshot('actual-be-desktop');await screenshot('actual-be-mobile',390,844)})}
  assert.equal(errors.length,0)
}catch(error){results.push({name:'Failure',status:'failed',reason:error.message});console.log('Failure chart state '+JSON.stringify(await evaluate("({path:location.pathname,monthly:document.querySelector('[data-admin-chart=monthly]')?.outerHTML.slice(0,1600),charts:document.querySelectorAll('[data-slot=chart]').length})")));await screenshot('failure');throw error}
finally{await writeFile(new URL('results.json',output),JSON.stringify({checkedAt:new Date().toISOString(),mode:'Controlled test fixtures, final case uses actual local BE when credentials supplied',results,runtimeErrors:errors},null,2));resetQaNotifications();socket.close()}
