import assert from 'node:assert/strict'
import test from 'node:test'
import { mapArticleDetailToViewModel, mapUploadToArticleMedia } from '../src/features/knowledge/model/article-adapters.ts'
import { articleFormToPayload, emptyArticleForm, slugifyArticleTitle, validateArticleForm } from '../src/features/knowledge/model/article-form.ts'
import { readLibraryQuery, toPublicListQuery } from '../src/features/knowledge/model/library-pagination.ts'
import { buildKnowledgeQueryString } from '../src/features/knowledge/model/knowledge-query.ts'
import { knowledgeEndpoints } from '../src/features/knowledge/model/knowledge-endpoints.ts'

test('uses paths relative to the shared /api/v1 client base', () => {
  assert.equal(knowledgeEndpoints.publicArticles, '/knowledge/articles')
  assert.equal(knowledgeEndpoints.publicArticle('vitamin d'), '/knowledge/articles/vitamin%20d')
  assert.equal(knowledgeEndpoints.bookmark('vitamin-d'), '/knowledge/articles/vitamin-d/bookmark')
  assert.equal(knowledgeEndpoints.adminArticles, '/admin/knowledge/articles')
  assert.equal(knowledgeEndpoints.adminArticle('article/1'), '/admin/knowledge/articles/article%2F1')
  assert.equal(knowledgeEndpoints.mediaUpload, '/admin/knowledge/media/upload')
})

test('serializes the exact public list contract', () => {
  const query = toPublicListQuery(readLibraryQuery('?page=2&category=nutrition&stage=trimester-1&topic=vitamin&saved=true'))
  assert.deepEqual(query, {
    page: 2,
    pageSize: 6,
    category: 'nutrition',
    stage: 'trimester-1',
    topic: 'vitamin',
    savedOnly: true,
    sort: 'publishedAt:desc',
  })
  assert.equal(buildKnowledgeQueryString(query), '?page=2&pageSize=6&category=nutrition&stage=trimester-1&topic=vitamin&savedOnly=true&sort=publishedAt%3Adesc')
})

test('builds a complete PUT payload and clears omitted optional content', () => {
  const form = emptyArticleForm()
  form.title = 'Vitamin D khi mang thai'
  form.slug = 'vitamin-d-khi-mang-thai'
  form.status = 'draft'
  form.topics = 'Vitamin, Chăm sóc hằng ngày'
  form.coverImage = { id: '', url: 'https://media.example.com/article/2026/09/a.jpg', alt: 'Vitamin D', caption: '' }
  form.sections = [{ key: 'one', heading: 'Tại sao quan trọng?', paragraphs: 'Đoạn một\nĐoạn hai', bullets: 'Ý chính' }]
  assert.deepEqual(validateArticleForm(form), {})
  assert.deepEqual(articleFormToPayload(form), {
    slug: 'vitamin-d-khi-mang-thai',
    title: 'Vitamin D khi mang thai',
    category: 'nutrition',
    stage: 'pregnancy',
    topics: ['Vitamin', 'Chăm sóc hằng ngày'],
    status: 'draft',
    coverImage: { url: 'https://media.example.com/article/2026/09/a.jpg', alt: 'Vitamin D' },
    sections: [{ heading: 'Tại sao quan trọng?', paragraphs: ['Đoạn một', 'Đoạn hai'], bullets: ['Ý chính'] }],
  })
  assert.equal(slugifyArticleTitle('Dinh dưỡng & Thai kỳ'), 'dinh-duong-thai-ky')
})

test('maps camelCase article DTOs and snake_case media DTOs without leaking contract details', () => {
  const view = mapArticleDetailToViewModel({
    id: 'article-1', slug: 'vitamin-d', title: 'Vitamin D', excerpt: 'Tổng quan', category: 'nutrition', stage: 'trimester-1', topics: ['Vitamin'],
    publishedAt: '2026-09-01T00:00:00Z', author: { id: 'admin-1', name: 'NutriMom Team' }, status: 'published', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    sections: [
      { id: 'second', heading: 'Hai', paragraphs: ['B'], bullets: [], sortOrder: 1 },
      { id: 'first', heading: 'Một', paragraphs: ['A'], bullets: ['Ý'], sortOrder: 0 },
    ],
  })
  assert.equal(view.category, 'Dinh dưỡng')
  assert.equal(view.stage, 'Tam cá nguyệt 1')
  assert.equal(view.publishedAt, '01.09.2026')
  assert.deepEqual(view.sections.map((section) => section.id), ['first', 'second'])
  assert.equal(view.editorial.selected, false)
  assert.equal(view.editorial.reviewer, null)

  assert.deepEqual(mapUploadToArticleMedia({ id: 'media-1', image_url: 'https://media.example.com/a.jpg', image_key: 'article/a.jpg', width: 100, height: 60, size_bytes: 20_000 }), {
    id: 'media-1', url: 'https://media.example.com/a.jpg', key: 'article/a.jpg', alt: '', caption: '', width: 100, height: 60, sizeBytes: 20_000,
  })
})
