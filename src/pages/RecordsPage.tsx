import { LockKey } from '@phosphor-icons/react'
import { useFeatureAccess } from '@/features/payment/hooks/useFeatureAccess'
import { getSessionScope } from '@/core/auth/token-store'
import { invalidateProfileResources } from '@/core/api/profile-requests'
import { createFileUpload, type UploadStage } from '@/features/maternity/model/file-upload'
import { createRequestSequence, createPageLoadGate, mergeUniqueRecords } from '@/features/maternity/model/records-coordination'
import { CalendarPlus, FileArrowUp, FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { formatDate, todayDate } from '@/core/auth/date'
import { filesApi, pregnancyApi, recordsApi, sha256, uploadContent } from '@/features/maternity/api/domain-api'
import { MedicalRecordAttachments } from '@/features/maternity/components/MedicalRecordAttachments'
import { MedicalRecordReminderDialog } from '@/features/calendar/components/MedicalRecordReminderDialog'
import { GlobalActionToast, type CalendarToastMessage } from '@/features/calendar/components/CalendarToast'
import { buildMedicalRecordPayload, createCurrentPregnancyLoader, loadMedicalRecords } from '@/features/maternity/model/records-page-data'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { ActionStateDialog } from '@/shared/components/ActionStateDialog'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { SelectField } from '@/shared/components/SelectField'
import { StatusMessage } from '@/shared/components/StatusMessage'
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
const editorFormId = 'medical-record-editor-form'
const deletedMessage = 'Đã xóa hồ sơ y tế.'

function vietnamDateOnly(value: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function RecordsPage() {
  const reminderAccess = useFeatureAccess('CALENDAR_REMINDERS')
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedRecordId = searchParams.get('record')?.trim() || ''
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('ULTRASOUND')
  const [attachments, setAttachments] = useState<string[]>([])
  const uploadAttempt = useRef<ReturnType<typeof createFileUpload> | null>(null)
  const uploadController = useRef<AbortController | null>(null)
  const uploadBusy = useRef(false)
  const editorGeneration = useRef(0)
  const listSequence = useRef(createRequestSequence())
  const moreInFlight = useRef(createPageLoadGate())
  const loadedPages = useRef(1)
  const mounted = useRef(false)
  const [uploadStage, setUploadStage] = useState<UploadStage | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [editorConflict, setEditorConflict] = useState(false)
  const savingRef = useRef(false)
  const [actionToast, setActionToast] = useState<CalendarToastMessage>()
  const actionToastId = useRef(0)
  const dismissToast = useCallback(() => setActionToast(undefined), [])
  const notify = useCallback((message: string) => {
    actionToastId.current += 1
    setActionToast({ id: actionToastId.current, message, tone: 'success' })
  }, [])
  const [filterCategory, setFilterCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filterKey = JSON.stringify([filterCategory, from, to])
  const currentFilter = useRef(filterKey)
  currentFilter.current = filterKey
  const [occurredAt, setOccurredAt] = useState('')
  const [dateError, setDateError] = useState('')
  const rangeError = from && to && from > to ? 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc. Hãy chọn lại khoảng ngày.' : ''
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [reminderRecordId, setReminderRecordId] = useState<string>()
  const [reminderRecords, setReminderRecords] = useState<MedicalRecord[]>([])
  const [reminderOpen, setReminderOpen] = useState(false)
  const [pregnancyResolved, setPregnancyResolved] = useState(false)
  const currentPregnancyLoader = useRef<(() => Promise<Pregnancy | null>) | null>(null)
  const pregnancyId = pregnancy?.id
  if (!currentPregnancyLoader.current) currentPregnancyLoader.current = createCurrentPregnancyLoader(pregnancyApi.current)

  const loadRecords = useCallback(async (activePregnancyId: string, cursor?: string) => {
    if (filterKey !== currentFilter.current) return
    const sequence = listSequence.current
    const generation = cursor ? sequence.current() : sequence.begin()
    if (cursor && !moreInFlight.current.start(generation, cursor)) return
    if (cursor) { setLoadingMore(true) }
    else { setLoading(true); setError(''); setNextCursor(null) }
    const accepts = () => mounted.current && sequence.accepts(generation) && filterKey === currentFilter.current
    if (from && to && from > to) { setRecords([]); setNextCursor(null); setLoading(false); return }
    try {
      let page = await loadMedicalRecords(recordsApi.list, activePregnancyId, { category: filterCategory, from, to }, cursor)
      let items = page.items
      // Reload only this filtered list after CRUD, preserving its loaded pagination depth.
      if (!cursor) {
        for (let index = 1; index < loadedPages.current && page.next_cursor; index += 1) {
          if (!accepts()) return
          page = await loadMedicalRecords(recordsApi.list, activePregnancyId, { category: filterCategory, from, to }, page.next_cursor)
          items = mergeUniqueRecords(items, page.items)
        }
      }
      if (!accepts()) return
      setRecords((current) => cursor ? mergeUniqueRecords(current, items) : items)
      setNextCursor(page.next_cursor || null)
      if (cursor) loadedPages.current += 1
    } catch (reason) { if (accepts()) setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ y tế.') }
    finally {
      if (cursor) moreInFlight.current.finish(generation, cursor)
      if (accepts()) { setLoading(false); setLoadingMore(false) }
    }
  }, [filterCategory, filterKey, from, to])

  const loadPregnancy = useCallback(async () => {
    setLoading(true)
    setError('')
    const scope = getSessionScope()
    try { const current = await currentPregnancyLoader.current!(); if (mounted.current && scope === getSessionScope()) setPregnancy(current) }
    catch (reason) { if (mounted.current && scope === getSessionScope()) setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ thai kỳ.') }
    finally { if (mounted.current && scope === getSessionScope()) { setPregnancyResolved(true); setLoading(false) } }
  }, [])

  useEffect(() => {
    const sequence = listSequence.current
    const controllerRef = uploadController
    mounted.current = true
    void loadPregnancy()
    return () => { mounted.current = false; editorGeneration.current += 1; sequence.invalidate(); controllerRef.current?.abort() }
  }, [loadPregnancy])
  useEffect(() => {
    const sequence = listSequence.current
    loadedPages.current = 1
    moreInFlight.current.clear()
    setLoadingMore(false); setRecords([]); setNextCursor(null)
    if (!pregnancyResolved) return
    if (!pregnancyId) { setRecords([]); setNextCursor(null); setLoading(false); return }
    void loadRecords(pregnancyId)
    return () => sequence.invalidate()
  }, [loadRecords, pregnancyId, pregnancyResolved])

  useEffect(() => {
    if (!focusedRecordId) return
    const controller = new AbortController()
    const generation = ++editorGeneration.current
    resetEditorState()
    setLoadingDetail(true); setError('')
    void recordsApi.get(focusedRecordId, controller.signal).then((detail) => {
      if (controller.signal.aborted || generation !== editorGeneration.current) return
      setEditing(detail)
      setCategory(detail.category)
      setOccurredAt(vietnamDateOnly(detail.occurred_at))
      setAttachments(detail.attachments?.map((item) => item.id) || [])
      setOpen(true)
    }).catch(() => {
      if (!controller.signal.aborted && generation === editorGeneration.current) setError('Không thể mở hồ sơ y tế này. Nội dung có thể không còn tồn tại hoặc bạn không có quyền xem.')
    }).finally(() => { if (!controller.signal.aborted && generation === editorGeneration.current) setLoadingDetail(false) })
    return () => controller.abort()
  }, [focusedRecordId])

  function closeEditor() {
    if (savingRef.current || uploadBusy.current) return
    editorGeneration.current += 1
    uploadController.current?.abort()
    uploadAttempt.current = null
    setOpen(false)
    if (!focusedRecordId) return
    const next = new URLSearchParams(searchParams)
    next.delete('record')
    setSearchParams(next, { replace: true })
  }

  function resetEditorState() {
    uploadController.current?.abort()
    uploadAttempt.current = null
    setUploadStage(null)
    setEditorError('')
    setEditorConflict(false)
    setUploadMessage('')
    setDateError('')
  }

  async function openEditor(record: MedicalRecord | null = null) {
    if (savingRef.current || uploadBusy.current) return
    const generation = ++editorGeneration.current
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
      if (!mounted.current || generation !== editorGeneration.current) return
      setEditing(detail)
      setCategory(detail.category)
      setOccurredAt(vietnamDateOnly(detail.occurred_at))
      setAttachments(detail.attachments?.map((item) => item.id) || [])
      setOpen(true)
    } catch (reason) { if (mounted.current && generation === editorGeneration.current) setError(reason instanceof Error ? reason.message : 'Không thể tải chi tiết hồ sơ y tế.') }
    finally { if (mounted.current && generation === editorGeneration.current) setLoadingDetail(false) }
  }

  async function runUpload() {
    if (uploadBusy.current || !uploadAttempt.current) return
    uploadBusy.current = true
    const generation = editorGeneration.current
    const accepts = () => mounted.current && generation === editorGeneration.current
    setUploading(true); setEditorError(''); setUploadMessage('')
    try {
      const complete = await uploadAttempt.current.run()
      if (!accepts()) return
      setAttachments((current) => [...new Set([...current, complete.id])])
      setUploadMessage('Tệp đã sẵn sàng. Bấm lưu hồ sơ để gắn tệp.')
    } catch (reason) { if (accepts()) setEditorError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') }
    finally { uploadBusy.current = false; if (accepts()) setUploading(false) }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    if (uploadBusy.current || savingRef.current) return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const generation = editorGeneration.current
    const controller = new AbortController()
    uploadController.current = controller
    uploadAttempt.current = createFileUpload(file, {
      digest: sha256,
      create: (digest) => filesApi.createSession({ purpose: 'MEDICAL_RECORD', file_name: file.name, mime_type: file.type, size_bytes: file.size, sha256: digest, pregnancy_id: editing?.pregnancy_id ?? pregnancy?.id }, controller.signal),
      put: (session, content) => uploadContent(session, content, controller.signal),
      complete: (id, digest, size) => filesApi.complete(id, { sha256: digest, size_bytes: size }, controller.signal),
    }, (stage) => { if (mounted.current && generation === editorGeneration.current) setUploadStage(stage) })
    await runUpload()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current || uploadBusy.current) return
    if (!pregnancy && !editing) { setEditorError('Hãy cập nhật hồ sơ thai kỳ trước khi thêm hồ sơ y tế.'); return }
    if (!occurredAt) { setDateError('Hãy chọn ngày khám trên lịch.'); return }
    if (occurredAt > todayDate()) { setDateError('Ngày khám không thể ở tương lai. Hãy chọn lại.'); return }
    const form = new FormData(event.currentTarget)
    const payload = buildMedicalRecordPayload({ category, title: String(form.get('title')), occurredAt, facilityName: String(form.get('facility_name') || ''), clinicianName: String(form.get('clinician_name') || ''), summary: String(form.get('summary') || ''), note: String(form.get('note') || ''), attachmentIds: attachments })
    const generation = editorGeneration.current
    savingRef.current = true
    setSaving(true)
    setEditorError('')
    try {
      const wasEditing = Boolean(editing)
      const saved = editing ? await recordsApi.update(editing.id, { ...payload, version: editing.version }) : await recordsApi.create({ ...payload, pregnancy_id: pregnancy?.id })
      if (!mounted.current || generation !== editorGeneration.current) return
      savingRef.current = false
      closeEditor(); setEditing(null); setAttachments([])
      void loadRecords(pregnancy?.id ?? saved.pregnancy_id)
      notify(wasEditing ? 'Đã cập nhật hồ sơ y tế.' : 'Đã thêm hồ sơ y tế.')
    } catch (reason) {
      if (!mounted.current || generation !== editorGeneration.current) return
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setEditorConflict(true)
        setEditorError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu lại.')
        if (pregnancy) void loadRecords(pregnancy.id)
      } else setEditorError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.')
    } finally { savingRef.current = false; if (mounted.current) setSaving(false) }
  }

  async function refreshEditorVersion() {
    if (!editing || loadingDetail || savingRef.current) return
    const generation = editorGeneration.current
    setLoadingDetail(true)
    try {
      invalidateProfileResources(`records:detail:${editing.id}`)
      const latest = await recordsApi.get(editing.id)
      if (!mounted.current || generation !== editorGeneration.current) return
      // Keep the dirty form and already READY IDs when resolving a version conflict.
      setEditing((current) => current ? { ...current, version: latest.version, attachment_count: latest.attachment_count, attachments: latest.attachments } : current)
      setAttachments((current) => [...new Set([...current, ...(latest.attachments ?? []).map((file) => file.id)])])
      setEditorConflict(false); setEditorError('')
    } catch (reason) { if (mounted.current && generation === editorGeneration.current) setEditorError(reason instanceof Error ? reason.message : 'Không thể tải phiên bản mới.') }
    finally { if (mounted.current && generation === editorGeneration.current) setLoadingDetail(false) }
  }

  async function remove() {
    if (!pendingDelete) return
    await recordsApi.remove(pendingDelete, pregnancy?.id)
  }

  async function openRecordReminder(record?: MedicalRecord) {
    setError('')
    if (record) { setReminderRecords(records); setReminderRecordId(record.id); setReminderOpen(true); return }
    if (records.length) { setReminderRecords(records); setReminderRecordId(undefined); setReminderOpen(true); return }
    if (!pregnancy) { setError('Hãy thêm ít nhất một hồ sơ y tế trước khi tạo lịch nhắc nhở.'); return }
    setLoadingDetail(true)
    try {
      const query = new URLSearchParams({ limit: '12', pregnancy_id: pregnancy.id })
      const page = await recordsApi.list(`?${query}`)
      if (!page.items.length) { setError('Hãy thêm ít nhất một hồ sơ y tế trước khi tạo lịch nhắc nhở.'); return }
      setReminderRecords(page.items); setReminderRecordId(undefined); setReminderOpen(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ để tạo lịch nhắc nhở.') }
    finally { setLoadingDetail(false) }
  }

  async function download(fileId: string, name?: string) {
    try { await filesApi.saveDownload(fileId, name) }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') }
  }

  return <AppShell>
    <header className="nm-account-workspace-heading nm-account-workspace-heading-actions"><div><span>Hồ sơ riêng tư</span><h1>Hồ sơ y tế</h1><p>Lưu kết quả khám, siêu âm và tài liệu quan trọng của bạn.</p></div><div className="record-heading-actions"><button className="secondary-button" type="button" disabled={loadingDetail} onClick={() => void openRecordReminder()}>{reminderAccess.locked ? <LockKey size={20} /> : <CalendarPlus size={20} />}{reminderAccess.locked ? 'Mở quyền nhắc nhở' : 'Thêm lịch nhắc nhở'}</button><button className="primary-button" type="button" onClick={() => void openEditor()}><Plus size={20} />Thêm hồ sơ</button></div></header>
    {error && <><StatusMessage tone="error">{error}</StatusMessage><button className="secondary-button" type="button" disabled={loading} onClick={() => void (pregnancy ? loadRecords(pregnancy.id) : loadPregnancy())}>Thử lại</button></>}
    <section className="record-filters"><SelectField label="Lọc hồ sơ" value={filterCategory} options={filterCategories} onChange={setFilterCategory} /><CalendarDatePicker label="Từ ngày" value={from} onChange={setFrom} allowClear yearsBack={30} error={rangeError || undefined} /><CalendarDatePicker label="Đến ngày" value={to} onChange={setTo} allowClear yearsBack={30} /></section>
    <section className="record-list">{rangeError ? null : loading ? <section className="empty-state"><p>Đang tải hồ sơ y tế...</p></section> : records.map((record) => <article className="app-card record-item" key={record.id}><FileText size={28} weight="duotone" /><div><p className="card-kicker">{categoryLabels[record.category] ?? 'Loại hồ sơ khác'}</p><h2>{record.title}</h2><p>{formatDate(record.occurred_at)} · {record.facility_name || 'Chưa có cơ sở khám'}</p><p>{record.summary}</p><MedicalRecordAttachments recordId={record.id} attachmentCount={record.attachment_count} attachments={record.attachments} onDownload={(fileId, name) => void download(fileId, name)} /></div><div className="record-actions"><button className="icon-button" type="button" aria-label={`Thêm lịch nhắc từ ${record.title}`} onClick={() => void openRecordReminder(record)} disabled={loadingDetail}><CalendarPlus size={20} /></button><button className="icon-button" type="button" aria-label="Sửa hồ sơ" onClick={() => void openEditor(record)} disabled={loadingDetail}><PencilSimple size={20} /></button><button className="icon-danger" type="button" aria-label="Xóa hồ sơ" onClick={() => setPendingDelete(record.id)} disabled={loadingDetail}><Trash size={20} /></button></div></article>)}{!rangeError && !loading && records.length === 0 && !error && <section className="empty-state"><FileText size={40} /><h2>Chưa có hồ sơ y tế</h2><p>Thêm hồ sơ đầu tiên để lưu tài liệu và tạo lịch tái khám.</p></section>}</section>
    {nextCursor && pregnancy && <button className="secondary-button load-more" type="button" disabled={loadingMore} onClick={() => void loadRecords(pregnancy.id, nextCursor)}>{loadingMore ? 'Đang tải...' : 'Tải thêm hồ sơ'}</button>}

    <AccessibleDialog
      open={open}
      title={editing ? 'Cập nhật hồ sơ y tế' : 'Thêm hồ sơ y tế'}
      description="Thông tin được lưu riêng tư trong tài khoản của bạn."
      onClose={closeEditor}
      busy={saving || uploading}
      className="medical-record-editor"
      footer={<><button className="secondary-button" type="button" disabled={saving || uploading} onClick={closeEditor}>Đóng</button><button className="primary-button" type="submit" form={editorFormId} disabled={saving || uploading}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></>}
    >
      <form id={editorFormId} key={editing?.id || 'new'} className="compact-form medical-record-form" onSubmit={submit}>
        <SelectField label="Loại hồ sơ" value={category} options={categories} onChange={setCategory} />
        <label>Tiêu đề<input name="title" required defaultValue={editing?.title || ''} placeholder="Ví dụ: Siêu âm tuần 24" /></label>
        <CalendarDatePicker label="Ngày khám" value={occurredAt} onChange={(value) => { setOccurredAt(value); setDateError('') }} error={dateError} yearsBack={30} />
        <label>Cơ sở khám<input name="facility_name" defaultValue={editing?.facility_name || ''} /></label>
        <label>Bác sĩ / chuyên viên<input name="clinician_name" defaultValue={editing?.clinician_name || ''} /></label>
        <label>Tóm tắt<textarea name="summary" defaultValue={editing?.summary || ''} /></label>
        <label>Ghi chú riêng<textarea name="note" defaultValue={editing?.note || ''} /></label>
        {editing && <><span className="field-label">Tệp đính kèm hiện có</span><MedicalRecordAttachments recordId={editing.id} initiallyOpen attachmentCount={editing.attachment_count} attachments={editing.attachments} onDownload={(fileId, name) => void download(fileId, name)} /></>}
        <label className="file-upload"><FileArrowUp size={20} /><span>{uploading ? ({ creating: 'Đang tạo phiên tải...', uploading: 'Đang tải tệp...', completing: 'Đang kiểm tra tệp...', ready: 'Tệp đã sẵn sàng', error: 'Tải tệp thất bại' }[uploadStage ?? 'creating']) : `Đính kèm tệp${attachments.length ? ` (${attachments.length})` : ''}`}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading || saving} /></label>
        {uploadStage === 'error' && <button className="secondary-button" type="button" disabled={saving || uploading} onClick={() => void runUpload()}>Thử tải lại tệp</button>}
        {uploadMessage && <p className="nm-upload-success" role="status">{uploadMessage}</p>}
        {editorError && <p className="nm-dialog-error" role="alert">{editorError}</p>}
        {editorConflict && <button className="secondary-button" type="button" disabled={loadingDetail || saving || uploading} onClick={() => void refreshEditorVersion()}>Tải phiên bản mới (giữ nội dung đang sửa)</button>}
      </form>
    </AccessibleDialog>

    <GlobalActionToast toast={actionToast} onClose={dismissToast} />
    <MedicalRecordReminderDialog open={reminderOpen} records={reminderRecords} initialRecordId={reminderRecordId} onClose={() => setReminderOpen(false)} onSaved={() => { if (!mounted.current) return; setReminderOpen(false); notify('Đã tạo lịch nhắc nhở.'); window.dispatchEvent(new CustomEvent('nutrimom:calendar-changed')) }} />
    <ActionStateDialog
      open={Boolean(pendingDelete)}
      danger
      compact
      closeOnSuccess
      title="Xóa hồ sơ y tế"
      description="Bạn có chắc chắn muốn xóa hồ sơ y tế?"
      confirmLabel="Xóa hồ sơ"
      cancelLabel="Giữ hồ sơ"
      busyLabel="Đang xóa hồ sơ..."
      successMessage={deletedMessage}
      onAction={remove}
      onCompleted={() => { if (!mounted.current) return; notify(deletedMessage); if (pregnancy) void loadRecords(pregnancy.id) }}
      onClose={() => setPendingDelete(null)}
      errorMessage={(reason) => reason instanceof Error ? reason.message : 'Không thể xóa hồ sơ.'}
    />
  </AppShell>
}
