import { ArrowClockwise, CalendarBlank, CheckCircle, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionStateDialog } from '@/shared/components/ActionStateDialog'
import { StatusMessage } from '@/shared/components/StatusMessage'
import { familyApi } from '../api/family-api'
import { familyErrorMessage, isFamilyError } from '../model/family-errors'
import { formatVietnamDateTime, memberLabel, taskPriorityLabels, taskStatusLabels } from '../model/family-formatters'
import type { FamilyMember, FamilyTask, FamilyTaskStatus } from '../model/family-types'
import { TaskEditorDialog } from './TaskEditorDialog'

interface Props { isOwner: boolean; canUseTasks: boolean; members: FamilyMember[] }

const taskRequests = new Map<string, Promise<FamilyTask[]>>()

function requestTasks(filters: { status?: FamilyTaskStatus; assignee_id?: string }) {
  const key = JSON.stringify(filters)
  const existing = taskRequests.get(key)
  if (existing) return existing
  const request = familyApi.tasks(filters)
  taskRequests.set(key, request)
  void request.finally(() => { window.setTimeout(() => taskRequests.delete(key), 0) }).catch(() => undefined)
  return request
}

export function FamilyTasksPanel({ isOwner, canUseTasks, members }: Props) {
  const [tasks, setTasks] = useState<FamilyTask[]>([])
  const [status, setStatus] = useState<FamilyTaskStatus | ''>('')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(canUseTasks)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyTask | null>(null)
  const [deleting, setDeleting] = useState<FamilyTask | null>(null)
  const updating = useRef(new Set<string>())
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!canUseTasks) return
    const currentRequest = ++requestId.current
    setLoading(true); setError('')
    try {
      const result = await requestTasks({ status: status || undefined, assignee_id: isOwner ? assigneeId || undefined : undefined })
      if (requestId.current === currentRequest) setTasks(result)
    } catch (reason) { if (requestId.current === currentRequest) setError(familyErrorMessage(reason)) }
    finally { if (requestId.current === currentRequest) setLoading(false) }
  }, [assigneeId, canUseTasks, isOwner, status])

  useEffect(() => {
    void load()
    return () => { requestId.current += 1 }
  }, [load])

  async function changeStatus(task: FamilyTask, nextStatus: FamilyTaskStatus) {
    if (updating.current.has(task.id)) return
    updating.current.add(task.id); setError(''); setConflict(false)
    try {
      const saved = await familyApi.updateTask(task.id, { status: nextStatus, version: task.version })
      setTasks((current) => current.map((item) => item.id === saved.id ? saved : item))
    } catch (reason) {
      setError(familyErrorMessage(reason))
      if (isFamilyError(reason, 'VERSION_CONFLICT')) setConflict(true)
    } finally { updating.current.delete(task.id) }
  }

  if (!canUseTasks) return <div className="family-no-access"><CheckCircle size={36} weight="duotone" aria-hidden="true" /><h2>Việc cần làm chưa được chia sẻ</h2><p>Chủ nhóm chưa cấp quyền Việc gia đình cho tài khoản của bạn.</p></div>
  return <section className="family-section" aria-labelledby="family-tasks-title">
    <div className="family-section-heading"><div><h2 id="family-tasks-title">Việc cần làm</h2><p>Theo dõi công việc chung và chỉ cập nhật sau khi máy chủ xác nhận.</p></div>{isOwner && <button className="primary-button" type="button" onClick={() => { setEditing(null); setEditorOpen(true) }}><Plus size={18} aria-hidden="true" />Tạo việc</button>}</div>
    <div className="family-filters"><label><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as FamilyTaskStatus | '')}><option value="">Tất cả</option>{(Object.keys(taskStatusLabels) as FamilyTaskStatus[]).map((value) => <option key={value} value={value}>{taskStatusLabels[value]}</option>)}</select></label>{isOwner && <label><span>Người phụ trách</span><select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Tất cả</option>{members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}</select></label>}<button className="family-icon-button" type="button" aria-label="Tải lại danh sách việc" onClick={() => void load()}><ArrowClockwise size={20} /></button></div>
    {error && <div className="family-inline-state"><StatusMessage tone="error">{error}</StatusMessage>{conflict && <button className="secondary-button" type="button" onClick={() => { setConflict(false); void load() }}>Tải lại</button>}</div>}
    {loading ? <div className="family-task-skeleton" aria-busy="true" aria-label="Đang tải việc"><span /><span /><span /></div> : tasks.length ? <div className="family-task-list">{tasks.map((task) => <article className="family-task-row" key={task.id}><div className={`family-priority is-${task.priority.toLowerCase()}`}>{taskPriorityLabels[task.priority]}</div><div className="family-task-copy"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="family-task-meta"><span><CalendarBlank size={17} aria-hidden="true" />{formatVietnamDateTime(task.due_at)}</span><span>{task.assignee_id ? memberLabel(members.find((member) => member.id === task.assignee_id)) : 'Chưa giao'}</span></div></div><div className="family-task-controls"><label><span className="sr-only">Trạng thái của {task.title}</span><select value={task.status} disabled={updating.current.has(task.id)} onChange={(event) => void changeStatus(task, event.target.value as FamilyTaskStatus)}>{(Object.keys(taskStatusLabels) as FamilyTaskStatus[]).map((value) => <option key={value} value={value}>{taskStatusLabels[value]}</option>)}</select></label>{isOwner && <div className="family-row-actions"><button className="family-icon-button" type="button" aria-label={`Sửa ${task.title}`} onClick={() => { setEditing(task); setEditorOpen(true) }}><PencilSimple size={19} /></button><button className="family-icon-button is-danger" type="button" aria-label={`Xóa ${task.title}`} onClick={() => setDeleting(task)}><Trash size={19} /></button></div>}</div></article>)}</div> : <div className="family-empty"><CheckCircle size={40} weight="duotone" aria-hidden="true" /><h3>Chưa có việc phù hợp</h3><p>{status || assigneeId ? 'Thử thay đổi bộ lọc để xem các việc khác.' : 'Khi có việc gia đình, danh sách sẽ xuất hiện tại đây.'}</p></div>}
    <TaskEditorDialog open={editorOpen} task={editing} members={members} onClose={() => setEditorOpen(false)} onSaved={(saved) => setTasks((current) => { const exists = current.some((item) => item.id === saved.id); return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current] })} onConflict={() => setConflict(true)} />
    <ActionStateDialog open={Boolean(deleting)} title="Xóa việc này?" description="Việc sẽ được xóa khỏi danh sách gia đình." confirmLabel="Xóa việc" cancelLabel="Giữ lại" busyLabel="Đang xóa..." successMessage="Đã xóa việc khỏi danh sách." danger onAction={async () => { if (deleting) await familyApi.deleteTask(deleting.id) }} onCompleted={() => { if (deleting) setTasks((current) => current.filter((item) => item.id !== deleting.id)) }} onClose={() => setDeleting(null)} errorMessage={familyErrorMessage} />
  </section>
}
