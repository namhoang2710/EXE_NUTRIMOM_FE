import { ArrowLeft, ArrowRight, BookOpenText, Check } from '@phosphor-icons/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { blogCategories, blogStages, blogTopics, publishedBlogPosts } from '../model/article-content'
import { useLibraryPagination } from '../model/use-library-pagination'
import { ArticleCard } from './ArticleCard'
import { LibrarySelect } from './LibrarySelect'

interface KnowledgeLibraryProps {
  savedSlugs: readonly string[]
  onBookmark: (slug: string) => void
}

export function KnowledgeLibrary({ savedSlugs, onBookmark }: KnowledgeLibraryProps) {
  const location = useLocation()
  const { query, pagination, loading, error, updateFilter, resetFilters, changePage, retryLoad } = useLibraryPagination(location.search, savedSlugs)
  const { filters } = query
  const { items, currentPage, totalPages, totalItems, pageSize } = pagination
  const [openSelect, setOpenSelect] = useState<'stage' | 'topic' | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [minimumHeight, setMinimumHeight] = useState(0)
  const hasFilters = Boolean(filters.category || filters.stage || filters.topic || filters.savedOnly)
  const savedCount = publishedBlogPosts.filter((post) => savedSlugs.includes(post.slug)).length
  const setStageOpen = useCallback((open: boolean) => setOpenSelect((previous) => open ? 'stage' : previous === 'stage' ? null : previous), [])
  const setTopicOpen = useCallback((open: boolean) => setOpenSelect((previous) => open ? 'topic' : previous === 'topic' ? null : previous), [])

  useLayoutEffect(() => {
    const node = content.current
    if (!node) return
    let width = node.getBoundingClientRect().width
    const measure = () => {
      const bounds = node.getBoundingClientRect()
      const resized = Math.abs(bounds.width - width) > 1
      width = bounds.width
      // Keep a height floor across queries to prevent anchoring and bottom clamping.
      // Re-measure at a different viewport width for mobile/tablet responsiveness.
      setMinimumHeight((previous) => resized ? Math.ceil(bounds.height) : Math.max(previous, Math.ceil(bounds.height)))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function scrollToResultsIfNeeded() {
    const node = frame.current
    if (node && node.getBoundingClientRect().top < 96) {
      node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start', inline: 'nearest' })
    }
  }

  function goToPage(page: number) {
    if (loading || page < 1 || page > totalPages || page === currentPage) return
    changePage(page)
    // Explicit user action only. Data effects never move the document.
    scrollToResultsIfNeeded()
  }

  const returnParams = new URLSearchParams(location.search)
  for (const name of ['category', 'stage', 'topic', 'saved', 'page']) returnParams.delete(name)
  if (filters.category) returnParams.set('category', filters.category)
  if (filters.stage) returnParams.set('stage', filters.stage)
  if (filters.topic) returnParams.set('topic', filters.topic)
  if (filters.savedOnly) returnParams.set('saved', 'true')
  if (currentPage > 1) returnParams.set('page', String(currentPage))
  const returnTo = `${location.pathname}${returnParams.size ? `?${returnParams}` : ''}#bai-viet-moi`
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)

  return <section className="nm-blog-section nm-blog-section--tinted nm-knowledge-library" id="bai-viet-moi" aria-labelledby="latest-heading">
    <div className="landing-section">
      <div className="nm-section-heading nm-section-heading--inline"><div><span>Thư viện kiến thức</span><h2 id="latest-heading">Bài viết dành cho mẹ</h2></div></div>
      <form className="nm-blog-filters" aria-label="Lọc bài viết" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="nm-category-filters"><legend>Danh mục</legend><div>
          {['', ...blogCategories].map((category) => <button type="button" key={category} className="nm-filter-chip" aria-pressed={filters.category === category} onClick={() => updateFilter('category', category)}>{category || 'Tất cả'}</button>)}
        </div></fieldset>
        <div className="nm-filter-controls">
          <LibrarySelect label="Giai đoạn" placeholder="Mọi giai đoạn" options={blogStages} value={filters.stage} open={openSelect === 'stage'} onOpenChange={setStageOpen} onChange={(value) => updateFilter('stage', value)} />
          <LibrarySelect label="Chủ đề" placeholder="Mọi chủ đề" options={blogTopics} value={filters.topic} open={openSelect === 'topic'} onOpenChange={setTopicOpen} onChange={(value) => updateFilter('topic', value)} />
          <label className="nm-saved-filter"><input type="checkbox" checked={filters.savedOnly} onChange={(event) => updateFilter('savedOnly', event.target.checked)} /><span className="nm-library-checkbox" aria-hidden="true"><Check size={13} weight="bold" /></span>Chỉ bài đã lưu ({savedCount})</label>
          <button className="nm-reset-filters" type="button" disabled={!hasFilters} onClick={resetFilters}>Xóa bộ lọc</button>
        </div>
      </form>
      <div className="nm-results-summary" role="status" aria-live="polite" aria-atomic="true">
        <span>{loading ? 'Đang cập nhật bài viết…' : totalItems ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalItems)} trong ${totalItems} bài viết${filters.savedOnly ? ' đã lưu' : ''}` : '0 bài viết phù hợp'}</span>
        <span>Nội dung chính thức · Sắp xếp mới nhất</span>
      </div>
      <div className="nm-library-results" ref={frame} style={{ minHeight: minimumHeight || undefined }} aria-busy={loading}>
        <div ref={content} className="nm-library-results-content" data-loading={loading} inert={loading}>
          {error ? <div className="nm-empty-state" role="alert"><h3>Chưa thể cập nhật bài viết</h3><p>Mẹ thử lại sau một chút nhé.</p><button type="button" className="nm-button nm-button--soft" onClick={retryLoad}>Thử lại</button></div> : items.length ? <div className="nm-post-grid" key={`${currentPage}-${items.map((post) => post.slug).join(',')}`}>
            {items.map((post) => <ArticleCard key={post.slug} post={post} saved={savedSlugs.includes(post.slug)} onToggle={() => onBookmark(post.slug)} libraryControls returnTo={returnTo} />)}
          </div> : <div className="nm-empty-state"><BookOpenText size={32} weight="duotone" /><h3>{filters.savedOnly ? 'Chưa có bài đã lưu phù hợp' : 'Chưa có bài phù hợp với lựa chọn này'}</h3><p>{filters.savedOnly ? 'Mẹ có thể lưu bài từ thư viện để đọc lại khi cần.' : 'Mẹ thử chọn danh mục hoặc giai đoạn khác nhé.'}</p><button type="button" className="nm-button nm-button--soft" onClick={resetFilters}>Xem lại thư viện</button></div>}
        </div>
        {loading && <div className="nm-library-loading" aria-hidden="true"><div className="nm-post-grid">{Array.from({ length: Math.max(1, items.length) }, (_, index) => <div className="nm-library-skeleton" key={index}><span /><span /><span /><span /><span /></div>)}</div></div>}
      </div>
      <nav className="nm-library-pagination" aria-label="Phân trang thư viện kiến thức">
        <button type="button" disabled={loading || currentPage <= 1 || !totalItems} onClick={() => goToPage(currentPage - 1)} aria-label="Trang trước"><ArrowLeft size={17} /><span>Trước</span></button>
        <div className="nm-library-page-numbers">{pageNumbers.map((page, index) => <span className="nm-library-page-slot" key={page} data-distant={Math.abs(page - currentPage) > 1}>{index > 0 && page - pageNumbers[index - 1] > 1 && <span className="nm-library-page-gap" aria-hidden="true">…</span>}<button type="button" aria-label={`Trang ${page}`} aria-current={currentPage === page ? 'page' : undefined} disabled={loading} onClick={() => goToPage(page)}>{page}</button></span>)}</div>
        <button type="button" disabled={loading || currentPage >= totalPages || !totalItems} onClick={() => goToPage(currentPage + 1)} aria-label="Trang sau"><span>Sau</span><ArrowRight size={17} /></button>
        <span className="nm-library-page-description">{totalItems ? `Trang ${currentPage} / ${totalPages}` : 'Chưa có bài viết'}</span>
      </nav>
    </div>
  </section>
}
