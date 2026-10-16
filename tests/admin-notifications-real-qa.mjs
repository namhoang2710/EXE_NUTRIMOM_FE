// Read-only local integration. Never persist credentials, bearer tokens or notification bodies.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { normalizeAdminNotificationPage, normalizeNotificationTotal } from '../src/features/admin/model/admin-notifications.ts'
const base = 'http://127.0.0.1:8080/api/v1'
const results = { base, mode:'real-read-only', checks:[] }
const output = new URL('../qa-artifacts/admin-notifications/',import.meta.url)
await mkdir(output,{recursive:true})
let auth
try {
  const specResponse = await fetch('http://127.0.0.1:8080/v3/api-docs',{signal:AbortSignal.timeout(15000)})
  const spec = await specResponse.json()
  results.checks.push({ endpoint:'/v3/api-docs',status:specResponse.status,notificationParameters:spec.paths?.['/api/v1/notifications']?.get?.parameters?.map(p=>p.name) || [] })
  const envText = await readFile('D:/KI8/BE/EXE_NUTRIMOM_BE/.env','utf8')
  const envValue = (key) => process.env[key] || envText.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1].trim().replace(/^['"]|['"]$/g,'')
  const phone=envValue('NUTRIMOM_ADMIN_PHONE'),password=envValue('NUTRIMOM_ADMIN_PASSWORD')
  if (!phone || !password) throw new Error('Local Admin QA credentials unavailable')
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password,device_id:'codex-notifications-read-'+crypto.randomUUID()}),signal:AbortSignal.timeout(15000)})
  results.checks.push({endpoint:'/auth/login',status:login.status})
  if (login.status !== 200) throw new Error('Local login unavailable')
  auth=(await login.json()).data
  for (const [path,validate] of [
    ['/notifications/unread-count?audience=ADMIN',p=>normalizeNotificationTotal(p,'count')],
    ['/notifications?audience=ADMIN&limit=20&unreadOnly=false',p=>normalizeAdminNotificationPage(p,{unreadOnly:false})],
    ['/notifications?audience=ADMIN&category=PAYMENT&limit=20&unreadOnly=false',p=>normalizeAdminNotificationPage(p,{category:'PAYMENT',unreadOnly:false})],
  ]) {
    const response=await fetch(base+path,{headers:{Authorization:'Bearer '+auth.access_token},signal:AbortSignal.timeout(15000)})
    const data=(await response.json()).data
    const row={endpoint:path,status:response.status}
    if (response.status === 200) {
      row.keys=data && typeof data==='object' ? Object.keys(data) : []
      if (Array.isArray(data?.items)) { row.items=data.items.length;row.missingAudience=data.items.filter(i=>i.audience!=='ADMIN').length;row.missingCategory=data.items.filter(i=>!i.category).length }
      try {validate(data);row.contract='PASS'}catch(error){row.contract='FAIL';row.reason=error.message}
    }
    results.checks.push(row)
  }
} catch (error) { results.unavailable=error.cause?.code || error.message }
finally {
  if (auth?.access_token) {
    const logout=await fetch(base+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh_token}),signal:AbortSignal.timeout(15000)}).catch(()=>null)
    results.checks.push({endpoint:'/auth/logout',status:logout?.status || 'unavailable'})
  }
  await writeFile(new URL('real-results.json',output),JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
}
