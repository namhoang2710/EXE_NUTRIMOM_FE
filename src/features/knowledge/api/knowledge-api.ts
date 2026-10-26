import { profileRead, invalidateProfileResources, requireCurrentScope } from '@/core/api/profile-requests'
import { getSessionScope } from '@/core/auth/token-store'
import { apiClient } from '@/core/api/api-client'
import type {
  AdminArticleListQuery,
  AdminArticleListItemDto,
  ArticleDetailDto,
  ArticlePageDto,
  ArticleRequestDto,
  ArticleSummaryDto,
  MediaUploadDto,
  PublicArticleListQuery,
} from '../model/knowledge-dto'
import { buildKnowledgeQueryString } from '../model/knowledge-query'
import { knowledgeEndpoints } from '../model/knowledge-endpoints'
import { adminRead, adminMutation } from '@/features/admin/api/admin-read'

export const knowledgeApi = {
  listArticles(query: PublicArticleListQuery, signal?: AbortSignal) {
    const path = `${knowledgeEndpoints.publicArticles}${buildKnowledgeQueryString(query)}`
    if (query.savedOnly) return profileRead(`saved:list:${path}`, () => apiClient.request<ArticlePageDto<ArticleSummaryDto>>(path), signal)
    return profileRead(`knowledge:list:${path}`, () => apiClient.request<ArticlePageDto<ArticleSummaryDto>>(path), signal)
  },
  getArticle(slug: string, signal?: AbortSignal) {
    return profileRead(`knowledge:article:${slug}`, () => apiClient.request<ArticleDetailDto>(knowledgeEndpoints.publicArticle(slug)), signal)
  },
  async saveBookmark(slug: string) {
    const scope = getSessionScope()
    const result = await apiClient.request<boolean>(knowledgeEndpoints.bookmark(slug), { method: 'PUT' })
    requireCurrentScope(scope)
    invalidateProfileResources('saved:')
    invalidateProfileResources('knowledge:')
    return result
  },
  async removeBookmark(slug: string) {
    const scope = getSessionScope()
    const result = await apiClient.request<boolean>(knowledgeEndpoints.bookmark(slug), { method: 'DELETE' })
    requireCurrentScope(scope)
    invalidateProfileResources('saved:')
    invalidateProfileResources('knowledge:')
    return result
  },
  listAllSavedSlugs(signal?: AbortSignal) {
    return profileRead('saved:slugs', async () => {
      const saved: string[] = []
      let page = 1
      let totalPages = 1
      do {
        const response = await this.listArticles({ page, pageSize: 100, savedOnly: true, sort: 'publishedAt:desc' })
        saved.push(...response.items.map((article) => article.slug))
        totalPages = response.totalPages
        page += 1
      } while (page <= totalPages)
      return saved
    }, signal)
  },
}

export const knowledgeAdminApi = {
  listArticles(query: AdminArticleListQuery, signal?: AbortSignal) {
    return adminRead(`${knowledgeEndpoints.adminArticles}${buildKnowledgeQueryString(query)}`, (p) => p as ArticlePageDto<AdminArticleListItemDto>,signal)
  },
  getArticle(id: string, signal?: AbortSignal) {
    return adminRead(knowledgeEndpoints.adminArticle(id),(p) => p as ArticleDetailDto,signal)
  },
  createArticle(payload: ArticleRequestDto) {
    return adminMutation(() => apiClient.request<ArticleDetailDto>(knowledgeEndpoints.adminArticles, {
      method: 'POST',
      body: JSON.stringify(payload),
      retryAfterRefresh: false,
    }),[knowledgeEndpoints.adminArticles])
  },
  updateArticle(id: string, payload: ArticleRequestDto) {
    return adminMutation(() => apiClient.request<ArticleDetailDto>(knowledgeEndpoints.adminArticle(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
      retryAfterRefresh: false,
    }),[knowledgeEndpoints.adminArticles])
  },
  deleteArticle(id: string) {
    return adminMutation(() => apiClient.request<boolean>(knowledgeEndpoints.adminArticle(id), { method: 'DELETE', retryAfterRefresh:false }),[knowledgeEndpoints.adminArticles])
  },
  uploadMedia(file: File, alt?: string, caption?: string) {
    const body = new FormData()
    body.set('file', file)
    if (alt?.trim()) body.set('alt', alt.trim())
    if (caption?.trim()) body.set('caption', caption.trim())
    return adminMutation(() => apiClient.request<MediaUploadDto>(knowledgeEndpoints.mediaUpload, { method: 'POST', body, timeoutMs: 60_000, retryAfterRefresh:false }),[])
  },
}
