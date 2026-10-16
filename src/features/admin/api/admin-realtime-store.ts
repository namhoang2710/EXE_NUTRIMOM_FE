import { createAdminRealtimeSync } from '../model/admin-realtime-sync.ts'

// Owned by the keyed AdminWorkspace. No timer, subscription or request when the flag is off.
export let adminRealtime: ReturnType<typeof createAdminRealtimeSync> | undefined
export function setAdminRealtime(value: typeof adminRealtime) { adminRealtime = value }
