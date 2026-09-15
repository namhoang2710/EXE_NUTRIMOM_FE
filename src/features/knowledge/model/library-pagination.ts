import { blogCategories, blogStages, blogTopics, filterBlogPosts } from './article-content'
import type { BlogFilters, BlogPost } from './article-content'

export const LIBRARY_PAGE_SIZE = 6

export interface LibraryQuery {
  filters: BlogFilters
  page: number
  pageSize: number
}

export interface PaginatedArticles {
  totalPages: number
  currentPage: number
  totalItems: number
  pageSize: number
  items: BlogPost[]
}

export function updateLibraryFilter<K extends keyof BlogFilters>(query: LibraryQuery, name: K, value: BlogFilters[K]): LibraryQuery {
  return query.filters[name] === value ? query : { ...query, filters: { ...query.filters, [name]: value }, page: 1 }
}

export function readLibraryQuery(search: string): LibraryQuery {
  const params = new URLSearchParams(search)
  const page = Number(params.get('page') ?? 1)
  const valid = (value: string | null, options: readonly string[]) => value && options.includes(value) ? value : ''
  return {
    filters: {
      category: valid(params.get('category'), blogCategories),
      stage: valid(params.get('stage'), blogStages),
      topic: valid(params.get('topic'), blogTopics),
      savedOnly: params.get('saved') === 'true',
    },
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: LIBRARY_PAGE_SIZE,
  }
}

export function paginateArticles(items: BlogPost[], page: number, pageSize = LIBRARY_PAGE_SIZE): PaginatedArticles {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : LIBRARY_PAGE_SIZE
  const totalPages = Math.ceil(items.length / size)
  const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const currentPage = Math.min(requestedPage, Math.max(1, totalPages))
  return { totalPages, currentPage, totalItems: items.length, pageSize: size, items: items.slice((currentPage - 1) * size, currentPage * size) }
}

export function getLibraryPage(query: LibraryQuery, savedSlugs: readonly string[]) {
  return paginateArticles(filterBlogPosts(query.filters, savedSlugs), query.page, query.pageSize)
}

export function libraryQueryKey(query: LibraryQuery, savedSlugs: readonly string[]) {
  return JSON.stringify([query, query.filters.savedOnly ? savedSlugs : []])
}

// Mock async boundary. A DB adapter can return the same pagination contract.
// Cancellation prevents a slower, older selection from replacing the latest one.
export function loadLibraryPage(query: LibraryQuery, savedSlugs: readonly string[], signal: AbortSignal): Promise<PaginatedArticles> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(new DOMException('Request cancelled', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve(getLibraryPage(query, savedSlugs))
    }, 160)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}
