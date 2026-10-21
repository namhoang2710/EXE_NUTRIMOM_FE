import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  values=new Map<string,string>()
  getItem(key:string){return this.values.get(key)??null}
  setItem(key:string,value:string){this.values.set(key,value)}
  removeItem(key:string){this.values.delete(key)}
}
const events=new EventTarget()
Object.assign(globalThis,{localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage(),window:{addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),setTimeout,clearTimeout}})
const {apiClient}=await import('../src/core/api/api-client.ts')
const {clearSession,saveApiSession}=await import('../src/core/auth/token-store.ts')
await import('../src/features/auth/api/auth-api.ts')
const {openAdminRealtime}=await import('../src/features/admin/api/admin-realtime-transport.ts')
const auth=(access='old',id='admin-a')=>({access_token:access,refresh_token:'refresh-qa',expires_in:900,refresh_expires_in:3600,token_type:'Bearer',user:{id,phone:'0900000000',display_name:'QA',roles:['ADMIN'],status:'ACTIVE',created_at:'2026-10-15T00:00:00Z'}})
const json=(data:unknown,status=200)=>new Response(JSON.stringify(status===200?{data}:data),{status,headers:{'Content-Type':'application/json'}})
const unauthorized=()=>json({error:{code:'UNAUTHORIZED',message:'QA'}},401)
test('HTTP and SSE simultaneous 401 share exactly one real refreshSession; token only in headers',async()=>{
  clearSession();saveApiSession(auth());let refreshes=0,gets=0,streams=0
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const path=String(input),headers=new Headers(init?.headers)
    assert.ok(!path.includes('old'));assert.ok(!path.includes('new-token'))
    if(path.endsWith('/auth/refresh')){refreshes++;await new Promise(r=>setTimeout(r,10));return json(auth('new-token'))}
    const stream=path.endsWith('/admin/realtime/stream');if(stream){streams++;assert.equal(headers.get('Accept'),'text/event-stream');assert.ok(headers.get('X-Device-Id'));assert.ok(headers.get('X-Request-Id'))}else gets++
    if(headers.get('Authorization')!=='Bearer new-token')return unauthorized()
    return stream?new Response('event: ready\ndata: {}\n\n',{headers:{'Content-Type':'text/event-stream'}}):json({ok:true})
  }) as typeof fetch
  const [data,stream]=await Promise.all([apiClient.request('/admin/dashboard'),openAdminRealtime(new AbortController().signal)])
  assert.deepEqual(data,{ok:true});assert.equal(stream.status,200);await stream.body?.cancel();assert.equal(refreshes,1);assert.equal(streams,2);assert.equal(gets,2)
})
test('SSE reuses an already rotated token instead of refreshing again',async()=>{
  clearSession();saveApiSession(auth());let calls=0,refreshes=0
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    if(String(input).endsWith('/auth/refresh')){refreshes++;return json(auth('rotated'))}
    calls++;if(calls===1){saveApiSession(auth('rotated'),true);return unauthorized()}
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer rotated');return new Response('',{headers:{'Content-Type':'text/event-stream'}})
  }) as typeof fetch
  const response=await openAdminRealtime(new AbortController().signal);await response.body?.cancel();assert.equal(calls,2);assert.equal(refreshes,0)
})
test('SSE retries 401 only once and rejects a final 401',async()=>{
  clearSession();saveApiSession(auth());let calls=0,refreshes=0
  globalThis.fetch=(async(input:RequestInfo|URL)=>{if(String(input).endsWith('/auth/refresh')){refreshes++;return json(auth('new'))};calls++;return unauthorized()}) as typeof fetch
  await assert.rejects(openAdminRealtime(new AbortController().signal),(e:unknown)=>Boolean(e&&typeof e==='object'&&'status' in e&&e.status===401));assert.equal(calls,2);assert.equal(refreshes,1)
})
test('a late stream handshake from another account cannot escape the session guard',async()=>{
  clearSession();saveApiSession(auth());let release!:(r:Response)=>void
  globalThis.fetch=(()=>new Promise<Response>(r=>release=r)) as typeof fetch
  const pending=openAdminRealtime(new AbortController().signal);saveApiSession(auth('other','admin-b'));release(new Response('',{headers:{'Content-Type':'text/event-stream'}}))
  await assert.rejects(pending,{name:'AbortError'})
})
