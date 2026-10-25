import assert from 'node:assert/strict'
import { browser, server, output, pageErrors, writeFile } from './helpers/nutrition-browser.mjs'
import { session } from './helpers/workspace-browser.mjs'
import { qaExpertId } from './admin-workspace-fixtures.mjs'
import { entitlementsFor } from './fixtures/subscription-plans.ts'
const base = `http://127.0.0.1:${process.env.NUTRITION_QA_PORT || 5195}`
const results = [], contexts = []
const sizes = [[320,740], [375,812], [390,844], [414,896], [430,932], [768,1024], [844,390], [1024,768], [1440,900], [1920,1080]]
async function open(role) { const f = await session(role, true, { reducedMotion: 'no-preference' }); contexts.push(f.context); return f }
async function screenshot(f, name) { await f.page.screenshot({ path: `${output}/${name}.png` }) }
async function fits(page, selector, name) {
  const layout = await page.locator(selector).evaluateAll(els => els.filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { class: String(e.className), x: r.x, y: r.y, width: r.width, height: r.height, fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 } }))
  assert(layout.length && layout.every(r => r.fits), name + ': ' + JSON.stringify(layout)); return layout
}
try {
  const guest = await open('guest'), p = guest.page
  for (const [width,height] of sizes) {
    await p.setViewportSize({ width,height }); await p.goto(base); await p.locator('.testimonial-marquee-section').waitFor()
    if (width > 1120) {
      const center = await p.locator('.landing-header-nav').evaluate(e => { const r = e.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2) })
      assert(center < 2, `Header center at ${width}: ${center}`)
    } else {
      await p.locator('.landing-menu-toggle').click()
      await p.waitForFunction(()=>document.querySelector('.vercel-tabs-indicator')?.getBoundingClientRect().width>20)
      await p.waitForTimeout(320)
      const indicator = await p.locator('.vercel-tabs-indicator').evaluate(e => e.getBoundingClientRect().width)
      assert(indicator > 20 && indicator < 120, `Mobile active indicator ${indicator}`)
      await p.locator('.landing-menu-toggle').click()
    }
    assert.equal(await p.locator('.landing-header .social-link, .landing-header .theme-toggle').count(), 0)
    await p.locator('.testimonial-marquee-section').scrollIntoViewIfNeeded()
    await p.waitForTimeout(350)
    const card = p.locator('.testimonial-marquee-card').first()
    const before = await card.evaluate(e => ({ x:e.getBoundingClientRect().x, w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height }))
    await p.waitForTimeout(350)
    const after = await card.evaluate(e => e.getBoundingClientRect().x)
    assert(Math.abs(before.w / before.h - 1122 / 1402) < .03, 'Testimonial ratio')
    assert(Math.abs(before.x - after) > .1, `Marquee should animate at ${width}`)
    if (width === 390 || width === 1440) await screenshot(guest, `homepage-testimonials-${width}`)
    results.push({ name:'public chrome and animated testimonial', width,height })
  }
  for (const role of ['USER', 'ADMIN', 'EXPERT']) {
    const f = await open(role), page = f.page
    for (const [width,height] of [[320,740],[390,844],[768,1024],[844,390],[1440,900]]) {
      await page.setViewportSize({ width,height }); await page.goto(base + (role === 'ADMIN' ? '/admin/users' : role === 'EXPERT' ? '/expert' : '/app'))
      await page.getByRole('button', { name:'Thông báo',exact:true }).click()
      const dialog = page.getByRole('dialog', { name:/^(Thông báo|Hộp thông báo)$/ })
      await dialog.waitFor(); await page.waitForTimeout(300)
      await fits(page,'[role="dialog"]',`${role} notification ${width}`)
      if(width===390) await screenshot(f,`notifications-${role}-390`)
      await page.keyboard.press('Escape')
      assert(await page.getByRole('button',{name:'Thông báo',exact:true}).evaluate(e=>document.activeElement===e),'Restore bell focus')
      results.push({name:'notification geometry and focus',role,width,height})
    }
  }
  const user = await open('USER'), u = user.page
  await user.context.route('**/api/v1/subscriptions/me', route => route.fulfill({json:{data:entitlementsFor('FREE')}}))
  await user.context.route('**/api/v1/experts/*/availability?*', route => route.fulfill({json:{data:{date:new URL(route.request().url()).searchParams.get('date'),day_off:false,slots:[{start_time:'10:00:00',end_time:'10:30:00',available:true}]}}}))
  await user.context.route('**/api/v1/consultation-requests/*/video', route => route.fulfill({json:{data:{request_id:'request-qa',user_name:'Mẹ QA',expert_name:'Chuyên gia NutriMom',specialty:'HEALTH',expert:false,consultation_status:'PENDING_CONSULTATION',state:'SCHEDULED',can_join:false,configured:true,opens_at:new Date(Date.now()+3600000).toISOString(),closes_at:new Date(Date.now()+7200000).toISOString(),server_time:new Date().toISOString()}}}))
  for(const [width,height] of sizes.filter(([w])=>w<=1024)) {
    await u.setViewportSize({width,height})
    await u.goto(base+`/app/consultations?expertUserId=${qaExpertId}`)
    await u.locator('.consultation-booking-bar').waitFor(); await u.locator('.consultation-booking-bar').scrollIntoViewIfNeeded()
    await u.waitForTimeout(250)
    await fits(u,'.consultation-booking-bar',`Booking ${width}`)
    assert.equal(await u.locator('.nm-assistant-launcher:visible').count(),0)
    if(width===390) await screenshot(user,'booking-390')
    await u.goto(base+'/app/pricing?plan=PLAN_99K')
    await u.locator('.nm-payment-topline--checkout').waitFor()
    await fits(u,'.nm-payment-topline--checkout',`Payment ${width}`)
    if(width===390) await screenshot(user,'payment-390')
    await u.goto(base+'/app/consultations/request-qa/call')
    await u.locator('.lk-prejoin').waitFor(); await u.waitForTimeout(300)
    await fits(u,'.lk-video-container, .lk-button-group-container, .lk-username-container',`Video ${width}`)
    const controls = await u.locator('.lk-button-group-container, .lk-username-container').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}))
    const [a,b]=controls
    assert(a.right<=b.x+1 || b.right<=a.x+1 || a.bottom<=b.y+1 || b.bottom<=a.y+1, 'Video controls overlap: '+JSON.stringify(controls))
    if(width===390||width===844) await screenshot(user,`video-prejoin-${width}`)
    results.push({name:'booking/payment/video prejoin',width,height})
  }
  assert.deepEqual(pageErrors,[])
} finally {
  await writeFile(`${output}/layout-results.json`,JSON.stringify({results,pageErrors},null,2))
  for(const c of contexts) await c.close(); await browser.close(); server.httpServer?.closeAllConnections(); await server.close()
}
console.log(JSON.stringify({checks:results.length,pageErrors}))
