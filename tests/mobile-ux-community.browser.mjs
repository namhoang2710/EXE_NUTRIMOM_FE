import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
process.env.COMMUNITY_QA_OUTPUT = 'qa-artifacts/mobile-ux-community'
const {fixture,browser,server,output,id,errors}=await import('./community-browser-harness.mjs')
const results=[]
try {
  for(const theme of ['light','dark']) {
    const f=await fixture({member:true,touch:true,theme,reactionDelay:500})
    await f.page.setViewportSize({width:390,height:844});await f.goto()
    const post=f.page.locator(`#community-post-${id(2)}`), like=post.getByRole('button',{name:/lượt thích/})
    await like.scrollIntoViewIfNeeded()
    await like.evaluate(e=>{e.click();e.click()})
    await f.page.waitForFunction(selector=>document.querySelector(selector)?.getAttribute('aria-pressed')==='true',`#community-post-${id(2)} .nm-community-action`)
    await f.page.waitForTimeout(700)
    assert.equal(f.state.calls.filter(c=>c.method==='PUT'&&c.path.endsWith('/like')).length,1)
    const paint=await like.evaluate(e=>({color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}))
    assert.equal(paint.color,'rgb(207, 54, 89)');assert.equal(paint.background,'rgba(0, 0, 0, 0)')
    await f.page.screenshot({path:`${output}/heart-${theme}-390.png`})
    await like.tap();await f.page.waitForTimeout(600)
    assert.equal(await like.getAttribute('aria-pressed'),'false')
    results.push({theme,paint,doubleTapRequests:1})
    await f.context.close()
  }
  const limited=await fixture({member:true,touch:true,reaction429:true})
  await limited.page.setViewportSize({width:390,height:844});await limited.goto()
  const post=limited.page.locator(`#community-post-${id(2)}`), like=post.getByRole('button',{name:/lượt thích/})
  await like.tap();await limited.page.getByRole('status').filter({hasText:/thử lại sau/}).waitFor()
  assert.equal(await like.getAttribute('aria-pressed'),'false')
  await like.tap();await post.getByRole('button',{name:'Lưu',exact:true}).tap()
  assert.equal(limited.state.calls.filter(c=>c.path.endsWith('/like')).length,1)
  assert.equal(limited.state.calls.filter(c=>c.path.endsWith('/save')).length,0)
  results.push('429 rolls back and blocks further reaction requests')
  await limited.context.close();assert.deepEqual(errors,[])
} finally {await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();server.httpServer?.closeAllConnections();await server.close()}
console.log(JSON.stringify(results))
