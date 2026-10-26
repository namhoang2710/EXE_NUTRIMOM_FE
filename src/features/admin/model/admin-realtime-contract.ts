export class AdminRealtimeContractError extends Error {
  constructor() { super('Invalid Admin realtime protocol'); this.name = 'AdminRealtimeContractError' }
}
export function realtimeRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length > 1024) throw new AdminRealtimeContractError()
  return BigInt(value).toString()
}
export function optionalRealtimeRevision(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if ('realtime_revision' in value) return realtimeRevision(value.realtime_revision)
  if ('type' in value && value.type === 'EXPERT_PERFORMANCE' && 'summary' in value && value.summary && typeof value.summary === 'object'
      && 'snapshot' in value.summary && value.summary.snapshot && typeof value.summary.snapshot === 'object' && 'realtime_revision' in value.summary.snapshot)
    return realtimeRevision(value.summary.snapshot.realtime_revision)
}
export const newerRevision = (next: string, old?: string) => old === undefined || BigInt(next) > BigInt(old)
export type RealtimeSnapshot = { protocol_version: 1; admin_user_id: string; dashboard_revision: string; notifications_revision: string; unread_count: number; community_pending_count?: number }
export type RealtimeEvent = { type: 'ready' | 'update'; snapshot: RealtimeSnapshot } | { type: 'heartbeat' } | { type: 'access_revoked' }
export function decodeRealtimeEvent(event: string, data: string, userId: string): RealtimeEvent | undefined {
  if (!['ready','update','heartbeat','access_revoked'].includes(event)) return
  let p: Record<string, unknown>
  try { p = JSON.parse(data) } catch { throw new AdminRealtimeContractError() }
  if (!p || typeof p !== 'object' || p.protocol_version !== 1) throw new AdminRealtimeContractError()
  if (event === 'heartbeat') return { type: event }
  if (event === 'access_revoked') {
    if (p.reason !== 'ADMIN_ACCESS_REVOKED') throw new AdminRealtimeContractError()
    return { type: event }
  }
  if (p.admin_user_id !== userId || typeof p.unread_count !== 'number' || !Number.isSafeInteger(p.unread_count) || p.unread_count < 0) throw new AdminRealtimeContractError()
  if (p.community_pending_count !== undefined && (typeof p.community_pending_count !== 'number' || !Number.isSafeInteger(p.community_pending_count) || p.community_pending_count < 0)) throw new AdminRealtimeContractError()
  return { type: event as 'ready' | 'update', snapshot: { protocol_version: 1, admin_user_id: userId, dashboard_revision: realtimeRevision(p.dashboard_revision), notifications_revision: realtimeRevision(p.notifications_revision), unread_count: p.unread_count, ...(p.community_pending_count !== undefined ? { community_pending_count: p.community_pending_count as number } : {}) } }
}

/** Incremental UTF-8 SSE decoder. EOF never dispatches an unterminated frame. */
export function createAdminSseParser(dispatch: (event: string, data: string) => void) {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let line = '', event = '', data: string[] = [], bytes = 0, afterCR = false
  const newline = () => {
    if (!line) { if (data.length) dispatch(event || 'message', data.join('\n')); event = ''; data = []; bytes = 0 }
    else if (!line.startsWith(':')) {
      const colon = line.indexOf(':'), field = colon < 0 ? line : line.slice(0, colon)
      let value = colon < 0 ? '' : line.slice(colon + 1); if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'event') event = value
      if (field === 'data') data.push(value)
    }
    line = ''
  }
  return {
    push(chunk: Uint8Array) {
      let decoded: string
      try { decoded = decoder.decode(chunk, { stream: true }) } catch { throw new AdminRealtimeContractError() }
      for (const char of decoded) {
        if (afterCR && char === '\n') { afterCR = false; if (bytes && ++bytes > 65_536) throw new AdminRealtimeContractError(); continue }
        afterCR = false
        const point = char.codePointAt(0)!
        bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4
        if (bytes > 65_536) throw new AdminRealtimeContractError()
        if (char === '\r' || char === '\n') { newline(); afterCR = char === '\r' } else line += char
      }
    },
    end() { try { decoder.decode() } catch { throw new AdminRealtimeContractError() }; line = ''; data = []; event = ''; bytes = 0 },
  }
}
