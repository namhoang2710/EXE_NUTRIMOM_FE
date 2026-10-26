import { LockKey } from '@phosphor-icons/react'
import { useFeatureAccess } from '@/features/payment/hooks/useFeatureAccess'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { getSessionScope } from '@/core/auth/token-store'
import { invalidateProfileResources } from '@/core/api/profile-requests'
import { createFileUpload, type UploadStage } from '@/features/maternity/model/file-upload'
import { createRequestSequence, createPageLoadGate, mergeUniqueRecords } from '@/features/maternity/model/records-coordination'
import { CalendarPlus, FileArrowUp, FileText, Plus } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { filesApi, pregnancyApi, recordsApi, sha256, uploadContent } from '@/features/maternity/api/domain-api'
import { MedicalRecordAttachments } from '@/features/maternity/components/MedicalRecordAttachments'
import { MedicalRecordGroups } from '@/features/maternity/components/MedicalRecordGroups'
import { MedicalRecordReminderDialog } from '@/features/calendar/components/MedicalRecordReminderDialog'
import { GlobalActionToast, type CalendarToastMessage } from '@/features/calendar/components/CalendarToast'
import { buildMedicalRecordPayload, loadMedicalRecords, medicalRecordCategoryLabels } from '@/features/maternity/model/records-page-data'
import { groupMedicalRecords, pregnancyLabel, vietnamDateOnly } from '@/features/maternity/model/records-pregnancy'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { ActionStateDialog } from '@/shared/components/ActionStateDialog'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { SelectField } from '@/shared/components/SelectField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { FeaturePage as AppShell } from '@/shared/layouts/FeaturePage'
import type { MedicalRecord, Pregnancy } from '@/types/domain'
import '@/features/maternity/styles/records.css'

const categories = Object.entries(medicalRecordCategoryLabels).map(([value, label]) => ({ value, label }))
const filterCategories = [{ value: '', label: 'Tất cả loại hồ sơ' }, ...categories]
const editorFormId = 'medical-record-editor-form'
const deletedMessage = 'Đã xóa hồ sơ y tế.'

export function RecordsPage() {
  const reminderAccess = useFeatureAccess('CALENDAR_REMINDERS')
  const cooldown = usePaymentCooldown('medical-records')
  const cooldownRef = useRef(cooldown)
  cooldownRef.current = cooldown
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedRecordId = searchParams.get('record')?.trim() || ''
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([])
  const [pregnancyStatus, setPregnancyStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pregnancyError, setPregnancyError] = useState('')
  const pregnancy = pregnancyStatus === 'ready' ? pregnancies.find((item) => item.status === 'ACTIVE') : undefined
  const recordsToday = vietnamDateOnly()
  const [createPregnancyId, setCreatePregnancyId] = useState('')
  const [pregnancyChanged, setPregnancyChanged] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [detailRetry, setDetailRetry] = useState(0)
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
  const [filterPregnancy, setFilterPregnancy] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filterKey = JSON.stringify([filterPregnancy, filterCategory, from, to])
  const currentFilter = useRef(filterKey)
  currentFilter.current = filterKey
  const [occurredAt, setOccurredAt] = useState('')
  const [dateError, setDateError] = useState('')
  const rangeError = from && to && from > to ? 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc. Hãy chọn lại khoảng ngày.' : ''
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MedicalRecord | null>(null)
  const [reminderRecordId, setReminderRecordId] = useState<string>()
  const [reminderRecords, setReminderRecords] = useState<MedicalRecord[]>([])
  const [reminderOpen, setReminderOpen] = useState(false)
  const pregnancySequence = useRef(0)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const groups = groupMedicalRecords(records, pregnancies)
  const pregnancyOptions = [{ value: '', label: 'Tất cả thai kỳ' }, ...pregnancies.map((item) => ({ value: item.id, label: pregnancyLabel(item) }))]
  for (const id of new Set([...records.map((record) => record.pregnancy_id), filterPregnancy].filter(Boolean))) {
    if (!pregnancies.some((item) => item.id === id)) pregnancyOptions.push({ value: id, label: pregnancyLabel(undefined, id) })
  }
  const createHint = pregnancyStatus === 'loading' ? 'Đang kiểm tra thai kỳ để thêm hồ sơ.' : pregnancyStatus === 'error' ? 'Chưa xác định được thai kỳ hiện tại. Hãy thử tải lại thông tin thai kỳ.' : !pregnancy ? 'Bạn vẫn có thể xem và cập nhật hồ sơ cũ. Cần có thai kỳ đang theo dõi để thêm hồ sơ mới.' : ''

  const loadRecords = useCallback(async (cursor?: string) => {
    if (filterKey !== currentFilter.current) return
    if (cooldownRef.current.blocked) { setError('Bạn đang thao tác quá nhanh. Vui lòng chờ rồi bấm Thử lại.'); setLoading(false); return }
    const sequence = listSequence.current
    const scope = getSessionScope()
    const generation = cursor ? sequence.current() : sequence.begin()
    if (cursor && !moreInFlight.current.start(generation, cursor)) return
    if (cursor) { setLoadingMore(true) }
    else { moreInFlight.current.clear(); setLoadingMore(false); setLoading(true); setError(''); setNextCursor(null) }
    const accepts = () => mounted.current && scope === getSessionScope() && sequence.accepts(generation) && filterKey === currentFilter.current
    if (from && to && from > to) { setRecords([]); setNextCursor(null); setLoading(false); return }
    try {
      let page = await loadMedicalRecords(recordsApi.list, { pregnancyId: filterPregnancy, category: filterCategory, from, to }, cursor)
      let items = page.items
      // Reload only this filtered list after CRUD, preserving its loaded pagination depth.
      if (!cursor) {
        for (let index = 1; index < loadedPages.current && page.next_cursor; index += 1) {
          if (!accepts()) return
          page = await loadMedicalRecords(recordsApi.list, { pregnancyId: filterPregnancy, category: filterCategory, from, to }, page.next_cursor)
          items = mergeUniqueRecords(items, page.items)
        }
      }
      if (!accepts()) return
      setRecords((current) => cursor ? mergeUniqueRecords(current, items) : items)
      setNextCursor(page.next_cursor || null)
      if (cursor) loadedPages.current += 1
    } catch (reason) { if (accepts()) { cooldownRef.current.handleRateLimit(reason); setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ y tế.') } }
    finally {
      if (cursor) moreInFlight.current.finish(generation, cursor)
      if (accepts()) { setLoading(false); setLoadingMore(false) }
    }
  }, [filterCategory, filterPregnancy, filterKey, from, to])

  const loadPregnancies = useCallback(async () => {
    if (cooldownRef.current.blocked) return
    const generation = ++pregnancySequence.current
    setPregnancyStatus('loading')
    setPregnancyError('')
    const scope = getSessionScope()
    const accepts = () => mounted.current && generation === pregnancySequence.current && scope === getSessionScope()
    try { const items = await pregnancyApi.list(); if (accepts()) { setPregnancies(items); setPregnancyStatus('ready') } }
    catch (reason) { if (accepts()) { cooldownRef.current.handleRateLimit(reason); setPregnancyStatus('error'); setPregnancyError(reason instanceof Error ? reason.message : 'Không thể tải thông tin thai kỳ.') } }
  }, [])

  useEffect(() => {
    const sequence = listSequence.current
    const controllerRef = uploadController
    mounted.current = true
    void loadPregnancies()
    return () => { mounted.current = false; pregnancySequence.current += 1; editorGeneration.current += 1; sequence.invalidate(); controllerRef.current?.abort() }
  }, [loadPregnancies])
  useEffect(() => {
    const sequence = listSequence.current
    loadedPages.current = 1
    setExpandedGroups({})
    moreInFlight.current.clear()
    setLoadingMore(false); setRecords([]); setNextCursor(null)
    void loadRecords()
    return () => sequence.invalidate()
  }, [loadRecords])

  useEffect(() => {
    setDetailError('')
    if (!focusedRecordId) return
    if (cooldownRef.current.blocked) { setDetailError('Vui lòng chờ trước khi mở lại hồ sơ.'); return }
    const controller = new AbortController()
    const generation = ++editorGeneration.current
    resetEditorState()
    setLoadingDetail(true)
    void recordsApi.get(focusedRecordId, controller.signal).then((detail) => {
      if (controller.signal.aborted || generation !== editorGeneration.current) return
      setEditing(detail)
      setCategory(detail.category)
      setOccurredAt(vietnamDateOnly(detail.occurred_at))
      setAttachments(detail.attachments?.map((item) => item.id) || [])
      setOpen(true)
    }).catch((reason) => {
      if (!controller.signal.aborted && generation === editorGeneration.current) { cooldownRef.current.handleRateLimit(reason); setDetailError(reason instanceof ApiClientError && reason.status === 429 ? reason.message : 'Không thể mở hồ sơ y tế này. Nội dung có thể không còn tồn tại hoặc bạn không có quyền xem.') }
    }).finally(() => { if (!controller.signal.aborted && generation === editorGeneration.current) setLoadingDetail(false) })
    return () => controller.abort()
  }, [focusedRecordId, detailRetry])

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
    setPregnancyChanged(false)
    setUploadMessage('')
    setDateError('')
  }

  async function openEditor(record: MedicalRecord | null = null) {
    if (savingRef.current || uploadBusy.current || cooldown.blocked || (!record && !pregnancy)) return
    const generation = ++editorGeneration.current
    setError('')
    resetEditorState()
    if (!record) {
      setCreatePregnancyId(pregnancy!.id)
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
    } catch (reason) { if (mounted.current && generation === editorGeneration.current) { cooldown.handleRateLimit(reason); setError(reason instanceof Error ? reason.message : 'Không thể tải chi tiết hồ sơ y tế.') } }
    finally { if (mounted.current && generation === editorGeneration.current) setLoadingDetail(false) }
  }

  async function runUpload() {
    if (uploadBusy.current || !uploadAttempt.current || cooldown.blocked || (!editing && pregnancyChanged)) return
    uploadBusy.current = true
    const generation = editorGeneration.current
    const accepts = () => mounted.current && generation === editorGeneration.current
    setUploading(true); setEditorError(''); setUploadMessage('')
    try {
      const complete = await uploadAttempt.current.run()
      if (!accepts()) return
      setAttachments((current) => [...new Set([...current, complete.id])])
      setUploadMessage('Tệp đã sẵn sàng. Bấm lưu hồ sơ để gắn tệp.')
    } catch (reason) { if (accepts()) { cooldown.handleRateLimit(reason); setEditorError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') } }
    finally { uploadBusy.current = false; if (accepts()) setUploading(false) }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    if (uploadBusy.current || savingRef.current || cooldown.blocked || (!editing && pregnancyChanged)) return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const generation = editorGeneration.current
    const controller = new AbortController()
    uploadController.current = controller
    uploadAttempt.current = createFileUpload(file, {
      digest: sha256,
      create: (digest) => filesApi.createSession({ purpose: 'MEDICAL_RECORD', file_name: file.name, mime_type: file.type, size_bytes: file.size, sha256: digest, pregnancy_id: editing?.pregnancy_id ?? createPregnancyId }, controller.signal),
      put: (session, content) => uploadContent(session, content, controller.signal),
      complete: (id, digest, size) => filesApi.complete(id, { sha256: digest, size_bytes: size }, controller.signal),
    }, (stage) => { if (mounted.current && generation === editorGeneration.current) setUploadStage(stage) })
    await runUpload()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current || uploadBusy.current || cooldown.blocked || (!editing && pregnancyChanged)) return
    if ((!pregnancy || pregnancy.id !== createPregnancyId) && !editing) { setEditorError('Hãy xác nhận thai kỳ hiện tại trước khi thêm hồ sơ y tế.'); return }
    if (!occurredAt) { setDateError('Hãy chọn ngày khám trên lịch.'); return }
    if (occurredAt > vietnamDateOnly()) { setDateError('Ngày khám không thể ở tương lai. Hãy chọn lại.'); return }
    const form = new FormData(event.currentTarget)
    const payload = buildMedicalRecordPayload({ category, title: String(form.get('title')), occurredAt, facilityName: String(form.get('facility_name') || ''), clinicianName: String(form.get('clinician_name') || ''), summary: String(form.get('summary') || ''), note: String(form.get('note') || ''), attachmentIds: attachments })
    const generation = editorGeneration.current
    savingRef.current = true
    setSaving(true)
    setEditorError('')
    try {
      const wasEditing = Boolean(editing)
      if (editing) await recordsApi.update(editing.id, { ...payload, version: editing.version })
      else await recordsApi.create({ ...payload, pregnancy_id: createPregnancyId })
      if (!mounted.current || generation !== editorGeneration.current) return
      savingRef.current = false
      closeEditor(); setEditing(null); setAttachments([])
      void loadRecords()
      notify(wasEditing ? 'Đã cập nhật hồ sơ y tế.' : 'Đã thêm hồ sơ y tế.')
    } catch (reason) {
      if (!mounted.current || generation !== editorGeneration.current) return
      cooldown.handleRateLimit(reason)
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setEditorConflict(true)
        setEditorError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu lại.')
        void loadRecords()
      } else if (reason instanceof ApiClientError && reason.code === 'PREGNANCY_NOT_ACTIVE') {
        setPregnancyChanged(true)
        setEditorError('Thai kỳ dùng để thêm hồ sơ đã kết thúc. Nội dung và tệp của bạn vẫn được giữ. Hãy xác nhận thai kỳ hiện tại trước khi lưu lại.')
        invalidateProfileResources('pregnancy:')
        void loadPregnancies()
      } else setEditorError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.')
    } finally { savingRef.current = false; if (mounted.current) setSaving(false) }
  }

  async function refreshEditorVersion() {
    if (!editing || loadingDetail || savingRef.current || cooldown.blocked) return
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
    } catch (reason) { if (mounted.current && generation === editorGeneration.current) { cooldown.handleRateLimit(reason); setEditorError(reason instanceof Error ? reason.message : 'Không thể tải phiên bản mới.') } }
    finally { if (mounted.current && generation === editorGeneration.current) setLoadingDetail(false) }
  }

  async function remove() {
    if (!pendingDelete) return
    if (cooldown.blocked) throw new Error(`Vui lòng chờ ${cooldown.remaining} giây rồi thử lại.`)
    try { await recordsApi.remove(pendingDelete.id, pendingDelete.pregnancy_id) }
    catch (reason) { cooldown.handleRateLimit(reason); throw reason }
  }

  async function openRecordReminder(record?: MedicalRecord) {
    if (cooldown.blocked || loadingDetail) return
    setError('')
    if (record) { setReminderRecords(records); setReminderRecordId(record.id); setReminderOpen(true); return }
    if (records.length) { setReminderRecords(records); setReminderRecordId(undefined); setReminderOpen(true); return }
    setLoadingDetail(true)
    try {
      const query = new URLSearchParams({ limit: '12' })
      if (filterPregnancy) query.set('pregnancy_id', filterPregnancy)
      const page = await recordsApi.list(`?${query}`)
      if (!page.items.length) { setError('Hãy thêm ít nhất một hồ sơ y tế trước khi tạo lịch nhắc nhở.'); return }
      setReminderRecords(page.items); setReminderRecordId(undefined); setReminderOpen(true)
    } catch (reason) { cooldown.handleRateLimit(reason); setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ để tạo lịch nhắc nhở.') }
    finally { setLoadingDetail(false) }
  }

  async function download(fileId: string, name?: string) {
    if (cooldown.blocked) return
    try { await filesApi.saveDownload(fileId, name) }
    catch (reason) { if (mounted.current) { cooldown.handleRateLimit(reason); setError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') } }
  }

  return <AppShell>
    <header className="nm-account-workspace-heading nm-account-workspace-heading-actions"><div><span>Hồ sơ riêng tư</span><h1>Hồ sơ y tế</h1><p>Xem lại kết quả khám và tài liệu của bạn qua từng thai kỳ.</p></div><div className="record-heading-actions"><button className="secondary-button" type="button" disabled={loadingDetail || cooldown.remaining > 0} onClick={() => void openRecordReminder()}>{reminderAccess.locked ? <LockKey size={20} /> : <CalendarPlus size={20} />}{reminderAccess.locked ? 'Mở quyền nhắc nhở' : 'Thêm lịch nhắc nhở'}</button><button className="primary-button" type="button" disabled={!pregnancy || cooldown.remaining > 0} aria-describedby={createHint ? 'record-create-hint' : undefined} onClick={() => void openEditor()}><Plus size={20} />Thêm hồ sơ</button></div></header>
    {createHint && <p className="record-context-notice" id="record-create-hint" role="status">{createHint}</p>}
    {pregnancyError && <div className="record-context-error"><StatusMessage tone="error">{pregnancyError}</StatusMessage><button className="secondary-button" type="button" disabled={pregnancyStatus === 'loading' || cooldown.remaining > 0} onClick={() => void loadPregnancies()}>Tải lại thông tin thai kỳ</button></div>}
    {cooldown.remaining > 0 && <StatusMessage tone="info">{`Bạn đang thao tác quá nhanh. Có thể thử lại sau ${cooldown.remaining} giây.`}</StatusMessage>}
    {error && <div className="record-context-error"><StatusMessage tone="error">{error}</StatusMessage><button className="secondary-button" type="button" disabled={loading || cooldown.remaining > 0} onClick={() => void loadRecords()}>Thử lại</button></div>}
    {detailError && <div className="record-context-error"><StatusMessage tone="error">{detailError}</StatusMessage><button className="secondary-button" type="button" disabled={loadingDetail || cooldown.remaining > 0} onClick={() => setDetailRetry((value) => value + 1)}>Thử mở lại hồ sơ</button></div>}
    <section className="record-filters" aria-label="Bộ lọc hồ sơ"><SelectField label="Thai kỳ" value={filterPregnancy} options={pregnancyOptions} onChange={setFilterPregnancy} /><SelectField label="Lọc hồ sơ" value={filterCategory} options={filterCategories} onChange={setFilterCategory} /><CalendarDatePicker label="Từ ngày" value={from} onChange={setFrom} today={recordsToday} allowClear yearsBack={30} error={rangeError || undefined} /><CalendarDatePicker label="Đến ngày" value={to} onChange={setTo} today={recordsToday} allowClear yearsBack={30} /></section>
    <section className="record-list" aria-label="Hồ sơ theo thai kỳ" aria-busy={loading}>{rangeError ? null : loading ? <div className="record-loading" role="status"><span>Đang tải hồ sơ y tế...</span><div className="record-skeleton" aria-hidden /><div className="record-skeleton" aria-hidden /></div> : <MedicalRecordGroups groups={groups} expanded={expandedGroups} selectedPregnancy={filterPregnancy} disabled={loadingDetail || cooldown.remaining > 0} onExpand={(id, expanded) => setExpandedGroups((current) => current[id] === expanded ? current : { ...current, [id]: expanded })} onEdit={(record) => void openEditor(record)} onDelete={setPendingDelete} onReminder={(record) => void openRecordReminder(record)} onDownload={(id, name) => void download(id, name)} />}{!rangeError && !loading && records.length === 0 && !error && <section className="empty-state"><FileText size={40} /><h2>{filterPregnancy || filterCategory || from || to ? 'Không có hồ sơ phù hợp' : 'Chưa có hồ sơ y tế'}</h2><p>{filterPregnancy || filterCategory || from || to ? 'Hãy đổi thai kỳ, loại hồ sơ hoặc khoảng ngày để xem kết quả khác.' : pregnancy ? 'Thêm hồ sơ đầu tiên để lưu kết quả khám và tài liệu của bạn.' : 'Hồ sơ đã lưu sẽ xuất hiện tại đây, kể cả khi thai kỳ đã kết thúc.'}</p></section>}</section>
    {nextCursor && <div className="record-pagination"><p>Số hồ sơ ở mỗi nhóm là số đã tải. Vẫn còn hồ sơ khác trong kết quả.</p><button className="secondary-button load-more" type="button" disabled={loadingMore || cooldown.remaining > 0} onClick={() => void loadRecords(nextCursor)}>{loadingMore ? 'Đang tải...' : 'Tải thêm hồ sơ'}</button></div>}

    <AccessibleDialog
      open={open}
      title={editing ? 'Cập nhật hồ sơ y tế' : 'Thêm hồ sơ y tế'}
      description="Thông tin được lưu riêng tư trong tài khoản của bạn."
      onClose={closeEditor}
      busy={saving || uploading}
      className="medical-record-editor"
      footer={<><button className="secondary-button" type="button" disabled={saving || uploading} onClick={closeEditor}>Đóng</button><button className="primary-button" type="submit" form={editorFormId} disabled={saving || uploading || cooldown.remaining > 0 || (!editing && pregnancyChanged)}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></>}
    >
      <form id={editorFormId} key={editing?.id || 'new'} className="compact-form medical-record-form" onSubmit={submit}>
        <p className="record-editor-context">{pregnancyLabel(pregnancies.find((item) => item.id === (editing?.pregnancy_id ?? createPregnancyId)), editing?.pregnancy_id ?? createPregnancyId)}</p>
        <SelectField label="Loại hồ sơ" value={category} options={categories} onChange={setCategory} />
        <label>Tiêu đề<input name="title" required defaultValue={editing?.title || ''} placeholder="Ví dụ: Siêu âm tuần 24" /></label>
        <CalendarDatePicker label="Ngày khám" value={occurredAt} onChange={(value) => { setOccurredAt(value); setDateError('') }} today={recordsToday} error={dateError} yearsBack={30} />
        <label>Cơ sở khám<input name="facility_name" defaultValue={editing?.facility_name || ''} /></label>
        <label>Bác sĩ / chuyên viên<input name="clinician_name" defaultValue={editing?.clinician_name || ''} /></label>
        <label>Tóm tắt<textarea name="summary" defaultValue={editing?.summary || ''} /></label>
        <label>Ghi chú riêng<textarea name="note" defaultValue={editing?.note || ''} /></label>
        {editing && <><span className="field-label">Tệp đính kèm hiện có</span><MedicalRecordAttachments recordId={editing.id} initiallyOpen attachmentCount={editing.attachment_count} attachments={editing.attachments} onDownload={(fileId, name) => void download(fileId, name)} /></>}
        <label className="file-upload"><FileArrowUp size={20} /><span>{uploading ? ({ creating: 'Đang tạo phiên tải...', uploading: 'Đang tải tệp...', completing: 'Đang kiểm tra tệp...', ready: 'Tệp đã sẵn sàng', error: 'Tải tệp thất bại' }[uploadStage ?? 'creating']) : `Đính kèm tệp${attachments.length ? ` (${attachments.length})` : ''}`}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading || saving || cooldown.remaining > 0 || (!editing && pregnancyChanged)} /></label>
        {uploadStage === 'error' && <button className="secondary-button" type="button" disabled={saving || uploading || cooldown.remaining > 0 || (!editing && pregnancyChanged)} onClick={() => void runUpload()}>Thử tải lại tệp</button>}
        {uploadMessage && <p className="nm-upload-success" role="status">{uploadMessage}</p>}
        {editorError && <p className="nm-dialog-error" role="alert">{editorError}</p>}
        {cooldown.remaining > 0 && <p role="status">{`Vui lòng chờ ${cooldown.remaining} giây trước khi thử lại.`}</p>}
        {pregnancyChanged && (pregnancy ? <button className="secondary-button" type="button" disabled={saving || uploading || cooldown.remaining > 0} onClick={() => { setCreatePregnancyId(pregnancy.id); setPregnancyChanged(false); setEditorError('') }}>Dùng thai kỳ hiện tại</button> : <><p>Chưa xác định được thai kỳ đang theo dõi. Bạn có thể đóng cửa sổ hoặc tải lại thông tin thai kỳ.</p><button className="secondary-button" type="button" disabled={pregnancyStatus === 'loading' || cooldown.remaining > 0} onClick={() => { invalidateProfileResources('pregnancy:'); void loadPregnancies() }}>Tải lại thông tin thai kỳ</button></>)}
        {editorConflict && <button className="secondary-button" type="button" disabled={loadingDetail || saving || uploading || cooldown.remaining > 0} onClick={() => void refreshEditorVersion()}>Tải phiên bản mới (giữ nội dung đang sửa)</button>}
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
      confirmLabel={cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining} giây` : 'Xóa hồ sơ'}
      disabled={cooldown.remaining > 0}
      cancelLabel="Giữ hồ sơ"
      busyLabel="Đang xóa hồ sơ..."
      successMessage={deletedMessage}
      onAction={remove}
      onCompleted={() => { if (!mounted.current) return; notify(deletedMessage); void loadRecords() }}
      onClose={() => setPendingDelete(null)}
      errorMessage={(reason) => reason instanceof Error ? reason.message : 'Không thể xóa hồ sơ.'}
    />
  </AppShell>
}
