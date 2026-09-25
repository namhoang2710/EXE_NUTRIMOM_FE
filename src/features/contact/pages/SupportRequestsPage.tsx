import { Headset, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { contactApi } from '../api/contact-api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ContactStatusBadge } from '../components/ContactStatusBadge'
import type { ContactPageDto, ContactRequestDto, ContactTopic } from '../model/contact-dto'
import { contactErrorMessage, isContactLimitReached, isInvalidContactState } from '../model/contact-errors'
import { formatVietnamDateTime } from '../model/contact-format'
import { contactTopicLabel, contactTopicOptions } from '../model/contact-labels'
import { USER_CONTACT_PAGE_SIZE, clampContactPage } from '../model/contact-query'
import { CONTACT_MESSAGE_MAX, validateContactForm } from '../model/contact-validation'
import '../styles/contact.css'

const SUCCESS_MESSAGE = 'Đã gửi yêu cầu. Admin sẽ gọi điện cho bạn qua số điện thoại tài khoản.'
const emptyDraft = { topic: '' as ContactTopic | '', message: '' }

export function SupportRequestsPage() {
  const [draft, setDraft] = useState(emptyDraft)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [limitReached, setLimitReached] = useState(false)
  const [sending, setSending] = useState(false)

  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<ContactPageDto<ContactRequestDto> | null>(null)
  const [listState, setListState] = useState<'loading' | 'success' | 'error'>('loading')
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [cancelTarget, setCancelTarget] = useState<ContactRequestDto | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setListState('loading')
    contactApi.list({ page, pageSize: USER_CONTACT_PAGE_SIZE }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        // Backend trả lại đúng trang được hỏi, nên trang cuối vừa trống đi phải tự lùi.
        const target = clampContactPage(result)
        if (target !== page) { setPage(target); return }
        setHistory(result)
        setListError('')
        setListState('success')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setListError(contactErrorMessage(reason, 'Không thể tải lịch sử yêu cầu hỗ trợ.'))
        setListState('error')
      })
    return () => controller.abort()
  }, [page, reloadKey])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateContactForm(draft.topic, draft.message)
    setFieldErrors(errors)
    setFormError('')
    setSuccess('')
    if (Object.keys(errors).length > 0) return

    setSending(true)
    try {
      await contactApi.create({ topic: draft.topic as ContactTopic, message: draft.message.trim() })
      setDraft(emptyDraft)
      setLimitReached(false)
      setSuccess(SUCCESS_MESSAGE)
      // Danh sách sắp xếp mới nhất trước nên yêu cầu vừa tạo luôn nằm ở trang 1.
      if (page === 1) setReloadKey((value) => value + 1); else setPage(1)
    } catch (reason) {
      if (isContactLimitReached(reason)) {
        // Giữ nguyên nội dung đang soạn để user hủy bớt rồi gửi lại mà không phải gõ lại.
        setLimitReached(true)
        setFormError(reason.message)
      } else if (reason instanceof ApiClientError && Object.keys(reason.fields).length > 0) {
        setFieldErrors(reason.fields)
        setFormError(reason.message)
      } else {
        setFormError(contactErrorMessage(reason, 'Không thể gửi yêu cầu hỗ trợ.'))
      }
    } finally {
      setSending(false)
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelBusy(true)
    setCancelError('')
    try {
      await contactApi.cancel(cancelTarget.id)
      setCancelTarget(null)
      setLimitReached(false)
      setReloadKey((value) => value + 1)
    } catch (reason) {
      if (isInvalidContactState(reason)) {
        setCancelTarget(null)
        setListError('')
        setFormError('Yêu cầu này không còn ở trạng thái chờ. Danh sách đã được tải lại.')
        setReloadKey((value) => value + 1)
      } else {
        setCancelError(contactErrorMessage(reason, 'Không thể hủy yêu cầu.'))
      }
    } finally {
      setCancelBusy(false)
    }
  }

  const totalPages = Math.max(1, history?.total_pages ?? 1)
  const counterId = 'nm-contact-message-counter'

  return <main className="nm-account-workspace-page">
    <header className="nm-account-workspace-heading">
      <span>Hỗ trợ khách hàng</span>
      <h1>Hỗ trợ / Liên hệ</h1>
      <p>Gửi thắc mắc về chính sách, cách dùng ứng dụng hoặc tài khoản. Admin sẽ gọi điện cho bạn để giải đáp.</p>
    </header>

    <form className="nm-account-form nm-contact-form" onSubmit={(event) => void submit(event)} noValidate>
      <section>
        <h2>Gửi thắc mắc mới</h2>
        {limitReached && <p className="nm-contact-limit" role="status"><WarningCircle size={20} weight="fill" aria-hidden="true" />Bạn đang có 3 yêu cầu chờ xử lý. Hãy chờ admin liên hệ hoặc hủy bớt một yêu cầu bên dưới trước khi gửi thêm.</p>}

        <label htmlFor="nm-contact-topic">Chủ đề</label>
        <select
          id="nm-contact-topic"
          value={draft.topic}
          disabled={sending}
          aria-invalid={Boolean(fieldErrors.topic)}
          aria-describedby={fieldErrors.topic ? 'nm-contact-topic-error' : undefined}
          onChange={(event) => setDraft({ ...draft, topic: event.target.value as ContactTopic | '' })}
        >
          <option value="">Chọn chủ đề thắc mắc</option>
          {contactTopicOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {fieldErrors.topic && <p className="nm-form-error" id="nm-contact-topic-error" role="alert">{fieldErrors.topic}</p>}

        <label htmlFor="nm-contact-message">Nội dung thắc mắc</label>
        <textarea
          id="nm-contact-message"
          rows={7}
          value={draft.message}
          maxLength={CONTACT_MESSAGE_MAX}
          disabled={sending}
          placeholder="Mô tả thắc mắc của bạn càng rõ càng tốt để admin chuẩn bị trước khi gọi."
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? `nm-contact-message-error ${counterId}` : counterId}
          onChange={(event) => setDraft({ ...draft, message: event.target.value })}
        />
        {/* Cố tình không dùng aria-live: bộ đếm đọc lại sau mỗi phím gõ là không dùng được. */}
        <p className={`nm-contact-counter${draft.message.length > CONTACT_MESSAGE_MAX - 100 ? ' is-near-limit' : ''}`} id={counterId}>
          {draft.message.length}/{CONTACT_MESSAGE_MAX} ký tự
        </p>
        {fieldErrors.message && <p className="nm-form-error" id="nm-contact-message-error" role="alert">{fieldErrors.message}</p>}
      </section>

      {formError && <p className="nm-form-error" role="alert">{formError}</p>}
      {success && <p className="nm-form-success" role="status">{success}</p>}
      <div className="nm-form-actions">
        <button className="nm-primary-action" type="submit" disabled={sending}>
          <PaperPlaneTilt size={18} aria-hidden="true" />{sending ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </div>
    </form>

    <section className="nm-contact-history" aria-label="Lịch sử yêu cầu hỗ trợ">
      <h2>Yêu cầu đã gửi</h2>
      {listState === 'loading' ? <div className="nm-account-state-card" role="status">Đang tải lịch sử yêu cầu...</div>
        : listState === 'error' ? <div className="nm-account-state-card"><h3>Chưa thể tải lịch sử</h3><p role="alert">{listError}</p><button className="nm-secondary-action" type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></div>
          : history && history.items.length > 0 ? <>
            <ul className="nm-contact-list">
              {history.items.map((request) => <li key={request.id} className="nm-contact-item">
                <div className="nm-contact-item-top">
                  <div>
                    <strong>{contactTopicLabel(request.topic)}</strong>
                    <time dateTime={request.created_at}>Gửi lúc {formatVietnamDateTime(request.created_at)}</time>
                  </div>
                  <ContactStatusBadge value={request.status} />
                </div>
                <p className="nm-contact-item-message">{request.message}</p>
                <div className="nm-contact-item-foot">
                  {request.status === 'COMPLETED' && request.completed_at && <span>Hoàn tất lúc {formatVietnamDateTime(request.completed_at)}</span>}
                  {request.status === 'CANCELLED' && request.cancelled_at && <span>Đã hủy lúc {formatVietnamDateTime(request.cancelled_at)}</span>}
                  {request.status === 'PENDING' && <button className="nm-secondary-action" type="button" onClick={() => { setCancelTarget(request); setCancelError('') }}>Hủy yêu cầu</button>}
                </div>
              </li>)}
            </ul>
            {totalPages > 1 && <div className="nm-saved-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Sau</button>
            </div>}
          </>
            : <div className="nm-account-state-card"><Headset size={36} weight="duotone" aria-hidden="true" /><h3>Chưa có yêu cầu nào</h3><p>Khi bạn gửi thắc mắc, yêu cầu sẽ xuất hiện tại đây để theo dõi tình trạng xử lý.</p></div>}
    </section>

    {cancelTarget && <ConfirmDialog
      variant="user"
      danger
      title="Hủy yêu cầu hỗ trợ?"
      description={`Yêu cầu về "${contactTopicLabel(cancelTarget.topic)}" sẽ bị hủy và bộ phận hỗ trợ sẽ không liên hệ với bạn nữa. Bạn có thể gửi yêu cầu mới bất cứ lúc nào.`}
      confirmLabel="Hủy yêu cầu"
      cancelLabel="Giữ yêu cầu"
      busy={cancelBusy}
      error={cancelError}
      onConfirm={() => void confirmCancel()}
      onCancel={() => setCancelTarget(null)}
    />}
  </main>
}
