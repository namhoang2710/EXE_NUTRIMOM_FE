import type { CardStatusItem } from '@/components/ui/card-status-list'
import { scopeLabels } from './family-formatters.ts'
import type { FamilyScope } from './family-types'

export interface FamilyScopeCapability {
  scope: FamilyScope
  available: boolean
  comingSoon?: boolean
}

export const familyScopeCapabilities: readonly FamilyScopeCapability[] = [
  { scope: 'PREGNANCY_SUMMARY', available: true },
  { scope: 'FAMILY_TASKS', available: true },
  { scope: 'SHARED_CALENDAR', available: true },
  { scope: 'ACTIVITY_FEED', available: true },
  { scope: 'ALERTS', available: false, comingSoon: true },
  { scope: 'MEDICAL_RECORDS', available: false, comingSoon: true },
]

const availableScopes = new Set(
  familyScopeCapabilities.filter((capability) => capability.available).map((capability) => capability.scope),
)

export const familyScopeCards: readonly CardStatusItem<FamilyScope>[] = familyScopeCapabilities.map((capability) => ({
  id: capability.scope,
  title: scopeLabels[capability.scope],
  comingSoon: capability.comingSoon,
  disabled: !capability.available,
}))

export function supportedFamilyScopes(scopes: readonly FamilyScope[]) {
  return scopes.filter((scope) => availableScopes.has(scope))
}
