import assert from 'node:assert/strict'
import test from 'node:test'
import { mapArticleDetailToViewModel, mapUploadToArticleMedia } from '../src/features/knowledge/model/article-adapters.ts'
import { articleDetailToForm, articleFormToPayload, emptyArticleForm, slugifyArticleTitle, validateArticleForm } from '../src/features/knowledge/model/article-form.ts'
import { isValidYoutubeVideoId, parseYoutubeVideoId } from '../src/features/knowledge/model/youtube-video.ts'
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
  form.sections = [{ key: 'one', heading: 'Tại sao quan trọng?', paragraphs: '<strong>Đoạn một</strong>\nĐoạn <em>hai</em>', bullets: '<u>Ý chính</u>' }]
  assert.deepEqual(validateArticleForm(form), {})
  assert.deepEqual(articleFormToPayload(form), {
    slug: 'vitamin-d-khi-mang-thai',
    title: 'Vitamin D khi mang thai',
    category: 'nutrition',
    stage: 'pregnancy',
    topics: ['Vitamin', 'Chăm sóc hằng ngày'],
    status: 'draft',
    coverImage: { url: 'https://media.example.com/article/2026/09/a.jpg', alt: 'Vitamin D' },
    sections: [{ heading: 'Tại sao quan trọng?', paragraphs: ['<strong>Đoạn một</strong>', 'Đoạn <em>hai</em>'], bullets: ['<u>Ý chính</u>'] }],
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
  assert.equal(view.youtubeVideoId, undefined)

  assert.deepEqual(mapUploadToArticleMedia({ id: 'media-1', image_url: 'https://media.example.com/a.jpg', image_key: 'article/a.jpg', width: 100, height: 60, size_bytes: 20_000 }), {
    id: 'media-1', url: 'https://media.example.com/a.jpg', key: 'article/a.jpg', alt: '', caption: '', width: 100, height: 60, sizeBytes: 20_000,
  })
})

test('accepts only a YouTube ID or supported YouTube video URL', () => {
  const id = 'dQw4w9WgXcQ'
  for (const input of [
    id,
    ` ${id} `,
    `https://www.youtube.com/watch?v=${id}&t=10`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ]) assert.equal(parseYoutubeVideoId(input), id, input)
  assert.equal(isValidYoutubeVideoId(id), true)

  for (const input of [
    '', ' ', 'dQw4w9WgX', 'dQw4w9WgXcQ!', '<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/watch?list=PL123',
    'https://youtube.com/watch?v=too-short',
    `https://youtube.com/watch?v=${id}&v=${id}`,
    `https://youtube.com.evil.test/watch?v=${id}`,
    `https://evil.test/youtube.com/watch?v=${id}`,
    `https://youtube.com@evil.test/watch?v=${id}`,
    `https://youtube.com/shorts/${id}/extra`,
  ]) assert.equal(parseYoutubeVideoId(input), null, input)
  assert.equal(isValidYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ'), false)
})

test('detail to edit form to PUT retains the video until an admin removes it', () => {
  const detail = {
    id: 'article-1', slug: 'vitamin-d', title: 'Vitamin D', category: 'nutrition', stage: 'pregnancy', topics: [],
    author: { id: 'admin-1', name: 'NutriMom Team' }, status: 'draft' as const,
    createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', sections: [],
    youtubeVideoId: 'dQw4w9WgXcQ',
  }
  const form = articleDetailToForm(detail)
  assert.equal(form.youtubeVideo, detail.youtubeVideoId)
  form.title = 'Vitamin D đã sửa'
  assert.deepEqual(validateArticleForm(form), {})
  assert.equal(articleFormToPayload(form).youtubeVideoId, detail.youtubeVideoId)
  assert.equal(mapArticleDetailToViewModel(detail).youtubeVideoId, detail.youtubeVideoId)

  form.youtubeVideo = `https://youtu.be/${detail.youtubeVideoId}`
  assert.equal(articleFormToPayload(form).youtubeVideoId, detail.youtubeVideoId)
  form.youtubeVideo = 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'
  assert.ok(validateArticleForm(form).youtubeVideo)
  form.youtubeVideo = ''
  assert.equal('youtubeVideoId' in articleFormToPayload(form), false)

  const { youtubeVideoId: _removedVideoId, ...oldDetail } = detail
  assert.equal(articleDetailToForm(oldDetail).youtubeVideo, '')
  assert.equal(mapArticleDetailToViewModel(oldDetail).youtubeVideoId, undefined)
  assert.equal('youtubeVideoId' in articleFormToPayload(articleDetailToForm(oldDetail)), false)
})
