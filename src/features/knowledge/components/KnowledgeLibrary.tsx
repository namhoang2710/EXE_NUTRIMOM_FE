import { ArrowLeft, ArrowRight, BookOpenText, Check } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { articleCategories, articleStages } from '../model/article-types'
import { useLibraryPagination } from '../model/use-library-pagination'
import { LibraryArticleCard } from './ArticleCard'
import { LibrarySelect } from './LibrarySelect'

interface KnowledgeLibraryProps {
  savedSlugs: readonly string[]
  bookmarksLoading: boolean
  authenticated: boolean
}

export function KnowledgeLibrary({ savedSlugs, bookmarksLoading, authenticated }: KnowledgeLibraryProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { query, pagination, loading, error, updateFilter, resetFilters, changePage, retryLoad } = useLibraryPagination()
  const { filters } = query
  const { items, currentPage, totalPages, totalItems, pageSize } = pagination
  const [openSelect, setOpenSelect] = useState<'stage' | null>(null)
  const [topic, setTopic] = useState(filters.topic)
  const frame = useRef<HTMLDivElement>(null)
  const hasFilters = Boolean(filters.category || filters.stage || filters.topic || filters.savedOnly)
  const setStageOpen = useCallback((open: boolean) => setOpenSelect(open ? 'stage' : null), [])

  useEffect(() => setTopic(filters.topic), [filters.topic])

  function scrollToResultsIfNeeded() {
    const node = frame.current
    if (node && node.getBoundingClientRect().top < 96) {
      node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }
  }

  function goToPage(page: number) {
    if (loading || page < 1 || page > totalPages || page === currentPage) return
    changePage(page)
    scrollToResultsIfNeeded()
  }

  function toggleSavedOnly(checked: boolean) {
    if (!authenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}${location.hash}` } })
      return
    }
    updateFilter('savedOnly', checked)
  }

  const returnParams = new URLSearchParams(location.search)
  if (currentPage <= 1) returnParams.delete('page')
  const returnTo = `${location.pathname}${returnParams.size ? `?${returnParams}` : ''}#bai-viet-moi`
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)

  return <section className="nm-blog-section nm-blog-section--tinted nm-knowledge-library" id="bai-viet-moi" aria-labelledby="latest-heading">
    <div className="landing-section">
      <div className="nm-section-heading nm-section-heading--inline"><div><span>Thư viện kiến thức</span><h2 id="latest-heading">Bài viết dành cho mẹ</h2></div></div>
      <form className="nm-blog-filters" aria-label="Lọc bài viết" onSubmit={(event) => { event.preventDefault(); updateFilter('topic', topic.trim()) }}>
        <fieldset className="nm-category-filters"><legend>Danh mục</legend><div>
          {[{ value: '', label: 'Tất cả' }, ...articleCategories].map((category) => <button type="button" key={category.value} className="nm-filter-chip" aria-pressed={filters.category === category.value} onClick={() => updateFilter('category', category.value)}>{category.label}</button>)}
        </div></fieldset>
        <div className="nm-filter-controls">
          <LibrarySelect label="Giai đoạn" placeholder="Mọi giai đoạn" options={articleStages} value={filters.stage} open={openSelect === 'stage'} onOpenChange={setStageOpen} onChange={(value) => updateFilter('stage', value)} />
          <label className="nm-topic-filter"><span>Chủ đề chính xác</span><span><input value={topic} maxLength={100} placeholder="Ví dụ: vitamin" onChange={(event) => setTopic(event.target.value)} /><button type="submit">Lọc</button></span></label>
          <label className="nm-saved-filter"><input type="checkbox" checked={filters.savedOnly} disabled={bookmarksLoading} onChange={(event) => toggleSavedOnly(event.target.checked)} /><span className="nm-library-checkbox" aria-hidden="true"><Check size={13} weight="bold" /></span>Chỉ bài đã lưu{authenticated ? ` (${savedSlugs.length})` : ''}</label>
          <button className="nm-reset-filters" type="button" disabled={!hasFilters} onClick={resetFilters}>Xóa bộ lọc</button>
        </div>
      </form>
      <div className="nm-library-frame"><div className="nm-results-summary" role="status" aria-live="polite" aria-atomic="true">
        <span>{loading ? 'Đang cập nhật bài viết…' : totalItems ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalItems)} trong ${totalItems} bài viết${filters.savedOnly ? ' đã lưu' : ''}` : '0 bài viết phù hợp'}</span>
        <span>Nội dung chính thức · Sắp xếp mới nhất</span>
      </div>
      <div className="nm-library-results" ref={frame} aria-busy={loading}>
        <div className="nm-library-results-content" data-loading={loading} inert={loading}>
          {error ? <div className="nm-empty-state" role="alert"><h3>Chưa thể cập nhật bài viết</h3><p>{error}</p><button type="button" className="nm-button nm-button--soft" onClick={retryLoad}>Thử lại</button></div> : items.length ? <div className="nm-post-grid" key={`${currentPage}-${items.map((post) => post.slug).join(',')}`}>
            {items.slice(0, pageSize).map((post) => <LibraryArticleCard key={post.id} post={post} returnTo={returnTo} />)}
          </div> : !loading && <div className="nm-empty-state"><BookOpenText size={32} weight="duotone" /><h3>{filters.savedOnly ? 'Chưa có bài đã lưu phù hợp' : 'Chưa có bài phù hợp với lựa chọn này'}</h3><p>{filters.savedOnly ? 'Mẹ có thể lưu bài từ thư viện để đọc lại khi cần.' : 'Mẹ thử chọn danh mục, giai đoạn hoặc chủ đề khác nhé.'}</p><button type="button" className="nm-button nm-button--soft" onClick={resetFilters}>Xem lại thư viện</button></div>}
        </div>
        {loading && <div className="nm-library-loading" aria-hidden="true"><div className="nm-post-grid">{Array.from({ length: pageSize }, (_, index) => <div className="nm-library-skeleton" key={index}><span /><span /></div>)}</div></div>}
      </div>
      <nav className="nm-library-pagination" aria-label="Phân trang thư viện kiến thức">
        <button type="button" disabled={loading || currentPage <= 1 || !totalItems} onClick={() => goToPage(currentPage - 1)} aria-label="Trang trước"><ArrowLeft size={17} /><span>Trước</span></button>
        <div className="nm-library-page-numbers">{pageNumbers.map((page, index) => <span className="nm-library-page-slot" key={page} data-distant={Math.abs(page - currentPage) > 1}>{index > 0 && page - pageNumbers[index - 1] > 1 && <span className="nm-library-page-gap" aria-hidden="true">…</span>}<button type="button" aria-label={`Trang ${page}`} aria-current={currentPage === page ? 'page' : undefined} disabled={loading} onClick={() => goToPage(page)}>{page}</button></span>)}</div>
        <button type="button" disabled={loading || currentPage >= totalPages || !totalItems} onClick={() => goToPage(currentPage + 1)} aria-label="Trang sau"><span>Sau</span><ArrowRight size={17} /></button>
        <span className="nm-library-page-description">{totalItems ? `Trang ${currentPage} / ${totalPages}` : 'Chưa có bài viết'}</span>
      </nav>
      </div>
    </div>
  </section>
}
