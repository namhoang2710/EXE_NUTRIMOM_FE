import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { knowledgeApi } from '../api/knowledge-api'

export function useArticleBookmarks() {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [savedSlugs, setSavedSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [busySlugs, setBusySlugs] = useState<string[]>([])

  useEffect(() => {
    if (status !== 'authenticated') {
      setSavedSlugs([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    knowledgeApi.listAllSavedSlugs(controller.signal)
      .then((slugs) => { if (!controller.signal.aborted) setSavedSlugs(slugs) })
      .catch(() => { if (!controller.signal.aborted) setSavedSlugs([]) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status])

  const toggleBookmark = useCallback(async (slug: string) => {
    if (status !== 'authenticated') {
      const from = `${location.pathname}${location.search}${location.hash}`
      navigate('/login', { state: { from } })
      return 'Đăng nhập để lưu bài viết và đọc lại trên mọi thiết bị.'
    }
    if (busySlugs.includes(slug)) return ''
    const removing = savedSlugs.includes(slug)
    const previous = savedSlugs
    setBusySlugs((values) => [...values, slug])
    setSavedSlugs((values) => removing ? values.filter((value) => value !== slug) : [...values, slug])
    try {
      if (removing) await knowledgeApi.removeBookmark(slug)
      else await knowledgeApi.saveBookmark(slug)
      return removing ? 'Đã bỏ lưu bài viết.' : 'Đã lưu bài viết vào tài khoản của bạn.'
    } catch (error) {
      setSavedSlugs(previous)
      return error instanceof ApiClientError ? error.message : 'Chưa thể cập nhật bài đã lưu. Vui lòng thử lại.'
    } finally {
      setBusySlugs((values) => values.filter((value) => value !== slug))
    }
  }, [busySlugs, location, navigate, savedSlugs, status])

  return { savedSlugs, toggleBookmark, loading: status === 'loading' || loading, busySlugs, authenticated: status === 'authenticated' }
}
