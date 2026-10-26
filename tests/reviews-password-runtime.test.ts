import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthResponseDto } from '../src/features/auth/model/auth-dto.ts'
class MemoryStorage {
  values = new Map<string,string>()
  getItem(key:string) {return this.values.get(key) ?? null}
  setItem(key:string,value:string) {this.values.set(key,value)}
  removeItem(key:string) {this.values.delete(key)}
}
const events = new EventTarget()
Object.assign(globalThis,{localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage(),window:{location:{origin:'http://localhost:5173'},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),setTimeout,clearTimeout}})
const { reviewsApi,invalidateReviews }=await import('../src/features/reviews/api/reviews-api.ts')
const { passwordApi }=await import('../src/features/auth/api/password-api.ts')
const { clearSession,saveApiSession }=await import('../src/core/auth/token-store.ts')
const { env }=await import('../src/core/config/env.ts')
const { ApiClientError }=await import('../src/core/api/api-error.ts')
function reset(id='reviewer') {
  clearSession(); saveApiSession({access_token:'qa-jwt',refresh_token:'qa-refresh',expires_in:900,refresh_expires_in:3600,token_type:'Bearer',user:{id,phone:'0900000000',display_name:'QA',roles:['USER'],status:'ACTIVE',created_at:'2026-10-25T00:00:00Z'}} as AuthResponseDto)
  invalidateReviews();Object.assign(env,{apiBaseUrl:'/api/v1'})
}
function json(data:unknown,status=200,headers={}) {return new Response(JSON.stringify(status<400?{data}:{error:data}),{status,headers:{'Content-Type':'application/json',...headers}})}
const summary={total:0,by_rating:{'1':0,'2':0,'3':0,'4':0,'5':0}}
test('review summary coalesces overlapping readers, caches results and sends no auth to public endpoints',async()=>{
  reset();let calls=0
  globalThis.fetch=(async(_url,options)=>{calls++;assert.equal(new Headers(options?.headers).has('Authorization'),false);await new Promise(r=>setTimeout(r,5));return json(summary)}) as typeof fetch
  await Promise.all([reviewsApi.summary(),reviewsApi.summary(),reviewsApi.summary()]);await reviewsApi.summary()
  assert.equal(calls,1)
})
test('only the specific missing-own-review code is empty and that empty result is cached',async()=>{
  reset();let calls=0
  globalThis.fetch=(async()=>{calls++;return json({code:'WEB_REVIEW_NOT_FOUND',message:'None'},404)}) as typeof fetch
  assert.equal(await reviewsApi.mine(),null);assert.equal(await reviewsApi.mine(),null);assert.equal(calls,1)
  invalidateReviews()
  globalThis.fetch=(async()=>json({code:'ENDPOINT_NOT_FOUND',message:'Unavailable'},404)) as typeof fetch
  await assert.rejects(reviewsApi.mine(),(error:unknown)=>error instanceof ApiClientError && error.code==='ENDPOINT_NOT_FOUND')
})
test('review mutation serializes the explicit version and expires summary only after server success',async()=>{
  reset();let reads=0
  globalThis.fetch=(async(_url,options)=>{if(options?.method==='PUT'){assert.deepEqual(JSON.parse(String(options.body)),{rating:5,content:'Trải nghiệm tuyệt vời',version:8});return json({id:'r',rating:5,content:'Trải nghiệm tuyệt vời',version:9,status:'PUBLISHED'})}reads++;return json(summary)}) as typeof fetch
  await reviewsApi.summary();await reviewsApi.save(5,' Trải nghiệm tuyệt vời ',8);await reviewsApi.summary();assert.equal(reads,2)
})
test('a private late response cannot populate another account cache',async()=>{
  reset();let release:(response:Response)=>void=()=>{}
  globalThis.fetch=(()=>new Promise<Response>(resolve=>{release=resolve})) as typeof fetch
  const old=reviewsApi.mine();const rejected=assert.rejects(old)
  await new Promise(r=>setTimeout(r,1));clearSession();release(json({id:'old',rating:5,content:'Old account',version:1,status:'PUBLISHED'}));await rejected
  reset('new-reviewer');globalThis.fetch=(async()=>json({id:'new',rating:4,content:'New account',version:1,status:'PUBLISHED',created_at:'2026-10-25T00:00:00Z'})) as typeof fetch
  assert.equal((await reviewsApi.mine())?.id,'new')
})
test('reset validation single flight does not expose the token outside the POST body',async()=>{
  reset();let calls=0
  globalThis.fetch=(async(url,options)=>{calls++;assert.equal(String(url).includes('private-token'),false);assert.deepEqual(JSON.parse(String(options?.body)),{token:'private-token'});await new Promise(r=>setTimeout(r,5));return json({valid:true,expires_at:'2026-10-26T00:00:00Z',email_masked:'m***@example.test'})}) as typeof fetch
  await Promise.all([passwordApi.validate('private-token'),passwordApi.validate('private-token')]);assert.equal(calls,1)
})
test('public 429 blocks changed star filters and forgot 429 blocks changed email without automatic retry',async()=>{
  reset();let calls=0
  globalThis.fetch=(async()=>{calls++;return json({code:'RATE_LIMITED',message:'Chờ'},429,{'Retry-After':'60'})}) as typeof fetch
  await assert.rejects(reviewsApi.list({rating:'5'}));await assert.rejects(reviewsApi.list({rating:'4'}));assert.equal(calls,1)
  await assert.rejects(passwordApi.forgot('first@example.test'));await assert.rejects(passwordApi.forgot('second@example.test'));assert.equal(calls,2)
  await new Promise(r=>setTimeout(r,20));assert.equal(calls,2)
})
