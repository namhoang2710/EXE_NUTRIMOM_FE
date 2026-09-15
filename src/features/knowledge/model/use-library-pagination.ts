import { useCallback, useEffect, useState } from 'react'
import type { BlogFilters } from './article-content'
import { getLibraryPage, libraryQueryKey, loadLibraryPage, readLibraryQuery, updateLibraryFilter } from './library-pagination'

export function useLibraryPagination(initialSearch: string, savedSlugs: readonly string[]) {
  const [query, setQuery] = useState(() => {
    const initial = readLibraryQuery(initialSearch)
    return { ...initial, page: getLibraryPage(initial, savedSlugs).currentPage }
  })
  const key = libraryQueryKey(query, savedSlugs)
  const [response, setResponse] = useState(() => ({ key, data: getLibraryPage(query, savedSlugs) }))
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const error = failure?.key === key ? failure.message : ''
  const [retry, setRetry] = useState(0)
  const loading = key !== response.key && !error

  useEffect(() => {
    if (key === response.key) return
    const controller = new AbortController()
    loadLibraryPage(query, savedSlugs, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      const normalized = { ...query, page: data.currentPage }
      setQuery(normalized)
      setResponse({ key: libraryQueryKey(normalized, savedSlugs), data })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Không thể tải bài viết.' })
    })
    return () => controller.abort()
  }, [key, query, savedSlugs, response.key, retry])

  const updateFilter = useCallback(<K extends keyof BlogFilters>(name: K, value: BlogFilters[K]) => {
    setFailure(null)
    setQuery((previous) => updateLibraryFilter(previous, name, value))
  }, [])

  const resetFilters = useCallback(() => {
    setFailure(null)
    setQuery((previous) => ({ ...previous, filters: { category: '', stage: '', topic: '', savedOnly: false }, page: 1 }))
  }, [])

  const changePage = useCallback((page: number) => {
    setFailure(null)
    setQuery((previous) => previous.page === page ? previous : { ...previous, page })
  }, [])

  const retryLoad = () => { setFailure(null); setRetry((previous) => previous + 1) }
  return { query, pagination: response.data, loading, error, updateFilter, resetFilters, changePage, retryLoad }
}
