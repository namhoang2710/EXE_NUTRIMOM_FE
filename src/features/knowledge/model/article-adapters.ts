import type { ArticleCardViewModel, ArticleDetailViewModel, ArticleImageViewModel } from './article-types'
import { categoryLabel, stageLabel } from './article-types.ts'
import type { ArticleDetailDto, ArticleImageDto, ArticleSummaryDto, MediaUploadDto } from './knowledge-dto'

export function formatArticleDate(value?: string) {
  if (!value) return 'Chưa xuất bản'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa xuất bản'
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}`
}

export function calculateReadTime(parts: Array<string | undefined>) {
  const wordCount = parts.join(' ').trim().split(/\s+/u).filter(Boolean).length
  return `${Math.max(1, Math.ceil(wordCount / 200))} phút đọc`
}

function mapImage(image?: ArticleImageDto): ArticleImageViewModel | undefined {
  if (!image?.url) return undefined
  return { url: image.url, alt: image.alt ?? '', caption: image.caption }
}

export function mapArticleSummaryToCard(article: ArticleSummaryDto): ArticleCardViewModel {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? '',
    category: categoryLabel(article.category),
    categoryValue: article.category,
    stage: stageLabel(article.stage),
    stageValue: article.stage,
    topics: article.topics ?? [],
    readTime: calculateReadTime([article.title, article.excerpt]),
    publishedAt: formatArticleDate(article.publishedAt),
    publishedAtIso: article.publishedAt,
    coverImage: mapImage(article.coverImage),
    editorial: {
      author: article.author?.name ?? 'Ban biên tập NutriMom',
      selected: false,
      moderation: 'approved',
      reviewer: null,
    },
  }
}

export function mapArticleDetailToViewModel(article: ArticleDetailDto): ArticleDetailViewModel {
  const text = [
    article.title,
    article.excerpt,
    article.lead,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...section.bullets]),
  ]
  return {
    ...mapArticleSummaryToCard(article),
    readTime: calculateReadTime(text),
    lead: article.lead ?? '',
    sections: [...(article.sections ?? [])]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((section) => ({
        id: section.id,
        heading: section.heading,
        paragraphs: section.paragraphs ?? [],
        bullets: section.bullets ?? [],
        sortOrder: section.sortOrder,
        image: mapImage(section.image),
      })),
    source: article.source,
    status: article.status,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  }
}

export function mapUploadToArticleMedia(upload: MediaUploadDto) {
  return {
    id: upload.id,
    url: upload.image_url,
    key: upload.image_key,
    alt: upload.alt ?? '',
    caption: upload.caption ?? '',
    width: upload.width,
    height: upload.height,
    sizeBytes: upload.size_bytes,
  }
}
