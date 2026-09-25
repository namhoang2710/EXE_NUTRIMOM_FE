export interface ApiMeta {
  request_id: string
  server_time: string
}

export interface ApiResponse<T> {
  data: T
  meta: ApiMeta
}

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  meta: ApiMeta & PaginationMeta
}
