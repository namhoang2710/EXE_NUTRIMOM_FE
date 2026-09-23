export type ArticleStatus = 'draft' | 'published' | 'archived'

export type ArticleSortField = 'publishedAt' | 'title' | 'createdAt' | 'updatedAt'
export type ArticleSort = `${ArticleSortField}:${'asc' | 'desc'}`

export interface ArticleAuthorDto {
  id: string
  name: string
}

export interface ArticleImageDto {
  url: string
  alt?: string
  caption?: string
}

export interface ArticleImageInput {
  id?: string
  url?: string
  alt?: string
  caption?: string
}

export interface ArticleSourceDto {
  label: string
  href: string
}

export interface ArticleSectionDto {
  id: string
  heading: string
  paragraphs: string[]
  bullets: string[]
  image?: ArticleImageDto
  sortOrder: number
}

export interface ArticleSectionInput {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  image?: ArticleImageInput
}

export interface ArticleSummaryDto {
  id: string
  slug: string
  title: string
  excerpt?: string
  category: string
  stage: string
  topics: string[]
  publishedAt?: string
  author: ArticleAuthorDto
  coverImage?: ArticleImageDto
}

export interface ArticleDetailDto extends ArticleSummaryDto {
  lead?: string
  youtubeVideoId?: string
  sections: ArticleSectionDto[]
  source?: ArticleSourceDto
  status: ArticleStatus
  createdAt: string
  updatedAt: string
}

// Admin list items resemble details, but the list endpoint omits the video field.
export type AdminArticleListItemDto = Omit<ArticleDetailDto, 'youtubeVideoId'>

export interface ArticleRequestDto {
  slug: string
  title: string
  excerpt?: string
  category: string
  stage: string
  topics: string[]
  publishedAt?: string
  status: ArticleStatus
  authorId?: string
  coverImage?: ArticleImageInput
  lead?: string
  youtubeVideoId?: string
  sections: ArticleSectionInput[]
  source?: ArticleSourceDto
}

export interface ArticlePageDto<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export interface MediaUploadDto {
  id: string
  image_url: string
  image_key: string
  alt?: string
  caption?: string
  width: number
  height: number
  size_bytes: number
}

export interface ArticleListQuery {
  page: number
  pageSize: number
  category?: string
  stage?: string
  topic?: string
  sort?: ArticleSort
}

export interface AdminArticleListQuery extends ArticleListQuery {
  status?: ArticleStatus
}

export interface PublicArticleListQuery extends ArticleListQuery {
  savedOnly?: boolean
}
