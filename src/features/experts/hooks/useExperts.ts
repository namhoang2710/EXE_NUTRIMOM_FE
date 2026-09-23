import { useCallback, useEffect, useRef, useState } from 'react'
import { expertsApi } from '../api/experts-api'
import type { Expert, ExpertSpecialty } from '../model/expert-types'

export function useExperts(specialty: ExpertSpecialty | null) {
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
    } catch {
      if (!controller.signal.aborted) {
        setError('Không thể tải danh sách bác sĩ lúc này. Vui lòng thử lại sau.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [specialty])

  useEffect(() => {
    void loadExperts(true)
    return () => activeRequest.current?.abort()
  }, [loadExperts])

  useEffect(() => {
    function refreshWhenActive() {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt.current < 300) return
      void loadExperts(false)
    }

    window.addEventListener('focus', refreshWhenActive)
    document.addEventListener('visibilitychange', refreshWhenActive)
    window.addEventListener('nutrimom:experts-changed', refreshWhenActive)
    return () => {
      window.removeEventListener('focus', refreshWhenActive)
      document.removeEventListener('visibilitychange', refreshWhenActive)
      window.removeEventListener('nutrimom:experts-changed', refreshWhenActive)
    }
  }, [loadExperts])

  return {
    experts,
    loading,
    error,
    retry: () => loadExperts(true),
  }
}

export function notifyExpertsChanged() {
  window.dispatchEvent(new Event('nutrimom:experts-changed'))
}
