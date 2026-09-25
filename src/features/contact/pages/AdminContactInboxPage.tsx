import { CaretRight } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeading, ResourceState, TableCard, TablePagination } from '@/features/admin/components/AdminUI'
import { LibrarySelect } from '@/features/knowledge/components/LibrarySelect'
import { contactAdminApi } from '../api/contact-api'
import { ContactStatusBadge } from '../components/ContactStatusBadge'
import type { AdminContactSummaryDto, ContactPageDto } from '../model/contact-dto'
import { contactErrorMessage } from '../model/contact-errors'
import { formatVietnamDateTime } from '../model/contact-format'
import { contactStatusOptions, contactTopicLabel, contactTopicOptions } from '../model/contact-labels'
import {
  ADMIN_CONTACT_PAGE_SIZE,
  ADMIN_CONTACT_PAGE_SIZES,
  ADMIN_STATUS_ALL,
  clampContactPage,
  hasAdminContactFilters,
  readAdminContactQuery,
  toAdminListQuery,
} from '../model/contact-query'
import { useDebouncedValue } from '../model/use-debounced-value'
import '../styles/contact-admin.css'

const emptyPage: ContactPageDto<AdminContactSummaryDto> = { items: [], page: 1, page_size: ADMIN_CONTACT_PAGE_SIZE, total_items: 0, total_pages: 0 }

export function AdminContactInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()
  const filters = useMemo(() => readAdminContactQuery(search), [search])

  const [page, setPage] = useState(emptyPage)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [openFilter, setOpenFilter] = useState<'status' | 'topic' | null>(null)
  const [keyword, setKeyword] = useState(filters.q ?? '')
  const debouncedKeyword = useDebouncedValue(keyword)

  const setParameter = useCallback((name: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value); else next.delete(name)
      if (name !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Đồng bộ ô tìm kiếm khi URL đổi từ bên ngoài (back/forward, xoá bộ lọc).
  useEffect(() => setKeyword(filters.q ?? ''), [filters.q])

  useEffect(() => {
    const trimmed = debouncedKeyword.trim()
    if (trimmed === (filters.q ?? '')) return
    setParameter('q', trimmed)
  }, [debouncedKeyword, filters.q, setParameter])

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    setError(null)
    contactAdminApi.list(toAdminListQuery(filters), controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        // Backend echo lại đúng trang được hỏi nên trang vượt quá phải tự lùi về trang cuối.
        const target = clampContactPage(result)
        if (target !== filters.page) { setParameter('page', target > 1 ? String(target) : ''); return }
        setPage(result)
        setState('success')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(contactErrorMessage(reason, 'Không thể tải hộp thư hỗ trợ.'))
        setState('error')
      })
    return () => controller.abort()
  }, [filters, reload, setParameter])

  function resetFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const name of ['status', 'topic', 'q', 'page']) next.delete(name)
      return next
    }, { replace: true })
  }


  return <div className="admin-page admin-contact-page">
    <PageHeading
      eyebrow="Hỗ trợ khách hàng"
      title="Hộp thư hỗ trợ"
      description="Thắc mắc của người dùng. Mở chi tiết để lấy số điện thoại, gọi điện giải đáp rồi đánh dấu hoàn tất."
    />

    <section className="admin-card admin-filters admin-contact-filters" aria-label="Bộ lọc hộp thư hỗ trợ">
      <LibrarySelect
        label="Trạng thái"
        placeholder="Tất cả trạng thái"
        options={contactStatusOptions}
        value={filters.statusFilter === ADMIN_STATUS_ALL ? '' : filters.statusFilter}
        open={openFilter === 'status'}
        onOpenChange={(open) => setOpenFilter(open ? 'status' : null)}
        onChange={(value) => setParameter('status', value)}
      />
      <LibrarySelect
        label="Chủ đề"
        placeholder="Tất cả chủ đề"
        options={contactTopicOptions}
        value={filters.topic ?? ''}
        open={openFilter === 'topic'}
        onOpenChange={(open) => setOpenFilter(open ? 'topic' : null)}
        onChange={(value) => setParameter('topic', value)}
      />
      <label htmlFor="admin-contact-search">
        <span>Tìm theo tên hoặc số điện thoại</span>
        {/* Không bọc form/nút submit: ô này tự lọc sau 350ms ngừng gõ. */}
        <input
          id="admin-contact-search"
          type="search"
          maxLength={100}
          value={keyword}
          placeholder="Ví dụ: Lan hoặc 0913000021"
          onChange={(event) => setKeyword(event.target.value)}
        />
      </label>
      <button className="admin-text-button" type="button" disabled={!hasAdminContactFilters(filters)} onClick={resetFilters}>Xóa bộ lọc</button>
    </section>

    <TableCard
      title="Yêu cầu hỗ trợ"
      description="Mới nhất trước. Số lượng và trang hiển thị ở chân bảng."
    >
      <ResourceState status={state} empty={page.items.length === 0} error={error} onRetry={() => setReload((value) => value + 1)}>
        <div className="admin-table-scroll">
          <table className="admin-table admin-contact-table">
            <thead><tr><th>Thời gian gửi</th><th>Người gửi</th><th>Số điện thoại</th><th>Chủ đề</th><th>Nội dung</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead>
            <tbody>
              {page.items.map((request) => <tr key={request.id}>
                <td><span className="admin-table-primary">{formatVietnamDateTime(request.created_at)}</span></td>
                <td><strong className="admin-table-primary">{request.user_display_name}</strong></td>
                <td>{request.user_phone}</td>
                <td>{contactTopicLabel(request.topic)}</td>
                <td><span className="admin-contact-preview">{request.message_preview}</span></td>
                <td><ContactStatusBadge value={request.status} variant="admin" /></td>
                <td>
                  <Link
                    className="admin-row-action"
                    to={`/admin/support/${request.id}`}
                    state={{ inboxSearch: search }}
                    aria-label={`Xem yêu cầu của ${request.user_display_name}`}
                  >
                    <CaretRight size={17} />
                  </Link>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page.page}
          pageSize={page.page_size}
          totalItems={page.total_items}
          totalPages={page.total_pages}
          pageSizes={ADMIN_CONTACT_PAGE_SIZES}
          busy={state === 'loading'}
          itemNoun="yêu cầu"
          onPageChange={(next) => setParameter('page', next > 1 ? String(next) : '')}
          onPageSizeChange={(next) => setParameter('pageSize', next === ADMIN_CONTACT_PAGE_SIZE ? '' : String(next))}
        />
      </ResourceState>
    </TableCard>
  </div>
}
