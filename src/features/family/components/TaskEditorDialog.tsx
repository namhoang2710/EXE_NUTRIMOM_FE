import { useEffect, useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { memberLabel, taskPriorityLabels, toIsoTimestamp } from '../model/family-formatters'
import type { FamilyMember, FamilyTask, FamilyTaskPriority } from '../model/family-types'

interface Props {
  open: boolean
  task: FamilyTask | null
  members: FamilyMember[]
  onClose: () => void
  onSaved: (task: FamilyTask) => void
  onConflict: () => void
}
function localDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function TaskEditorDialog({ open, task, members, onClose, onSaved, onConflict }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<FamilyTaskPriority>('MEDIUM')
  const [dueAt, setDueAt] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setPriority(task?.priority || 'MEDIUM')
    setDueAt(localDateTime(task?.due_at))
    setAssigneeId(task?.assignee_id || '')
    setError('')
  }, [open, task])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Tiêu đề là bắt buộc.'); return }
    if (cleanTitle.length > 200) { setError('Tiêu đề tối đa 200 ký tự.'); return }
    const isoDueAt = toIsoTimestamp(dueAt)
    if (dueAt && !isoDueAt) { setError('Thời hạn chưa hợp lệ.'); return }
    setBusy(true); setError('')
    try {
      const payload = {
        title: cleanTitle,
        ...(description.trim() ? { description: description.trim() } : {}),
        priority,
        ...(isoDueAt ? { due_at: isoDueAt } : {}),
        ...(assigneeId ? { assignee_id: assigneeId } : {}),
      }
      const saved = task
        ? await familyApi.updateTask(task.id, { ...payload, version: task.version })
        : await familyApi.createTask(payload)
      onSaved(saved); onClose()
    } catch (reason) {
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'VERSION_CONFLICT')) onConflict()
    } finally { setBusy(false) }
  }

  return <AccessibleDialog open={open} title={task ? 'Sửa việc gia đình' : 'Tạo việc gia đình'} description="Thay đổi chỉ hiển thị sau khi máy chủ xác nhận thành công." onClose={onClose} busy={busy} initialFocusRef={titleRef} className="family-dialog">
    <form className="family-form" onSubmit={(event) => void submit(event)}>
      <label className="family-field"><span>Tiêu đề</span><input ref={titleRef} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} required /><small>{title.length}/200</small></label>
      <label className="family-field"><span>Mô tả</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="family-form-row"><label className="family-field"><span>Ưu tiên</span><select value={priority} onChange={(event) => setPriority(event.target.value as FamilyTaskPriority)}>{(Object.keys(taskPriorityLabels) as FamilyTaskPriority[]).map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</select></label><label className="family-field"><span>Thời hạn</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>
      <label className="family-field"><span>Người phụ trách</span><select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Chưa giao</option>{members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}</select></label>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : task ? 'Lưu thay đổi' : 'Tạo việc'}</button></div>
    </form>
  </AccessibleDialog>
}

