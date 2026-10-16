import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { fixtureResponse, qaId, qaExpertId, qaUser, payment, page, resetQaNotifications } from './admin-workspace-fixtures.mjs'

const origin = process.env.NUTRIMOM_QA_ORIGIN || 'http://127.0.0.1:5174'
const output = new URL('../qa/admin-workspace/',import.meta.url)
const animationOnly = process.argv.includes('--login-animation-only')
// The redesigned timeline has a dedicated acceptance harness.
if (animationOnly) { await import('./admin-dashboard-redesign-browser-qa.mjs'); process.exit(0) }
const resultName = 'results.json'
await mkdir(output,{recursive:true})
const targets = await fetch('http://127.0.0.1:9223/json').then(r=>r.json())
const target = targets.find(t=>t.type==='page')
if(!target) throw new Error('Start the isolated headless QA Chrome on port 9223 first.')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0
const pending=new Map(), requests=[], errors=[], results=[]
let fixtures=true, fault='', completedDetail=false, role='ADMIN', exportFault=0, conflict=false, authDelay=0, dashboardDelay=0,completionDelay=0
socket.addEventListener('message',async event=>{
  const message=JSON.parse(event.data)
  if(message.id) {const item=pending.get(message.id);if(item){pending.delete(message.id);if(message.error)item.reject(new Error(message.error.message));else item.resolve(message.result)};return}
  if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''))
  if(message.method!=='Fetch.requestPaused') return
  const {requestId,request}=message.params
  const url=new URL(request.url), path=url.pathname.replace(/^\/api\/v1/,'')
  requests.push({path,query:url.search,method:request.method,authenticated:Boolean(request.headers.Authorization || request.headers.authorization)})
  if(!fixtures) {await command('Fetch.continueRequest',{requestId});return}
  let status=200,data,headers=[{name:'Content-Type',value:'application/json'}]
  if(authDelay && path==='/auth/me') await delay(authDelay)
  if(dashboardDelay && path==='/admin/dashboard') await delay(dashboardDelay)
  if(completionDelay && path.endsWith('/complete')) await delay(completionDelay)
  if(path.includes('/export')) {
    if(exportFault) {status=exportFault;data={error:{code:'EXPORT_LIMIT',message:'QA export limit',retryable:false}}}
    else {headers=[{name:'Content-Type',value:'text/csv; charset=utf-8'},{name:'Content-Disposition',value:'attachment; filename="qa-report.csv"'}]; await command('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:headers,body:Buffer.from('\ufeffid,title\n'+qaId+',QA\n').toString('base64')});return}
  } else if(path==='/admin/dashboard' && fault==='403') {status=403;data={error:{code:'FORBIDDEN',message:'QA permission revoked',retryable:false}}}
  else if(path==='/admin/dashboard' && fault==='404') {status=404;data={error:{code:'NOT_FOUND',message:'API chưa khả dụng',retryable:false}}}
  else if(path==='/admin/dashboard' && fault==='500') {status=500;data={error:{code:'SERVER_ERROR',message:'QA temporary failure',retryable:true}}}
  else if(path==='/admin/experts/'+qaExpertId && request.method==='PATCH' && conflict) {status=409;data={error:{code:'VERSION_CONFLICT',message:'QA version conflict',retryable:false}}}
  else {
    data=fixtureResponse(path,url.searchParams,request.method,request.postData)
    if(path==='/auth/me') data={...qaUser,roles:[role]}
    if(path.startsWith('/admin/contact-requests/') && data) data={...data,id:path.split('/')[3],user:{...data.user,phone:null,email:'support-qa@example.test'}}
    if(path==='/admin/appointments/'+qaId && completedDetail) data={...data,status:'COMPLETED',completed_at:data.updated_at}
    if(path==='/admin/dashboard' && fault==='invalid-money') data.kpis.real_collected_amount='bad'
    if(path==='/admin/appointments' && fault==='empty') data=page([],url.searchParams,0)
    if(data===undefined){status=404;data={error:{code:'NOT_FOUND',message:'QA fixture unavailable',retryable:false}}}
  }
  await command('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from(JSON.stringify(status===200?{data,meta:{request_id:'qa-request'}}:data)).toString('base64')})
})
function command(method,params={}) {const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression) {const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
async function until(expression,timeout=12000) {const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(`(()=>{try{return Boolean(${expression})}catch{return false}})()`))return;await delay(100)}throw new Error('Timed out: '+expression)}
async function navigate(path) {await command('Page.navigate',{url:origin+path});await until("document.readyState === 'complete'");await delay(300)}
async function click(text,selector='button') {assert.equal(await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.textContent.trim().includes(${JSON.stringify(text)}) || x.getAttribute('aria-label')?.includes(${JSON.stringify(text)}));if(!e)return false;e.click();return true})()`),true,'Missing control '+text);await delay(200)}
async function type(selector,value) {await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await command('Input.insertText',{text:value})}
function countRequests(path,from=0) {return requests.slice(from).filter(r=>r.path===path&&r.method==='GET').length}
async function record(name,task) {const from=requests.length;await task(from);results.push({name,status:'passed',requests:requests.slice(from)});console.log('PASS '+name)}
async function screenshot(name,width,height,dark=false) {await until("!document.querySelector('.admin-shell')?.classList.contains('admin-login-enter')");await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await command('Page.bringToFront');await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(dark?'dark':'light')}`);await delay(700);if(width>1020 && await evaluate("!!document.querySelector('.admin-nav-link')")) await until("[...document.querySelectorAll('.admin-nav-link')].every(e=>getComputedStyle(e).opacity==='1')");assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'Page overflow at '+width);const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});await writeFile(new URL(name+'.png',output),Buffer.from(result.data,'base64'))}
async function seedSession(nextRole='ADMIN') {role=nextRole;await evaluate(`sessionStorage.setItem('nutrimom.auth-session',${JSON.stringify(JSON.stringify({accessToken:'qa-token',refreshToken:'',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+7200000,tokenType:'Bearer',user:{id:qaId,phone:'0900000001',displayName:'QA session',roles:[nextRole],status:'ACTIVE',createdAt:'2026-01-01T00:00:00Z'}}))})`)}
await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/*',requestStage:'Request'}]});await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
// Downloads inside Vite's watched source tree trigger a full reload and erase instrumentation.
const downloadOutput = new URL('../../../QA_Admin_2026_10_15/downloads/',import.meta.url)
await mkdir(downloadOutput,{recursive:true})
await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:fileURLToPath(downloadOutput),eventsEnabled:true})
try {
  await navigate('/login')
  await evaluate("sessionStorage.removeItem('nutrimom.auth-session')")
  await navigate('/login');await until("!!document.querySelector('input[name=identifier]')")
  await record('credential login: one dashboard GET + one count GET, animation once',async from=>{
    await type('input[name=identifier]','0900000001');await type('input[name=password]','QaPassword123!')
    await click('Đăng nhập','button[type=submit]');await until("!!document.querySelector('.admin-workspace-kpis')");await delay(250)
    assert.equal(countRequests('/admin/dashboard',from),1);assert.equal(countRequests('/notifications/unread-count',from),1);assert.equal(countRequests('/notifications',from),0)
    assert.equal(await evaluate("document.querySelector('.admin-shell').classList.contains('admin-login-enter')"),true)
  })
  await record('focus before TTL and chart resize: zero reads',async from=>{await evaluate("window.dispatchEvent(new Event('focus'))");await delay(250);await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await delay(250);assert.equal(countRequests('/admin/dashboard',from),0);assert.equal(countRequests('/notifications/unread-count',from),0)})
  await record('desktop/tablet/mobile, dark theme, sidebar closed and no page overflow',async()=>{
    await screenshot('dashboard-desktop-1440',1440,1000)
    await screenshot('dashboard-tablet-1024',1024,900)
    await screenshot('dashboard-tablet-768',768,1024)
    for(const width of [360,390,430]) {await screenshot('dashboard-mobile-'+width,width,844);assert.equal(await evaluate("document.querySelector('.admin-sidebar').classList.contains('is-open')"),false)}
    await screenshot('dashboard-mobile-dark',390,844,true)
    await screenshot('dashboard-mobile-landscape',844,390)
  })
  await record('mobile menu focus trap, Escape and focus restoration',async()=>{
    await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate("document.querySelector('.admin-menu-button').focus();document.querySelector('.admin-menu-button').click()")
    await until("document.querySelector('.admin-sidebar').classList.contains('is-open')")
    await evaluate("document.querySelector('.admin-sidebar-close').focus()")
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});assert.equal(await evaluate("document.activeElement.getAttribute('href')"),'/admin/notifications')
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(200);assert.equal(await evaluate("document.activeElement.classList.contains('admin-menu-button')"),true)
  })
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await record('shadcn Vietnam calendar, animated month/year dropdown, draft dates and one Apply GET',async from=>{
    assert.match(await evaluate("document.querySelector('.admin-greeting').textContent"),/Hôm nay \d{2}\/\d{2}\/\d{2} \| \d{2}:\d{2}/)
    await evaluate("document.querySelector('.admin-date-trigger').click()");await until("!!document.querySelector('.admin-calendar [data-day]')")
    assert.equal(await evaluate("document.querySelector('.admin-calendar').textContent.includes('Tháng')"),true)
    await screenshot('calendar-desktop',1440,1000)
    await evaluate("document.querySelector('.admin-calendar-caption .admin-dropdown-trigger').click()");await until("!!document.querySelector('.admin-select-popup [role=option]')")
    const duration=await evaluate("getComputedStyle(document.querySelector('.admin-select-popup')).transitionDuration");assert.ok(duration.includes('0.24s'))
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(350)
    assert.equal(await evaluate("!!document.querySelector('.admin-date-popup')"),true,'Escape closes only nested select')
    await evaluate("[...document.querySelectorAll('.admin-calendar button[data-day]')].find(e=>e.textContent.trim()==='2' && !e.closest('.rdp-outside')).click()")
    await delay(300);assert.equal(countRequests('/admin/dashboard',from),0)
    await click('Áp dụng','.admin-period-filter button');await delay(350);assert.equal(countRequests('/admin/dashboard',from),1)
    await evaluate("document.querySelectorAll('.admin-date-trigger')[1].click()");await until("!!document.querySelector('.admin-calendar')");await screenshot('calendar-mobile',390,844)
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(350)
    assert.equal(await evaluate("!!document.querySelector('.admin-date-popup')"),false)
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
    await click('Tháng này','.admin-period-filter button');await delay(350)
  })
  await record('Admin account dropdown retains closing roll-up animation',async()=>{
    await evaluate("document.querySelector('.admin-profile-button').click()");await until("!!document.querySelector('.admin-profile-menu')");await delay(300)
    await evaluate("document.querySelector('.admin-profile-button').click()");assert.equal(await evaluate("!!document.querySelector('.admin-profile-menu')"),true)
    await delay(350);assert.equal(await evaluate("!!document.querySelector('.admin-profile-menu')"),false)
  })
  await record('bell first open uses one list request and cached page shares it',async from=>{
    await evaluate("document.querySelector('.nm-notification-trigger').click()");await until("document.querySelectorAll('.nm-notification-item').length>0")
    assert.equal(countRequests('/notifications',from),1);await click('Thông báo','.admin-nav-link');await until("!!document.querySelector('.admin-notification-list')");assert.equal(countRequests('/notifications',from),1)
  })
  await record('read all is idempotent, reconciles count and uses unread-only query',async from=>{
    await click('Đọc tất cả','.admin-heading-actions button');await until("document.querySelector('.admin-page-heading').textContent.includes('0 chưa đọc')")
    assert.equal(requests.slice(from).filter(r=>r.path==='/notifications/read-all').length,1)
    await evaluate("document.querySelector('.admin-checkbox input').click()");await delay(400)
    assert.ok(requests.slice(from).some(r=>r.path==='/notifications'&&new URLSearchParams(r.query).get('unreadOnly')==='true'))
  })
  await record('search 10 keys within 400ms: one list GET; page change: one list GET',async()=>{
    await click('Người dùng','.admin-nav-link');await until("!!document.querySelector('.admin-users-table')");const start=requests.length
    await evaluate("document.querySelector('.admin-filter-search input').focus()")
    for(const character of 'NguyenQA12') await command('Input.insertText',{text:character})
    await delay(750);assert.equal(countRequests('/admin/users',start),1);assert.equal(countRequests('/admin/users/summary',start),0)
    const next=requests.length;await click('Sau','.admin-table-pagination button');await delay(400);assert.equal(countRequests('/admin/users',next),1);assert.equal(countRequests('/admin/users/summary',next),0)
  })
  await record('independent user drawer and valid external deep link',async()=>{await navigate('/admin/users?userId='+qaId);await until("!!document.querySelector('[role=dialog] .admin-operational-detail')");assert.ok(await evaluate("document.querySelector('[role=dialog]').textContent.includes('Người dùng QA')"));await screenshot('user-drawer-mobile',390,844);await click('Đóng','.nm-dialog-close')})
  await record('invalid URL dates/status/page/UUID do not send appointment reads',async from=>{
    for(const filter of ['page=-1','status=NO_SHOW','requestId=bad','fromDate=2026-02-30&toDate=2026-03-01']) {await navigate('/admin/appointments?'+filter);await until("!!document.querySelector('.admin-query-error')")}
    assert.equal(countRequests('/admin/appointments',from),0)
  })
  await record('appointments waiting tab uses CREATED; history detail enforces COMPLETED',async()=>{
    await navigate('/admin/appointments');await until("!!document.querySelector('.admin-operational-table')");const from=requests.length;await click('Chờ tiếp nhận','.admin-management-tabs button');await delay(350);const r=requests.slice(from).find(r=>r.path==='/admin/appointments');assert.equal(new URLSearchParams(r.query).get('dateBasis'),'CREATED');assert.equal(new URLSearchParams(r.query).get('status'),'PENDING_EXPERT')
    await navigate('/admin/consultations?requestId='+qaId);await until("!!document.querySelector('[role=dialog] .admin-state')");assert.equal(await evaluate("document.querySelector('[role=dialog]').textContent.includes('COMPLETED')"),true)
    completedDetail=true;await click('Thử lại','[role=dialog] button');await until("!!document.querySelector('[role=dialog] .admin-operational-detail')");completedDetail=false;await click('Đóng','.nm-dialog-close')
  })
  await record('revenue mount two GETs; page only list; subscriptions only subscription GET',async()=>{
    await navigate('/admin/revenue');await until("!!document.querySelector('.admin-revenue-summary')");await until("!!document.querySelector('.admin-operational-table')");const from=requests.length
    await click('Sau','.admin-table-pagination button');await delay(350);assert.equal(countRequests('/admin/payment-orders',from),1);assert.equal(countRequests('/admin/revenue/summary',from),0)
    const tab=requests.length;await click('Gói đang sử dụng','.admin-management-tabs button');await delay(350);assert.equal(countRequests('/admin/subscriptions',tab),1);assert.equal(countRequests('/admin/payment-orders',tab),0);assert.equal(countRequests('/admin/revenue/summary',tab),0);assert.equal(await evaluate("document.querySelector('.admin-operational-table').textContent.includes('Hết hạn')"),true)
  })
  await record('payment code beyond JS safe integer loads detail unchanged',async()=>{await navigate('/admin/revenue?orderCode='+payment.order_code);await until("!!document.querySelector('[role=dialog] .admin-operational-detail')");assert.ok(await evaluate("document.querySelector('[role=dialog]').textContent.includes('9223372036854775807')"));await click('Đóng','.nm-dialog-close')})
  await record('three report previews, authenticated CSV, export errors have no retries',async()=>{
    await navigate('/admin/reports');await until("!!document.querySelector('.admin-report-summary')")
    await evaluate("(()=>{window.__qaCsvUrls=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=(blob)=>{const url=create(blob);const item={url,size:blob.size,type:blob.type,revoked:false};window.__qaCsvUrls.push(item);blob.arrayBuffer().then(bytes=>{item.prefix=[...new Uint8Array(bytes).slice(0,3)]});return url};URL.revokeObjectURL=(url)=>{const item=window.__qaCsvUrls.find(item=>item.url===url);if(item)item.revoked=true;revoke(url)}})()")
    const from=requests.length;await click('Tải CSV','.admin-heading-actions button');await delay(350);const request=requests.slice(from).find(r=>r.path.endsWith('/export'));assert.ok(request);assert.equal(request.authenticated,true);assert.equal(new URLSearchParams(request.query).has('page'),false);assert.equal(new URLSearchParams(request.query).has('pageSize'),false)
    const urls=await evaluate('window.__qaCsvUrls');
    if(!urls) console.log('CSV_QA_DIAGNOSTIC',JSON.stringify({ui:await evaluate("({path:location.pathname,error:document.querySelector('[role=alert]')?.textContent,hasSession:Boolean(sessionStorage.getItem('nutrimom.auth-session'))})"),requests:requests.slice(from)}));
    assert.ok(urls,'CSV instrumentation must remain in the same authenticated document');assert.equal(urls.length,1);assert.equal(urls[0].revoked,true);assert.deepEqual(urls[0].prefix,[239,187,191]);assert.ok(urls[0].size>3)
    for(const [type,label] of [['USERS_SUBSCRIPTIONS','Người dùng & Gói'],['REVENUE','Tiền thu']]) {await evaluate("document.querySelector('[data-admin-select=type]').click()");await until("!!document.querySelector('.admin-select-popup [role=option]')");await click(label,'.admin-select-popup [role=option]');await delay(350);assert.ok(await evaluate("!!document.querySelector('.admin-report-summary')"));assert.ok(requests.some(r=>r.path==='/admin/reports/'+type))}
    exportFault=422;const errorStart=requests.length;await click('Tải CSV','.admin-heading-actions button');await delay(350);assert.equal(await evaluate("document.querySelector('.admin-query-error').textContent.includes('10.000')"),true);assert.equal(requests.slice(errorStart).filter(r=>r.path.endsWith('/export')).length,1);exportFault=0
    exportFault=429;await click('Tải CSV','.admin-heading-actions button');await until("document.querySelector('.admin-heading-actions button')?.textContent.includes('Chờ')");const blocked=requests.length
    await click('Người dùng','.admin-nav-link');await until("!!document.querySelector('.admin-users-table')");await click('Báo cáo','.admin-nav-link');await until("!!document.querySelector('.admin-report-summary')")
    assert.equal(await evaluate("document.querySelector('.admin-heading-actions button').disabled"),true)
    await evaluate("document.querySelector('.admin-heading-actions button').click()");await delay(250);assert.equal(requests.slice(blocked).filter(r=>r.path.endsWith('/export')).length,0);exportFault=0
    await screenshot('reports-mobile',390,844)
  })
  await record('expert page DB pagination and shared specialties; double submit and 409 protection',async()=>{
    await navigate('/admin/experts');await until("!!document.querySelector('.admin-experts-table')");await click('Tạo chuyên gia','.admin-heading-actions button');await until("!!document.querySelector('input[name=phone]')")
    await type('input[name=phone]','0900000004');await type('input[name=password]','QaPassword123!');await type('input[name=fullName]','QA expert')
    await click('Chọn chuyên khoa','[role=combobox]');await click('Sức khỏe','[role=option]');const from=requests.length
    await evaluate("document.querySelector('.admin-editor-form').requestSubmit();document.querySelector('.admin-editor-form').requestSubmit()");await delay(500);assert.equal(requests.slice(from).filter(r=>r.path==='/admin/experts'&&r.method==='POST').length,1)
    await click('Xem chi tiết','.admin-row-action');await until("!!document.querySelector('.admin-expert-detail-actions')");await click('Sửa hồ sơ','.admin-expert-detail-actions button');conflict=true;await click('Lưu thay đổi','button[type=submit]');await until("!!document.querySelector('.admin-form-alert')");assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),true)
    await type('input[name=fullName]',' edit');assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),true);conflict=false;await click('Tải lại phiên bản mới','.admin-form-alert button');await delay(350);assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),false)
    await screenshot('expert-edit-desktop',1440,1000)
  })
  await record('email-only Support completes once without a detail/count refetch',async()=>{
    await navigate('/admin/support?status=PENDING');await until("!!document.querySelector('.admin-contact-table')")
    await navigate('/admin/support/'+qaId);await until("!!document.querySelector('.admin-contact-actions')")
    assert.ok(await evaluate("document.querySelector('.admin-contact-detail-page').textContent.includes('Chưa cung cấp')"))
    await click('Đánh dấu đã hoàn tất','.admin-contact-actions button');await until("!!document.querySelector('[role=alertdialog]')")
    const from=requests.length;await evaluate("(()=>{const b=[...document.querySelectorAll('[role=alertdialog] button')].find(e=>e.textContent.includes('Đã hoàn tất'));b.click();b.click()})()");await delay(400)
    assert.equal(requests.slice(from).filter(r=>r.path==='/admin/contact-requests/'+qaId+'/complete').length,1)
    assert.equal(countRequests('/notifications/unread-count',from),0)
    assert.equal(countRequests('/admin/contact-requests/'+qaId,from),0)
    assert.equal(await evaluate("!!document.querySelector('.admin-contact-actions')"),false)
    assert.equal(await evaluate("document.querySelector('.admin-contact-notice')?.textContent.includes('hoàn tất')"),true)
  })
  await record('late Support completion A cannot overwrite detail B after SPA navigation',async()=>{
    completionDelay=1200;await navigate('/admin/support/'+qaId);await until("!!document.querySelector('.admin-contact-actions')")
    await click('Đánh dấu đã hoàn tất','.admin-contact-actions button');await until("!!document.querySelector('[role=alertdialog]')")
    await click('Đã hoàn tất','[role=alertdialog] button')
    await evaluate(`history.pushState(history.state,'','/admin/support/${qaExpertId}');dispatchEvent(new PopStateEvent('popstate',{state:history.state}))`)
    await until("!!document.querySelector('.admin-contact-actions')");await delay(1500)
    assert.equal(await evaluate("location.pathname"),'/admin/support/'+qaExpertId)
    assert.equal(await evaluate("!!document.querySelector('.admin-contact-actions')"),true)
    assert.equal(await evaluate("!!document.querySelector('.admin-contact-notice')"),false);completionDelay=0
  })
  await record('Knowledge retains its editor and invalid URL filters cannot broaden the read',async()=>{
    await navigate('/admin/knowledge');await until("document.querySelector('.admin-page-heading')?.textContent.includes('Kiến thức')")
    await click('Bài viết mới','.admin-heading-actions button');await until("!!document.querySelector('[role=dialog]')")
    await screenshot('knowledge-editor-desktop',1440,1000)
    const from=requests.length;await navigate('/admin/knowledge?status=invalid');await until("!!document.querySelector('.admin-query-error')")
    assert.equal(countRequests('/admin/knowledge/articles',from),0)
  })
  await record('unsupported API and invalid financial contract surface errors; manual retry recovers',async()=>{
    for(const state of ['404','invalid-money']) {fault=state;await navigate('/admin');await until("document.querySelector('.admin-dashboard-error')");assert.ok((await evaluate("document.querySelector('[data-dashboard-metric=lifetime]').textContent")).includes('Dữ liệu chưa khả dụng'))}
    fault='';await click('Làm mới','.admin-dashboard-error button');await until("!document.querySelector('.admin-dashboard-error')")
  })
  await record('403 removes cached Admin payloads and prevents retry reads',async from=>{fault='403';await navigate('/admin');await until("document.querySelector('.admin-content').textContent.includes('Bạn không đủ quyền')");await evaluate("window.dispatchEvent(new Event('focus'))");await delay(350);assert.equal(countRequests('/admin/dashboard',from),1);assert.equal(await evaluate("!!document.querySelector('.admin-workspace-kpis')"),false);fault=''})
  await record('loading auth and revoked/non-admin roles never mount Admin data',async from=>{
    await seedSession('ADMIN');authDelay=1000;await navigate('/admin');assert.equal(countRequests('/admin/dashboard',from),0);await until("!!document.querySelector('.admin-workspace-kpis')");authDelay=0
    for(const nextRole of ['USER','EXPERT','CONTENT_EDITOR']) {await seedSession(nextRole);const start=requests.length;await navigate('/admin/appointments?requestId='+qaId);await delay(600);assert.equal(countRequests('/admin/appointments',start),0);assert.equal(countRequests('/admin/appointments/'+qaId,start),0)}
    role='ADMIN'
  })
  await record('restore/reload does not replay login animation; reduced motion is immediate',async()=>{
    await seedSession();await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('/admin');await until("!!document.querySelector('.admin-workspace-kpis')");assert.equal(await evaluate("document.querySelector('.admin-shell').classList.contains('admin-login-enter')"),false)
    await screenshot('dashboard-reduced-motion',1440,1000)
  })
  if(process.argv.includes('--hidden-120s')) await record('hidden for 120 seconds: zero unread count poll GETs',async from=>{
    await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
    await delay(120000);assert.equal(countRequests('/notifications/unread-count',from),0)
    await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))");await delay(300)
  })
  fixtures=false
  if(process.env.NUTRIMOM_ADMIN_PHONE && process.env.NUTRIMOM_ADMIN_PASSWORD) await record('actual local backend credential login result (no fixture)',async()=>{
    await navigate('/login');await evaluate("sessionStorage.removeItem('nutrimom.auth-session')");await navigate('/login');await until("!!document.querySelector('input[name=identifier]')")
    await type('input[name=identifier]',process.env.NUTRIMOM_ADMIN_PHONE);await type('input[name=password]',process.env.NUTRIMOM_ADMIN_PASSWORD);await click('Đăng nhập','button[type=submit]');await delay(1200)
    const destination=await evaluate('location.pathname');results.push({name:'real-backend-outcome',destination,authenticated:destination.startsWith('/admin'),limitation:destination.startsWith('/admin')?null:'Credential login rejected by current local backend. Integration remains unverified.'})
    await screenshot('real-backend-login',1440,1000)
  })
  else { results.push({name:'actual local backend credential login',status:'skipped',reason:'No live QA credentials supplied; fixtures are not a live integration test.'});console.log('SKIP actual local backend login: no live QA credentials supplied') }
  assert.equal(errors.length,0,'Browser runtime exceptions: '+errors.join('\n'))
  await writeFile(new URL(resultName,output),JSON.stringify({mode:animationOnly?'Fixture login animation QA':'Fixture behavior QA; final login uses actual backend',results,runtimeErrors:errors},null,2))
  console.log('QA completed: '+results.length+' checks; runtime errors '+errors.length)
} catch(reason) {
  await writeFile(new URL(resultName,output),JSON.stringify({results,runtimeErrors:errors,failure:reason.message},null,2))
  const capture=await command('Page.captureScreenshot',{format:'png',fromSurface:true});await writeFile(new URL('failure.png',output),Buffer.from(capture.data,'base64'))
  throw reason
} finally { resetQaNotifications(); socket.close() }
