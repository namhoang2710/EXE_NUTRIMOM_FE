import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSessionScope } from '@/core/auth/token-store'
import { knowledgeApi } from '../api/knowledge-api'

export function useArticleBookmarks() {
  const { status, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const busy = useRef(new Set<string>())
  const mounted = useRef(false)
  const [savedSlugs, setSavedSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [busySlugs, setBusySlugs] = useState<string[]>([])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    setSavedSlugs([]); setBusySlugs([])
    if (status !== 'authenticated') {
      setSavedSlugs([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setError('')
    setLoading(true)
    knowledgeApi.listAllSavedSlugs(controller.signal)
      .then((slugs) => { if (!controller.signal.aborted) setSavedSlugs(slugs) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể tải trạng thái bài đã lưu.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, user?.id, reloadKey])

  const toggleBookmark = useCallback(async (slug: string) => {
    if (status !== 'authenticated') {
      const from = `${location.pathname}${location.search}${location.hash}`
      navigate('/login', { state: { from } })
      return 'Đăng nhập để lưu bài viết và đọc lại trên mọi thiết bị.'
    }
    if (error) return error
    const scope = getSessionScope()
    const key = `${scope}:${slug}`
    if (busy.current.has(key)) return ''
    busy.current.add(key)
    const removing = savedSlugs.includes(slug)
    setBusySlugs((values) => [...values, slug])
    try {
      if (removing) await knowledgeApi.removeBookmark(slug)
      else await knowledgeApi.saveBookmark(slug)
      if (!mounted.current || scope !== getSessionScope()) return ''
      setSavedSlugs((values) => removing ? values.filter((value) => value !== slug) : [...new Set([...values, slug])])
      return removing ? 'Đã bỏ lưu bài viết.' : 'Đã lưu bài viết vào tài khoản của bạn.'
    } catch (error) {
      if (!mounted.current || scope !== getSessionScope()) return ''
      return error instanceof ApiClientError ? error.message : 'Chưa thể cập nhật bài đã lưu. Vui lòng thử lại.'
    } finally {
      busy.current.delete(key)
      if (mounted.current && scope === getSessionScope()) setBusySlugs((values) => values.filter((value) => value !== slug))
    }
  }, [error, location, navigate, savedSlugs, status])

  return { error, retry: () => setReloadKey((value) => value + 1), savedSlugs, toggleBookmark, loading: status === 'loading' || loading, busySlugs, authenticated: status === 'authenticated' }
}
