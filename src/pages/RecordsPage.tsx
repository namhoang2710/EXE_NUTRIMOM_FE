import { FileArrowUp, FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { formatDate, todayDate } from '@/core/auth/date'
import { filesApi, pregnancyApi, recordsApi, sha256, uploadContent } from '@/features/maternity/api/domain-api'
import { MedicalRecordAttachments } from '@/features/maternity/components/MedicalRecordAttachments'
import { buildMedicalRecordPayload, createCurrentPregnancyLoader, loadMedicalRecords } from '@/features/maternity/model/records-page-data'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { ActionStateDialog } from '@/shared/components/ActionStateDialog'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { SelectField } from '@/shared/components/SelectField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { SuccessDialog } from '@/shared/components/SuccessDialog'
import { FeaturePage as AppShell } from '@/shared/layouts/FeaturePage'
import type { MedicalRecord, Pregnancy } from '@/types/domain'

const categoryLabels: Record<string, string> = {
  PRENATAL_VISIT: 'Khám thai',
  ULTRASOUND: 'Siêu âm',
  LAB_RESULT: 'Kết quả xét nghiệm',
  PRESCRIPTION: 'Đơn thuốc',
  DISCHARGE: 'Giấy ra viện',
  OTHER: 'Khác',
}
const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))
const filterCategories = [{ value: '', label: 'Tất cả loại hồ sơ' }, ...categories]
const allowedUploadTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const maxUploadBytes = 25 * 1024 * 1024
const editorFormId = 'medical-record-editor-form'

function vietnamDateOnly(value: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function RecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('ULTRASOUND')
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState('')
  const savingRef = useRef(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [dateError, setDateError] = useState('')
  const rangeError = from && to && from > to ? 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc. Hãy chọn lại khoảng ngày.' : ''
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pregnancyResolved, setPregnancyResolved] = useState(false)
  const currentPregnancyLoader = useRef<(() => Promise<Pregnancy | null>) | null>(null)
  const pregnancyId = pregnancy?.id
  if (!currentPregnancyLoader.current) currentPregnancyLoader.current = createCurrentPregnancyLoader(pregnancyApi.current)

  const loadRecords = useCallback(async (activePregnancyId: string, cursor?: string) => {
    if (!cursor) { setLoading(true); setError('') }
    if (from && to && from > to) { setRecords([]); setNextCursor(null); setLoading(false); return }
    try {
      const page = await loadMedicalRecords(recordsApi.list, activePregnancyId, { category: filterCategory, from, to }, cursor)
      setRecords((current) => cursor ? [...current, ...page.items] : page.items)
      setNextCursor(page.next_cursor || null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ y tế.') }
    finally { if (!cursor) setLoading(false) }
  }, [filterCategory, from, to])

  const loadPregnancy = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setPregnancy(await currentPregnancyLoader.current!()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ thai kỳ.') }
    finally { setPregnancyResolved(true) }
  }, [])

  useEffect(() => { void loadPregnancy() }, [loadPregnancy])
  useEffect(() => {
    if (!pregnancyResolved) return
    if (!pregnancyId) { setRecords([]); setNextCursor(null); setLoading(false); return }
    void loadRecords(pregnancyId)
  }, [loadRecords, pregnancyId, pregnancyResolved])

  function resetEditorState() {
    setEditorError('')
    setUploadMessage('')
    setDateError('')
  }

  async function openEditor(record: MedicalRecord | null = null) {
    setError('')
    resetEditorState()
    if (!record) {
      setEditing(null)
      setCategory('ULTRASOUND')
      setOccurredAt('')
      setAttachments([])
      setOpen(true)
      return
    }

    setLoadingDetail(true)
    try {
      const detail = await recordsApi.get(record.id)
      setEditing(detail)
      setCategory(detail.category)
      setOccurredAt(vietnamDateOnly(detail.occurred_at))
      setAttachments(detail.attachments?.map((item) => item.id) || [])
      setOpen(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải chi tiết hồ sơ y tế.') }
    finally { setLoadingDetail(false) }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true); setEditorError(''); setUploadMessage('')
    try {
      if (!allowedUploadTypes.has(file.type)) throw new Error('Chỉ hỗ trợ PDF, JPG, PNG hoặc WEBP.')
      if (file.size > maxUploadBytes) throw new Error('Tệp tải lên không được vượt quá 25 MB.')
      const digest = await sha256(file)
      const session = await filesApi.createSession({ purpose: 'MEDICAL_RECORD', file_name: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size, sha256: digest, pregnancy_id: pregnancy?.id })
      await uploadContent(session, file)
      const complete = await filesApi.complete(session.file_id, { sha256: digest, size_bytes: file.size })
      setAttachments((current) => [...current, complete.id])
      setUploadMessage(`Đã tải ${file.name}.`)
    } catch (reason) { setEditorError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') }
    finally { setUploading(false); event.target.value = '' }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    if (!pregnancy && !editing) { setEditorError('Hãy cập nhật hồ sơ thai kỳ trước khi thêm hồ sơ y tế.'); return }
    if (!occurredAt) { setDateError('Hãy chọn ngày khám trên lịch.'); return }
    if (occurredAt > todayDate()) { setDateError('Ngày khám không thể ở tương lai. Hãy chọn lại.'); return }
    const form = new FormData(event.currentTarget)
    const payload = buildMedicalRecordPayload({ category, title: String(form.get('title')), occurredAt, facilityName: String(form.get('facility_name') || ''), clinicianName: String(form.get('clinician_name') || ''), summary: String(form.get('summary') || ''), note: String(form.get('note') || ''), attachmentIds: attachments })
    savingRef.current = true
    setSaving(true)
    setEditorError('')
    try {
      const wasEditing = Boolean(editing)
      const saved = editing ? await recordsApi.update(editing.id, { ...payload, version: editing.version }) : await recordsApi.create({ ...payload, pregnancy_id: pregnancy?.id })
      setRecords((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      setOpen(false); setEditing(null); setAttachments([])
      setSuccessMessage(wasEditing ? 'Đã cập nhật hồ sơ y tế thành công.' : 'Đã lưu hồ sơ y tế thành công.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setEditorError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu lại.')
        if (pregnancy) void loadRecords(pregnancy.id)
      } else setEditorError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.')
    } finally { savingRef.current = false; setSaving(false) }
  }

  async function remove() {
    if (!pendingDelete) return
    await recordsApi.remove(pendingDelete)
  }

  async function download(fileId: string) {
    try { const response = await filesApi.download(fileId); window.open(response.download_url, '_blank', 'noopener') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') }
  }

  return <AppShell>
    <header className="nm-account-workspace-heading nm-account-workspace-heading-actions"><div><span>Hồ sơ riêng tư</span><h1>Hồ sơ y tế</h1><p>Lưu kết quả khám, siêu âm và tài liệu quan trọng của bạn.</p></div><button className="primary-button" type="button" onClick={() => void openEditor()}><Plus size={20} />Thêm hồ sơ</button></header>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    <section className="record-filters"><SelectField label="Lọc hồ sơ" value={filterCategory} options={filterCategories} onChange={setFilterCategory} /><CalendarDatePicker label="Từ ngày" value={from} onChange={setFrom} allowClear yearsBack={30} error={rangeError || undefined} /><CalendarDatePicker label="Đến ngày" value={to} onChange={setTo} allowClear yearsBack={30} /></section>
    <section className="record-list">{rangeError ? null : loading ? <section className="empty-state"><p>Đang tải hồ sơ y tế...</p></section> : records.map((record) => <article className="app-card record-item" key={record.id}><FileText size={28} weight="duotone" /><div><p className="card-kicker">{categoryLabels[record.category] ?? 'Loại hồ sơ khác'}</p><h2>{record.title}</h2><p>{formatDate(record.occurred_at)} · {record.facility_name || 'Chưa có cơ sở khám'}</p><p>{record.summary}</p><MedicalRecordAttachments recordId={record.id} attachmentCount={record.attachment_count} attachments={record.attachments} onDownload={(fileId) => void download(fileId)} /></div><div className="record-actions"><button className="icon-button" type="button" aria-label="Sửa hồ sơ" onClick={() => void openEditor(record)} disabled={loadingDetail}><PencilSimple size={20} /></button><button className="icon-danger" type="button" aria-label="Xóa hồ sơ" onClick={() => setPendingDelete(record.id)} disabled={loadingDetail}><Trash size={20} /></button></div></article>)}{!rangeError && !loading && records.length === 0 && <section className="empty-state"><FileText size={40} /><h2>Chưa có hồ sơ y tế</h2><p>Thêm lần khám hoặc kết quả siêu âm đầu tiên của bạn.</p></section>}</section>
    {nextCursor && pregnancy && <button className="secondary-button load-more" type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); void loadRecords(pregnancy.id, nextCursor).finally(() => setLoadingMore(false)) }}>{loadingMore ? 'Đang tải...' : 'Tải thêm hồ sơ'}</button>}

    <AccessibleDialog
      open={open}
      title={editing ? 'Cập nhật hồ sơ y tế' : 'Thêm hồ sơ y tế'}
      description="Thông tin được lưu riêng tư trong tài khoản của bạn."
      onClose={() => setOpen(false)}
      busy={saving || uploading}
      className="medical-record-editor"
      footer={<><button className="secondary-button" type="button" disabled={saving || uploading} onClick={() => setOpen(false)}>Đóng</button><button className="primary-button" type="submit" form={editorFormId} disabled={saving || uploading}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></>}
    >
      <form id={editorFormId} key={editing?.id || 'new'} className="compact-form medical-record-form" onSubmit={submit}>
        <SelectField label="Loại hồ sơ" value={category} options={categories} onChange={setCategory} />
        <label>Tiêu đề<input name="title" required defaultValue={editing?.title || ''} placeholder="Ví dụ: Siêu âm tuần 24" /></label>
        <CalendarDatePicker label="Ngày khám" value={occurredAt} onChange={(value) => { setOccurredAt(value); setDateError('') }} error={dateError} yearsBack={30} />
        <label>Cơ sở khám<input name="facility_name" defaultValue={editing?.facility_name || ''} /></label>
        <label>Bác sĩ / chuyên viên<input name="clinician_name" defaultValue={editing?.clinician_name || ''} /></label>
        <label>Tóm tắt<textarea name="summary" defaultValue={editing?.summary || ''} /></label>
        <label>Ghi chú riêng<textarea name="note" defaultValue={editing?.note || ''} /></label>
        {editing && <><span className="field-label">Tệp đính kèm hiện có</span><MedicalRecordAttachments recordId={editing.id} attachmentCount={editing.attachment_count} attachments={editing.attachments} onDownload={(fileId) => void download(fileId)} /></>}
        <label className="file-upload"><FileArrowUp size={20} /><span>{uploading ? 'Đang tải tệp...' : `Đính kèm tệp${attachments.length ? ` (${attachments.length})` : ''}`}</span><input type="file" onChange={upload} disabled={uploading || saving} /></label>
        {uploadMessage && <p className="nm-upload-success" role="status">{uploadMessage}</p>}
        {editorError && <p className="nm-dialog-error" role="alert">{editorError}</p>}
      </form>
    </AccessibleDialog>

    <SuccessDialog open={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage('')} />
    <ActionStateDialog
      open={Boolean(pendingDelete)}
      danger
      title="Xóa hồ sơ y tế?"
      description="Hồ sơ sẽ được xóa mềm và ghi audit. Bạn có chắc muốn tiếp tục?"
      confirmLabel="Xóa hồ sơ"
      cancelLabel="Giữ hồ sơ"
      busyLabel="Đang xóa hồ sơ..."
      successMessage="Đã xóa hồ sơ y tế thành công."
      onAction={remove}
      onCompleted={() => { if (pendingDelete) setRecords((current) => current.filter((record) => record.id !== pendingDelete)) }}
      onClose={() => setPendingDelete(null)}
      errorMessage={(reason) => reason instanceof Error ? reason.message : 'Không thể xóa hồ sơ.'}
    />
  </AppShell>
}
