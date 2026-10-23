import { useEffect, useRef, useState } from 'react'
import { getSessionScope } from '@/core/auth/token-store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { paymentApi, invalidatePaymentHistory } from '../api/payment-api'
import { historyQueryString } from '../model/payment-history'
import type { PaymentHistoryQuery, PaymentOrderPage } from '../model/payment-types'
import { usePaymentCooldown } from './usePaymentCooldown'

export function usePaymentHistory(query: PaymentHistoryQuery) {
  const { status, user } = useAuth()
  const userId = user?.id
  const scope = getSessionScope()
  const key = `${scope}:${historyQueryString(query)}`
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ key: string; data: PaymentOrderPage | null; loading: boolean; error: string | null }>({ key, data: null, loading: true, error: null })
  const cooldown = usePaymentCooldown('payment-history')
  const latest = useRef({ query, cooldown })
  const activeRequest = useRef<AbortController | null>(null)
  const reloadQueued = useRef(false)
  latest.current = { query, cooldown }

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller
    reloadQueued.current = false
    const { query: requested, cooldown: limit } = latest.current
    if (status !== 'authenticated' || !userId) { activeRequest.current = null; setState({ key, data: null, loading: false, error: null }); return }
    if (limit.blocked) {
      activeRequest.current = null
      setState({ key, data: null, loading: false, error: 'Bạn thao tác hơi nhanh. Vui lòng chờ trước khi tải lại.' })
      return
    }
    setState((old) => ({ key, data: old.key === key ? old.data : null, loading: true, error: null }))
    paymentApi.getUserOrders(requested, controller.signal).then((data) => {
      if (!controller.signal.aborted && getSessionScope() === scope) setState({ key, data, loading: false, error: null })
    }).catch((reason: unknown) => {
      if (controller.signal.aborted || getSessionScope() !== scope) return
      latest.current.cooldown.handleRateLimit(reason)
      setState({ key, data: null, loading: false, error: reason instanceof Error ? reason.message : 'Chưa thể tải lịch sử giao dịch.' })
    }).finally(() => { if (activeRequest.current === controller) activeRequest.current = null })
    return () => { controller.abort(); if (activeRequest.current === controller) activeRequest.current = null }
  }, [key, scope, revision, status, userId])

  function reload() {
    if (cooldown.blocked || activeRequest.current || reloadQueued.current) return
    refreshAfterChange()
  }
  function refreshAfterChange() {
    if (cooldown.blocked || reloadQueued.current) return
    reloadQueued.current = true
    invalidatePaymentHistory()
    setRevision((value) => value + 1)
  }
  return { ...(state.key === key ? state : { data: null, loading: true, error: null }), reload, refreshAfterChange, cooldown }
}
