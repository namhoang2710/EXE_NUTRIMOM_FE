import { DownloadSimple, FileArrowUp, FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { FeaturePage as AppShell } from '@/shared/layouts/FeaturePage'
import { DateField } from '@/shared/components/DateField'
import { SelectField } from '@/shared/components/SelectField'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { ApiClientError } from '@/core/api/api-error'
import { formatDate } from '@/core/auth/date'
import { filesApi, pregnancyApi, recordsApi, sha256, uploadContent } from '@/features/maternity/api/domain-api'
import type { MedicalRecord, Pregnancy } from '@/types/domain'

const categories = ['PRENATAL_VISIT', 'ULTRASOUND', 'LAB_RESULT', 'PRESCRIPTION', 'DISCHARGE', 'OTHER'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))
const filterCategories = [{ value: '', label: 'Tất cả loại hồ sơ' }, ...categories]
const allowedUploadTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const maxUploadBytes = 25 * 1024 * 1024

export function RecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('ULTRASOUND')
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const load = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true)
    try {
      let currentPregnancy = pregnancy
      if (!cursor) {
        currentPregnancy = await pregnancyApi.current().catch(() => null)
        setPregnancy(currentPregnancy)
      }
      if (!currentPregnancy?.id) {
        setRecords([])
        setNextCursor(null)
        return
      }
      const params = new URLSearchParams({ limit: '12' })
      params.set('pregnancy_id', currentPregnancy.id)
      if (filterCategory) params.set('category', filterCategory)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (cursor) params.set('cursor', cursor)
      const page = await recordsApi.list(`?${params.toString()}`)
      setRecords((current) => cursor ? [...current, ...page.items] : page.items)
      setNextCursor(page.next_cursor || null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ y tế.') }
    finally { if (!cursor) setLoading(false) }
  }, [filterCategory, from, to, pregnancy])
  useEffect(() => { void load() }, [load])

  function openEditor(record: MedicalRecord | null = null) {
    setEditing(record)
    setCategory(record?.category || 'ULTRASOUND')
    setAttachments(record?.attachments?.map((item) => item.id) || [])
    setOpen(true)
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      if (!allowedUploadTypes.has(file.type)) throw new Error('Chỉ hỗ trợ PDF, JPG, PNG hoặc WEBP.')
      if (file.size > maxUploadBytes) throw new Error('Tệp tải lên không được vượt quá 25 MB.')
      const digest = await sha256(file)
      const session = await filesApi.createSession({ purpose: 'MEDICAL_RECORD', file_name: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size, sha256: digest, pregnancy_id: pregnancy?.id })
      await uploadContent(session, file)
      const complete = await filesApi.complete(session.file_id, { sha256: digest, size_bytes: file.size })
      setAttachments((current) => [...current, complete.id])
      setMessage(`Đã tải ${file.name}.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') } finally { setUploading(false); event.target.value = '' }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pregnancy && !editing) { setError('Hãy cập nhật hồ sơ thai kỳ trước khi thêm hồ sơ y tế.'); return }
    const form = new FormData(event.currentTarget)
    const occurredAt = String(form.get('occurred_at'))
    const payload = { category, title: String(form.get('title')), occurred_at: `${occurredAt}T00:00:00+07:00`, facility_name: String(form.get('facility_name') || ''), clinician_name: String(form.get('clinician_name') || ''), summary: String(form.get('summary') || ''), note: String(form.get('note') || ''), attachment_ids: attachments }
    try {
      const saved = editing ? await recordsApi.update(editing.id, { ...payload, version: editing.version }) : await recordsApi.create({ ...payload, pregnancy_id: pregnancy?.id })
      setRecords((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      setOpen(false); setEditing(null); setAttachments([])
      setMessage(editing ? 'Đã cập nhật hồ sơ y tế.' : 'Đã tạo hồ sơ y tế.')
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') {
        setError('Hồ sơ đã thay đổi ở nơi khác. Vui lòng tải lại dữ liệu mới nhất.')
        void load()
      } else setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.')
    }
  }

  async function remove(id: string) {
    try { await recordsApi.remove(id); setRecords((current) => current.filter((record) => record.id !== id)); setMessage('Đã xóa hồ sơ.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xóa hồ sơ.') }
    finally { setPendingDelete(null) }
  }

  async function download(fileId: string) {
    try { const response = await filesApi.download(fileId); window.open(response.download_url, '_blank', 'noopener') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải tệp.') }
  }

  return <AppShell>
    <div className="page-heading page-heading-actions"><div><p className="welcome-kicker">Hồ sơ riêng tư</p><h1>Hồ sơ y tế</h1><p>Lưu kết quả khám, siêu âm và tài liệu quan trọng của bạn.</p></div><button className="primary-button" onClick={() => openEditor()}><Plus size={20} />Thêm hồ sơ</button></div>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}
    <section className="record-filters"><SelectField label="Lọc hồ sơ" value={filterCategory} options={filterCategories} onChange={setFilterCategory} /><DateField label="Từ ngày" value={from} onChange={(event) => setFrom(event.target.value)} /><DateField label="Đến ngày" value={to} onChange={(event) => setTo(event.target.value)} /></section>
    <section className="record-list">{loading ? <section className="empty-state"><p>Đang tải hồ sơ y tế...</p></section> : records.map((record) => <article className="app-card record-item" key={record.id}><FileText size={28} weight="duotone" /><div><p className="card-kicker">{record.category.replaceAll('_', ' ')}</p><h2>{record.title}</h2><p>{formatDate(record.occurred_at)} · {record.facility_name || 'Chưa có cơ sở khám'}</p><p>{record.summary}</p>{record.attachments?.map((file) => <button className="attachment-button" type="button" key={file.id} onClick={() => void download(file.id)}><DownloadSimple size={16} />{file.file_name}</button>)}</div><div className="record-actions"><button className="icon-button" aria-label="Sửa hồ sơ" onClick={() => openEditor(record)}><PencilSimple size={20} /></button><button className="icon-danger" aria-label="Xóa hồ sơ" onClick={() => setPendingDelete(record.id)}><Trash size={20} /></button></div></article>)}{!loading && records.length === 0 && <section className="empty-state"><FileText size={40} /><h2>Chưa có hồ sơ y tế</h2><p>Thêm lần khám hoặc kết quả siêu âm đầu tiên của bạn.</p></section>}</section>
    {nextCursor && <button className="secondary-button load-more" type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(nextCursor).finally(() => setLoadingMore(false)) }}>{loadingMore ? 'Đang tải...' : 'Tải thêm hồ sơ'}</button>}
    {open && <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-label={editing ? 'Cập nhật hồ sơ y tế' : 'Thêm hồ sơ y tế'}><div className="section-title-row"><h2>{editing ? 'Cập nhật hồ sơ y tế' : 'Thêm hồ sơ y tế'}</h2><button className="text-button" type="button" onClick={() => setOpen(false)}>Đóng</button></div><form key={editing?.id || 'new'} className="compact-form" onSubmit={submit}><SelectField label="Loại hồ sơ" value={category} options={categories} onChange={setCategory} /><label>Tiêu đề<input name="title" required defaultValue={editing?.title || ''} placeholder="Ví dụ: Siêu âm tuần 24" /></label><DateField label="Ngày khám" name="occurred_at" required defaultValue={editing?.occurred_at.slice(0, 10) || ''} /><label>Cơ sở khám<input name="facility_name" defaultValue={editing?.facility_name || ''} /></label><label>Bác sĩ / chuyên viên<input name="clinician_name" defaultValue={editing?.clinician_name || ''} /></label><label>Tóm tắt<textarea name="summary" defaultValue={editing?.summary || ''} /></label><label>Ghi chú riêng<textarea name="note" defaultValue={editing?.note || ''} /></label><label className="file-upload"><FileArrowUp size={20} /><span>{uploading ? 'Đang tải tệp...' : `Đính kèm tệp${attachments.length ? ` (${attachments.length})` : ''}`}</span><input type="file" onChange={upload} disabled={uploading} /></label><button className="primary-button" disabled={uploading}>{editing ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></form></section></div>}
    {pendingDelete && <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-label="Xác nhận xóa hồ sơ"><div className="section-title-row"><h2>Xóa hồ sơ y tế?</h2><button className="text-button" type="button" onClick={() => setPendingDelete(null)}>Đóng</button></div><p>Hồ sơ sẽ được xóa mềm và ghi audit. Bạn có chắc muốn tiếp tục?</p><div className="nm-form-actions"><button className="nm-secondary-action" type="button" onClick={() => setPendingDelete(null)}>Hủy</button><button className="nm-danger-action" type="button" onClick={() => void remove(pendingDelete)}>Xóa hồ sơ</button></div></section></div>}
  </AppShell>
}
