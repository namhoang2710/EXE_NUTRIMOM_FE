import type { UserProfile } from '@/features/user/model/user-types'
import { familyApi } from '../api/family-api'
import type { FamilyGroup, FamilyMember } from './family-types'

interface FamilyBootstrap {
  groups: FamilyGroup[]
  members: FamilyMember[]
}

const CACHE_TTL_MS = 10_000
let bootstrapPromise: Promise<FamilyBootstrap> | null = null
let cachedBootstrap: { value: FamilyBootstrap; expiresAt: number } | null = null

export function invalidateFamilyBootstrap() {
  cachedBootstrap = null
}

export async function loadFamilyBootstrap(force = false): Promise<FamilyBootstrap> {
  if (!force && cachedBootstrap && cachedBootstrap.expiresAt > Date.now()) return cachedBootstrap.value
  if (!bootstrapPromise || force) {
    const request = familyApi.groups().then(async (groups) => ({
      groups,
      members: groups.length ? await familyApi.members() : [],
    }))
    bootstrapPromise = request
    void request.then((value) => {
      if (bootstrapPromise === request) cachedBootstrap = { value, expiresAt: Date.now() + CACHE_TTL_MS }
    }).finally(() => {
      if (bootstrapPromise === request) bootstrapPromise = null
    }).catch(() => undefined)
  }
  return bootstrapPromise
}

export async function refreshFamilyAfterAccept(reloadProfile: () => Promise<UserProfile>) {
  invalidateFamilyBootstrap()
  let profileRefreshed = true
  let familyRefreshed = true
  try { await reloadProfile() } catch { profileRefreshed = false }
  try { await loadFamilyBootstrap(true) } catch { familyRefreshed = false }
  return {
    profileRefreshed,
    familyRefreshed,
  }
}
