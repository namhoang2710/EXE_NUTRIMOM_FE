import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
process.env.COMMUNITY_QA_OUTPUT='qa-artifacts/responsive-hardening/community-conflict'
const {fixture,browser,server,output,id,errors}=await import('./community-browser-harness.mjs')
const results=[]
try {
  const f=await fixture({member:true,versionConflict:true})
  try {
    await f.page.setViewportSize({width:390,height:844});await f.goto('?tab=mine')
    await f.page.getByRole('button',{name:'Sửa bài viết',exact:true}).first().click()
    const dialog=f.page.getByRole('dialog',{name:'Sửa bài viết',exact:true})
    const input=dialog.getByLabel('Nội dung',{exact:false})
    await input.fill('Nội dung đang chỉnh sửa, giữ lại sau xung đột.')
    const image={name:'giu-anh.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64')}
    await dialog.locator('input[type=file]').setInputFiles(image)
    await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).waitFor({state:'visible'})
    await f.page.waitForFunction(()=>!document.querySelector('.nm-community-composer .nm-primary-action')?.disabled)
    await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).evaluate(e=>{e.click();e.click()})
    await dialog.getByRole('button',{name:'Xem phiên bản mới nhất, giữ bản nháp'}).waitFor()
    const writes=()=>f.state.calls.filter(c=>c.method==='PATCH'&&c.path.startsWith('/community/posts/'))
    assert.equal(writes().length,1)
    const postId=writes()[0].path.split('/').at(-1),post=f.state.posts.find(p=>p.id===postId)
    post.version=2;post.content='Nội dung mới từ người khác';f.state.versionConflict=false
    await dialog.getByRole('button',{name:'Xem phiên bản mới nhất, giữ bản nháp'}).click()
    await dialog.getByText(/Bản mới trên máy chủ/).waitFor()
    assert.equal(await input.inputValue(),'Nội dung đang chỉnh sửa, giữ lại sau xung đột.')
    assert.equal(writes().length,1)
    assert.equal(f.state.calls.filter(c=>c.path==='/community/media').length,1)
    assert(writes()[0].body.image_ids.includes(id(50)))
    await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await dialog.waitFor({state:'hidden'})
    assert.equal(writes().length,2);assert.equal(writes()[1].body.version,2);assert(writes()[1].body.image_ids.includes(id(50)))
    results.push('409 keeps content and uploaded images; manual refresh uses fresh version; no duplicate PATCH/upload')
    console.log('PASS '+results[0])
  } finally {await f.context.close()}
} finally {await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();await server.close();if(errors.length)process.exitCode=1}
