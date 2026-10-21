import { useSyncExternalStore } from 'react'
import { useRetryCountdown } from '@/features/payment/hooks/usePaymentCooldown'
import { nutritionResources } from '../api/nutrition-requests'
import type { NutritionRequestGroup } from '../model/nutrition-resources'

export function useNutritionCooldown(
  group: NutritionRequestGroup = 'personal',
) {
  const retryAt = useSyncExternalStore(
    nutritionResources.subscribe,
    () => nutritionResources.retryAt(group),
    () => 0,
  )
  const remaining = useRetryCountdown(retryAt)
  return { remaining, blocked: remaining > 0 }
}
