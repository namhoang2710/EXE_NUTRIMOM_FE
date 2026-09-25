import { BookmarkSimple } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api'
import { ArticleCard } from '@/features/knowledge/components/ArticleCard'
import { mapArticleSummaryToCard } from '@/features/knowledge/model/article-adapters'
import type { ArticleCardViewModel } from '@/features/knowledge/model/article-types'
import { useArticleBookmarks } from '@/features/knowledge/model/use-article-bookmarks'

export function SavedArticlesPage() {
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [articles, setArticles] = useState<ArticleCardViewModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const { savedSlugs, toggleBookmark, loading: bookmarksLoading, busySlugs } = useArticleBookmarks()

  useEffect(() => {
    const controller = new AbortController()
    knowledgeApi.listArticles({ page, pageSize: 8, savedOnly: true, sort: 'publishedAt:desc' }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.items.length === 0 && page > 1) { setPage(page - 1); return }
        setArticles(result.items.map(mapArticleSummaryToCard))
        setTotalPages(Math.max(1, result.totalPages))
        setError('')
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể tải bài đã lưu.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, reloadKey])

  async function unsave(slug: string) {
    setNotice(await toggleBookmark(slug))
    setReloadKey((value) => value + 1)
  }

  return <main className="nm-account-workspace-page"><header className="nm-account-workspace-heading"><span>Thư viện của bạn</span><h1>Đã lưu</h1><p>Những bài viết kiến thức bạn muốn đọc lại, ở cùng một nơi.</p></header>
    {loading ? <div className="nm-account-state-card" role="status">Đang tải bài đã lưu...</div> : error ? <section className="nm-account-state-card"><h2>Chưa thể tải bài viết</h2><p role="alert">{error}</p><button className="nm-secondary-action" type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1) }}>Thử lại</button></section> : articles.length === 0 ? <section className="nm-account-state-card"><BookmarkSimple size={36} weight="duotone" aria-hidden="true" /><h2>Chưa có bài viết đã lưu</h2><p>Khám phá thư viện kiến thức và lưu các bài bạn quan tâm để tìm lại nhanh hơn.</p><Link className="nm-primary-action" to="/app/knowledge">Khám phá kiến thức</Link></section> : <><div className="nm-saved-grid">{articles.map((article) => <ArticleCard key={article.id} post={article} saved={savedSlugs.includes(article.slug)} bookmarkBusy={bookmarksLoading || busySlugs.includes(article.slug)} returnTo="/app/profile/saved" onToggle={() => void unsave(article.slug)} />)}</div>{totalPages > 1 && <div className="nm-saved-pagination"><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }}>Trước</button><span>Trang {page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1) }}>Sau</button></div>}</>}
    {notice && <p className="nm-form-success" role="status">{notice}</p>}
  </main>
}
