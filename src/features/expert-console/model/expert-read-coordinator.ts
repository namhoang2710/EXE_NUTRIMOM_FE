import { ApiClientError } from '../../../core/api/api-error.ts'

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 30_000

function abortedRequest() {
  const error = new Error('Request aborted')
  error.name = 'AbortError'
  return error
}

function followWithSignal<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request
  if (signal.aborted) return Promise.reject(abortedRequest())

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortedRequest())
    signal.addEventListener('abort', abort, { once: true })
    void request.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

export function createExpertReadCoordinator(
  fallbackCooldownMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS,
  now: () => number = Date.now,
) {
  const pending=new Map<string,Promise<unknown>>(),cache=new Map<string,{value:unknown;expires:number}>()
  const invalidated=new Map<string,number>()
  let blockedUntil=0,rateLimitError:ApiClientError|null=null,generation=0,scope=''
  const failure=(reason:unknown)=>{if(reason instanceof ApiClientError&&reason.status===429){blockedUntil=Math.max(blockedUntil,now()+(reason.retryAfterMs??fallbackCooldownMs));rateLimitError=reason}}
  const clear=()=>{generation++;pending.clear();cache.clear();invalidated.clear();blockedUntil=0;rateLimitError=null}
  return {
    run<T>(key:string,request:()=>Promise<T>,signal?:AbortSignal,ttl=0):Promise<T>{
      if(signal?.aborted)return Promise.reject(abortedRequest())
      const hit=cache.get(key);if(hit&&hit.expires>now())return followWithSignal(Promise.resolve(hit.value as T),signal)
      cache.delete(key)
      const existing=pending.get(key) as Promise<T>|undefined;if(existing)return followWithSignal(existing,signal)
      if(now()<blockedUntil&&rateLimitError)return Promise.reject(rateLimitError)
      const started=generation,version=invalidated.get(key)??0
      const current=Promise.resolve().then(request).then(value=>{
        if(started!==generation||(invalidated.get(key)??0)!==version)throw abortedRequest()
        if(ttl>0){cache.set(key,{value,expires:now()+ttl});while(cache.size>40)cache.delete(cache.keys().next().value!)}
        return value
      }).catch((reason:unknown)=>{if(started===generation)failure(reason);throw reason}).finally(()=>{if(pending.get(key)===current)pending.delete(key)})
      pending.set(key,current);return followWithSignal(current,signal)
    },
    invalidate(prefix=''){for(const key of new Set([...cache.keys(),...pending.keys()]))if(key.startsWith(prefix)){cache.delete(key);pending.delete(key);invalidated.set(key,(invalidated.get(key)??0)+1)}},
    setScope(next:string){if(next!==scope){clear();scope=next}},
    assertAvailable(){if(now()<blockedUntil&&rateLimitError)throw rateLimitError},
    recordFailure:failure,
    isCoolingDown:()=>now()<blockedUntil,
    remainingMs:()=>Math.max(0,blockedUntil-now()),clear,
  }
}

export const expertReadCoordinator = createExpertReadCoordinator()
