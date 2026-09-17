export const knowledgeEndpoints = {
  publicArticles: '/knowledge/articles',
  publicArticle: (slug: string) => `/knowledge/articles/${encodeURIComponent(slug)}`,
  bookmark: (slug: string) => `/knowledge/articles/${encodeURIComponent(slug)}/bookmark`,
  adminArticles: '/admin/knowledge/articles',
  adminArticle: (id: string) => `/admin/knowledge/articles/${encodeURIComponent(id)}`,
  mediaUpload: '/admin/knowledge/media/upload',
} as const
