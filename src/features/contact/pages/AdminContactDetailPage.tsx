import { ArrowLeft, CheckCircle, PhoneCall, Tray } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageHeading, ResourceState } from '@/features/admin/components/AdminUI'
import { contactAdminApi } from '../api/contact-api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ContactStatusBadge } from '../components/ContactStatusBadge'
import type { AdminContactDetailDto } from '../model/contact-dto'
import { contactErrorMessage, isContactNotFound, isInvalidContactState } from '../model/contact-errors'
import { formatPlainDate, formatVietnamDateTime } from '../model/contact-format'
import { contactGenderLabel, contactTopicLabel } from '../model/contact-labels'
import '../styles/contact-admin.css'

export function AdminContactDetailPage() {
  const { requestId = '' } = useParams()
  const location = useLocation()
  const inboxSearch = (location.state as { inboxSearch?: string } | null)?.inboxSearch ?? ''

  const [detail, setDetail] = useState<AdminContactDetailDto | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reload, setReload] = useState(0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [completeBusy, setCompleteBusy] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    setError(null)
    setNotFound(false)
    contactAdminApi.get(requestId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setDetail(result)
        setState('success')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        if (isContactNotFound(reason)) setNotFound(true)
        setError(contactErrorMessage(reason, 'Không thể tải chi tiết yêu cầu hỗ trợ.'))
        setState('error')
      })
    return () => controller.abort()
  }, [requestId, reload])

  async function confirmComplete() {
    setCompleteBusy(true)
    setCompleteError('')
    try {
      // `complete` trả về bản chi tiết mới nên cập nhật tại chỗ, không cần tải lại.
      const updated = await contactAdminApi.complete(requestId)
      setDetail(updated)
      setConfirmOpen(false)
      setNotice('Đã đánh dấu yêu cầu là hoàn tất.')
    } catch (reason) {
      if (isInvalidContactState(reason)) {
        setConfirmOpen(false)
        setNotice('Yêu cầu này đã được hủy hoặc hoàn tất ở nơi khác. Đang tải lại thông tin mới nhất.')
        setReload((value) => value + 1)
      } else {
        setCompleteError(contactErrorMessage(reason, 'Không thể đánh dấu hoàn tất.'))
      }
    } finally {
      setCompleteBusy(false)
    }
  }

  const backTo = { pathname: '/admin/support', search: inboxSearch ? `?${inboxSearch}` : '' }

  if (notFound) {
    return <div className="admin-page admin-contact-detail-page">
      <PageHeading eyebrow="Hỗ trợ khách hàng" title="Chi tiết yêu cầu" description="Yêu cầu này không còn khả dụng." />
      <section className="admin-card">
        <div className="admin-state">
          <span className="admin-state-icon"><Tray size={25} /></span>
          <h3>Không tìm thấy yêu cầu</h3>
          <p>Yêu cầu hỗ trợ này không tồn tại hoặc đã bị xoá khỏi hệ thống.</p>
          <Link className="admin-button secondary" to={backTo}><ArrowLeft size={17} />Quay lại hộp thư</Link>
        </div>
      </section>
    </div>
  }

  return <div className="admin-page admin-contact-detail-page">
    <PageHeading
      eyebrow="Hỗ trợ khách hàng"
      title="Chi tiết yêu cầu"
      description="Gọi điện cho người dùng theo số bên dưới, sau đó đánh dấu yêu cầu là đã hoàn tất."
      actions={<Link className="admin-button secondary" to={backTo}><ArrowLeft size={17} />Quay lại hộp thư</Link>}
    />

    <ResourceState status={state} empty={false} error={error} onRetry={() => setReload((value) => value + 1)}>
      {detail && <>
        {notice && <p className="admin-contact-notice" role="status">{notice}</p>}

        <div className="admin-contact-detail-grid">
          <section className="admin-card admin-contact-panel">
            <div className="admin-card-heading">
              <div>
                <h2>Nội dung thắc mắc</h2>
                <p>{contactTopicLabel(detail.topic)} · Gửi lúc {formatVietnamDateTime(detail.created_at)}</p>
              </div>
              <ContactStatusBadge value={detail.status} variant="admin" />
            </div>
            <p className="admin-contact-message">{detail.message}</p>
            <dl className="admin-contact-meta">
              {detail.completed_at && <><dt>Hoàn tất lúc</dt><dd>{formatVietnamDateTime(detail.completed_at)}</dd></>}
              {detail.cancelled_at && <><dt>Đã hủy lúc</dt><dd>{formatVietnamDateTime(detail.cancelled_at)}</dd></>}
            </dl>
            {detail.status === 'PENDING' && <div className="admin-contact-actions">
              <button className="admin-button primary" type="button" onClick={() => { setConfirmOpen(true); setCompleteError('') }}>
                <CheckCircle size={18} />Đánh dấu đã hoàn tất
              </button>
            </div>}
          </section>

          <section className="admin-card admin-contact-panel">
            <div className="admin-card-heading"><div><h2>Thông tin liên hệ</h2><p>Dùng để gọi điện giải đáp trực tiếp.</p></div></div>
            <dl className="admin-contact-meta">
              <dt>Họ tên</dt><dd>{detail.user.display_name}</dd>
              <dt>Số điện thoại</dt><dd><a className="admin-contact-phone" href={`tel:${detail.user.phone.replace(/[^\d+]/g, '')}`}><PhoneCall size={17} weight="duotone" aria-hidden="true" />{detail.user.phone}</a></dd>
              <dt>Email</dt><dd>{detail.user.email || '—'}</dd>
              <dt>Giới tính</dt><dd>{contactGenderLabel(detail.user.gender)}</dd>
              <dt>Ngày sinh</dt><dd>{formatPlainDate(detail.user.date_of_birth)}</dd>
            </dl>
          </section>
        </div>
      </>}
    </ResourceState>

    {confirmOpen && detail && <ConfirmDialog
      title="Đánh dấu đã hoàn tất?"
      description={`Xác nhận bạn đã gọi điện và giải đáp thắc mắc của ${detail.user.display_name}. Thao tác này không thể hoàn tác.`}
      confirmLabel="Đã hoàn tất"
      cancelLabel="Hủy"
      busy={completeBusy}
      error={completeError}
      onConfirm={() => void confirmComplete()}
      onCancel={() => setConfirmOpen(false)}
    />}
  </div>
}
