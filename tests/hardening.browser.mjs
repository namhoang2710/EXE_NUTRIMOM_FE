import assert from 'node:assert/strict'
import { session, profile, article, missing } from './helpers/workspace-browser.mjs'
import { browser, server, output, writeFile, pageErrors, unexpected } from './helpers/nutrition-browser.mjs'

const results = []
const origin = `http://127.0.0.1:${process.env.NUTRITION_QA_PORT || 5195}`
const image = { name: 'ban-nhap.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') }
const ok = (route, data) => route.fulfill({ json: { data } })
const fail = (route, status, code, headers = {}) => route.fulfill({ status, headers, json: { error: { code, message: 'Kiểm tra bản nháp và thời gian chờ.' } } })
async function check(name, run) {
  if (process.env.HARDENING_QA_FILTER && !name.includes(process.env.HARDENING_QA_FILTER)) return
  try { const details = await run(); results.push({ name, passed: true, details }); console.log('PASS ' + name) }
  catch (error) { results.push({ name, passed: false, error: error.stack || String(error) }); console.log('FAIL ' + name + ': ' + error.message) }
}
async function goto(f, path) { await f.page.goto(origin + path); await f.page.waitForFunction(() => document.querySelector('h1,h2')); await f.page.evaluate(() => document.fonts.ready) }
async function twice(button) { await button.evaluate(element => { element.click(); element.click() }) }
async function assertValue(input, value) { assert.equal(await input.inputValue(), value) }

try {
  await check('public socials, aligned footer, three mobile actions, menu and low landscape', async () => {
    const f = await session('guest')
    try {
      const samples = []
      for (const [width, height] of [[320,568], [375,812], [390,844], [430,932], [568,320], [844,390], [1120,900], [1121,900], [1440,900]]) {
        await f.page.setViewportSize({ width, height }); await goto(f, '/contact'); assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false, `${width} header overflow`)
        const expected = ['Facebook','Instagram','TikTok']
        assert.deepEqual(await f.page.locator('.landing-footer-socials .social-link-label').allTextContents(), expected)
        assert.equal(await f.page.locator('.landing-footer-socials .is-tiktok').getAttribute('href'), 'https://www.tiktok.com/@nutrimom202?_r=1&_t=ZS-9Aos3P82qHA')
        if (width <= 700) {
          assert.deepEqual(await f.page.locator('.contactQuickActions .social-link-label').allTextContents(), expected)
          await f.page.locator('.landing-footer').scrollIntoViewIfNeeded(); await f.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await f.page.waitForTimeout(100)
          const geometry = await f.page.evaluate(() => {
            const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom } }
            return { social:rect('.landing-footer-socials h2'), contact:rect('.landing-footer-column:has(.landing-footer-contact) h2'), dock:rect('.contactQuickActions'), top:rect('.scroll-progress-button'), overflow:document.documentElement.scrollWidth > innerWidth+1 }
          })
          assert(Math.abs(geometry.social.left - geometry.contact.left) <= 1)
          assert(geometry.top.bottom <= geometry.dock.top, JSON.stringify(geometry))
          assert.equal(geometry.overflow, false, `${width}x${height} overflow: ${JSON.stringify(geometry)}`)
          samples.push({ width, height, geometry })
          if ([375,390,430].includes(width)) await f.page.screenshot({ path:`${output}/contact-footer-${width}.png` })
          await f.page.locator('.contactForm input').first().focus()
          await f.page.waitForTimeout(100); assert.equal(await f.page.locator('.contactQuickActions').isVisible(), false, `${width} dock while typing`)
        }
        await f.page.evaluate(() => window.scrollTo(0,0))
        if (width <= 1120) {
          await f.page.locator('.landing-menu-toggle').click()
          assert.equal(await f.page.locator('.landing-header-nav .is-tiktok').isVisible(),true)
          await f.page.keyboard.press('Escape')
          assert.equal(await f.page.locator('.landing-menu-toggle').evaluate(e=>e===document.activeElement),true)
        } else assert.equal(await f.page.locator('.landing-header-actions .is-tiktok').isVisible(),true)
      }
      return samples
    } finally { await f.context.close() }
  })

  await check('mobile and desktop motion change over time; native strip swipes; reduced motion stays still', async () => {
    const samples = []
    for (const reducedMotion of ['no-preference','reduce']) {
      const f = await session('guest', false, { reducedMotion })
      try {
        for (const width of [390,1440]) {
          await f.page.setViewportSize({ width, height:844 }); await goto(f,'/')
          await f.page.waitForTimeout(250)
          const read = () => f.page.locator('.hero-parallax__gallery').evaluate(e=>getComputedStyle(e).transform)
          const before=await read(); await f.page.evaluate(()=>window.scrollTo(0,250)); await f.page.waitForTimeout(650); const after=await read()
          if (reducedMotion==='no-preference') assert.notEqual(before,after,`${width}: missing motion`)
          else assert.equal(after,'none')
          if (width===390) {
            const swipe=await f.page.locator('.hero-parallax__gallery').evaluate(e=>{ e.scrollLeft=200; return { x:e.scrollLeft, translate:getComputedStyle(e).translate } })
            assert(swipe.x>0); assert.equal(swipe.translate,'none')
          }
          const frames = reducedMotion === 'no-preference' ? await f.page.evaluate(() => new Promise(resolve => {
            const gaps=[];let start=0,last=0
            function step(now) {
              if(!start)start=now
              if(last)gaps.push(now-last)
              last=now;window.scrollTo(0,250+(now-start)/8)
              if(now-start<800)requestAnimationFrame(step)
              else {gaps.sort((a,b)=>a-b);resolve({count:gaps.length,medianMs:gaps[Math.floor(gaps.length/2)],p95Ms:gaps[Math.ceil(gaps.length*.95)-1],over50Ms:gaps.filter(v=>v>50).length})}
            }
            requestAnimationFrame(step)
          })) : undefined
          samples.push({ width, reducedMotion, before, after, frames })
        }
      } finally { await f.context.close() }
    }
    return samples
  })

  await check('409 profile refresh preserves fields and saves latest version; double click sends once', async () => {
    const f = await session('USER'); let version=1, writes=[]
    await f.context.route('**/api/v1/users/me', route => {
      if (route.request().method()==='PATCH') { const body=route.request().postDataJSON(); writes.push(body); if(writes.length===1) { version=2; return fail(route,409,'VERSION_CONFLICT') } return ok(route,{...profile,...body,version:3}) }
      return ok(route,{...profile,display_name:version===1?profile.display_name:'Tên mới từ máy chủ',version})
    })
    try {
      await goto(f,'/app/profile'); const input=f.page.getByLabel('Tên hiển thị', { exact:true }); await input.fill('Bản nháp giữ nguyên')
      await twice(f.page.getByRole('button',{name:'Lưu thay đổi',exact:true})); await f.page.getByText(/Hồ sơ đã thay đổi ở nơi khác/).waitFor()
      assert.equal(writes.length,1); await assertValue(input,'Bản nháp giữ nguyên')
      await f.page.getByRole('button',{name:'Tải lại',exact:true}).click(); await f.page.getByText(/Đã tải hồ sơ mới/).waitFor(); await assertValue(input,'Bản nháp giữ nguyên')
      assert.equal(writes.length,1); await f.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click(); await f.page.getByText('Hồ sơ đã được cập nhật.').waitFor(); assert.equal(writes[1].version,2)
      return writes
    } finally { await f.context.close() }
  })

  await check('429 countdown waits and never retries a write automatically', async () => {
    const f=await session('USER'); let writes=0
    await f.context.route('**/api/v1/users/me', route => { if(route.request().method()==='PATCH') { writes++; return writes===1?fail(route,429,'TOO_MANY_REQUESTS',{'Retry-After':'2'}):ok(route,{...profile,display_name:'Thử giới hạn',version:2}) } return ok(route,profile) })
    try {
      await goto(f,'/app/profile'); await f.page.getByLabel('Tên hiển thị',{exact:true}).fill('Thử giới hạn')
      await twice(f.page.getByRole('button',{name:'Lưu thay đổi',exact:true})); await f.page.getByText(/Thử lại sau [12] giây/).waitFor()
      assert.equal(writes,1); assert.equal(await f.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).isDisabled(),true)
      await f.page.waitForTimeout(2300); assert.equal(writes,1)
      await f.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click(); await f.page.getByText('Hồ sơ đã được cập nhật.').waitFor(); assert.equal(writes,2)
    } finally { await f.context.close() }
  })

  await check('CMS conflict keeps text and uploaded image IDs; refresh does not upload or save again; focus stays in dialog', async () => {
    const f=await session('ADMIN'); let writes=[],uploads=0, latest=false
    await f.context.route('**/api/v1/admin/knowledge/**', route => {
      const path=new URL(route.request().url()).pathname, method=route.request().method()
      if(path.endsWith('/media/upload')) { uploads++; if(uploads===1)return fail(route,409,'R2_UPLOAD_FAILED'); return ok(route,{id:'image-draft',image_url:'/nutrimom-logo.png',image_key:'image-draft',width:1,height:1,size_bytes:100}) }
      if(method==='PUT') { writes.push(route.request().postDataJSON()); latest=true; return fail(route,409,'VERSION_CONFLICT') }
      const data={...article,title:latest?'Tiêu đề từ máy chủ':article.title}
      return ok(route,path.endsWith('/articles')?{items:[data],currentPage:1,pageSize:12,totalItems:1,totalPages:1}:data)
    })
    try {
      await f.page.setViewportSize({width:390,height:844}); await goto(f,'/admin/knowledge'); await f.page.getByRole('button',{name:'Sửa '+article.title,exact:true}).click()
      const dialog=f.page.getByRole('dialog',{name:'Chỉnh sửa bài viết',exact:true}); const input=dialog.getByLabel('Tiêu đề *',{exact:true}); await input.fill('Nội dung đang soạn')
      await dialog.locator('input[type=file]').first().setInputFiles(image); await dialog.getByRole('button',{name:'Thử tải lại ảnh đã chọn'}).click(); await dialog.locator('.admin-image-preview img').first().waitFor()
      await twice(dialog.getByRole('button',{name:'Lưu thay đổi',exact:true})); await dialog.getByText('Bài viết vừa được cập nhật ở nơi khác').waitFor(); assert.equal(writes.length,1)
      await dialog.getByRole('button',{name:'Tải phiên bản mới nhất'}).click(); await dialog.getByText(/Đã tải bản mới/).waitFor()
      await assertValue(input,'Nội dung đang soạn'); assert.equal(uploads,2); assert.equal(writes.length,1); assert.equal(writes[0].coverImage.id,'image-draft')
      for(let i=0;i<12;i++) await f.page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true)
      await dialog.getByRole('button',{name:'Hủy',exact:true}).click(); const discard=f.page.getByRole('dialog',{name:'Bỏ thay đổi chưa lưu?'}); await discard.waitFor(); await discard.getByRole('button',{name:'Tiếp tục chỉnh sửa'}).click(); await assertValue(input,'Nội dung đang soạn')
      await f.page.waitForTimeout(350); assert.equal(await dialog.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)'); await f.page.screenshot({path:`${output}/cms-draft-390.png`}); await f.page.setViewportSize({width:568,height:320}); const bounds=await dialog.boundingBox(); assert(bounds.y>=0 && bounds.y+bounds.height<=321,JSON.stringify(bounds)); await input.focus(); assert.equal(await input.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true)
    } finally { await f.context.close() }
  })

  await check('task conflict keeps fields and rebases version with one manual GET', async () => {
    const f=await session('USER'); let version=1, writes=[]
    const task={ id:'task-draft',title:'Chuẩn bị đồ',description:'Mang theo sổ',priority:'MEDIUM',status:'TODO',assignee_id:null,due_at:'2099-10-23T18:00:00Z',version:1,created_at:'2026-10-21T00:00:00Z' }
    await f.context.route('**/api/v1/family/tasks**',route=> {
      if(route.request().method()==='PATCH') { writes.push(route.request().postDataJSON()); if(writes.length===1) {version=2;return fail(route,409,'VERSION_CONFLICT')} return ok(route,{...task,...writes.at(-1),version:3}) }
      return ok(route,[{...task,title:version===1?task.title:'Đã cập nhật ở nơi khác',version}])
    })
    try {
      await goto(f,'/app/family?tab=tasks'); await f.page.getByRole('button',{name:'Sửa '+task.title,exact:true}).click(); const dialog=f.page.getByRole('dialog',{name:'Sửa việc gia đình',exact:true})
      await dialog.getByLabel(/^Tiêu đề/).fill('Giữ nội dung việc'); await twice(dialog.getByRole('button',{name:'Lưu thay đổi',exact:true})); await dialog.getByRole('button',{name:'Xem bản mới, giữ bản nháp'}).waitFor(); assert.equal(writes.length,1)
      await dialog.getByRole('button',{name:'Xem bản mới, giữ bản nháp'}).click(); await dialog.getByText(/Bản mới có tiêu đề/).waitFor(); await assertValue(dialog.getByLabel(/^Tiêu đề/),'Giữ nội dung việc')
      assert.equal(writes.length,1); await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal(writes[1].version,2)
      return writes
    } finally { await f.context.close() }
  })
  await check('settings conflict keeps preferences and uses the refreshed version', async () => {
    const f=await session('USER'); let version=1, writes=[]
    const saved={language:'vi',locale:'vi-VN',timezone:'Asia/Ho_Chi_Minh',theme:'LIGHT',weight_unit:'KG',length_unit:'CM',glucose_unit:'MMOL_L',backup_enabled:true,notification_enabled:true,push_enabled:false,email_enabled:false,sms_enabled:false,preferred_reminder_time:null,quiet_hours:null,version:1}
    await f.context.route('**/api/v1/users/me/preferences',route=>{
      if(route.request().method()==='PATCH') { writes.push(route.request().postDataJSON()); if(writes.length===1) {version=2;return fail(route,409,'VERSION_CONFLICT')} return ok(route,{...saved,...writes.at(-1),version:3}) }
      return ok(route,{...saved,version})
    })
    try {
      await goto(f,'/app/settings');await f.page.getByLabel('Locale',{exact:true}).fill('en-US')
      await twice(f.page.getByRole('button',{name:'Lưu cài đặt',exact:true}));await f.page.getByRole('button',{name:'Tải lại',exact:true}).waitFor()
      await f.page.getByRole('button',{name:'Tải lại',exact:true}).click();await f.page.getByText(/Đã tải bản mới/).waitFor();await assertValue(f.page.getByLabel('Locale',{exact:true}),'en-US')
      assert.equal(writes.length,1);await f.page.getByRole('button',{name:'Lưu cài đặt',exact:true}).click();await f.page.getByText('Cài đặt đã được lưu.').waitFor();assert.equal(writes[1].version,2)
    } finally {await f.context.close()}
  })

  await check('reminder conflict keeps note and Vietnam wall time when the parent receives fresh detail', async () => {
    const f=await session('USER');let version=1,writes=[]
    const detail={id:'reminder-qa',type:'CUSTOM',title:'Uống vitamin',starts_at:'2099-10-23T18:00:00Z',date:'2099-10-24',status:'SCHEDULED',note:'Ghi chú ban đầu',remind_minutes_before:10,version:1}
    await f.context.route('**/api/v1/calendar/reminders/reminder-qa',route=>{
      if(route.request().method()==='PATCH') {writes.push(route.request().postDataJSON());if(writes.length===1){version=2;return fail(route,409,'VERSION_CONFLICT')}return ok(route,{...detail,...writes.at(-1),version:3})}
      return ok(route,{...detail,title:version===1?detail.title:'Bản mới từ máy chủ',version})
    })
    try {
      await f.page.setViewportSize({width:390,height:844});await goto(f,'/app?reminder=reminder-qa#calendar')
      await f.page.getByRole('button',{name:'Sửa',exact:true}).click();const dialog=f.page.getByRole('dialog',{name:'Sửa lịch nhắc nhở',exact:true})
      await dialog.getByLabel(/^Ghi chú/).fill('Bản nháp lịch nhắc');await assertValue(dialog.getByLabel('Thời gian bắt đầu',{exact:true}),'2099-10-24T01:00')
      await twice(dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}));await dialog.getByRole('button',{name:'Xem bản mới, giữ bản nháp'}).click();await dialog.getByText(/Bản mới: Bản mới từ máy chủ/).waitFor()
      await assertValue(dialog.getByLabel(/^Ghi chú/),'Bản nháp lịch nhắc');assert.equal(writes.length,1)
      await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes[1].version,2);assert.equal(writes[1].note,'Bản nháp lịch nhắc')
    } finally {await f.context.close()}
  })
  await check('HTTP-date 429 blocks query changes and waits for manual library retry', async () => {
    const f=await session('guest');let reads=0
    await f.context.route('**/api/v1/knowledge/articles?**',route=>{
      const query=new URL(route.request().url()).searchParams
      if(query.get('pageSize')==='1')return ok(route,{items:[],currentPage:1,pageSize:1,totalItems:0,totalPages:0})
      reads++;if(reads===1)return fail(route,429,'TOO_MANY_REQUESTS',{'Retry-After':new Date(Date.now()+3000).toUTCString()})
      return ok(route,{items:[],currentPage:1,pageSize:6,totalItems:0,totalPages:0})
    })
    try {
      await goto(f,'/blog');const library=f.page.locator('.nm-knowledge-library');await library.getByRole('button',{name:/Thử lại sau/}).waitFor();assert.equal(reads,1)
      await library.locator('.nm-filter-chip').nth(1).click();await f.page.waitForTimeout(150);assert.equal(reads,1)
      await f.page.waitForTimeout(3100);assert.equal(reads,1);await library.getByRole('button',{name:'Thử lại',exact:true}).click();await library.getByText('Chưa có bài phù hợp với lựa chọn này').waitFor();assert.equal(reads,2)
    } finally {await f.context.close()}
  })

  await check('member scope conflict keeps checked options and saves the latest version', async () => {
    const f=await session('USER');let version=1,writes=[]
    const member={id:'member-qa',family_group_id:'group-qa',user_id:'partner-qa',display_name:'Bạn đời QA',relationship:'PARTNER',membership_role:'PARTNER',scopes:['PREGNANCY_SUMMARY','FAMILY_TASKS'],status:'ACTIVE',version:1,created_at:'2026-10-21T00:00:00Z',updated_at:'2026-10-21T00:00:00Z'}
    await f.context.route('**/api/v1/family-members**',route=>{
      if(route.request().method()==='PATCH'){writes.push(route.request().postDataJSON());if(writes.length===1){version=2;return fail(route,409,'VERSION_CONFLICT')}return ok(route,{...member,...writes.at(-1),version:3})}
      return ok(route,[{...member,version}])
    })
    try {
      await goto(f,'/app/family');await f.page.getByRole('button',{name:/^Chỉnh quyền Bạn đời QA/}).click();const dialog=f.page.getByRole('dialog',{name:'Chỉnh quyền thành viên',exact:true})
      const taskScope=dialog.getByRole('checkbox',{name:'Việc gia đình',exact:true});await taskScope.focus();await f.page.keyboard.press('Space');assert.equal(await taskScope.isChecked(),false);await twice(dialog.getByRole('button',{name:'Lưu quyền',exact:true}))
      await dialog.getByRole('button',{name:'Xem quyền mới, giữ lựa chọn'}).click();await dialog.getByText(/Đã tải quyền mới/).waitFor();assert.equal(await taskScope.isChecked(),false);assert.equal(writes.length,1)
      await dialog.getByRole('button',{name:'Lưu quyền',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes[1].version,2);assert(!writes[1].scopes.includes('FAMILY_TASKS'))
    } finally {await f.context.close()}
  })
  await check('lifecycle: offscreen motion pauses and reduced-motion video waits for user control', async () => {
    const f=await session('guest',false,{reducedMotion:'no-preference'})
    try {
      await goto(f,'/');const marquee=f.page.locator('.testimonial-marquee-track')
      await f.page.waitForTimeout(100);assert.equal(await marquee.evaluate(e=>getComputedStyle(e).animationPlayState),'paused')
      await marquee.scrollIntoViewIfNeeded();await f.page.waitForTimeout(200);assert.equal(await marquee.evaluate(e=>getComputedStyle(e).animationPlayState),'running')
      await f.page.evaluate(()=>window.scrollTo(0,0));await f.page.waitForTimeout(200);assert.equal(await marquee.evaluate(e=>getComputedStyle(e).animationPlayState),'paused')
    } finally {await f.context.close()}
    const user=await session('USER')
    try {
      await user.page.setViewportSize({width:390,height:844});await goto(user,'/app');const video=user.page.locator('.nm-overview-hero__video')
      assert.equal(await video.getAttribute('src'),null)
      await user.page.getByRole('button',{name:'Phát video nền',exact:true}).click();await user.page.getByRole('button',{name:'Tạm dừng video nền',exact:true}).waitFor()
      await user.page.getByRole('button',{name:'Tạm dừng video nền',exact:true}).click();assert.equal(await video.evaluate(e=>e.paused),true)
    } finally {await user.context.close()}
  })

  await check('personas: partner and family-member layouts support light/dark mobile and laptop', async () => {
    const samples=[]
    for(const persona of ['PARTNER','FAMILY_MEMBER']) {
      const f=await session(persona)
      try {
        for(const width of [390,1440]) for(const path of ['/app','/app/family?tab=tasks','/app/profile','/app/nutrition']) {
          await f.page.setViewportSize({width,height:844});await goto(f,path);await f.page.waitForTimeout(350)
          for(const theme of ['light','dark']) {
            await f.page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme)
            const geometry=await f.page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,body:document.body.innerText.length,path:location.pathname}))
            assert.equal(geometry.overflow,false);assert(geometry.body>80);assert(geometry.path.startsWith('/app'));samples.push({persona,width,path,theme})
          }
        }
      } finally {await f.context.close()}
    }
    return samples
  })
  await check('diary: refresh after 409 preserves text and requires an explicit discard or save', async () => {
    const f=await session('USER');let writes=[]
    const entry={entry_id:'diary-conflict',local_date:'2026-10-18',meal_type:'LUNCH',name:'Món tự ghi',custom_text:'Nội dung ban đầu',amount_text:'Một bát',estimate_incomplete:true,coverage:'PARTIAL',created_at:'2026-10-18T05:00:00Z',nutrition:{},notes:[]}
    f.state.diaryEntries=[entry]
    await f.context.route('**/api/v1/diary-entries/diary-conflict',route=>{
      if(route.request().method()!=='PATCH')return route.fallback()
      writes.push(route.request().postDataJSON());if(writes.length===1){entry.custom_text='Món đã sửa trên máy chủ';return fail(route,409,'VERSION_CONFLICT')}
      return route.fallback()
    })
    try {
      await goto(f,'/app/nutrition?tab=diary&date=2026-10-18');await f.page.getByLabel('Thao tác với Món tự ghi',{exact:true}).click();await f.page.getByRole('button',{name:'Sửa món đã ghi',exact:true}).click()
      const dialog=f.page.getByRole('dialog',{name:'Sửa món đã ghi',exact:true});const input=dialog.getByLabel('Tên món tự nhập',{exact:true});await input.fill('Món trong bản nháp')
      await dialog.getByRole('button',{name:'Lưu thay đổi nhật ký',exact:true}).click();await dialog.getByRole('button',{name:'Tải nhật ký mới, giữ nội dung đang sửa'}).click();await dialog.getByText('Đã tải nhật ký mới, bản nháp vẫn được giữ').waitFor()
      await assertValue(input,'Món trong bản nháp');assert.equal(writes.length,1);await dialog.getByRole('button',{name:'Đóng',exact:true}).first().click()
      const discard=f.page.getByRole('dialog',{name:'Bỏ thay đổi chưa lưu?'});await discard.getByRole('button',{name:'Tiếp tục chỉnh sửa'}).click();await assertValue(input,'Món trong bản nháp')
      await dialog.getByRole('button',{name:'Lưu thay đổi nhật ký',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.length,2);assert.equal(writes[1].custom_text,'Món trong bản nháp')
    } finally {await f.context.close()}
  })
  await check('OTP: six-digit challenge fits phone, tablet, laptop and short landscape in both themes', async () => {
    const f=await session('guest')
    await f.context.route('**/api/v1/auth/otp/request',route=>ok(route,{challenge_id:'challenge-qa',masked_phone:'090***2233',delivery_channel:'SMS',expires_in:300,resend_after:30}))
    try {
      await goto(f,'/otp');await f.page.getByLabel('Số điện thoại',{exact:true}).fill('0901112233');await f.page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();await f.page.locator('.otp-control [data-pin-slot]').last().waitFor()
      assert.equal(await f.page.locator('.otp-control [data-pin-slot]').count(),6)
      for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[568,320]]) for(const theme of ['light','dark']) {
        await f.page.setViewportSize({width,height});await f.page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme)
        const layout=await f.page.locator('.otp-control').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}))
        assert(!layout.overflow && layout.left>=0 && layout.right<=width,JSON.stringify(layout))
      }
    } finally {await f.context.close()}
  })
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify({results,pageErrors,unexpected,missing:[...missing]},null,2))
  await browser.close(); await server.close()
  if(results.some(r=>!r.passed)||pageErrors.length||unexpected.length||missing.size) process.exitCode=1
}
