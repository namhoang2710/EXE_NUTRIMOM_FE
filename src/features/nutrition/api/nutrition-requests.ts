import {
  apiClient,
  type ApiRequestOptions,
} from '../../../core/api/api-client.ts'
import { getSessionScope } from '../../../core/auth/token-store.ts'
import { StaleResourceError } from '../../../core/api/resource-cache.ts'
import {
  createNutritionResources,
  type NutritionRequestGroup,
} from '../model/nutrition-resources.ts'

export const nutritionResources = createNutritionResources()
const refreshSignals = new WeakSet<AbortSignal>()
export function markNutritionRefresh(signal: AbortSignal) {
  refreshSignals.add(signal)
}
const scopedKey = (key: string) => `${getSessionScope()}|${key}`
if (typeof window !== 'undefined') {
  window.addEventListener('nutrimom:session-cleared', () =>
    nutritionResources.clear(),
  )
  window.addEventListener('nutrimom:session-changed', () =>
    nutritionResources.clear(),
  )
}
export function nutritionRead<T>(
  key: string,
  path: string,
  ttl: number,
  signal?: AbortSignal,
  options: ApiRequestOptions = {},
  fresh = false,
) {
  const scope = getSessionScope()
  const group: NutritionRequestGroup =
    options.authenticated === false ? 'catalog' : 'personal'
  return nutritionResources.read(
    scopedKey(key),
    async () => {
      if (scope !== getSessionScope()) throw new StaleResourceError()
      const value = await apiClient.request<T>(path, options)
      if (scope !== getSessionScope()) throw new StaleResourceError()
      return value
    },
    ttl,
    group,
    signal,
    fresh || Boolean(signal && refreshSignals.has(signal)),
  )
}
export async function nutritionWrite<T>(
  path: string,
  options: ApiRequestOptions,
  accept?: (result: T) => void,
) {
  const scope = getSessionScope()
  const result = await nutritionResources.write(() =>
    apiClient.request<T>(path, options),
  )
  if (scope !== getSessionScope()) throw new StaleResourceError()
  accept?.(result)
  return result
}
export function seedNutrition<T>(key: string, value: T, ttl: number) {
  nutritionResources.seed(scopedKey(key), value, ttl)
}
export function nutritionSnapshot<T>(key: string, ttl: number) {
  return nutritionResources.peek<T>(scopedKey(key), ttl)
}
export function invalidateNutrition(prefix: string) {
  nutritionResources.invalidate(scopedKey(prefix))
}
