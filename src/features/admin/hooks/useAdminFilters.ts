import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseWorkspaceQuery, vietnamToday, type WorkspaceKind } from '../model/admin-workspace-query'

export function useAdminFilters(kind: WorkspaceKind) {
  const [params, setParams] = useSearchParams()
  const raw = params.toString()
  const today = vietnamToday()
  const parsed = useMemo(() => parseWorkspaceQuery(raw, kind,today), [raw, kind,today])
  const [search, setSearch] = useState(params.get('q') ?? '')
  const querySearch = params.get('q') ?? ''
  const commit = useCallback((changes: Record<string, string | null>, resetPage = true) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) { if (value === null || value === '') next.delete(key); else next.set(key, value) }
      if (resetPage) next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])
  useEffect(() => setSearch(querySearch), [querySearch])
  useEffect(() => {
    if (search.trim() === querySearch.trim()) return
    const timer = window.setTimeout(() => commit({ q: search.trim() }), 400)
    return () => window.clearTimeout(timer)
  }, [search, querySearch, commit])
  return { ...parsed, queryString: parsed.search, params, search, setSearch, commit, page: Number(parsed.query.get('page') ?? 1), pageSize: Number(parsed.query.get('pageSize') ?? 20) }
}
