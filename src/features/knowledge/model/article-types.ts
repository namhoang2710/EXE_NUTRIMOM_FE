import type { ArticleStatus } from './knowledge-dto'

export const articleCategories = [
  { value: 'nutrition', label: 'Dinh dưỡng' },
  { value: 'wellness', label: 'Sống khỏe' },
  { value: 'exercise', label: 'Vận động' },
  { value: 'pregnancy', label: 'Thai kỳ' },
  { value: 'postpartum', label: 'Sau sinh' },
  { value: 'preconception', label: 'Chuẩn bị' },
] as const

export const articleStages = [
  { value: 'preconception', label: 'Chuẩn bị mang thai' },
  { value: 'pregnancy', label: 'Trong thai kỳ' },
  { value: 'trimester-1', label: 'Tam cá nguyệt 1' },
  { value: 'trimester-2', label: 'Tam cá nguyệt 2' },
  { value: 'trimester-3', label: 'Tam cá nguyệt 3' },
  { value: 'postpartum', label: 'Sau sinh' },
] as const

export interface ArticleImageViewModel {
  url: string
  alt: string
  caption?: string
}

export interface ArticleCardViewModel {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  categoryValue: string
  stage: string
  stageValue: string
  topics: string[]
  readTime: string
  publishedAt: string
  publishedAtIso?: string
  coverImage?: ArticleImageViewModel
  editorial: {
    author: string
    selected: false
    moderation: 'approved'
    reviewer: null
  }
}

export interface ArticleSectionViewModel {
  id: string
  heading: string
  paragraphs: string[]
  bullets: string[]
  sortOrder: number
  image?: ArticleImageViewModel
}

export interface ArticleDetailViewModel extends ArticleCardViewModel {
  lead: string
  sections: ArticleSectionViewModel[]
  source?: { label: string; href: string }
  status: ArticleStatus
  createdAt: string
  updatedAt: string
}

export function categoryLabel(value: string) {
  return articleCategories.find((option) => option.value === value)?.label ?? value
}

export function stageLabel(value: string) {
  return articleStages.find((option) => option.value === value)?.label ?? value
}

export function categoryValue(value: string) {
  return articleCategories.find((option) => option.value === value || option.label === value)?.value ?? value
}

export function stageValue(value: string) {
  return articleStages.find((option) => option.value === value || option.label === value)?.value ?? value
}
