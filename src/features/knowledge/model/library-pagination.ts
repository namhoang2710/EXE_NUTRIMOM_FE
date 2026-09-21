import type { PublicArticleListQuery } from './knowledge-dto'

export const LIBRARY_PAGE_SIZE = 6

export interface BlogFilters {
  category: string
  stage: string
  topic: string
  savedOnly: boolean
}

export interface LibraryQuery extends PublicArticleListQuery {
  filters: BlogFilters
}

export function readLibraryQuery(search: string): LibraryQuery {
  const params = new URLSearchParams(search)
  const parsedPage = Number(params.get('page') ?? 1)
  return {
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: LIBRARY_PAGE_SIZE,
    sort: 'publishedAt:desc',
    filters: {
      category: params.get('category')?.trim() ?? '',
      stage: params.get('stage')?.trim() ?? '',
      topic: params.get('topic')?.trim() ?? '',
      savedOnly: params.get('saved') === 'true',
    },
  }
}

export function toPublicListQuery(query: LibraryQuery): PublicArticleListQuery {
  return {
    page: query.page,
    pageSize: query.pageSize,
    category: query.filters.category || undefined,
    stage: query.filters.stage || undefined,
    topic: query.filters.topic || undefined,
    savedOnly: query.filters.savedOnly || undefined,
    sort: query.sort,
  }
}

export function updateLibrarySearch<K extends keyof BlogFilters>(search: URLSearchParams, name: K, value: BlogFilters[K]) {
  const next = new URLSearchParams(search)
  const parameter = name === 'savedOnly' ? 'saved' : name
  if (value === '' || value === false) next.delete(parameter)
  else next.set(parameter, String(value))
  next.delete('page')
  return next
}
