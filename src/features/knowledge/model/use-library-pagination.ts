import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { knowledgeApi } from '../api/knowledge-api'
import { mapArticleSummaryToCard } from './article-adapters'
import type { ArticleCardViewModel } from './article-types'
import type { ArticlePageDto } from './knowledge-dto'
import { LIBRARY_PAGE_SIZE, readLibraryQuery, toPublicListQuery, updateLibrarySearch } from './library-pagination'
import type { BlogFilters } from './library-pagination'

const emptyPage: ArticlePageDto<ArticleCardViewModel> = {
  items: [], totalItems: 0, totalPages: 0, currentPage: 1, pageSize: LIBRARY_PAGE_SIZE,
}

export function useLibraryPagination() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => readLibraryQuery(searchParams.toString()), [searchParams])
  const requestKey = JSON.stringify(query)
  const [response, setResponse] = useState<ArticlePageDto<ArticleCardViewModel>>(emptyPage)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const loading = loadedKey !== requestKey && !error

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    knowledgeApi.listArticles(toPublicListQuery(query), controller.signal).then((data) => {
      if (controller.signal.aborted) return
      setResponse({ ...data, items: data.items.map(mapArticleSummaryToCard) })
      setLoadedKey(requestKey)
      if (data.currentPage !== query.page) {
        const next = new URLSearchParams(searchParams)
        if (data.currentPage > 1) next.set('page', String(data.currentPage))
        else next.delete('page')
        setSearchParams(next, { replace: true })
      }
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Không thể tải bài viết.')
      setLoadedKey(requestKey)
    })
    return () => controller.abort()
  }, [query, requestKey, retry, searchParams, setSearchParams])

  const updateFilter = useCallback(<K extends keyof BlogFilters>(name: K, value: BlogFilters[K]) => {
    setSearchParams((current) => updateLibrarySearch(current, name, value), { replace: true })
  }, [setSearchParams])

  const resetFilters = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const name of ['category', 'stage', 'topic', 'saved', 'page']) next.delete(name)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const changePage = useCallback((page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (page > 1) next.set('page', String(page))
      else next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const retryLoad = useCallback(() => {
    setError('')
    setLoadedKey('')
    setRetry((value) => value + 1)
  }, [])

  return { query, pagination: response, loading, error, updateFilter, resetFilters, changePage, retryLoad }
}
