import type { ArticleDetailDto, ArticleImageInput, ArticleRequestDto, ArticleStatus } from './knowledge-dto'
import { categoryValue, stageValue } from './article-types.ts'

export interface ArticleImageDraft {
  id: string
  url: string
  alt: string
  caption: string
}

export interface ArticleSectionDraft {
  key: string
  heading: string
  paragraphs: string
  bullets: string
  image?: ArticleImageDraft
}

export interface ArticleFormDraft {
  slug: string
  title: string
  excerpt: string
  category: string
  stage: string
  topics: string
  status: ArticleStatus
  publishedAt: string
  lead: string
  coverImage?: ArticleImageDraft
  sourceLabel: string
  sourceHref: string
  sections: ArticleSectionDraft[]
}

function key() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function emptySection(): ArticleSectionDraft {
  return { key: key(), heading: '', paragraphs: '', bullets: '' }
}

export function emptyArticleForm(): ArticleFormDraft {
  return {
    slug: '', title: '', excerpt: '', category: 'nutrition', stage: 'pregnancy', topics: '',
    status: 'draft', publishedAt: '', lead: '', sourceLabel: '', sourceHref: '', sections: [emptySection()],
  }
}

function toLocalDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

export function articleDetailToForm(article: ArticleDetailDto): ArticleFormDraft {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? '',
    category: categoryValue(article.category),
    stage: stageValue(article.stage),
    topics: (article.topics ?? []).join(', '),
    status: article.status,
    publishedAt: toLocalDateTime(article.publishedAt),
    lead: article.lead ?? '',
    coverImage: article.coverImage ? { id: '', url: article.coverImage.url, alt: article.coverImage.alt ?? '', caption: article.coverImage.caption ?? '' } : undefined,
    sourceLabel: article.source?.label ?? '',
    sourceHref: article.source?.href ?? '',
    sections: [...article.sections].sort((a, b) => a.sortOrder - b.sortOrder).map((section) => ({
      key: section.id,
      heading: section.heading,
      paragraphs: section.paragraphs.join('\n'),
      bullets: section.bullets.join('\n'),
      image: section.image ? { id: '', url: section.image.url, alt: section.image.alt ?? '', caption: section.image.caption ?? '' } : undefined,
    })),
  }
}

export function slugifyArticleTitle(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/đ/gu, 'd').replace(/Đ/gu, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 180).replace(/-+$/u, '')
}

function lines(value: string, maximum: number) {
  return value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).slice(0, maximum)
}

function imageInput(image?: ArticleImageDraft): ArticleImageInput | undefined {
  if (!image?.id && !image?.url) return undefined
  return {
    ...(image.id ? { id: image.id } : { url: image.url }),
    ...(image.alt.trim() ? { alt: image.alt.trim() } : {}),
    ...(image.caption.trim() ? { caption: image.caption.trim() } : {}),
  }
}

export function validateArticleForm(form: ArticleFormDraft) {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Vui lòng nhập tiêu đề.'
  else if (form.title.trim().length > 300) errors.title = 'Tiêu đề tối đa 300 ký tự.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(form.slug)) errors.slug = 'Slug chỉ gồm chữ thường, số và dấu gạch ngang đơn.'
  else if (form.slug.length > 180) errors.slug = 'Slug tối đa 180 ký tự.'
  if (form.excerpt.length > 2000) errors.excerpt = 'Mô tả tối đa 2.000 ký tự.'
  if (form.lead.length > 10_000) errors.lead = 'Mở đầu tối đa 10.000 ký tự.'
  const topics = form.topics.split(',').map((item) => item.trim()).filter(Boolean)
  if (new Set(topics).size !== topics.length) errors.topics = 'Mỗi chủ đề chỉ được xuất hiện một lần.'
  else if (topics.length > 30) errors.topics = 'Tối đa 30 chủ đề.'
  else if (topics.some((topic) => topic.length > 100)) errors.topics = 'Mỗi chủ đề tối đa 100 ký tự.'
  if (form.status === 'published' && form.publishedAt && Number.isNaN(new Date(form.publishedAt).getTime())) errors.publishedAt = 'Thời gian xuất bản không hợp lệ.'
  if ((form.sourceLabel.trim() && !form.sourceHref.trim()) || (!form.sourceLabel.trim() && form.sourceHref.trim())) errors.source = 'Nguồn cần có đủ nhãn và đường dẫn.'
  if (form.sourceHref.trim()) {
    try {
      const url = new URL(form.sourceHref.trim())
      if (!['http:', 'https:'].includes(url.protocol)) errors.source = 'Nguồn phải dùng đường dẫn http hoặc https.'
    } catch { errors.source = 'Đường dẫn nguồn không hợp lệ.' }
  }
  if (form.sections.length > 100) errors.sections = 'Tối đa 100 phần nội dung.'
  form.sections.forEach((section, index) => {
    if (!section.heading.trim()) errors[`section-${index}`] = `Phần ${index + 1} cần có tiêu đề.`
    else if (section.heading.trim().length > 300) errors[`section-${index}`] = `Tiêu đề phần ${index + 1} tối đa 300 ký tự.`
    const paragraphs = lines(section.paragraphs, 101)
    const bullets = lines(section.bullets, 101)
    if (paragraphs.length > 100) errors[`section-${index}`] = `Phần ${index + 1} có tối đa 100 đoạn.`
    else if (paragraphs.some((paragraph) => paragraph.length > 10_000)) errors[`section-${index}`] = `Mỗi đoạn ở phần ${index + 1} tối đa 10.000 ký tự.`
    if (bullets.length > 100) errors[`section-${index}`] = `Phần ${index + 1} có tối đa 100 gạch đầu dòng.`
    else if (bullets.some((bullet) => bullet.length > 2000)) errors[`section-${index}`] = `Mỗi gạch đầu dòng ở phần ${index + 1} tối đa 2.000 ký tự.`
  })
  return errors
}

export function articleFormToPayload(form: ArticleFormDraft): ArticleRequestDto {
  const topicValues = [...new Set(form.topics.split(',').map((item) => item.trim()).filter(Boolean))]
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    ...(form.excerpt.trim() ? { excerpt: form.excerpt.trim() } : {}),
    category: form.category,
    stage: form.stage,
    topics: topicValues,
    status: form.status,
    ...(form.status === 'published' && form.publishedAt ? { publishedAt: new Date(form.publishedAt).toISOString() } : {}),
    ...(imageInput(form.coverImage) ? { coverImage: imageInput(form.coverImage) } : {}),
    ...(form.lead.trim() ? { lead: form.lead.trim() } : {}),
    sections: form.sections.map((section) => ({
      heading: section.heading.trim(),
      paragraphs: lines(section.paragraphs, 100),
      ...(lines(section.bullets, 100).length ? { bullets: lines(section.bullets, 100) } : {}),
      ...(imageInput(section.image) ? { image: imageInput(section.image) } : {}),
    })),
    ...(form.sourceLabel.trim() && form.sourceHref.trim() ? { source: { label: form.sourceLabel.trim(), href: form.sourceHref.trim() } } : {}),
  }
}
