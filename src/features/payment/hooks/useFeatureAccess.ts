import { useCallback, useState } from 'react'
import type { GatedFeature, UpgradeHint } from '../model/entitlement-types'
import { featureUpgradeHint, upgradeHintFromError } from '../model/upgrade-hint'
import { loadCurrentEntitlements, loadPricingCatalog, useEntitlements, usePricingCatalog } from './useEntitlements'

export function useFeatureAccess(feature: GatedFeature, enabled = true) {
  const state = useEntitlements(enabled)
  const { subscription } = state
  const entitlement = subscription?.features.find((item) => item.code === feature)
  const locked = subscription?.features.find((item) => item.code === feature)?.included === false
  const catalog = usePricingCatalog(enabled && locked)
  const [upgrade, setUpgrade] = useState<UpgradeHint | null>(null)
  const clearUpgrade = useCallback(() => setUpgrade(null), [])
  const hint = featureUpgradeHint(feature, subscription, catalog.data ?? [])

  async function checkAccess({ requireKnown = false } = {}) {
    try {
      const current = await loadCurrentEntitlements()
      const included = current.features.find((item) => item.code === feature)?.included
      if (included !== false) return requireKnown ? included === true : true
      const nextHint = featureUpgradeHint(feature, current, await loadPricingCatalog().catch(() => []))
        ?? { message: `${current.features.find((item) => item.code === feature)?.label || 'Tính năng này'} thuộc quyền lợi của gói trả phí.`, feature }
      setUpgrade(nextHint)
      return false
    } catch { /* Existing guarded writes still defer unknown access to the backend. */ }
    return !requireKnown
  }

  function handleError(reason: unknown) {
    const nextHint = upgradeHintFromError(reason)
    if (!nextHint) return false
    setUpgrade(nextHint)
    return true
  }

  return { locked, hint, upgrade, checkAccess, handleError, clearUpgrade, ready: Boolean(entitlement), loading: state.loading, error: state.error, retryAt: state.retryAt, reload: state.reload }
}
