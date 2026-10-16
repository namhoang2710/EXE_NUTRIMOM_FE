import { newerRevision, type RealtimeSnapshot } from './admin-realtime-contract.ts'

export type RealtimeState = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'forbidden'
export type RealtimeGroup = 'dashboard' | 'notifications'
type Target = { group: RealtimeGroup; revision?: string; covered: number; busy: number; dirty: boolean; attempted: number; callbacks: Set<() => boolean> }
export function realtimeGroup(path: string): RealtimeGroup | undefined {
  if (['/admin/dashboard','/admin/experts/performance','/admin/reports/EXPERT_PERFORMANCE'].includes(path.split('?')[0])) return 'dashboard'
  if (path.split('?')[0] === '/notifications') return 'notifications'
}
/** One fixed refresh window across all visible canonical queries; requests are never aborted by events. */
export function createAdminRealtimeSync(options: { expire: (prefix: string) => void; now?: () => number; schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>; cancel?: (id: ReturnType<typeof setTimeout>) => void }) {
  const now = options.now ?? Date.now, schedule = options.schedule ?? setTimeout, cancel = options.cancel ?? clearTimeout
  const targets = new Map<string, Target>(), listeners = new Set<() => void>()
  let state: RealtimeState = 'disabled', active = true, blockedUntil = 0, timer: ReturnType<typeof setTimeout> | undefined
  let snapshot: RealtimeSnapshot | undefined, sequence = 0, connection = 0
  const versions: Partial<Record<RealtimeGroup, string>> = {}
  const sequences: Record<RealtimeGroup,number> = { dashboard:0,notifications:0 }
  let countChangedAt = 0
  const notify = () => listeners.forEach(fn => fn())
  const ensure = (key: string, group: RealtimeGroup) => {
    let t = targets.get(key)
    if (!t) {
      if (targets.size >= 100) for (const [old, entry] of targets) if (!entry.busy && !entry.callbacks.size) { targets.delete(old); break }
      t = { group, covered: 0, busy: 0, dirty: false, attempted: -1, callbacks: new Set() }; targets.set(key, t)
    }
    return t
  }
  function arm() {
    if (!active || state === 'disabled' || state === 'forbidden' || timer !== undefined || ![...targets.values()].some(t => t.dirty && t.callbacks.size && !t.busy && t.attempted !== sequences[t.group])) return
    timer = schedule(flush, Math.min(2_147_483_647,Math.max(2_000, blockedUntil - now())))
  }
  function flush() {
    timer = undefined
    if (!active || now() < blockedUntil) { arm(); return }
    for (const t of targets.values()) {
      if (!t.dirty || t.busy || t.attempted === sequences[t.group]) continue
      for (const callback of t.callbacks) if (callback()) t.attempted = sequences[t.group]
    }
    // A family cooldown or a paused mutation can retain dirty work without spinning.
    if ([...targets.values()].some(t => t.dirty && !t.busy && t.callbacks.size && t.attempted !== sequences[t.group])) timer = schedule(flush, Math.min(2_147_483_647,Math.max(2_000, blockedUntil - now())))
  }
  return {
    inspect: () => ({ state, snapshot, sequence, connection, blockedUntil, active }),
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
    setState(next: RealtimeState) { state = next; notify(); arm() },
    setActive(value: boolean) { active = value; if (!value && timer !== undefined) { cancel(timer); timer = undefined }; if (value) arm() },
    block(until: number) { blockedUntil = Math.max(until, blockedUntil); notify() },
    snapshot(next: RealtimeSnapshot, ready: boolean) {
      if (ready) connection++
      const dashboardChanged = newerRevision(next.dashboard_revision, versions.dashboard)
      const countChanged = snapshot !== undefined && next.notifications_revision === snapshot.notifications_revision && next.unread_count !== snapshot.unread_count
      const notificationsChanged = newerRevision(next.notifications_revision, versions.notifications) || countChanged
      if (dashboardChanged) versions.dashboard = next.dashboard_revision
      if (notificationsChanged) versions.notifications = next.notifications_revision
      // Older snapshots cannot roll back the count. The same revision must describe the same count.
      if (!snapshot || newerRevision(next.notifications_revision, snapshot.notifications_revision) || next.notifications_revision === snapshot.notifications_revision) snapshot = next
      if (dashboardChanged || notificationsChanged || ready) sequence++
      for (const group of ['dashboard','notifications'] as const) {
        const changed = group === 'dashboard' ? dashboardChanged : notificationsChanged
        if (changed || ready) sequences[group]++
        if (group === 'notifications' && countChanged) countChangedAt = sequences[group]
        if (changed) {
          if(group==='dashboard') { options.expire('GET:/admin/dashboard'); options.expire('GET:/admin/experts/performance'); options.expire('GET:/admin/reports/EXPERT_PERFORMANCE') }
          else options.expire('GET:/notifications?')
        }
        for (const t of targets.values()) if (t.group === group && (changed || (ready && t.revision === undefined))) {
          const desired = versions[group]
          t.dirty = desired !== undefined && ((t.revision === undefined ? t.covered < sequences[group] : newerRevision(desired, t.revision)) || group === 'notifications' && t.covered < countChangedAt)
        }
      }
      notify(); arm()
    },
    register(key: string, group: RealtimeGroup, refresh: () => boolean) {
      const t = ensure(key, group); t.callbacks.add(refresh)
      const desired = versions[group]
      if (desired && ((t.revision === undefined ? t.covered < sequences[group] : newerRevision(desired, t.revision)) || group === 'notifications' && t.covered < countChangedAt)) t.dirty = true
      arm(); return () => { t.callbacks.delete(refresh) }
    },
    begin(key: string, group: RealtimeGroup) {
      const t = ensure(key, group), started = sequences[group]; t.busy++
      return (revision?: string, success = true, retryAfterCooldown = false) => {
        t.busy = Math.max(0, t.busy - 1)
        if (retryAfterCooldown) t.attempted = -1
        if (success) {
          if (revision !== undefined && newerRevision(revision, t.revision)) t.revision = revision
          t.covered = Math.max(t.covered, started)
          const desired = versions[group]
          t.dirty = desired !== undefined && ((t.revision === undefined ? t.covered < sequences[group] : newerRevision(desired, t.revision)) || group === 'notifications' && t.covered < countChangedAt)
          // One catch-up after an event during a GET. No unbounded loop against a lagging replica.
          if (t.dirty && started < sequences[group]) t.attempted = -1
        }
        arm()
      }
    },
    wake() { for (const t of targets.values()) if (t.dirty) t.attempted = -1; arm() },
    dispose() { active = false; if (timer !== undefined) cancel(timer); timer = undefined; targets.clear(); listeners.clear() },
  }
}
export type AdminRealtimeSync = ReturnType<typeof createAdminRealtimeSync>
