import { useEffect, useRef, useState } from 'react'
import { vietnamDateTimeInput } from '@/core/date-time/vietnam'
import { Link } from 'react-router-dom'
import { AnimatedSelect, type AnimatedSelectOption } from '@/components/ui/animated-select'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { DiscardDraftDialog } from '@/shared/components/DiscardDraftDialog'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { memberLabel, taskPriorityLabels, toIsoTimestamp } from '../model/family-formatters'
import type { FamilyMember, FamilyTask, FamilyTaskPriority } from '../model/family-types'

const priorityOptions: AnimatedSelectOption<FamilyTaskPriority>[] = (Object.keys(taskPriorityLabels) as FamilyTaskPriority[]).map((value) => ({ value, label: taskPriorityLabels[value] }))

interface Props {
  open: boolean
  task: FamilyTask | null
  members: FamilyMember[]
  onClose: () => void
  onSaved: (task: FamilyTask) => void
  onConflict: () => void
}
function localDateTime(value?: string) {
  return value ? vietnamDateTimeInput(value) : ''
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
  const submitting = useRef(false)
  const initialized = useRef<string | null>(null)
  const baseline = useRef<FamilyTask | null>(task)
  const [conflict, setConflict] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [latestTitle, setLatestTitle] = useState('')
  const cooldown = usePaymentCooldown('family-task-editor')
  const assigneeOptions: AnimatedSelectOption<string>[] = [
    { value: '', label: 'Chưa giao' },
    ...members.map((member) => {
      const canReceiveTasks = member.scopes.includes('FAMILY_TASKS')
      return {
        value: member.id,
        label: memberLabel(member),
        disabled: !canReceiveTasks,
        description: canReceiveTasks ? undefined : 'Chưa được cấp quyền Việc gia đình',
      }
    }),
  ]

  useEffect(() => {
    if (!open) { initialized.current = null; return }
    const key = task?.id ?? 'new'
    if (initialized.current === key) return
    initialized.current = key; baseline.current = task
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setPriority(task?.priority || 'MEDIUM')
    setDueAt(localDateTime(task?.due_at))
    setAssigneeId(task?.assignee_id || '')
    setError('')
    setConflict(false); setLatestTitle(''); setDiscard(false)
  }, [open, task])

  function requestClose() {
    if (busy) return
    const original = baseline.current
    const dirty = title !== (original?.title || '') || description !== (original?.description || '') || priority !== (original?.priority || 'MEDIUM') || dueAt !== localDateTime(original?.due_at) || assigneeId !== (original?.assignee_id || '')
    if (dirty) setDiscard(true)
    else onClose()
  }

  async function reloadLatest() {
    if (!task || submitting.current || cooldown.blocked) return
    submitting.current = true; setBusy(true)
    try {
      const latest = (await familyApi.tasks({})).find((item) => item.id === task.id)
      if (!latest) { setError('Việc này đã bị xóa hoặc bạn không còn quyền truy cập. Bản nháp vẫn được giữ.'); return }
      baseline.current = latest; setLatestTitle(latest.title); setConflict(false); setError('')
    } catch (reason) { cooldown.handleRateLimit(reason); setError(familyErrorMessage(reason)) }
    finally { submitting.current = false; setBusy(false) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    if (conflict || cooldown.blocked) return
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Tiêu đề là bắt buộc.'); return }
    if (cleanTitle.length > 200) { setError('Tiêu đề tối đa 200 ký tự.'); return }
    const isoDueAt = toIsoTimestamp(dueAt)
    if (dueAt && !isoDueAt) { setError('Thời hạn chưa hợp lệ.'); return }
    submitting.current = true; setBusy(true); setError('')
    try {
      const basePayload = {
        title: cleanTitle,
        ...(description.trim() ? { description: description.trim() } : {}),
        priority,
        ...(isoDueAt ? { due_at: isoDueAt } : {}),
      }
      const saved = task
        ? await familyApi.updateTask(task.id, {
          ...basePayload,
          ...(assigneeId !== (baseline.current?.assignee_id || '') ? { assignee_id: assigneeId } : {}),
          version: baseline.current?.version ?? task.version,
        })
        : await familyApi.createTask({ ...basePayload, ...(assigneeId ? { assignee_id: assigneeId } : {}) })
      onSaved(saved); onClose()
    } catch (reason) {
      setError(familyErrorMessage(reason))
      cooldown.handleRateLimit(reason)
      if (isFamilyError(reason, 'VERSION_CONFLICT')) { setConflict(true); onConflict() }
    } finally { submitting.current = false; setBusy(false) }
  }

  return <><AccessibleDialog open={open} title={task ? 'Sửa việc gia đình' : 'Tạo việc gia đình'} description="Thay đổi chỉ hiển thị sau khi máy chủ xác nhận thành công." onClose={requestClose} busy={busy || discard} initialFocusRef={titleRef} className="family-dialog">
    <form className="family-form" onSubmit={(event) => void submit(event)}>
      <label className="family-field"><span>Tiêu đề</span><input ref={titleRef} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} required /><small>{title.length}/200</small></label>
      <label className="family-field"><span>Mô tả</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="family-form-row"><AnimatedSelect className="family-field" label="Ưu tiên" value={priority} options={priorityOptions} onValueChange={setPriority} /><label className="family-field"><span>Thời hạn</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>
      <AnimatedSelect className="family-field" label="Người phụ trách" value={assigneeId} options={assigneeOptions} onValueChange={setAssigneeId} />
      {members.some((member) => !member.scopes.includes('FAMILY_TASKS')) && <p className="family-helper">Thành viên bị khóa chưa được cấp quyền Việc gia đình. <Link className="text-link" to="/app/family" onClick={onClose}>Mở tab Nhóm gia đình để chỉnh quyền.</Link></p>}
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {conflict && <button className="secondary-button" type="button" disabled={busy || cooldown.remaining > 0} onClick={() => void reloadLatest()}>Xem bản mới, giữ bản nháp</button>}
      {latestTitle && <p role="status">Bản mới có tiêu đề: {latestTitle}. Các trường bạn đang sửa vẫn được giữ. Kiểm tra trước khi lưu.</p>}
      <div className="family-dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={requestClose}>Hủy</button><button className="primary-button" type="submit" disabled={busy || conflict || cooldown.remaining > 0}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining}s` : busy ? 'Đang lưu...' : task ? 'Lưu thay đổi' : 'Tạo việc'}</button></div>
    </form>
  </AccessibleDialog><DiscardDraftDialog open={discard} onContinue={() => setDiscard(false)} onDiscard={onClose} /></>
}

