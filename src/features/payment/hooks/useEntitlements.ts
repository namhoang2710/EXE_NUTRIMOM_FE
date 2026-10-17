import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getSession, getSessionScope } from '@/core/auth/token-store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { paymentApi } from '../api/payment-api'
import type { MyEntitlementsDto, SubscriptionPlanDto } from '../model/entitlement-types'
import { createSubscriptionResource } from '../model/subscription-resource'
import { toPricingPlan } from '../model/pricing-catalog'

const catalog = createSubscriptionResource<SubscriptionPlanDto[]>(300_000)
const entitlements = createSubscriptionResource<MyEntitlementsDto>(15_000)

export function refreshEntitlements() {
  const scope = getSessionScope()
  return entitlements.load(scope, () => paymentApi.getMyEntitlements(), true)
}

export const loadCurrentEntitlements = () => entitlements.load(getSessionScope(), () => paymentApi.getMyEntitlements())
export const loadPricingCatalog = () => catalog.load('catalog', () => paymentApi.listPlans())

if (typeof window !== 'undefined') {
  const clear = () => entitlements.clear()
  window.addEventListener('nutrimom:session-cleared', clear)
  window.addEventListener('nutrimom:session-changed', clear)
  window.addEventListener('nutrimom:subscription-changed', () => {
    if (getSession()) {
      entitlements.invalidate(getSessionScope())
      void refreshEntitlements().catch(() => undefined)
    }
  })
}

function useReadResource<T>(resource: ReturnType<typeof createSubscriptionResource<T>>, key: string, loader: () => Promise<T>, enabled: boolean) {
  const snapshot = useSyncExternalStore(resource.subscribe, useCallback(() => resource.snapshot(key), [resource, key]))
  const reload = useCallback(() => resource.load(key, loader, true), [resource, key, loader])
  useEffect(() => {
    if (!enabled) return
    void resource.load(key, loader).catch(() => undefined)
    const focus = () => {
      if (document.visibilityState === 'visible') void resource.load(key, loader).catch(() => undefined)
    }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', focus)
    return () => { window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus) }
  }, [resource, key, loader, enabled])
  return { ...snapshot, loading: enabled && (snapshot.loading || (!snapshot.data && !snapshot.error)), reload }
}

const loadPlans = () => paymentApi.listPlans()
const loadEntitlements = () => paymentApi.getMyEntitlements()

export function usePricingCatalog(enabled = true) {
  const state = useReadResource(catalog, 'catalog', loadPlans, enabled)
  return { ...state, plans: state.data?.map(toPricingPlan) ?? [] }
}

export function useEntitlements(enabled = true) {
  const { status } = useAuth()
  const state = useReadResource(entitlements, getSessionScope(), loadEntitlements, enabled && status === 'authenticated')
  const endDate = state.data?.paid ? state.data.end_date : null
  useEffect(() => {
    if (!enabled || status !== 'authenticated' || !endDate) return
    const delay = Date.parse(endDate) - Date.now() + 100
    if (delay <= 0 || delay > 2_147_483_647) return
    const timer = window.setTimeout(() => { void refreshEntitlements().catch(() => undefined) }, delay)
    return () => window.clearTimeout(timer)
  }, [enabled, status, endDate])
  return { ...state, loading: state.loading || (enabled && status === 'loading'), subscription: status === 'authenticated' ? state.data : null }
}
