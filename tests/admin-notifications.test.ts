import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClientError } from '../src/core/api/api-error.ts'
import { createAdminReadCoordinator } from '../src/features/admin/model/admin-read-coordinator.ts'
import { adaptAdminNotificationLink } from '../src/features/admin/model/admin-notification-link.ts'
import { adminNotificationCountPath, applyAdminRead, applyAdminReadAll, buildAdminNotificationsPath, buildAdminReadAllPath, createAdminCursorRecovery, createAdminNotificationMutations, normalizeAdminNotificationPage, normalizeNotificationTotal, parseAdminNotificationQuery } from '../src/features/admin/model/admin-notifications.ts'
import { normalizeNotificationPage, NotificationContractError } from '../src/features/notifications/model/notification-normalizers.ts'
import type { NotificationItem } from '../src/features/notifications/model/notification-types.ts'
const id = '11111111-1111-4111-8111-111111111111'
const item:NotificationItem = { id,type:'SYSTEM',title:'Tài khoản mới',body:'Nội dung BE',created_at:'2026-10-14T01:00:00Z',audience:'ADMIN',category:'ACCOUNT' }
const deferred = <T>() => { let resolve!:(value:T) => void; const promise=new Promise<T>((r) => {resolve=r});return {promise,resolve} }

test('Admin canonical queries always carry audience; All omits category and opaque cursor is encoded',() => {
  assert.equal(buildAdminNotificationsPath({unreadOnly:false}),'/notifications?audience=ADMIN&limit=20&unreadOnly=false')
  const params=new URLSearchParams(buildAdminNotificationsPath({unreadOnly:true,category:'PAYMENT'},'a+/=?&x').split('?')[1])
  assert.equal(params.get('cursor'),'a+/=?&x'); assert.equal(params.get('category'),'PAYMENT');assert.equal(params.get('unreadOnly'),'true')
  assert.equal(adminNotificationCountPath,'/notifications/unread-count?audience=ADMIN')
  assert.equal(buildAdminReadAllPath(),'/notifications/read-all?audience=ADMIN')
  assert.equal(buildAdminReadAllPath('ACCOUNT'),'/notifications/read-all?audience=ADMIN&category=ACCOUNT')
})
test('URL filters reject empty, duplicate, invented and non-boolean values before transport',() => {
  for (const raw of ['category=','category=ALL','category=USER','category=ACCOUNT&category=PAYMENT','unreadOnly=','unreadOnly=1','unreadOnly=true&unreadOnly=false']) assert.equal(parseAdminNotificationQuery(new URLSearchParams(raw)).valid,false,raw)
  assert.deepEqual(parseAdminNotificationQuery(new URLSearchParams('category=PAYMENT&unreadOnly=true')).filter,{category:'PAYMENT',unreadOnly:true})
  assert.equal(parseAdminNotificationQuery(new URLSearchParams()).valid,true)
})
test('legacy User items remain valid; metadata is preserved without assigning missing Admin metadata',() => {
  const {audience:_audience,category:_category,...legacy}=item
  assert.deepEqual(normalizeNotificationPage({items:[legacy],has_more:false}).items,[legacy])
  assert.deepEqual(normalizeNotificationPage({items:[item],has_more:false}).items,[item])
  assert.throws(() => normalizeAdminNotificationPage({items:[legacy],has_more:false},{unreadOnly:false}),NotificationContractError)
})
test('Admin rejects mixed audiences, categories, malformed items, unread violations and incomplete cursor contract',() => {
  for (const wrong of [{...item,audience:'USER'},{...item,audience:'UNKNOWN'},{...item,category:undefined},{...item,category:'SYSTEM'},{...item,title:''}]) assert.throws(() => normalizeAdminNotificationPage({items:[item,wrong],has_more:false},{unreadOnly:false}),NotificationContractError)
  assert.throws(() => normalizeAdminNotificationPage({items:[item],has_more:false},{category:'PAYMENT',unreadOnly:false}),NotificationContractError)
  assert.throws(() => normalizeAdminNotificationPage({items:[{...item,read_at:item.created_at}],has_more:false},{unreadOnly:true}),NotificationContractError)
  assert.throws(() => normalizeAdminNotificationPage({items:[item],has_more:true},{unreadOnly:false}),NotificationContractError)
})
test('count and updated are safe nonnegative integers, with no coercion or fake zero',() => {
  for (const field of ['count','updated'] as const) {
    for (const value of [undefined,null,-1,1.5,'0',NaN,Number.MAX_SAFE_INTEGER+1]) assert.throws(() => normalizeNotificationTotal({[field]:value},field),NotificationContractError)
    assert.equal(normalizeNotificationTotal({[field]:0},field),0)
    assert.equal(normalizeNotificationTotal({[field]:101},field),101)
  }
})
test('four strict deep links open existing drawers, preserving a Long order code string',() => {
  const expected={users:'/admin/users?userId='+id,appointments:'/admin/appointments?requestId='+id,'contact-requests':'/admin/support/'+id}
  for (const [kind,path] of Object.entries(expected)) assert.deepEqual(adaptAdminNotificationLink(`nutrimom://admin/${kind}/${id}`,true),{path})
  assert.deepEqual(adaptAdminNotificationLink('nutrimom://admin/payment-orders/9223372036854775807',true),{path:'/admin/revenue?orderCode=9223372036854775807'})
  for (const link of ['javascript:alert(1)','https://evil.test','nutrimom://admin/users/'+id+'#x','nutrimom://admin/users/'+id+'?x=1','nutrimom://admin/users/%2e%2e','nutrimom://admin/users/../'+id,'nutrimom://admin/payment-orders/'+id,'nutrimom://admin/payment-orders/9223372036854775808','nutrimom://admin/payment-orders/01','nutrimom://admin/users/%31'+id.slice(1)]) assert.equal(adaptAdminNotificationLink(link,true).path,undefined,link)
  assert.equal(adaptAdminNotificationLink('nutrimom://admin/users/'+id,false).path,undefined)
})
test('read removes only unread feed entries, preserving all-feed cache and unrelated categories',() => {
  const payment={...item,id:'payment',category:'PAYMENT' as const};const state={items:[item,payment],hasMore:true,nextCursor:'opaque'}
  const updated={...item,read_at:item.created_at}
  assert.equal(applyAdminRead(state,{unreadOnly:true},updated).items.length,1)
  assert.equal(applyAdminRead(state,{unreadOnly:false},updated).items.length,2)
  const all=applyAdminReadAll(state,{unreadOnly:false},'ACCOUNT',item.created_at)
  assert.ok(all.items[0].read_at);assert.equal(all.items[1].read_at,undefined)
  assert.deepEqual(applyAdminReadAll(state,{unreadOnly:true},'ACCOUNT',item.created_at).items,[payment])
  assert.equal(applyAdminReadAll(state,{unreadOnly:true},undefined,item.created_at).items.length,0)
  assert.equal(applyAdminReadAll(state,{unreadOnly:false},undefined,item.created_at,new Set([item.id])).items[1].read_at,undefined)
})
test('a rejected cursor recovers at most once within its session/filter scope',() => {
  const c=createAdminCursorRecovery(),a=buildAdminNotificationsPath({unreadOnly:false},'opaque'),b=buildAdminNotificationsPath({unreadOnly:true,category:'PAYMENT'},'opaque')
  assert.equal(c.recover(a),true);assert.equal(c.recover(a),false);assert.equal(c.recover(b),true)
})
test('writes dedupe ID/scope and serialize read/read-all; rejection does not poison the queue',async () => {
  const c=createAdminNotificationMutations(),d=deferred<number>();let reads=0,alls=0
  const one=c.run('read:a',()=>{reads++;return d.promise}),two=c.run('read:a',async()=>++reads)
  const all=c.run('all:PAYMENT',async()=>++alls),same=c.run('all:PAYMENT',async()=>++alls)
  assert.equal(one,two);assert.equal(all,same);await Promise.resolve();await Promise.resolve();assert.equal(alls,0)
  d.resolve(7);assert.equal(await one,7);await all;assert.equal(reads,1);assert.equal(alls,1)
  await assert.rejects(c.run('read:b',async()=>{throw new Error('fail')}));assert.equal(await c.run('read:c',async()=>4),4)
})
test('notification 429 blocks every new feed, count, retry and POST scope; invalidation preserves cooldown',async () => {
  let now=0,calls=0; const c=createAdminReadCoordinator(()=>now);c.setScope('A')
  const rate=new ApiClientError(429,{code:'TOO_MANY_REQUESTS',message:'Wait'},90_000)
  const key='GET:'+buildAdminNotificationsPath({unreadOnly:false})
  await assert.rejects(c.read(key,async()=>{calls++;throw rate}))
  c.invalidate('GET:/notifications')
  for (const blocked of ['GET:'+buildAdminNotificationsPath({category:'PAYMENT',unreadOnly:true}),'GET:'+adminNotificationCountPath]) await assert.rejects(c.read(blocked,async()=>++calls))
  for (const blocked of ['POST:'+buildAdminReadAllPath('ACCOUNT'),'POST:/notifications/a/read']) assert.throws(()=>c.assertAvailable(blocked),ApiClientError)
  assert.equal(calls,1);assert.equal(c.cooldownUntil('POST:/notifications/read-all'),90_000)
  assert.equal(await c.read('GET:/admin/users',async()=>9),9)
  now=90_001;assert.equal(await c.read(key,async()=>++calls),2)
})
test('POST rate limits protect GET scopes and cooldown is isolated to the session',async () => {
  let calls=0;const c=createAdminReadCoordinator(()=>0);c.setScope('A')
  c.recordFailure('POST:/notifications/read-all?audience=ADMIN',new ApiClientError(429,{code:'TOO_MANY_REQUESTS',message:'Wait'},10_000))
  await assert.rejects(c.read('GET:'+adminNotificationCountPath,async()=>++calls));assert.equal(calls,0)
  c.setScope('B');assert.equal(await c.read('GET:'+adminNotificationCountPath,async()=>++calls),1)
})
test('terminal notification 401/403 purges cache and GET flights without retry; next account starts clean',async () => {
  for (const status of [401,403]) {
    const c=createAdminReadCoordinator();c.setScope('A');await c.read('GET:/admin/users',async()=>item)
    await assert.rejects(c.read('GET:'+adminNotificationCountPath,async()=>{throw new ApiClientError(status,{code:'UNAUTHORIZED',message:'Denied'})}))
    assert.equal(c.inspect().cached,0);assert.equal(c.isDenied(),true)
    let calls=0;await assert.rejects(c.read('GET:/notifications',async()=>++calls));assert.equal(calls,0)
    c.setScope('B');assert.equal(await c.read('GET:/notifications',async()=>++calls),1)
  }
})
test('shared feed StrictMode leases, TTL and late account responses obey HTTP budgets',async () => {
  let now=0,calls=0;const c=createAdminReadCoordinator(()=>now);c.setScope('A');const d=deferred<number>(),a=new AbortController()
  const key='GET:'+buildAdminNotificationsPath({unreadOnly:false})
  const old=c.read(key,()=>{calls++;return d.promise},a.signal);const rejected=assert.rejects(old,{name:'AbortError'})
  a.abort();const bell=c.read(key,()=>{calls++;return d.promise});const page=c.read(key,async()=>++calls)
  d.resolve(1);assert.equal(await bell,1);assert.equal(await page,1);await rejected;assert.equal(calls,1)
  now=29_999;assert.equal(await c.read(key,async()=>++calls),1);now=30_000;assert.equal(await c.read(key,async()=>++calls),2)
  const late=deferred<number>();const pending=c.read('GET:/notifications?cursor=next',()=>late.promise);const denied=assert.rejects(pending,{name:'AbortError'})
  await Promise.resolve();c.setScope('B');late.resolve(99);await denied;assert.equal(c.inspect().cached,0)
})
