import { BookmarkSimple, BookOpenText, ChatsCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { communityApi } from '@/features/community/api/community-api'
import { friendlyError, isAbort } from '@/features/community/model/community-errors'
import { relativeTime } from '@/features/community/model/community-time'
import type { SavedItem } from '@/features/community/model/community-types'
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api'
import '@/features/community/styles/community.css'

type SavedTab = 'ALL' | 'KNOWLEDGE' | 'COMMUNITY'
const PAGE_SIZE = 12
const tabs: Array<{ value: SavedTab; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'KNOWLEDGE', label: 'Kiến thức' },
  { value: 'COMMUNITY', label: 'Cộng đồng' },
]

/** Bài Knowledge mở đúng trang bài; bài Cộng đồng mở trang Cộng đồng và highlight đúng bài. */
function destination(item: SavedItem) {
  return item.type === 'KNOWLEDGE'
    ? `/app/knowledge/${encodeURIComponent(item.slug ?? '')}`
    : `/app/community?post=${encodeURIComponent(item.id)}`
}

export function SavedArticlesPage() {
  const [tab, setTab] = useState<SavedTab>('ALL')
  const [items, setItems] = useState<SavedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const unsavingRef = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string | null) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    try {
      const page = await communityApi.savedItems(tab, from, PAGE_SIZE, controller.signal)
      setItems((current) => (from ? [...current, ...page.items] : page.items))
      setCursor(page.next_cursor ?? null)
      setHasMore(page.has_more)
      setError('')
    } catch (reason) {
      if (!isAbort(reason)) setError(friendlyError(reason).message)
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load(null)
    return () => controllerRef.current?.abort()
  }, [load, reloadKey])

  async function unsave(item: SavedItem) {
    if (unsavingRef.current) return
    unsavingRef.current = true
    setBusyId(item.id)
    try {
      if (item.type === 'KNOWLEDGE' && item.slug) await knowledgeApi.removeBookmark(item.slug)
      else await communityApi.save(item.id, false)
      setItems((current) => current.filter((entry) => !(entry.type === item.type && entry.id === item.id)))
      setNotice('Đã bỏ lưu.')
    } catch (reason) {
      setNotice(friendlyError(reason).message)
    } finally {
      unsavingRef.current = false
      setBusyId(null)
    }
  }

  return <main className="nm-account-workspace-page"><header className="nm-account-workspace-heading"><span>Thư viện của bạn</span><h1>Đã lưu</h1><p>Bài viết kiến thức và bài cộng đồng bạn muốn đọc lại, ở cùng một nơi.</p></header>
    <div className="nm-community-tabs nm-saved-tabs" role="tablist" aria-label="Loại bài đã lưu">
      {tabs.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={tab === item.value ? 'is-active' : ''} onClick={() => setTab(item.value)}>{item.label}</button>)}
    </div>
    {loading && items.length === 0 ? <div className="nm-account-state-card" role="status">Đang tải bài đã lưu...</div>
      : error && items.length === 0 ? <section className="nm-account-state-card"><h2>Chưa thể tải bài đã lưu</h2><p role="alert">{error}</p><button className="nm-secondary-action" type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></section>
        : items.length === 0 ? <section className="nm-account-state-card"><BookmarkSimple size={36} weight="duotone" aria-hidden="true" /><h2>Chưa có bài viết đã lưu</h2><p>Lưu bài ở thư viện Kiến thức hoặc trong Cộng đồng để tìm lại nhanh hơn.</p><div className="nm-saved-empty-actions"><Link className="nm-primary-action" to="/app/knowledge">Khám phá kiến thức</Link><Link className="nm-secondary-action" to="/app/community">Vào cộng đồng</Link></div></section>
          : <ul className="nm-saved-list">
            {items.map((item) => <li key={`${item.type}-${item.id}`} className="nm-saved-item">
              <Link to={destination(item)} className="nm-saved-item__link">
                {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" loading="lazy" decoding="async" width={96} height={72} /> : <span className="nm-saved-item__icon" aria-hidden="true">{item.type === 'KNOWLEDGE' ? <BookOpenText size={26} /> : <ChatsCircle size={26} />}</span>}
                <span className="nm-saved-item__body">
                  <span className="nm-community-tag">{item.type === 'KNOWLEDGE' ? 'Kiến thức' : 'Cộng đồng'}</span>
                  <strong>{item.title || item.excerpt || 'Bài viết'}</strong>
                  {item.title && item.excerpt && <span className="nm-saved-item__excerpt">{item.excerpt}</span>}
                  <small>Đã lưu {relativeTime(item.saved_at)}</small>
                </span>
              </Link>
              <button type="button" className="nm-community-icon-button" aria-label="Bỏ lưu" disabled={busyId === item.id} onClick={() => void unsave(item)}><BookmarkSimple size={20} weight="fill" /></button>
            </li>)}
          </ul>}
    {error && items.length > 0 && <p className="nm-form-error" role="alert">{error}</p>}
    {hasMore && <button type="button" className="nm-secondary-action nm-saved-more" disabled={loading} onClick={() => void load(cursor)}>{loading ? 'Đang tải…' : 'Xem thêm'}</button>}
    {notice && <p className="nm-form-note" role="status">{notice}</p>}
  </main>
}
