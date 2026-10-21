import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { fixtureResponse, qaId, qaUser } from './admin-workspace-fixtures.mjs'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'

const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_DIR||'playwright')
const origin=process.env.NUTRIMOM_QA_ORIGIN||'http://127.0.0.1:5175',output=new URL('../qa/admin-workspace/expert-performance/',import.meta.url)
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1})
const requests=[],errors=[],results=[];let mode='full',fault=0,performanceDelay=0,filteredData=false
await context.addInitScript(({qaId})=>{if(location.pathname.startsWith('/admin'))sessionStorage.setItem('nutrimom.auth-session',JSON.stringify({accessToken:'qa-token',refreshToken:'qa-refresh',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000,tokenType:'Bearer',user:{id:qaId,phone:'0900000001',displayName:'Quản trị QA',role:'ADMIN',roles:['ADMIN'],status:'ACTIVE',createdAt:'2026-01-01T00:00:00Z'}}))},{qaId})
await context.route('**/api/v1/**',async route=>{
  const u=new URL(route.request().url()),path=u.pathname.replace(/^\/api\/v1/,'');requests.push({path,query:u.search,method:route.request().method()})
  let data=path==='/auth/me'?qaUser:fixtureResponse(path,u.searchParams,route.request().method(),route.request().postData()),status=data===undefined?404:200
  if(path==='/admin/dashboard')data=enrichDashboard(data)
  if(path==='/admin/experts/performance'){status=fault||200;data=fault?undefined:expertPerformanceFixture(u.searchParams,filteredData&&u.searchParams.get('specialty')==='PSYCHOLOGY'?'empty':mode);if(performanceDelay)await new Promise(resolve=>setTimeout(resolve,performanceDelay))}
  await route.fulfill({status,headers:{'Content-Type':'application/json',...(status===429?{'Retry-After':'3'}:{})},body:JSON.stringify(status===200?{data}:{error:{code:status===429?'RATE_LIMITED':'RESOURCE_NOT_FOUND',message:'QA: dữ liệu chưa khả dụng',retryable:false}})})
})
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
const count=(path,from=0)=>requests.slice(from).filter(r=>r.path===path&&r.method==='GET').length
const performancePath='/admin/experts/performance'
async function loaded(){await page.locator('[data-expert-performance] .admin-performance-summary').waitFor();await page.locator('.admin-dashboard-sections[data-content-ready="true"]').waitFor();await page.locator('[data-admin-chart="expert-performance"]').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.locator('[data-expert-performance] .admin-radar-axis-value').first().waitFor();await page.locator('[data-admin-chart="expert-performance"] svg').waitFor()}
async function record(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS '+name)}
try {
  await page.goto(`${origin}/admin`);await loaded()
  await record('one v3 KPI snapshot and no eager expert list requests',async()=>{assert.equal(count(performancePath),1);assert.ok(requests.some(r=>r.path===performancePath&&new URLSearchParams(r.query).get('calculationVersion')==='3'));assert.equal(count('/admin/experts/page'),0);assert.equal(await page.locator('.admin-radar-axis').count(),6);assert.equal(await page.locator('.admin-performance-summary > div').count(),5)})
  await record('desktop layout, glass fill, fixed 0–100 domain and tooltip',async()=>{
    const shape=page.locator('[data-admin-chart="expert-performance"] .recharts-radar-polygon .recharts-polygon');await shape.waitFor();assert.match(await shape.getAttribute('fill'),/^url\(/)
    const cards=await page.locator('.admin-performance-grid > .admin-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))
    assert.equal(cards[0].y,cards[1].y);assert.ok(cards[0].width>cards[1].width);assert.ok(cards[0].height<570)
    const dots=await page.locator('[data-admin-chart="expert-performance"] .recharts-radar-dots circle').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))})))
    const middle={x:(dots[0].x+dots[3].x)/2,y:(dots[0].y+dots[3].y)/2};const distance=p=>Math.hypot(p.x-middle.x,p.y-middle.y)
    assert.ok(distance(dots[0])>distance(dots[5]),'Higher score must be further out on its axis')
    const dot=page.locator('[data-admin-chart="expert-performance"] .recharts-radar-dots circle').first();await dot.hover();await page.locator('[data-admin-chart="expert-performance"] .admin-chart-tooltip').waitFor()
    await page.locator('[data-expert-performance]').screenshot({path:new URL('desktop-light.png',output).pathname.replace(/^\/(?:([A-Z]):)/,'$1:')})
  })
  await record('calendar accepts this month end and the response compares to the previous calendar month',async()=>{
    const section=page.locator('[data-expert-performance]'),before=requests.length
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()),last=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10)
    await section.getByRole('combobox',{name:/Kỳ KPI/}).click();await page.getByRole('option',{name:'Tùy chọn',exact:true}).click()
    await section.getByRole('button',{name:/KPI từ ngày/}).click()
    await page.locator('.admin-date-popup:not([data-ending-style]) button:not([disabled])').filter({hasText:/^1$/}).first().click()
    await section.getByRole('button',{name:/KPI đến ngày/}).click()
    const popup=page.locator('.admin-date-popup:not([data-ending-style])')
    const lastDay=popup.getByRole('button',{name:new RegExp(`^.*${Number(last.slice(8))} .*${Number(today.slice(5,7))}.*${today.slice(0,4)}`)})
    await lastDay.click();assert.equal(count(performancePath,before),0)
    assert.match(await section.getByRole('button',{name:/KPI từ ngày/}).innerText(),new RegExp(`01/${today.slice(5,7)}/${today.slice(0,4)}`))
    assert.match(await section.getByRole('button',{name:/KPI đến ngày/}).innerText(),new RegExp(`${last.slice(8)}/${today.slice(5,7)}/${today.slice(0,4)}`))
    assert.equal(await section.getByRole('button',{name:'Áp dụng',exact:true}).isEnabled(),true)
    await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(performancePath)&&new URL(r.url()).searchParams.get('toDate')===last),section.getByRole('button',{name:'Áp dụng',exact:true}).click()]);await loaded()
    assert.equal(count(performancePath,before),1)
    await section.locator('.admin-performance-method').getByText(/So với tháng lịch trước/).waitFor({state:'attached'})
  })
  await record('draft filters do not fetch; Apply changes KPI only',async()=>{
    const before=requests.length,section=page.locator('[data-expert-performance]')
    await section.getByRole('combobox',{name:/Kỳ KPI/}).click();await page.getByRole('option',{name:'30 ngày gần nhất'}).click();await page.waitForTimeout(100)
    assert.equal(count(performancePath,before),0);await section.getByRole('button',{name:'Áp dụng',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.admin-performance-method')?.textContent?.includes('Toàn đội ngũ'))
    await page.waitForFunction(()=>document.querySelector('[data-admin-chart="expert-performance"]')?.getAttribute('data-drawing')==='animating')
    const counter=page.locator('.admin-radar-axis-value').first(),early=await counter.textContent()
    await page.waitForTimeout(200);assert.notEqual(await counter.textContent(),early,'KPI percentage must count up after Apply')
    await page.waitForFunction(()=>document.querySelector('[data-admin-chart="expert-performance"]')?.getAttribute('data-drawing')==='static')
    assert.equal(await counter.textContent(),await counter.getAttribute('aria-label'))
    assert.equal(count(performancePath,before),1);assert.equal(count('/admin/dashboard',before),0);assert.equal(count('/admin/experts/page',before),0)
  })
  await record('expert picker loads on demand and selected snapshot is scoped',async()=>{
    const section=page.locator('[data-expert-performance]'),before=requests.length
    await section.getByRole('button',{name:/^Chuyên gia /}).click();await page.locator('.admin-performance-expert-options button').first().waitFor()
    assert.equal(count('/admin/experts/page',before),1);await page.locator('.admin-performance-expert-options button').first().click()
    assert.equal(count(performancePath,before),0);await section.getByRole('button',{name:'Áp dụng',exact:true}).click()
    await section.getByText('Tổng quan chuyên gia',{exact:true}).waitFor();assert.equal(count(performancePath,before),1)
  })
  await record('dark theme redraw does not fetch data',async()=>{const before=requests.length;await page.locator('.theme-toggle').click();await page.waitForTimeout(150);assert.equal(count(performancePath,before),0);await page.locator('[data-expert-performance]').screenshot({path:new URL('desktop-dark.png',output).pathname.replace(/^\/(?:([A-Z]):)/,'$1:')})})
  await record('historical missing entry actions do not erase schedule attendance',async()=>{mode='missing';await page.reload();await loaded();assert.equal(await page.locator('[data-admin-chart="expert-performance"] .recharts-radar-dots circle[data-missing="false"]').count(),5);assert.equal(await page.locator('.admin-radar-axis-value').nth(1).textContent(),'—');assert.equal(await page.locator('.admin-radar-axis-value').first().textContent(),'95,83%');assert.equal(await page.locator('.admin-performance-values').count(),0);assert.equal(await page.getByText('Chất lượng tư vấn',{exact:true}).count(),0);await page.locator('[data-expert-performance]').screenshot({path:new URL('legacy-completed.png',output).pathname.replace(/^\/(?:([A-Z]):)/,'$1:')})})
  await record('real zero and unavailable reviews retain distinct point markers',async()=>{mode='zero';await page.reload();await loaded();assert.equal(await page.locator('.admin-radar-axis-value').first().textContent(),'0%');assert.equal(await page.locator('.recharts-radar-dots circle[data-missing="true"]').count(),2);mode='partial';await page.reload();await loaded();assert.equal(await page.locator('.admin-radar-axis-value').nth(1).textContent(),'75%')})
  await record('both dashboard calendars block dates before the runtime schedule data minimum',async()=>{
    mode='partial-period';await page.reload();await loaded();const section=page.locator('[data-expert-performance]'),before=requests.length
    await section.getByRole('combobox',{name:/Kỳ KPI/}).click();await page.getByRole('option',{name:'Tùy chọn',exact:true}).click()
    for(const label of ['KPI từ ngày','KPI đến ngày']){
      await section.getByRole('button',{name:new RegExp(label)}).click();const popup=page.locator('.admin-date-popup:not([data-ending-style])')
      await popup.locator('.rdp-button_previous').click()
      assert.equal(await popup.locator('button').filter({hasText:/^21$/}).first().isDisabled(),true)
      assert.equal(await popup.locator('button').filter({hasText:/^22$/}).first().isEnabled(),true)
      assert.equal(await popup.locator('.rdp-button_previous').isDisabled(),true)
      await popup.getByRole('button',{name:'Đóng',exact:true}).click()
    }
    assert.equal(count(performancePath,before),0);mode='full'
  })
  await record('mobile stacks cards without page overflow',async()=>{mode='full';await page.setViewportSize({width:390,height:844});await page.reload();await loaded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const cards=await page.locator('.admin-performance-grid > .admin-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));assert.ok(cards[1]>cards[0]);assert.ok(await page.locator('.admin-performance-radar').evaluate(card=>{const bounds=card.getBoundingClientRect();return [...card.querySelectorAll('.admin-radar-axis text')].every(text=>{const r=text.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right&&r.top>=bounds.top&&r.bottom<=bounds.bottom})}),'Axis labels must fit inside the card');await page.locator('[data-expert-performance]').evaluate(n=>window.scrollTo(0,scrollY+n.getBoundingClientRect().top-90));await page.screenshot({path:new URL('mobile.png',output).pathname.replace(/^\/(?:([A-Z]):)/,'$1:')})})
  await record('reduced motion keeps radar static',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await loaded();assert.equal(await page.locator('[data-admin-chart="expert-performance"]').getAttribute('data-drawing'),'static');await page.emulateMedia({reducedMotion:'no-preference'})})
  await record('login starts KPI fetch during shell entrance and draws radar once',async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>sessionStorage.clear());await page.goto(`${origin}/login`)
    await page.locator('input[name="identifier"]').fill('0900000001');await page.locator('input[name="password"]').fill('QaPassword123!')
    const before=requests.length;await page.locator('button[type="submit"]').click();await page.locator('[data-expert-performance]').waitFor({state:'attached'})
    assert.equal(count(performancePath,before),1);assert.equal(await page.locator('[data-admin-chart="expert-performance"] svg').count(),0)
    await loaded();await page.waitForFunction(()=>document.querySelector('[data-admin-chart="expert-performance"]')?.getAttribute('data-drawing')==='static')
    assert.equal(count(performancePath,before),1)
  })
  await record('Apply sends one scoped request and settles after a slow filtered response',async()=>{
    mode='full';filteredData=true;performanceDelay=600;await page.reload();await loaded();
    const section=page.locator('[data-expert-performance]'),before=requests.length;
    await section.getByRole('combobox',{name:/Chuyên khoa KPI/}).click();await page.getByRole('option',{name:'Tâm lý',exact:true}).click();
    assert.equal(count(performancePath,before),0);await section.getByRole('button',{name:'Áp dụng',exact:true}).click();
    await page.locator('.admin-performance-skeleton').waitFor();assert.equal(await section.getByRole('button',{name:'Áp dụng',exact:true}).isDisabled(),true);
    await loaded();assert.equal(count(performancePath,before),1);assert.ok(requests.slice(before).some(r=>r.path===performancePath&&r.query.includes('specialty=PSYCHOLOGY')));
    assert.equal(await page.locator('.admin-radar-axis-value').first().textContent(),'—');assert.equal(await page.locator('.admin-performance-skeleton').count(),0);
  })
  await record('failed Apply stops loading and shows a retryable error without a request loop',async()=>{
    fault=500;const section=page.locator('[data-expert-performance]'),before=requests.length;
    await section.getByRole('combobox',{name:/Chuyên khoa KPI/}).click();await page.getByRole('option',{name:'Sức khỏe',exact:true}).click();await section.getByRole('button',{name:'Áp dụng',exact:true}).click();
    await section.getByText('QA: dữ liệu chưa khả dụng',{exact:false}).waitFor();await page.waitForTimeout(1000);
    assert.equal(count(performancePath,before),1);assert.equal(await page.locator('.admin-performance-skeleton').count(),0);
    fault=0;performanceDelay=0;filteredData=false;
  })
  await record('404 is isolated from dashboard and 429 does not trigger a retry loop',async()=>{fault=404;await page.reload();await page.getByText('Dữ liệu KPI chưa khả dụng cho phạm vi này.',{exact:false}).waitFor();assert.equal(await page.locator('[data-dashboard-metric]').count(),4);fault=429;const before=requests.length;await page.reload();await page.getByText('QA: dữ liệu chưa khả dụng',{exact:false}).waitFor();await page.waitForTimeout(1200);assert.equal(count(performancePath,before),1);assert.equal(await page.locator('[data-expert-performance]').getByRole('button',{name:'Thử lại',exact:true}).isDisabled(),true)})
  assert.deepEqual(errors,[]);await writeFile(new URL('results.json',output),JSON.stringify({results,requests,errors},null,2));await rm(new URL('failure.json',output),{force:true})
} catch(error) {
  await writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),url:page.url(),body:await page.locator('body').innerText().catch(()=>''),requests,errors},null,2))
  throw error
} finally {await browser.close()}
