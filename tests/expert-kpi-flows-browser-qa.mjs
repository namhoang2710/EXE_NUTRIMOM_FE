import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { qaId, qaExpertId, qaUser, user, expert, fixtureResponse } from './admin-workspace-fixtures.mjs'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_DIR||'playwright')
const origin=process.env.NUTRIMOM_QA_ORIGIN||'http://127.0.0.1:5175',output=new URL('../qa/admin-workspace/kpi-flows/',import.meta.url)
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']})
const results=[],requests=[],errors=[]
const stamp='2026-10-15T19:50:00+07:00',preferred='2026-10-18',deadline='2026-10-16T08:30:00+07:00'
const pending={id:qaId,user_id:qaId,user_display_name:'Khách KPI QA',expert_user_id:null,expert_name:null,specialty:'HEALTH',assignment_type:'RANDOM',status:'PENDING_EXPERT',slot:null,note:'Yêu cầu kiểm thử',reviewed:false,can_review:false,completed_at:null,version:1,created_at:stamp,updated_at:stamp,preferred_date:preferred,acceptance_opened_at:stamp,acceptance_deadline_at:deadline,accepted_at:null,acceptance_policy_version:2,acceptance_status:'WAITING',server_time:stamp}
const pageDto=(items,q)=>({items,page:Number(q.get('page')||1),page_size:Number(q.get('pageSize')||20),total_items:items.length,total_pages:items.length?1:0})
async function session(role){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['camera','microphone']})
  await ctx.addInitScript(({role,qaId,qaExpertId})=>sessionStorage.setItem('nutrimom.auth-session',JSON.stringify({accessToken:'qa-'+role,refreshToken:'qa-refresh',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000,tokenType:'Bearer',user:{id:role==='EXPERT'?qaExpertId:qaId,phone:'0900000001',displayName:'QA',role,roles:[role],status:'ACTIVE',createdAt:'2026-01-01T00:00:00Z'}})),{role,qaId,qaExpertId})
  const state={accepted:false,expired:false,notice429:false,post429:false,conflict:false,kpiPartial:false,scheduleCase:false,schedulePaged:false,scheduleNoNext:false,posts:[]}
  await ctx.route('**/api/v1/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname.replace(/^\/api\/v1/,''),q=u.searchParams,method=req.method()
    requests.push({role,path,query:u.search,method,body:req.postData()});let data,status=200
    if(path==='/auth/me')data={...qaUser,id:role==='EXPERT'?qaExpertId:qaId,roles:[role]}
    else if(path==='/users/me')data={...user,onboarding_status:'COMPLETED'}
    else if(path==='/expert/me')data=expert
    else if(path==='/expert/schedule/summary')data=[{date:'2026-10-15',open_count:2,booked_count:0,closed_count:0,day_off:false}]
    else if(path==='/expert/schedule')data={date:q.get('date'),day_off:false,has_bookings:false,slots:[{start_time:'09:00:00',end_time:'09:30:00',state:state.conflict?'BOOKED':'OPEN',past:false}]}
    else if(path==='/expert/consultation-requests'){
      if(state.scheduleCase&&q.get('type')==='assigned'&&q.get('includeNext')==='true'){
        const item=(hour,index,day='2026-10-16')=>({...pending,id:qaId.slice(0,-2)+String(index).padStart(2,'0'),expert_user_id:qaExpertId,user_display_name:`Khách lúc ${hour}`,status:'PENDING_CONSULTATION',assignment_type:'DIRECT',slot:{id:qaId,slot_date:day,start_time:hour+':00',end_time:hour==='14:00'?'14:30:00':hour==='14:30'?'15:00:00':'15:30:00'},server_time:'2026-10-16T13:31:00+07:00'})
        const nearest=item('14:00',1),items=[item('15:00',3),item('14:30',2),nearest]
        if(state.schedulePaged)for(let i=1;i<=9;i++)items.unshift(item('15:00',i+3,`2026-10-${16+i}`))
        const page=Number(q.get('page')||1),size=Number(q.get('pageSize')||10)
        data={items:items.slice((page-1)*size,page*size),page,page_size:size,total_items:items.length,total_pages:Math.ceil(items.length/size),next_consultation:state.scheduleNoNext?null:nearest,server_time:'2026-10-16T13:31:00+07:00'}
      }else data=pageDto(q.get('type')==='pool'&&!state.accepted?[{...pending,...(state.expired?{preferred_date:'2026-10-14'}:{})}]:[],q)
    }
    else if(path.endsWith('/accept')){
      state.posts.push(JSON.parse(req.postData()));if(state.conflict){status=409;data={code:'SLOT_UNAVAILABLE',message:'Slot conflict'}}else{state.accepted=true;data={...pending,status:'PENDING_CONSULTATION',expert_user_id:qaExpertId,accepted_at:stamp,acceptance_status:'ACCEPTED_ON_TIME',slot:{id:qaId,slot_date:preferred,start_time:'09:00:00',end_time:'09:30:00'}}}
    }
    else if(path==='/notifications/unread-count')data={count:1}
    else if(path==='/notifications'){
      if(state.notice429){status=429;data={code:'RATE_LIMITED',message:'QA notification cooldown'}}
      else data={items:[{id:qaId,type:'CONSULTATION',audience:'USER',title:'Yêu cầu tư vấn mới',body:'Đúng chuyên khoa Sức khỏe',deep_link:'nutrimom://expert/consultations',created_at:stamp}],has_more:false}
    }
    else if(path.endsWith('/read')||path.endsWith('/read-all'))data={updated:1}
    else if(path==='/consultation-requests'){
      if(method==='POST'){
        state.posts.push(JSON.parse(req.postData()));if(state.post429){status=429;data={code:'RATE_LIMITED',message:'QA booking cooldown'}}else data=pending
      }else data=pageDto([],q)
    }
    else if(path==='/admin/reports/EXPERT_PERFORMANCE'){
      const snapshot=expertPerformanceFixture(new URLSearchParams([...q,['expertUserId',qaExpertId]]),state.kpiPartial?'partial-period':'full');snapshot.expert=null
      const row=expertPerformanceFixture(new URLSearchParams([...q,['expertUserId',qaExpertId]]),state.kpiPartial?'partial-period':'full')
      data={type:'EXPERT_PERFORMANCE',generated_at:snapshot.snapshot_at,timezone:snapshot.timezone,period:snapshot.period,summary:{snapshot},...pageDto([{expert:row.expert,summary:row.summary,axes:row.axes,schedule_summary:row.schedule_summary,checkin_summary:row.checkin_summary,data_coverage:row.data_coverage}],q)}
    }
    else if(path==='/admin/reports/EXPERT_PERFORMANCE/export'){
      await route.fulfill({status:200,headers:{'Content-Type':'text/csv;charset=UTF-8','Content-Disposition':'attachment; filename="expert-performance.csv"','Access-Control-Expose-Headers':'Content-Disposition'},body:'\ufeffExpert,Attendance\nQA,95.83\n'});return
    }
    else if(path===`/consultation-requests/${qaId}/video`){
      const now=Date.now();data={request_id:qaId,user_name:'Khách QA',expert_name:'Expert QA',specialty:'HEALTH',note:null,expert:true,consultation_status:'PENDING_CONSULTATION',state:'READY',can_join:true,configured:true,opens_at:new Date(now-300000).toISOString(),closes_at:new Date(now+1800000).toISOString(),server_time:new Date(now).toISOString()}
    }
    else if(path===`/consultation-requests/${qaId}/video/join`){
      await new Promise(resolve=>setTimeout(resolve,300));status=503;data={code:'VIDEO_PROVIDER_UNAVAILABLE',message:'QA: kết nối video chưa sẵn sàng'}
    }
    else data=fixtureResponse(path,q,method,req.postData())
    if(data===undefined){status=404;data={code:'RESOURCE_NOT_FOUND',message:'QA unavailable '+path}}
    await route.fulfill({status,headers:{'Content-Type':'application/json',...(status===429?{'Retry-After':'60'}:{})},body:JSON.stringify(status===200?{data}:{error:data})})
  })
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push({role,error:e.message}));return {ctx,page,state}
}
const shot=async(page,name)=>page.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\/([A-Z]):/,'$1:'),fullPage:true})
async function record(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS '+name)}
try{
  const e=await session('EXPERT');const p=e.page
  await p.goto(origin+'/expert?section=requests&request_type=pool');await p.getByRole('button',{name:'Nhận yêu cầu',exact:true}).waitFor()
  await record('expert deadline uses server tomorrow and preferred-date acceptance loads one day only',async()=>{
    await p.getByText(/Chậm nhất 08:30 ngày mai/).waitFor();const before=requests.length
    await p.getByRole('button',{name:'Nhận yêu cầu',exact:true}).click();const d=p.getByRole('dialog',{name:'Xếp lịch cho yêu cầu'})
    await d.locator('.consultation-time-grid button[data-state=open]').waitFor();assert.equal(await d.locator('input[type=date]').count(),0)
    const reads=requests.slice(before).filter(r=>r.path.startsWith('/expert/schedule'));assert.equal(reads.length,1);assert.match(reads[0].query,/date=2026-10-18/)
    await shot(p,'expert-deadline');await d.locator('.consultation-time-grid button[data-state=open]').click();await d.getByRole('button',{name:'Xác nhận tiếp nhận'}).click()
    await d.waitFor({state:'hidden'});assert.equal(e.state.posts.length,1);assert.equal(e.state.posts[0].slot_date,preferred)
  })
  await record('expert bell uses USER audience and pool deep link without patient navigation',async()=>{
    await p.getByRole('button',{name:'Thông báo',exact:true}).click();await p.getByRole('button',{name:/Yêu cầu tư vấn mới/}).click();await p.waitForURL('**/expert?section=requests&request_type=pool')
    for(const r of requests.filter(r=>r.role==='EXPERT'&&(r.path==='/notifications'||r.path==='/notifications/unread-count')))assert.match(r.query,/audience=USER/)
    await p.getByRole('dialog',{name:'Hộp thông báo'}).waitFor({state:'hidden'})
  })
  await e.ctx.close()
  const schedule=await session('EXPERT');schedule.state.scheduleCase=true
  await record('nearest expert banner uses 14:00 instead of descending 15:00, including across pages',async()=>{
    const page=schedule.page,before=requests.length
    await page.goto(origin+'/expert?section=schedule');await page.locator('.expert-next-call').waitFor()
    assert.match(await page.locator('.expert-next-call').innerText(),/14:00/)
    assert.match(await page.locator('.expert-consultation-list .expert-date-tile strong').first().innerText(),/15:00/)
    assert.equal(requests.slice(before).filter(r=>r.path==='/expert/consultation-requests'&&new URLSearchParams(r.query).get('includeNext')==='true').length,1)
    await shot(page,'expert-nearest')
    schedule.state.schedulePaged=true;await page.reload();await page.locator('.expert-next-call').waitFor()
    assert.match(await page.locator('.expert-next-call').innerText(),/14:00/)
    assert.equal(await page.locator('.expert-consultation-list .expert-date-tile strong').filter({hasText:'14:00'}).count(),0)
    const next=page.getByRole('button',{name:/Trang sau/});await next.click();await page.waitForURL('**/*schedule_page=2*')
    await page.locator('.expert-next-call').waitFor();assert.match(await page.locator('.expert-next-call').innerText(),/14:00/)
    schedule.state.scheduleNoNext=true;await page.reload();await page.locator('.expert-consultation-list').waitFor();assert.equal(await page.locator('.expert-next-call').count(),0)
  });await schedule.ctx.close()
  const c=await session('EXPERT');c.state.conflict=true;await c.page.goto(origin+'/expert?section=requests&request_type=pool')
  await record('slot conflict refreshes stale schedule and keeps submit disabled',async()=>{
    // First load exposes an open slot; server claims it immediately before submit.
    c.state.conflict=false;await c.page.getByRole('button',{name:'Nhận yêu cầu',exact:true}).click();const d=c.page.getByRole('dialog',{name:'Xếp lịch cho yêu cầu'})
    await d.locator('.consultation-time-grid button[data-state=open]').click();c.state.conflict=true;const before=requests.length;await d.getByRole('button',{name:'Xác nhận tiếp nhận'}).click()
    await d.getByText(/Khung giờ/).first().waitFor();assert.equal(requests.slice(before).filter(r=>r.path==='/expert/schedule').length,1);assert.equal(await d.getByRole('button',{name:'Xác nhận tiếp nhận'}).isDisabled(),true)
  })
  await c.ctx.close()
  const expired=await session('EXPERT');expired.state.expired=true;const expiredStart=requests.length;await expired.page.goto(origin+'/expert?section=requests&request_type=pool')
  await record('expired preferred date cannot be claimed or silently rescheduled',async()=>{
    await expired.page.getByText('Ngày mong muốn đã qua').waitFor();assert.equal(await expired.page.getByRole('button',{name:'Nhận yêu cầu',exact:true}).isDisabled(),true)
    assert.equal(requests.slice(expiredStart).filter(r=>r.path==='/expert/schedule'||r.method==='POST').length,0)
  });await expired.ctx.close()
  const n=await session('EXPERT');n.state.notice429=true;await n.page.goto(origin+'/expert?section=requests&request_type=pool')
  await record('429 notification does not loop on close/reopen or focus bursts',async()=>{
    await n.page.getByRole('button',{name:'Thông báo',exact:true}).click();await n.page.getByText('QA notification cooldown').waitFor()
    const before=requests.length;await n.page.keyboard.press('Escape');await n.page.getByRole('button',{name:'Thông báo',exact:true}).click();await n.page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('focus'))});await n.page.waitForTimeout(500)
    assert.equal(requests.slice(before).filter(r=>r.path.startsWith('/notifications')).length,0)
  });await n.ctx.close()
  const u=await session('USER');await u.page.goto(origin+'/app/consultations?mode=random')
  await record('user random booking sends chosen day and displays server deadline with no availability fetches',async()=>{
    await u.page.getByRole('radio',{name:/Sức khỏe/}).click();await u.page.locator('#random-panel input[type=date]').fill(preferred)
    await u.page.getByRole('button',{name:'Gửi yêu cầu tư vấn'}).click();await u.page.getByText(/Chậm nhất 08:30 ngày mai/).waitFor()
    assert.equal(u.state.posts.length,1);assert.deepEqual(u.state.posts[0],{assignment_type:'RANDOM',specialty:'HEALTH',preferred_date:preferred})
    assert.equal(requests.filter(r=>r.role==='USER'&&r.path.includes('/availability')).length,0);await shot(u.page,'user-deadline')
  });await u.ctx.close()
  const limited=await session('USER');limited.state.post429=true;await limited.page.goto(origin+'/app/consultations?mode=random')
  await record('booking 429 blocks repeated submission without another HTTP request',async()=>{
    await limited.page.getByRole('radio',{name:/Sức khỏe/}).click();await limited.page.getByRole('button',{name:'Gửi yêu cầu tư vấn'}).click()
    await limited.page.getByText('QA booking cooldown').waitFor();await limited.page.getByRole('button',{name:'Gửi yêu cầu tư vấn'}).click()
    await limited.page.waitForTimeout(300);assert.equal(limited.state.posts.length,1)
  });await limited.ctx.close()
  const a=await session('ADMIN');await a.page.goto(origin+'/admin/reports?type=EXPERT_PERFORMANCE')
  await record('KPI report preview and CSV preserve filter scope and omit revenue source',async()=>{
    await a.page.locator('.admin-kpi-report-table tbody tr').first().waitFor();assert.equal(await a.page.locator('.admin-kpi-report-table th').count(),4)
    assert.equal(await a.page.locator('.admin-kpi-report-table tbody tr').first().locator('.admin-kpi-score').count(),6)
    const download=a.page.waitForEvent('download');await a.page.getByRole('button',{name:'Tải CSV'}).click();assert.equal((await download).suggestedFilename(),'expert-performance.csv')
    for(const r of requests.filter(r=>r.path.startsWith('/admin/reports/EXPERT_PERFORMANCE'))){assert.equal(new URLSearchParams(r.query).has('source'),false);assert.equal(new URLSearchParams(r.query).get('calculationVersion'),'3')}
    await shot(a.page,'report');assert.deepEqual(errors,[])
  })
  await record('KPI detail popup shows six comparisons without changing the table or fetching',async()=>{
    const trigger=a.page.getByRole('button',{name:'Xem chi tiết',exact:true}).first(),before=requests.length
    const row=a.page.locator('.admin-kpi-report-table tbody tr').first(),height=await row.evaluate(node=>node.getBoundingClientRect().height)
    await trigger.click();const dialog=a.page.getByRole('dialog',{name:/Chi tiết KPI/});await dialog.waitFor()
    assert.equal(await dialog.locator('.admin-kpi-details-metric').count(),6)
    assert.equal(await dialog.locator('.admin-kpi-details-periods>div').count(),2)
    assert.match(await dialog.innerText(),/điểm phần trăm/)
    assert.equal(await row.evaluate(node=>node.getBoundingClientRect().height),height)
    const light=await dialog.evaluate(node=>getComputedStyle(node).backgroundColor)
    await shot(a.page,'report-detail')
    await a.page.evaluate(()=>document.documentElement.dataset.theme='dark')
    assert.notEqual(await dialog.evaluate(node=>getComputedStyle(node).backgroundColor),light)
    await shot(a.page,'report-detail-dark')
    await a.page.evaluate(()=>document.documentElement.dataset.theme='light')
    await a.page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
    assert.equal(await trigger.evaluate(node=>node===document.activeElement),true)
    assert.equal(requests.slice(before).filter(r=>r.path.startsWith('/admin/reports/EXPERT_PERFORMANCE')).length,0)
  })
  await record('report draft changes wait for Apply and issue one scoped preview',async()=>{
    const before=requests.length
    await a.page.getByRole('combobox',{name:/Chuyên khoa KPI/}).click();await a.page.getByRole('option',{name:'Sức khỏe',exact:true}).click()
    assert.equal(requests.slice(before).filter(r=>r.path==='/admin/reports/EXPERT_PERFORMANCE').length,0)
    const refreshed=a.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/reports/EXPERT_PERFORMANCE')&&new URL(r.url()).searchParams.get('specialty')==='HEALTH')
    await a.page.getByRole('button',{name:'Áp dụng',exact:true}).click();await refreshed;await a.page.locator('.admin-kpi-report-table tbody tr').first().waitFor()
    const reads=requests.slice(before).filter(r=>r.path==='/admin/reports/EXPERT_PERFORMANCE');assert.equal(reads.length,1);assert.match(reads[0].query,/specialty=HEALTH/)
  })
  await record('report calendars use the same runtime minimum and partial-month popup avoids trend claims',async()=>{
    a.state.kpiPartial=true;await a.page.reload();await a.page.locator('.admin-kpi-report-table tbody tr').first().waitFor();const before=requests.length
    for(const label of ['Từ ngày KPI','Đến ngày KPI']){
      await a.page.getByRole('button',{name:new RegExp(label)}).click();const popup=a.page.locator('.admin-date-popup:not([data-ending-style])')
      await popup.locator('.rdp-button_previous').click()
      assert.equal(await popup.locator('button').filter({hasText:/^21$/}).first().isDisabled(),true)
      assert.equal(await popup.locator('button').filter({hasText:/^22$/}).first().isEnabled(),true)
      assert.equal(await popup.locator('.rdp-button_previous').isDisabled(),true)
      await popup.getByRole('button',{name:'Đóng',exact:true}).click()
    }
    await a.page.getByRole('button',{name:'Xem chi tiết',exact:true}).first().click();const dialog=a.page.getByRole('dialog',{name:/Chi tiết KPI/});await dialog.waitFor()
    assert.match(await dialog.innerText(),/chưa đủ kỳ/)
    assert.equal(await dialog.locator('.admin-kpi-details-change[data-direction=up],.admin-kpi-details-change[data-direction=down]').count(),0)
    await shot(a.page,'report-partial-period');await a.page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
    assert.equal(requests.slice(before).filter(r=>r.path.startsWith('/admin/reports/EXPERT_PERFORMANCE')).length,0)
    a.state.kpiPartial=false;await a.page.reload();await a.page.locator('.admin-kpi-report-table tbody tr').first().waitFor()
  })
  await record('report mobile shows complete expert cards without horizontal scrolling',async()=>{
    await a.page.setViewportSize({width:390,height:844});await a.page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth)
    assert.equal(await a.page.locator('.admin-kpi-report-table').evaluate(node=>node.scrollWidth<=node.clientWidth),true)
    assert.equal(await a.page.locator('.admin-kpi-report-table tbody tr').first().locator('.admin-kpi-score').count(),6)
    await shot(a.page,'report-mobile')
    await a.page.getByRole('button',{name:'Xem chi tiết',exact:true}).first().click()
    const dialog=a.page.getByRole('dialog',{name:/Chi tiết KPI/});await dialog.waitFor()
    assert.ok(await dialog.evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}))
    assert.equal(await dialog.locator('.admin-kpi-details-body').evaluate(node=>node.scrollWidth<=node.clientWidth),true)
    await dialog.getByRole('button',{name:'Đóng',exact:true}).focus();await a.page.keyboard.press('Tab')
    await a.page.waitForFunction(()=>document.querySelector('.admin-kpi-details')?.contains(document.activeElement))
    await shot(a.page,'report-detail-mobile')
    await dialog.getByRole('button',{name:'Đóng chi tiết KPI'}).click();await dialog.waitFor({state:'hidden'})
  });await a.ctx.close()
  const call=await session('EXPERT');await call.page.goto(origin+`/expert/consultations/${qaId}/call`)
  await record('preview does not check in; actual entry sends one join POST without a duplicate check-in request',async()=>{
    const button=call.page.getByRole('button',{name:'Vào phòng tư vấn',exact:true});await button.waitFor()
    assert.equal(requests.filter(r=>r.path.endsWith('/video/join')||r.path.endsWith('/video/check-in')).length,0)
    await button.dblclick();await call.page.getByText('QA: kết nối video chưa sẵn sàng',{exact:true}).waitFor()
    await call.page.waitForTimeout(500)
    const joins=requests.filter(r=>r.path.endsWith('/video/join'));assert.equal(joins.length,1);assert.equal(joins[0].method,'POST');assert.equal(joins[0].body,null)
    assert.equal(requests.filter(r=>r.path.endsWith('/video/check-in')).length,0)
  });await call.ctx.close()
  await writeFile(new URL('results.json',output),JSON.stringify({results,requests,errors},null,2));await rm(new URL('failure.json',output),{force:true})
}catch(error){
  const debug=[];for(const context of browser.contexts())for(const page of context.pages()){
    debug.push({url:page.url(),overflow:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth&&r.width>0}).slice(0,20).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right})))})
    await shot(page,'failure')
  }
  await writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),results,requests,errors,debug},null,2));throw error
}
finally{await browser.close()}
