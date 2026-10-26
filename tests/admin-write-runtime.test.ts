import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { ApiClientError } from '../src/core/api/api-error.ts'

class MemoryStorage {
  values = new Map<string,string>()
  getItem(key:string) { return this.values.get(key) ?? null }
  setItem(key:string,value:string) { this.values.set(key,value) }
  removeItem(key:string) { this.values.delete(key) }
}
const events = new EventTarget()
Object.assign(globalThis, { localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage(),window:{
  location:{origin:'http://localhost:5173'},addEventListener:events.addEventListener.bind(events),
  dispatchEvent:events.dispatchEvent.bind(events),setTimeout,clearTimeout,
} })
const tokens = await import('../src/core/auth/token-store.ts')
let source = await readFile(new URL('../src/features/admin/api/admin-read.ts',import.meta.url),'utf8')
for (const [alias,path] of Object.entries({
  '@/core/api/api-client':'../src/core/api/api-client.ts',
  '@/core/api/api-error':'../src/core/api/api-error.ts',
  '@/core/auth/token-store':'../src/core/auth/token-store.ts',
  '../model/admin-read-coordinator':'../src/features/admin/model/admin-read-coordinator.ts',
  './admin-realtime-store':'../src/features/admin/api/admin-realtime-store.ts',
  '../model/admin-realtime-sync':'../src/features/admin/model/admin-realtime-sync.ts',
  '../model/admin-realtime-contract':'../src/features/admin/model/admin-realtime-contract.ts',
})) source=source.replace(`'${alias}'`,`'${new URL(path,import.meta.url).href}'`)
const admin = await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
function login(id='admin-a') {
  tokens.clearSession()
  tokens.saveApiSession({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:900,refresh_expires_in:3600,token_type:'Bearer',user:{id,phone:'0900000000',display_name:'QA',roles:['ADMIN'],status:'ACTIVE',created_at:'2026-10-15T00:00:00Z'}})
  admin.configureAdminReads(id,['ADMIN'],true)
}
const failure=(status:number)=>new ApiClientError(status,{code:'RATE_LIMITED',message:'QA'},60_000)
test('one Admin write 429 blocks subsequent Admin writes and reads without retrying transport',async()=>{
  login();let writes=0,reads=0
  await assert.rejects(admin.adminMutation(async()=>{writes++;throw failure(429)},[]))
  await assert.rejects(admin.adminMutation(async()=>{writes++},[]))
  await assert.rejects(admin.adminReads.read('GET:/admin/users',async()=>{reads++}))
  assert.equal(writes,1);assert.equal(reads,0)
})
test('a late 403 from the previous account cannot deny the newly authenticated Admin',async()=>{
  login();let reject!:(reason:unknown)=>void
  const delayed=admin.adminMutation(()=>new Promise((_resolve,r)=>{reject=r}),[])
  login('admin-b');reject(failure(403));await assert.rejects(delayed)
  assert.equal(admin.adminReads.isDenied(),false)
  assert.equal(await admin.adminMutation(async()=>42,[]),42)
})
test('a final Admin write 401 clears the session and prevents further Admin writes',async()=>{
  login();await assert.rejects(admin.adminMutation(async()=>{throw failure(401)},[]))
  assert.equal(tokens.getSession(),null)
  let writes=0;await assert.rejects(admin.adminMutation(async()=>{writes++},[]));assert.equal(writes,0)
})
