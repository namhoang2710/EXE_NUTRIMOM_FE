import assert from 'node:assert/strict'
import { preview } from 'vite'
import { browser, server, output, pageErrors, writeFile } from './helpers/nutrition-browser.mjs'
import { session } from './helpers/workspace-browser.mjs'
import { entitlementsFor } from './fixtures/subscription-plans.ts'

const port = Number(process.env.NUTRITION_QA_PORT || 5195), base = `http://127.0.0.1:${port}`
const baselineDist = process.env.OVERVIEW_FOOTER_BASELINE_DIST
const results = [], contexts = []
let baseline
const review = { id: '96a80ace-5c5d-46b0-bae4-6c454564ec44', rating: 5, content: 'NutriMom giúp gia đình theo dõi hành trình mỗi ngày.', author: { display_name: 'M*** A**' }, created_at: '2026-10-24T18:00:00Z' }
async function open(role='guest', options={}) {
  const f = await session(role, true, { theme: options.theme || 'light', reducedMotion: options.motion || 'reduce' })
  contexts.push(f.context)
  const state = { count: 1, reviewMode: 'ready', planMode: 'ready', tier: 'PLAN_399K', ...options, calls: {} }
  await f.context.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.hostname !== '127.0.0.1' && !url.pathname.startsWith('/api/v1/') ? route.fulfill({status:200,body:'',contentType:'text/javascript'}) : route.fallback()
  })
  await f.context.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1','')
    state.calls[path] = (state.calls[path] || 0) + 1
    const ok = data => route.fulfill({json:{data}})
    if(path==='/analytics/traffic/visit') return ok({recorded:true,source:'DIRECT'})
    if(path==='/reviews/summary' || path==='/reviews') {
      if(state.reviewMode==='loading') await new Promise(resolve=>setTimeout(resolve,1400))
      if(state.reviewMode==='error') return route.fulfill({status:503,json:{error:{code:'SERVICE_UNAVAILABLE',message:'Chưa thể tải đánh giá.'}}})
      if(state.reviewMode==='limited') return route.fulfill({status:429,headers:{'Retry-After':'5'},json:{error:{code:'RATE_LIMITED',message:'Vui lòng chờ.',retryable:true}}})
      if(path==='/reviews/summary') return ok({average:state.count?5:null,total:state.count,by_rating:{'1':0,'2':0,'3':0,'4':0,'5':state.count}})
      return ok({items:Array.from({length:Math.min(state.count,2)},(_,index)=>({...review,id:index?'d8988238-d434-416b-a82e-e9a9f50caf9f':review.id,...(state.long?{content:'Nội dung đánh giá dài cần xuống dòng tự nhiên trên mọi màn hình. '.repeat(12),author:{display_name:'Tên khách hàng dài để kiểm tra bố cục'}}:{})})),has_more:false})
    }
    if(path==='/subscriptions/me') {
      if(state.planMode==='loading') await new Promise(resolve=>setTimeout(resolve,1400))
      if(state.planMode==='error') return route.fulfill({status:503,json:{error:{code:'SERVICE_UNAVAILABLE',message:'Chưa thể tải gói.'}}})
      if(state.planMode==='limited') return route.fulfill({status:429,headers:{'Retry-After':'5'},json:{error:{code:'RATE_LIMITED',message:'Vui lòng chờ.',retryable:true}}})
      return ok({...entitlementsFor(state.tier),...(state.long?{plan_name:'Gói chăm sóc toàn diện dành cho mẹ và gia đình trong cả hành trình'}:{}),...(state.expired?{end_date:'2026-01-01T00:00:00Z',days_remaining:0}:{})})
    }
    return route.fallback()
  })
  return {...f,testState:state}
}
async function visit(f, url, selector) {
  await f.page.goto(url)
  await f.page.locator(selector).waitFor()
  await f.page.evaluate(()=>document.fonts.ready)
}
async function fits(page, selector) {
  const rects = await page.locator(selector).evaluateAll(elements=>elements.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}}))
  assert(rects.length && rects.every(r=>r.x>=-1 && r.right<=page.viewportSize().width+1),selector+': '+JSON.stringify(rects))
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow')
}
async function geometry(page, rootSelector, childSelector) {
  return page.locator(rootSelector).evaluate((root,selector)=>{
    const rr=root.getBoundingClientRect(), round=n=>Math.round(n*100)/100
    return {width:round(rr.width),height:round(rr.height),children:[...root.querySelectorAll(selector)].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent,x:round(r.x-rr.x),y:round(r.y-rr.y),width:round(r.width),height:round(r.height),align:s.textAlign,font:s.fontSize,color:s.color}})}
  },childSelector)
}
async function footerSnapshot(f,url,width,stage) {
  await f.page.setViewportSize({width,height:900})
  await visit(f,url,'.landing-footer')
  await f.page.locator('.nm-footer-reviews').scrollIntoViewIfNeeded()
  await f.page.locator('.nm-footer-reviews .nm-review-summary').waitFor()
  await f.page.locator('.nm-footer-reviews .nm-web-review-card').first().waitFor()
  await f.page.waitForTimeout(100)
  const layout=await geometry(f.page,'.landing-footer','.landing-footer-brand, .landing-footer-column, h2, .nm-review-summary, .nm-review-score, .nm-review-distribution, .nm-web-review-card, .nm-review-secondary, .nutrimom-social-link, .landing-footer-bottom, .landing-footer-bottom > span')
  if([390,1440].includes(width)) {
    await f.page.locator('.landing-footer').screenshot({path:`${output}/${stage}-footer-${width}.png`,animations:'disabled'})
    await f.page.locator('.landing-footer-bottom').screenshot({path:`${output}/${stage}-legal-${width}.png`,animations:'disabled'})
  }
  return layout
}
try {
  if(baselineDist) baseline=await preview({build:{outDir:baselineDist},preview:{host:'127.0.0.1',port:port+1,strictPort:true,open:false}})
  if(process.env.OVERVIEW_FOOTER_QA_VIDEO_ONLY!=='1') {
  const widths=[320,390,430,600,767,768,1120,1121,1366,1440,1920]
  const oldFooter=baseline?await open():null, newFooter=await open()
  for(const width of widths) {
    const before=oldFooter?await footerSnapshot(oldFooter,`http://127.0.0.1:${port+1}/`,width,'before'):null
    const after=await footerSnapshot(newFooter,base,width,'after')
    if(before && width<=1120) assert.deepEqual(after,before,`Footer changed outside desktop at ${width}`)
    await fits(newFooter.page,'.landing-footer-brand, .nm-footer-reviews, .landing-footer-contacts, .landing-footer-socials')
    if(width>=1121) {
      const positions=await newFooter.page.locator('.landing-footer-inner').evaluate(e=>[...e.children].map(x=>{const r=x.getBoundingClientRect();return {name:x.className,x:r.x,y:r.y,bottom:r.bottom,width:r.width}}))
      const [brand,reviews,contacts,socials]=positions
      assert(Math.max(brand.y,contacts.y,socials.y)-Math.min(brand.y,contacts.y,socials.y)<2,JSON.stringify(positions))
      assert(reviews.y>=Math.max(brand.bottom,contacts.bottom,socials.bottom),JSON.stringify(positions))
      assert(Math.abs(reviews.x-brand.x)<2 && reviews.width>brand.width+contacts.width,JSON.stringify(positions))
      assert.equal(await newFooter.page.locator('.nm-footer-reviews').count(),1)
      const socialWidths=await newFooter.page.locator('.landing-footer-socials a').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width))
      assert(Math.max(...socialWidths)-Math.min(...socialWidths)<1)
    }
    results.push({footer:width,unchanged:before?width<=1120:undefined,geometry:after})
    console.log(`FOOTER_OK ${width}`)
  }
  const reads={...newFooter.testState.calls}
  await newFooter.page.setViewportSize({width:390,height:900});await newFooter.page.locator('.nm-footer-reviews').scrollIntoViewIfNeeded();await newFooter.page.waitForTimeout(350)
  await newFooter.page.setViewportSize({width:1440,height:900});await newFooter.page.locator('.nm-footer-reviews').scrollIntoViewIfNeeded();await newFooter.page.waitForTimeout(350)
  assert.equal(newFooter.testState.calls['/reviews/summary'],reads['/reviews/summary'])
  assert.equal(newFooter.testState.calls['/reviews'],reads['/reviews'])
  await newFooter.page.getByRole('button',{name:'Xem tất cả đánh giá',exact:true}).click()
  await newFooter.page.getByRole('dialog',{name:'Đánh giá NutriMom'}).waitFor()
  await newFooter.page.keyboard.press('Escape')
  results.push({footer:'resize without duplicate requests, one reviews instance and modal'})
  for(const mode of ['empty','many','long','loading','error','limited']) {
    const f=await open('guest',{count:mode==='empty'?0:mode==='many'?124:2,long:mode==='long',reviewMode:['loading','error','limited'].includes(mode)?mode:'ready'})
    await f.page.setViewportSize({width:1121,height:900})
    await visit(f,base,'.landing-footer');await f.page.locator('.nm-footer-reviews').scrollIntoViewIfNeeded()
    if(mode==='limited') await f.page.locator('.nm-footer-reviews').getByText(/Vui lòng thử lại sau/).waitFor()
    else if(mode==='error') await f.page.locator('.nm-footer-reviews [role="alert"]').first().waitFor()
    else if(mode==='loading') await f.page.locator('.nm-footer-reviews [role="status"]').first().waitFor()
    else await f.page.locator('.nm-footer-reviews .nm-review-summary').waitFor()
    await fits(f.page,'.nm-footer-reviews, .nm-footer-review-stats, .nm-footer-review-latest')
    if(mode==='limited') {const count={...f.testState.calls};await f.page.waitForTimeout(1200);assert.equal(f.testState.calls['/reviews/summary'],count['/reviews/summary']);assert.equal(f.testState.calls['/reviews'],count['/reviews'])}
    results.push({footerState:mode});await f.context.close()
  }
  const oldPlan=baseline?await open('USER'):null
  for(const theme of ['light','dark']) {
    const f=await open('USER',{theme})
    for(const width of [320,375,390,430,600,601,768,900,901,1440]) {
      await f.page.setViewportSize({width,height:900})
      await visit(f,base+'/app','.nm-overview-membership')
      await f.page.locator('.nm-overview-membership__action').waitFor()
      const band=f.page.locator('.nm-overview-membership')
      await band.scrollIntoViewIfNeeded()
      const data=await geometry(f.page,'.nm-overview-membership','.nm-overview-membership__copy, .nm-overview-membership__eyebrow, h2, .nm-overview-membership__details, .nm-overview-membership__expiry, .nm-overview-membership__action')
      if(width<=600) {
        const layout=await band.evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('h2, .nm-overview-membership__expiry, .nm-overview-membership__action')].map(x=>{const b=x.getBoundingClientRect();return {delta:Math.abs(b.x+b.width/2-r.x-r.width/2),height:b.height,width:b.width}})})
        assert(layout.every(x=>x.delta<2),JSON.stringify(layout))
        assert(layout[2].height>=44 && layout[2].width<=280.1)
        assert.equal(await band.locator('.nm-overview-membership__inner').evaluate(e=>getComputedStyle(e).gap),'16px')
        assert.equal(await band.locator('.nm-overview-membership__details').evaluate(e=>getComputedStyle(e).gap),'14px')
      } else if(oldPlan) {
        await oldPlan.page.setViewportSize({width,height:900})
        await oldPlan.page.goto(`http://127.0.0.1:${port+1}/app`)
        await oldPlan.page.locator('.nm-overview-membership__action').waitFor()
        await oldPlan.page.evaluate(()=>document.fonts.ready)
        await oldPlan.page.locator('.nm-overview-membership').scrollIntoViewIfNeeded()
        const before=await geometry(oldPlan.page,'.nm-overview-membership','.nm-overview-membership__copy, .nm-overview-membership__eyebrow, h2, .nm-overview-membership__details, .nm-overview-membership__expiry, .nm-overview-membership__action')
        if(theme==='light') assert.deepEqual(data,before,`Desktop/tablet membership changed at ${width}`)
      }
      await fits(f.page,'.nm-overview-membership h2, .nm-overview-membership__action')
      const link=await band.locator('a').getAttribute('href');assert(link.includes('PLAN_399K'))
      if([390,1440].includes(width)) await band.screenshot({path:`${output}/after-plan-${theme}-${width}.png`,animations:'disabled'})
      results.push({plan:width,theme,geometry:data});console.log(`PLAN_OK ${theme} ${width}`)
    }
    const count=f.testState.calls['/subscriptions/me'];await f.page.setViewportSize({width:390,height:900});await f.page.waitForTimeout(350);assert.equal(f.testState.calls['/subscriptions/me'],count)
    await f.context.close()
  }
  for(const options of [{tier:'FREE'},{tier:'PLAN_99K'},{long:true},{expired:true},{planMode:'loading'},{planMode:'error'},{planMode:'limited'}]) {
    const f=await open('USER',options);await f.page.setViewportSize({width:320,height:740})
    await visit(f,base+'/app','.nm-overview-membership')
    await f.page.locator('.nm-overview-membership').scrollIntoViewIfNeeded()
    if(options.planMode==='loading') await f.page.getByRole('status',{name:'Đang tải gói của bạn'}).waitFor()
    else if(options.planMode==='error'||options.planMode==='limited') await f.page.getByText('Chưa tải được thông tin gói của bạn.',{exact:true}).waitFor()
    else await f.page.locator('.nm-overview-membership__action').waitFor()
    await fits(f.page,'.nm-overview-membership__inner')
    if(options.planMode==='limited'){const count=f.testState.calls['/subscriptions/me'];await f.page.waitForTimeout(1100);assert.equal(f.testState.calls['/subscriptions/me'],count)}
    results.push({planState:options});await f.context.close()
  }
  }
  for(const width of [390,1440]) {
    const f=await open('USER',{motion:'no-preference'});await f.page.setViewportSize({width,height:900})
    await f.context.addInitScript(()=>{window.qaVideoWrites=0;const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');Object.defineProperty(HTMLMediaElement.prototype,'src',{...d,set(value){window.qaVideoWrites++;return d.set.call(this,value)}})})
    await visit(f,base+'/app','.nm-overview-hero')
    await f.page.waitForFunction(()=>{const v=document.querySelector('.nm-overview-hero video');return !v.paused&&v.currentTime>.6})
    assert.equal(await f.page.locator('.nm-overview-hero__playback').count(),0)
    assert.equal(await f.page.locator('video').evaluate(v=>v.controls),false)
    const source=await f.page.locator('video').evaluate(v=>v.src)
    await f.page.evaluate(()=>{const v=document.querySelector('.nm-overview-hero video'),r=v.getBoundingClientRect();scrollBy(0,r.top+r.height*.86)})
    await f.page.waitForFunction(()=>document.querySelector('.nm-overview-hero video').paused)
    const time=await f.page.locator('video').evaluate(v=>v.currentTime)
    await f.page.waitForTimeout(350);assert.equal(await f.page.locator('video').evaluate(v=>v.currentTime),time)
    await f.page.evaluate(()=>{const r=document.querySelector('.nm-overview-hero video').getBoundingClientRect();scrollBy(0,r.bottom-r.height*.16)})
    await f.page.waitForFunction(()=>!document.querySelector('.nm-overview-hero video').paused)
    assert(await f.page.locator('video').evaluate((v,time)=>v.currentTime>=time && v.currentTime<time+1,time))
    await f.page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
    const hiddenTime=await f.page.locator('video').evaluate(v=>v.currentTime)
    await f.page.waitForTimeout(350);assert.equal(await f.page.locator('video').evaluate(v=>v.currentTime),hiddenTime)
    await f.page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))})
    await f.page.waitForFunction(()=>!document.querySelector('.nm-overview-hero video').paused)
    await f.page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))
    assert(await f.page.locator('video').evaluate(v=>v.paused))
    await f.page.evaluate(()=>window.dispatchEvent(new Event('pageshow')))
    await f.page.waitForFunction(()=>!document.querySelector('.nm-overview-hero video').paused)
    assert.equal(await f.page.locator('video').evaluate(v=>v.src),source)
    assert.equal(await f.page.evaluate(()=>window.qaVideoWrites),1)
    await f.page.evaluate(()=>window.qaOldVideo=document.querySelector('.nm-overview-hero video'))
    await f.page.getByRole('link',{name:'Khám phá dinh dưỡng',exact:true}).click()
    await f.page.waitForFunction(()=>window.qaOldVideo.paused&&!window.qaOldVideo.getAttribute('src'))
    results.push({video:width,sourceWrites:1});console.log(`VIDEO_OK ${width}`);await f.context.close()
  }
  for(const mode of ['reduce','blocked','failed']) {
    const f=await open('USER',{motion:mode==='reduce'?'reduce':'no-preference'})
    if(mode==='blocked') await f.context.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'))})
    if(mode==='failed') await f.context.route('**/welcome-landscape-v2.mp4',route=>route.abort())
    await visit(f,base+'/app','.nm-overview-hero')
    await f.page.waitForTimeout(1400)
    assert(await f.page.locator('video').evaluate(v=>v.paused))
    assert.equal(await f.page.locator('.nm-overview-hero__playback').count(),0)
    if(mode==='reduce') assert.equal(await f.page.locator('video').getAttribute('src'),null)
    results.push({posterFallback:mode});await f.context.close()
  }
  assert.deepEqual(pageErrors,[])
  console.log(JSON.stringify({checks:results.length,pageErrors}))
} catch(error) {
  for(const c of contexts) for(const p of c.pages()) {try{await p.screenshot({path:`${output}/failure-${Date.now()}.png`})}catch{}}
  throw error
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify({results,pageErrors},null,2))
  await browser.close()
  for(const s of [server,baseline]) {s?.httpServer?.closeAllConnections();await s?.close()}
}
