import { ArrowLeft, ArrowRight, BookOpenText, PencilSimple, Plus, Trash, WarningCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { knowledgeAdminApi } from '@/features/knowledge/api/knowledge-api'
import { LibrarySelect } from '@/features/knowledge/components/LibrarySelect'
import { categoryLabel, articleCategories, articleStages, stageLabel } from '@/features/knowledge/model/article-types'
import type { AdminArticleListItemDto, ArticlePageDto, ArticleSort, ArticleStatus } from '@/features/knowledge/model/knowledge-dto'
import { ArticleEditor } from '../components/ArticleEditor'
import { PageHeading, ResourceState, StatusBadge, TableCard } from '../components/AdminUI'
import { formatAdminDate } from '../model/admin-formatters'

const emptyPage: ArticlePageDto<AdminArticleListItemDto> = { items: [], totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 12 }
const allowedSorts: ArticleSort[] = ['updatedAt:desc', 'updatedAt:asc', 'publishedAt:desc', 'publishedAt:asc', 'title:asc', 'title:desc', 'createdAt:desc', 'createdAt:asc']
const allowedStatuses: ArticleStatus[] = ['draft', 'published', 'archived']
const statusOptions = [
  { value: 'draft', label: 'Bản nháp' },
  { value: 'published', label: 'Đã xuất bản' },
  { value: 'archived', label: 'Lưu trữ' },
] as const
const sortOptions = [
  { value: 'updatedAt:desc', label: 'Cập nhật mới nhất' },
  { value: 'updatedAt:asc', label: 'Cập nhật cũ nhất' },
  { value: 'publishedAt:desc', label: 'Xuất bản mới nhất' },
  { value: 'publishedAt:asc', label: 'Xuất bản cũ nhất' },
  { value: 'title:asc', label: 'Tiêu đề A–Z' },
  { value: 'title:desc', label: 'Tiêu đề Z–A' },
  { value: 'createdAt:desc', label: 'Tạo mới nhất' },
  { value: 'createdAt:asc', label: 'Tạo cũ nhất' },
] as const

export function AdminKnowledgePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => {
    const page = Number(searchParams.get('page') ?? 1)
    const sort = searchParams.get('sort') as ArticleSort | null
    const status = searchParams.get('status') as ArticleStatus | null
    const category = searchParams.get('category')
    const stage = searchParams.get('stage')
    return {
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      pageSize: 12,
      category: category && articleCategories.some((option) => option.value === category) ? category : undefined,
      stage: stage && articleStages.some((option) => option.value === stage) ? stage : undefined,
      topic: searchParams.get('topic') || undefined,
      status: status && allowedStatuses.includes(status) ? status : undefined,
      sort: sort && allowedSorts.includes(sort) ? sort : 'updatedAt:desc' as ArticleSort,
    }
  }, [searchParams])
  const [topic, setTopic] = useState(query.topic ?? '')
  const [page, setPage] = useState(emptyPage)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<{ id?: string } | null>(null)
  const [deleting, setDeleting] = useState<AdminArticleListItemDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [openFilter, setOpenFilter] = useState<'status' | 'category' | 'stage' | 'sort' | null>(null)

  const setParameter = useCallback((name: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value); else next.delete(name)
      if (name !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => setTopic(query.topic ?? ''), [query.topic])

  useEffect(() => {
    const controller = new AbortController()
    setState('loading'); setError(null)
    knowledgeAdminApi.listArticles(query, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setPage(result); setState('success')
      if (result.currentPage !== query.page) setParameter('page', result.currentPage > 1 ? String(result.currentPage) : '')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách bài viết.'); setState('error')
    })
    return () => controller.abort()
  }, [query, reload, setParameter])

  function resetFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const name of ['category', 'stage', 'topic', 'status', 'sort', 'page']) next.delete(name)
      return next
    }, { replace: true })
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true); setDeleteError('')
    try {
      await knowledgeAdminApi.deleteArticle(deleting.id)
      setDeleting(null); setReload((value) => value + 1)
    } catch (reason) {
      setDeleteError(reason instanceof ApiClientError ? reason.message : 'Không thể xóa bài viết.')
    } finally { setDeleteBusy(false) }
  }

  const scheduled = (article: AdminArticleListItemDto) => article.status === 'published' && article.publishedAt && new Date(article.publishedAt).getTime() > Date.now()
  const hasFilters = Boolean(query.category || query.stage || query.topic || query.status || query.sort !== 'updatedAt:desc')

  return <div className="admin-page admin-knowledge-page">
    <PageHeading eyebrow="Content operations" title="Knowledge CMS" description="Quản lý bài viết, lịch xuất bản và nội dung đa phương tiện theo contract backend." actions={<button className="admin-button primary" type="button" onClick={() => setEditor({})}><Plus size={18} /> Bài viết mới</button>} />

    <section className="admin-card admin-knowledge-filters" aria-label="Bộ lọc bài viết">
      <LibrarySelect label="Trạng thái" placeholder="Tất cả" options={statusOptions} value={query.status ?? ''} open={openFilter === 'status'} onOpenChange={(open) => setOpenFilter(open ? 'status' : null)} onChange={(value) => setParameter('status', value)} />
      <LibrarySelect label="Danh mục" placeholder="Tất cả" options={articleCategories} value={query.category ?? ''} open={openFilter === 'category'} onOpenChange={(open) => setOpenFilter(open ? 'category' : null)} onChange={(value) => setParameter('category', value)} />
      <LibrarySelect label="Giai đoạn" placeholder="Tất cả" options={articleStages} value={query.stage ?? ''} open={openFilter === 'stage'} onOpenChange={(open) => setOpenFilter(open ? 'stage' : null)} onChange={(value) => setParameter('stage', value)} />
      <form onSubmit={(event) => { event.preventDefault(); setParameter('topic', topic.trim()) }}><label><span>Chủ đề chính xác</span><span className="admin-filter-search"><input maxLength={100} value={topic} placeholder="Ví dụ: vitamin" onChange={(event) => setTopic(event.target.value)} /><button type="submit">Lọc</button></span></label></form>
      <LibrarySelect label="Sắp xếp" placeholder="Sắp xếp" options={sortOptions} value={query.sort} open={openFilter === 'sort'} onOpenChange={(open) => setOpenFilter(open ? 'sort' : null)} onChange={(value) => setParameter('sort', value)} />
      <button className="admin-text-button" type="button" disabled={!hasFilters} onClick={resetFilters}>Xóa bộ lọc</button>
    </section>

    <TableCard title="Thư viện nội dung" description={state === 'success' ? `${page.totalItems} bài viết · Trang ${page.currentPage}/${Math.max(1, page.totalPages)}` : 'Đang đồng bộ với Knowledge CMS'}>
      <ResourceState status={state} empty={page.items.length === 0} error={error} onRetry={() => setReload((value) => value + 1)}>
        <div className="admin-table-scroll"><table className="admin-table admin-knowledge-table"><thead><tr><th>Bài viết</th><th>Phân loại</th><th>Tác giả</th><th>Xuất bản</th><th>Cập nhật</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead><tbody>
          {page.items.map((article) => <tr key={article.id}><td><div className="admin-article-cell"><span>{article.coverImage ? <img src={article.coverImage.url} alt="" /> : <BookOpenText size={19} />}</span><div><strong>{article.title}</strong><small>/{article.slug}</small></div></div></td><td><strong className="admin-table-primary">{categoryLabel(article.category)}</strong><small className="admin-cell-subtitle">{stageLabel(article.stage)}</small></td><td>{article.author.name}</td><td>{article.publishedAt ? formatAdminDate(article.publishedAt, true) : '—'}</td><td>{formatAdminDate(article.updatedAt, true)}</td><td><StatusBadge value={scheduled(article) ? 'scheduled' : article.status} /></td><td><div className="admin-row-actions"><button className="admin-row-action" type="button" aria-label={`Sửa ${article.title}`} onClick={() => setEditor({ id: article.id })}><PencilSimple size={17} /></button><button className="admin-row-action danger" type="button" aria-label={`Xóa ${article.title}`} onClick={() => { setDeleting(article); setDeleteError('') }}><Trash size={17} /></button></div></td></tr>)}
        </tbody></table></div>
        {page.totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang bài viết"><button type="button" disabled={state === 'loading' || page.currentPage <= 1} onClick={() => setParameter('page', String(page.currentPage - 1))}><ArrowLeft size={16} /> Trước</button><span>Trang {page.currentPage} / {page.totalPages}</span><button type="button" disabled={state === 'loading' || page.currentPage >= page.totalPages} onClick={() => setParameter('page', String(page.currentPage + 1))}>Sau <ArrowRight size={16} /></button></nav>}
      </ResourceState>
    </TableCard>

    {editor && <ArticleEditor articleId={editor.id} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setReload((value) => value + 1) }} />}
    {deleting && <div className="admin-dialog-backdrop" role="presentation"><section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-article-title"><span className="admin-confirm-icon"><WarningCircle size={28} /></span><h2 id="delete-article-title">Xóa bài viết?</h2><p>“{deleting.title}” sẽ bị xóa khỏi CMS. Ảnh đã upload vẫn được giữ lại theo chính sách media.</p>{deleteError && <div className="admin-field-error" role="alert">{deleteError}</div>}<div><button className="admin-button secondary" type="button" disabled={deleteBusy} onClick={() => setDeleting(null)}>Hủy</button><button className="admin-button danger" type="button" disabled={deleteBusy} onClick={() => { void confirmDelete() }}><Trash size={17} />{deleteBusy ? 'Đang xóa…' : 'Xóa bài viết'}</button></div></section></div>}
  </div>
}
