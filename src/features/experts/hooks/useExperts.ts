import { useCallback, useEffect, useRef, useState } from 'react'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { expertsApi } from '../api/experts-api'
import type { Expert, ExpertSpecialty } from '../model/expert-types'

export function useExperts(specialty: ExpertSpecialty | null) {
  const { handleRateLimit, remaining } = usePaymentCooldown('expert-directory')
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activeRequest = useRef<AbortController | null>(null)
  const lastRefreshAt = useRef(0)

  const loadExperts = useCallback(async (showLoading: boolean) => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    lastRefreshAt.current = Date.now()

    if (showLoading) setLoading(true)
    setError('')

    try {
      const nextExperts = await expertsApi.list(specialty, controller.signal)
      if (!controller.signal.aborted) setExperts(nextExperts)
    } catch (reason) {
      if (!controller.signal.aborted) {
        handleRateLimit(reason)
        setError('Không thể tải danh sách bác sĩ lúc này. Vui lòng thử lại sau.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [specialty, handleRateLimit])

  useEffect(() => {
    void loadExperts(true)
    return () => activeRequest.current?.abort()
  }, [loadExperts])

  useEffect(() => {
    function refreshWhenActive() {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt.current < 30_000) return
      void loadExperts(false)
    }
    function refreshChangedExperts() {
      expertsApi.invalidate()
      void loadExperts(false)
    }

    window.addEventListener('focus', refreshWhenActive)
    document.addEventListener('visibilitychange', refreshWhenActive)
    window.addEventListener('nutrimom:experts-changed', refreshChangedExperts)
    return () => {
      window.removeEventListener('focus', refreshWhenActive)
      document.removeEventListener('visibilitychange', refreshWhenActive)
      window.removeEventListener('nutrimom:experts-changed', refreshChangedExperts)
    }
  }, [loadExperts])

  return {
    experts,
    loading,
    error,
    retryIn: remaining,
    retry: () => remaining > 0 ? Promise.resolve() : loadExperts(true),
  }
}

export function notifyExpertsChanged() {
  window.dispatchEvent(new Event('nutrimom:experts-changed'))
}
