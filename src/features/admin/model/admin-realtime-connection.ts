import { ApiClientError } from '../../../core/api/api-error.ts'
import { AdminRealtimeContractError, createAdminSseParser, decodeRealtimeEvent, type RealtimeSnapshot } from './admin-realtime-contract.ts'
import type { RealtimeState } from './admin-realtime-sync.ts'

type Clock = { now: () => number; set: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>; clear: (timer: ReturnType<typeof setTimeout>) => void }
/** Transport policy is independent of React and uses only one reconnect and one deadline timer. */
export function createAdminRealtimeConnection(options: {
  userId: string; open: (signal: AbortSignal) => Promise<Response>; current: () => boolean
  state: (state: RealtimeState) => void; snapshot: (value: RealtimeSnapshot, ready: boolean) => void
  forbidden: () => void; unauthorized: () => void; block: (until: number) => void; diagnostic: () => void
  clock?: Clock; random?: () => number
}) {
  const clock = options.clock ?? { now: Date.now, set: (fn: () => void, ms: number) => setTimeout(fn,ms), clear: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) }, random = options.random ?? Math.random
  let running = false, terminal = false, generation = 0, failures = 0, retryAt = 0
  let reconnect: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined, reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  const clearTimers = () => { if (reconnect !== undefined) clock.clear(reconnect); if (deadline !== undefined) clock.clear(deadline); reconnect = deadline = undefined }
  const cancel = () => { controller?.abort(); controller = undefined; void reader?.cancel().catch(() => undefined); reader = undefined; clearTimers() }
  async function connect() {
    reconnect = undefined
    if (!running || terminal || !options.current()) return
    if (clock.now() < retryAt) { reconnect = clock.set(() => void connect(), Math.min(2_147_483_647,retryAt - clock.now())); return }
    const run = ++generation, abort = new AbortController(); controller = abort
    const valid = () => running && !terminal && generation === run && options.current() && !abort.signal.aborted
    options.state(failures ? 'reconnecting' : 'connecting')
    let readyAt: number | undefined, localReader: typeof reader
    const arm = (ms: number) => { if (deadline !== undefined) clock.clear(deadline); deadline = clock.set(() => abort.abort(), ms) }
    arm(15_000)
    try {
      const response = await options.open(abort.signal)
      if (!valid()) { void response.body?.cancel().catch(() => undefined); return }
      if (response.headers.get('Content-Type')?.toLowerCase().split(';')[0].trim() !== 'text/event-stream' || !response.body) throw new AdminRealtimeContractError()
      localReader = response.body.getReader(); reader = localReader
      const parser = createAdminSseParser((event, data) => {
        if (!valid()) return
        const decoded = decodeRealtimeEvent(event, data, options.userId)
        if (!decoded) return
        if (decoded.type === 'access_revoked') { terminal = true; options.state('forbidden'); options.forbidden(); abort.abort(); return }
        if (decoded.type === 'heartbeat') { if (readyAt !== undefined) arm(45_000); return }
        if (decoded.type === 'update' && readyAt === undefined) throw new AdminRealtimeContractError()
        if (decoded.type === 'ready') {
          if (readyAt !== undefined) throw new AdminRealtimeContractError()
          readyAt = clock.now(); options.state('connected')
        }
        options.snapshot(decoded.snapshot, decoded.type === 'ready'); arm(45_000)
      })
      while (valid()) {
        const chunk = await localReader.read()
        if (chunk.done) { parser.end(); break }
        parser.push(chunk.value)
      }
    } catch (reason) {
      if (generation !== run || !running || terminal || !options.current()) return
      if (reason instanceof ApiClientError && reason.status === 401) { terminal = true; options.state('forbidden'); options.unauthorized(); return }
      if (reason instanceof ApiClientError && reason.status === 403) { terminal = true; options.state('forbidden'); options.forbidden(); return }
      if (reason instanceof AdminRealtimeContractError || reason instanceof TypeError && reason.message.includes('encoded data') || reason instanceof ApiClientError && [400,404,405,422,501].includes(reason.status)) {
        terminal = true; options.state('fallback'); if (reason instanceof AdminRealtimeContractError) options.diagnostic(); return
      }
      if (reason instanceof ApiClientError && reason.status === 429) {
        retryAt = clock.now() + (reason.retryAfterMs ?? 30_000); options.block(retryAt)
      }
    } finally {
      if (localReader) { void localReader.cancel().catch(() => undefined); try { localReader.releaseLock() } catch { /* pending abort read */ } }
      if (generation === run) { reader = undefined; controller = undefined; abort.abort(); if (deadline !== undefined) clock.clear(deadline); deadline = undefined }
    }
    if (generation !== run || !running || terminal || !options.current()) return
    if (readyAt !== undefined && clock.now() - readyAt >= 30_000) failures = 0
    const backoff = Math.min(30_000, 1_000 * 2 ** Math.min(failures++, 5)) * (1 + random() * .2)
    options.state('reconnecting')
    reconnect = clock.set(() => void connect(), Math.min(2_147_483_647,Math.max(backoff, retryAt - clock.now())))
  }
  return {
    start() { if (running || terminal) return; running = true; const run = ++generation; queueMicrotask(() => { if (running && generation === run) void connect() }) },
    pause() { running = false; generation++; cancel(); if (!terminal) options.state('reconnecting') },
    stop() { running = false; terminal = true; generation++; cancel() },
  }
}
