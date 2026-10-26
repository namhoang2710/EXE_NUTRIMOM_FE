// Local lab comparison; no request routing, so Chromium's real HTTP cache stays enabled.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { brotliCompressSync, constants } from 'node:zlib'
import { createRequire } from 'node:module'
import { resolve, sep, extname } from 'node:path'
import { fixtureResponse, expert } from './admin-workspace-fixtures.mjs'
import { planDtos, entitlementsFor } from './fixtures/subscription-plans.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const before=process.env.PERF_BEFORE, after=process.env.PERF_AFTER
assert(before && after, 'PERF_BEFORE and PERF_AFTER must identify production builds')
const output=process.env.NUTRITION_QA_OUTPUT || 'qa-artifacts/responsive-hardening/performance'
await mkdir(output,{recursive:true})
const vitals=await readFile(process.env.WEB_VITALS_FILE)
const profile={id:'nutrition-account-a',phone:'0901112233',display_name:'Nguyễn Minh Anh',roles:['USER'],role:'MOM',onboarding_status:'COMPLETED',status:'ACTIVE',version:1}
const pregnancy={id:'pregnancy-qa',status:'ACTIVE',local_date:'2026-10-24',timezone:'Asia/Ho_Chi_Minh',gestational_week:27,gestational_day:2,estimated_due_date:'2027-01-21',version:1}
let cohort='before', root=before, role='guest'
const files=new Map(), apiCalls=[], httpRequests=[]
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.json':'application/json'}
function dataFor(path,query) {
  if(path==='/auth/me'||path==='/users/me') return {...profile,roles:[role],role:role==='USER'?'MOM':role}
  if(path==='/users/me/preferences') return {timezone:'Asia/Ho_Chi_Minh',version:1}
  if(path==='/knowledge/articles') return {items:[],totalItems:0,totalPages:0,currentPage:1,pageSize:6}
  if(path==='/subscriptions/me') return entitlementsFor('PLAN_399K')
  if(path==='/subscription-plans') return planDtos
  if(path==='/pregnancies/current') return pregnancy
  if(path==='/dashboard/mom') return {profile_summary:profile,pregnancy_summary:pregnancy,upcoming_reminders:[],active_alerts:[],recommended_articles:[],unread_notification_count:0}
  if(path.startsWith('/calendar/')||path==='/family-groups'||path==='/expert/schedule/summary') return []
  if(path==='/expert/me') return expert
  if(path==='/expert/schedule') return {date:query.get('date'),day_off:false,has_bookings:false,slots:[]}
  if(path==='/community/notifications/unread-count') return {unread_count:0}
  if(path==='/notifications/unread-count') return {count:0}
  if(path==='/assistant/status') return {ai_ready:false,provider:'GUIDE',remaining_ai_messages:0,daily_ai_limit:0,retention_days:30}
  if(path==='/assistant/preferences') return {cloud_consent:false,version:1}
  if(path==='/assistant/conversations') return []
  if(path==='/assistant/context') return {items:[],suggestions:[],context_version:1}
  return fixtureResponse(path,query,'GET',null) ?? {items:[],page:1,page_size:20,total_items:0,total_pages:0}
}
const errors=[]
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1'), path=decodeURIComponent(url.pathname)
    if(!path.startsWith('/__qa/'))httpRequests.push(path)
    if(path==='/__qa/vitals.js') {res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'public,max-age=31536000,immutable'});res.end(vitals);return}
    if(path.startsWith('/api/v1/')) {
      const api=path.slice(7);apiCalls.push(api)
      if(api==='/admin/realtime/stream') {
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});res.write(`event: ready\ndata: ${JSON.stringify({protocol_version:1,admin_user_id:profile.id,dashboard_revision:'0',notifications_revision:'0',unread_count:0})}\n\n`)
        const timer=setInterval(()=>res.write('event: heartbeat\ndata: {"protocol_version":1}\n\n'),15000);res.on('close',()=>clearInterval(timer));return
      }
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({data:dataFor(api,url.searchParams)}));return
    }
    const file=resolve(root,'.'+path)
    if(!file.startsWith(resolve(root)+sep) && file!==resolve(root)) {res.writeHead(403);res.end();return}
    const extension=extname(file), filename=extension?file:resolve(root,'index.html'), key=cohort+':'+filename
    let asset=files.get(key)
    if(!asset) {
      let body=await readFile(filename)
      if(!extension||extension==='.html') body=Buffer.from(body.toString().replace('<head>','<head><script src="/__qa/vitals.js"></script><script>window.__vitals={}; for(const name of ["CLS","LCP","INP"]) webVitals["on"+name](m=>{window.__vitals[name]=m.value;window.__reportVital?.({name,value:m.value})},{reportAllChanges:true});</script>'))
      const compressed=/\.(js|css|html|svg)$/.test(filename)?brotliCompressSync(body,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}):body
      asset={body:compressed,etag:'"'+createHash('sha1').update(body).digest('hex')+'"',compressed:compressed!==body};files.set(key,asset)
    }
    const immutable=cohort==='after'&&/^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(path)
    const headers={'Content-Type':mimes[extension]||'text/html; charset=utf-8','Cache-Control':immutable?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate',ETag:asset.etag,...(asset.compressed?{'Content-Encoding':'br'}:{})}
    if(req.headers['if-none-match']===asset.etag) {res.writeHead(304,headers);res.end();return}
    res.writeHead(200,{...headers,'Content-Length':asset.body.length});res.end(asset.body)
  } catch(error) {res.writeHead(404);res.end('Not found');errors.push(String(error))}
})
await new Promise(resolve=>server.listen(5202,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:'chrome',headless:true})
const cases=[['guest','/',390],['guest','/',1440],['guest','/contact',390],['guest','/contact',1440],['USER','/app',390],['ADMIN','/admin',1440],['EXPERT','/expert',1440]]
const selectedCases=cases.flatMap(c=>Array.from({length:c[0]==='guest'&&c[1]==='/'?3:1},(_,repeat)=>[...c,repeat+1]))
const results=[]
try {
  for(const label of ['before','after']) {
    cohort=label;root=label==='before'?before:after
    for(const [account,path,width,repeat] of selectedCases) {
      role=account
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})
      await context.addInitScript(({account,profile})=>{ if(location.protocol!=='http:')return; localStorage.setItem('nutrimom.theme','light'); if(account!=='guest') sessionStorage.setItem('nutrimom.auth-session',JSON.stringify({accessToken:'qa',refreshToken:'qa-r',accessExpiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000,tokenType:'Bearer',user:{...profile,roles:[account],role:account==='USER'?'MOM':account,onboardingStatus:'COMPLETED'}})) },{account,profile})
      const page=await context.newPage(), cdp=await context.newCDPSession(page)
      await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:20,downloadThroughput:1_000_000,uploadThroughput:500_000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
      let bytes=0,requests=0,cached=0,measurements={}
      await page.exposeFunction('__reportVital',m=>{measurements[m.name]=m.value})
      page.on('pageerror',e=>errors.push(e.message))
      cdp.on('Network.dataReceived',e=>{bytes+=e.encodedDataLength})
      cdp.on('Network.requestWillBeSent',e=>{if(e.request.url.startsWith('http://127.0.0.1:5202/')&&!e.request.url.includes('/__qa/'))requests++})
      cdp.on('Network.responseReceived',e=>{if(e.response.fromDiskCache||e.response.fromPrefetchCache)cached++})
      for(const temperature of ['cold','warm']) {
        bytes=0;requests=0;cached=0;measurements={};apiCalls.length=0;httpRequests.length=0
        const started=performance.now();await page.goto(`http://127.0.0.1:5202${path}`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('h1,h2'));await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}).every(e=>e.complete),undefined,{timeout:45000});await page.waitForTimeout(1500)
        const toggle=page.locator('.theme-toggle').first();if(await toggle.isVisible())await toggle.click()
        await page.waitForTimeout(300)
        const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,transfer:e.transferSize,bytes:e.encodedBodySize})))
        const observed={...measurements};const elapsed=performance.now()-started
        await page.goto('about:blank');await page.waitForTimeout(80)
        results.push({cohort:label,role:account,path,width,repeat,temperature,logicalBrowserRequests:requests,httpRequests:httpRequests.length,encodedBodyBytesReceived:bytes,cachedResponses:cached,apiRequests:apiCalls.length,elapsedMs:Math.round(elapsed),vitals:{...observed,...measurements},resources})
      }
      console.log(`MEASURED ${label} ${account} ${path} ${width} run ${repeat}`);await context.close()
    }
  }
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify({browser:browser.version(),conditions:{latencyMs:20,downloadBytesPerSecond:1000000,cpuSlowdown:4,brotliQuality:4,homeRuns:3,scope:'Local lab, fixture API, one theme toggle per visit, real browser HTTP cache; not field Web Vitals or live CDN data.'},results,errors},null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))
  if(errors.length)process.exitCode=1
}
