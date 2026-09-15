import { apiClient } from '@/core/api/api-client'
import type {
  AdminArticleListQuery,
  ArticleDetailDto,
  ArticlePageDto,
  ArticleRequestDto,
  ArticleSummaryDto,
  MediaUploadDto,
  PublicArticleListQuery,
} from '../model/knowledge-dto'
import { buildKnowledgeQueryString } from '../model/knowledge-query'
import { knowledgeEndpoints } from '../model/knowledge-endpoints'

export const knowledgeApi = {
  listArticles(query: PublicArticleListQuery, signal?: AbortSignal) {
    return apiClient.request<ArticlePageDto<ArticleSummaryDto>>(`${knowledgeEndpoints.publicArticles}${buildKnowledgeQueryString(query)}`, { signal })
  },
  getArticle(slug: string, signal?: AbortSignal) {
    return apiClient.request<ArticleDetailDto>(knowledgeEndpoints.publicArticle(slug), { signal })
  },
  saveBookmark(slug: string) {
    return apiClient.request<boolean>(knowledgeEndpoints.bookmark(slug), { method: 'PUT' })
  },
  removeBookmark(slug: string) {
    return apiClient.request<boolean>(knowledgeEndpoints.bookmark(slug), { method: 'DELETE' })
  },
  async listAllSavedSlugs(signal?: AbortSignal) {
    const saved: string[] = []
    let page = 1
    let totalPages = 1
    do {
      const response = await this.listArticles({ page, pageSize: 100, savedOnly: true, sort: 'publishedAt:desc' }, signal)
      saved.push(...response.items.map((article) => article.slug))
      totalPages = response.totalPages
      page += 1
    } while (page <= totalPages)
    return saved
  },
}

export const knowledgeAdminApi = {
  listArticles(query: AdminArticleListQuery, signal?: AbortSignal) {
    return apiClient.request<ArticlePageDto<ArticleDetailDto>>(`${knowledgeEndpoints.adminArticles}${buildKnowledgeQueryString(query)}`, { signal })
  },
  getArticle(id: string, signal?: AbortSignal) {
    return apiClient.request<ArticleDetailDto>(knowledgeEndpoints.adminArticle(id), { signal })
  },
  createArticle(payload: ArticleRequestDto) {
    return apiClient.request<ArticleDetailDto>(knowledgeEndpoints.adminArticles, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateArticle(id: string, payload: ArticleRequestDto) {
    return apiClient.request<ArticleDetailDto>(knowledgeEndpoints.adminArticle(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteArticle(id: string) {
    return apiClient.request<boolean>(knowledgeEndpoints.adminArticle(id), { method: 'DELETE' })
  },
  uploadMedia(file: File, alt?: string, caption?: string) {
    const body = new FormData()
    body.set('file', file)
    if (alt?.trim()) body.set('alt', alt.trim())
    if (caption?.trim()) body.set('caption', caption.trim())
    return apiClient.request<MediaUploadDto>(knowledgeEndpoints.mediaUpload, { method: 'POST', body, timeoutMs: 60_000 })
  },
}
