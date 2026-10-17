import { useCallback, useState } from 'react'
import type { GatedFeature, UpgradeHint } from '../model/entitlement-types'
import { featureUpgradeHint, upgradeHintFromError } from '../model/upgrade-hint'
import { loadCurrentEntitlements, loadPricingCatalog, useEntitlements, usePricingCatalog } from './useEntitlements'

export function useFeatureAccess(feature: GatedFeature, enabled = true) {
  const { subscription } = useEntitlements(enabled)
  const locked = subscription?.features.find((item) => item.code === feature)?.included === false
  const catalog = usePricingCatalog(enabled && locked)
  const [upgrade, setUpgrade] = useState<UpgradeHint | null>(null)
  const clearUpgrade = useCallback(() => setUpgrade(null), [])
  const hint = featureUpgradeHint(feature, subscription, catalog.data ?? [])

  async function checkAccess() {
    try {
      const current = await loadCurrentEntitlements()
      if (current.features.find((item) => item.code === feature)?.included !== false) return true
      const nextHint = featureUpgradeHint(feature, current, await loadPricingCatalog())
      if (nextHint) { setUpgrade(nextHint); return false }
    } catch { /* An unavailable read cannot replace the backend's write authorization. */ }
    return true
  }

  function handleError(reason: unknown) {
    const nextHint = upgradeHintFromError(reason)
    if (!nextHint) return false
    setUpgrade(nextHint)
    return true
  }

  return { locked, hint, upgrade, checkAccess, handleError, clearUpgrade }
}
