import assert from 'node:assert/strict'
import { browser,server,output,writeFile } from './helpers/nutrition-browser.mjs'
import { session } from './helpers/workspace-browser.mjs'
const base=`http://127.0.0.1:${process.env.NUTRITION_QA_PORT||5195}`, results=[]
let f
try {
  f=await session('guest',true,{reducedMotion:'no-preference'})
  await f.page.setViewportSize({width:390,height:844});await f.page.goto(base)
  await f.page.locator('.testimonial-marquee-heading').scrollIntoViewIfNeeded();await f.page.waitForTimeout(500)
  assert(await f.page.locator('.testimonial-marquee-heading').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth}),'Testimonial heading must fit the mobile grid')
  results.push(await f.page.locator('.testimonial-marquee-heading').evaluate(e=>{
    const describe=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,rect:{x:r.x,y:r.y,w:r.width,h:r.height},color:s.color,display:s.display,opacity:s.opacity,visibility:s.visibility,transform:s.transform}}
    const r=e.getBoundingClientRect()
    return {name:'heading',elements:[e,...e.querySelectorAll('*')].map(describe),hit:document.elementFromPoint(r.x+30,r.y+40)?.outerHTML.slice(0,250)}
  }))
  await f.page.screenshot({path:`${output}/testimonial-heading-390.png`})
  await f.page.locator('.landing-footer').scrollIntoViewIfNeeded();await f.page.waitForTimeout(500)
  await f.page.screenshot({path:`${output}/footer-390.png`})
  await f.context.close()
  f=await session('ADMIN',true)
  await f.page.setViewportSize({width:390,height:844});await f.page.goto(base+'/admin/users')
  await f.page.locator('.admin-user-mobile-card').first().waitFor()
  await f.page.screenshot({path:`${output}/admin-users-390.png`,fullPage:true})
  assert.equal(await f.page.locator('.admin-users-desktop').isVisible(),false)
  assert(await f.page.locator('.admin-user-mobile-card').first().getByText('Điện thoại',{exact:true}).isVisible())
  await f.context.close()
  f=await session('USER',true)
  await f.page.setViewportSize({width:390,height:844});await f.page.goto(base+'/app/profile')
  const save=f.page.getByRole('button',{name:'Lưu thay đổi',exact:true})
  await save.scrollIntoViewIfNeeded();await f.page.waitForTimeout(200)
  const layout=await save.evaluate(e=>{const r=e.getBoundingClientRect();return {center:Math.abs(r.x+r.width/2-innerWidth/2),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}})
  assert(layout.center<2 && layout.hit,JSON.stringify(layout));results.push({name:'profile save',layout})
  assert.equal(await f.page.locator('.nm-assistant-launcher:visible').count(),0)
  await f.page.screenshot({path:`${output}/profile-save-390.png`})
} finally {
  await writeFile(`${output}/details-results.json`,JSON.stringify(results,null,2))
  await f?.context.close();await browser.close();server.httpServer?.closeAllConnections();await server.close()
}
console.log(JSON.stringify(results))
