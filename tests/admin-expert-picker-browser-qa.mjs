import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir,writeFile } from 'node:fs/promises'
import { qaId,qaUser,expert,fixtureResponse } from './admin-workspace-fixtures.mjs'
import { expertPerformanceFixture } from './admin-expert-performance-fixtures.mjs'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_DIR||'playwright')
const output=new URL('../qa/admin-workspace/expert-picker/',import.meta.url),origin=process.env.NUTRIMOM_QA_ORIGIN||'http://127.0.0.1:5175'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
const requests=[],errors=[],results=[];let total=8
await ctx.addInitScript(({qaId})=>sessionStorage.setItem('nutrimom.auth-session',JSON.stringify({accessToken:'qa-token',refreshToken:'qa-refresh',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000,tokenType:'Bearer',user:{id:qaId,phone:'0900000001',displayName:'QA',role:'ADMIN',roles:['ADMIN'],status:'ACTIVE',createdAt:'2026-01-01T00:00:00Z'}})),{qaId})
await ctx.route('**/api/v1/**',async route=>{
  const u=new URL(route.request().url()),path=u.pathname.replace(/^\/api\/v1/,''),q=u.searchParams
  requests.push({path,query:u.search})
  let data=path==='/auth/me'?qaUser:fixtureResponse(path,q)
  if(path==='/admin/dashboard')data=enrichDashboard(data)
  if(path==='/admin/experts/performance')data=expertPerformanceFixture(q,'missing')
  if(path==='/admin/experts/page'){
    let items=Array.from({length:total},(_,i)=>({...expert,user_id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,full_name:`Chuyên gia ${String(i+1).padStart(2,'0')}`,status:i===4?'INACTIVE':'ACTIVE'}))
    if(q.get('q'))items=items.filter(e=>e.full_name.toLowerCase().includes(q.get('q').toLowerCase()))
    const page=Number(q.get('page')||1),size=Number(q.get('pageSize')||20)
    data={items:items.slice((page-1)*size,page*size),page,page_size:size,total_items:items.length,total_pages:Math.ceil(items.length/size)}
  }
  await route.fulfill({status:data===undefined?404:200,contentType:'application/json',body:JSON.stringify(data===undefined?{error:{code:'RESOURCE_NOT_FOUND',message:'QA unavailable'}}:{data})})
})
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message))
const section=page.locator('[data-expert-performance]'),popup=page.locator('.admin-performance-expert-popup'),options=popup.locator('.admin-performance-expert-options button')
const reads=(start=0)=>requests.slice(start).filter(r=>r.path==='/admin/experts/page')
const open=async()=>{await section.getByRole('button',{name:/^Chuyên gia /}).click();await options.first().waitFor()}
const shot=async(name)=>page.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\/([A-Z]):/,'$1:')})
async function record(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS '+name)}
async function fits(){
  assert.ok(await popup.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}))
  assert.ok(await popup.locator('.admin-performance-picker-pages').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.admin-performance-expert-popup').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom}))
}
try{
  await page.goto(origin+'/admin');await section.locator('.admin-radar-axis').first().waitFor();await section.scrollIntoViewIfNeeded()
  await record('missing-data radar retains solid purple border and six axes',async()=>{
    const shape=section.locator('.recharts-radar-polygon .recharts-polygon');await shape.waitFor()
    assert.equal(await shape.evaluate(el=>getComputedStyle(el).strokeDasharray),'none');assert.equal(await section.locator('.admin-radar-axis').count(),6)
    assert.equal(await section.locator('.admin-radar-axis-value').nth(1).textContent(),'—');assert.equal(reads().length,0)
    await shot('solid-radar')
  })
  await record('all eight experts including inactive can be scrolled to and selected',async()=>{
    await open();assert.equal(await options.count(),8);await popup.getByText('1–8 / 8 chuyên gia').waitFor();assert.equal(reads().length,1)
    assert.equal(await options.filter({hasText:'Ngừng nhận lịch'}).count(),1)
    await options.last().scrollIntoViewIfNeeded();await fits()
    assert.ok(await options.last().evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.admin-performance-expert-options').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom}))
    await shot('eight-experts');await options.last().click();await popup.waitFor({state:'hidden'})
    assert.match(await section.getByRole('button',{name:/^Chuyên gia /}).innerText(),/Chuyên gia 08/)
    await open();assert.equal(reads().length,1);await page.keyboard.press('Escape')
  })
  await record('short viewport keeps search and last expert reachable',async()=>{
    await page.setViewportSize({width:1000,height:500});await section.locator('.admin-performance-toolbar').scrollIntoViewIfNeeded();await open();await fits()
    await options.last().scrollIntoViewIfNeeded();await options.last().click();await popup.waitFor({state:'hidden'})
  })
  await record('mobile popup scrolls inside viewport without page overflow',async()=>{
    await page.setViewportSize({width:390,height:844});await section.locator('.admin-performance-toolbar').scrollIntoViewIfNeeded();await open();await fits()
    await options.last().scrollIntoViewIfNeeded();await shot('mobile-picker');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape')
  })
  await record('pagination exposes expert 25 without prefetching every page',async()=>{
    total=25;await page.setViewportSize({width:1440,height:1000});await page.reload();await section.locator('.admin-radar-axis').first().waitFor();await section.scrollIntoViewIfNeeded()
    const start=requests.length;await open();assert.equal(await options.count(),20);assert.equal(reads(start).length,1)
    await options.last().scrollIntoViewIfNeeded();await fits();await popup.getByRole('button',{name:'Trang chuyên gia sau'}).click()
    await options.filter({hasText:'Chuyên gia 25'}).waitFor();assert.equal(await options.count(),5);assert.equal(reads(start).length,2)
    await popup.getByText('21–25 / 25 chuyên gia').waitFor();await fits();await shot('page-two')
  })
  await record('search from page two resets to page one and only fires one debounced request',async()=>{
    const start=requests.length,kpiBefore=requests.filter(r=>r.path==='/admin/experts/performance').length
    await popup.getByRole('searchbox').fill('Chuyên gia 23');await popup.getByText('1–1 / 1 chuyên gia').waitFor()
    assert.equal(await options.count(),1);assert.equal(reads(start).length,1);assert.match(reads(start)[0].query,/page=1&/)
    await options.first().click();await popup.waitFor({state:'hidden'});await open();assert.equal(await options.count(),20)
    assert.equal(await popup.getByRole('searchbox').inputValue(),'');assert.equal(reads(start).length,1)
    assert.equal(requests.filter(r=>r.path==='/admin/experts/performance').length,kpiBefore)
  })
  assert.deepEqual(errors,[]);await writeFile(new URL('results.json',output),JSON.stringify({results,requests,errors},null,2))
}catch(error){await shot('failure');await writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),body:await page.locator('body').innerText(),requests,errors},null,2));throw error}
finally{await browser.close()}
