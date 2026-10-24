import { ArrowClockwise, SealCheck } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityApi } from '../api/community-api'
import { useImageUploads } from '../hooks/useImageUploads'
import { FileUploadCard } from '@/components/ui/file-upload-card'
import { friendlyError } from '../model/community-errors'
import { CommunitySelect } from './CommunitySelect'
import { RetryButton } from './FeedStatus'
import { communityLimits, communityTopics } from '../model/community-topics'
import type { AdminPostInput, CommunityPost, PostTopic } from '../model/community-types'

interface Props {
  /** null = viết bài mới. */
  editing: CommunityPost | null
  onClose: () => void
  onSaved: (post: CommunityPost, created: boolean) => void
  admin?: boolean
  onPublish?: (input: AdminPostInput) => Promise<CommunityPost>
}

/** Viết/sửa bài: văn bản + tối đa 4 ảnh. Dialog được mount lại mỗi lần mở nên state luôn sạch. */
export function PostComposerDialog({ editing, onClose, onSaved, admin = false, onPublish }: Props) {
  const [content, setContent] = useState(editing?.content ?? '')
  const [topic, setTopic] = useState<PostTopic>(editing?.topic ?? 'PREGNANCY')
  const [busy, setBusy] = useState(false)
  // Khoá bằng ref để bấm đúp nút Đăng bài không tạo hai bài.
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState(0)
  const [pinned, setPinned] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [version, setVersion] = useState(editing?.version ?? 0)
  const [conflict, setConflict] = useState(false)
  const [latest, setLatest] = useState<CommunityPost | null>(null)
  const uploads = useImageUploads(editing?.images ?? [])
  const trimmed = content.trim()
  const tooLong = trimmed.length > communityLimits.postMaxChars
  const canSubmit = Boolean(trimmed) && !tooLong && !uploads.busy && !uploads.failed && !busy && !conflict
  const dirty = content !== (editing?.content ?? '') || topic !== (editing?.topic ?? 'PREGNANCY') || pinned
    || JSON.stringify(uploads.imageIds) !== JSON.stringify(editing?.images.map((image) => image.id) ?? []) || uploads.busy || uploads.failed
  function requestClose() { if (!busy) { if (dirty) setDiscard(true); else onClose() } }

  async function submit() {
    if (!canSubmit || submittingRef.current || Date.now() < retryAt) return
    submittingRef.current = true
    setBusy(true)
    setError(null)
    try {
      const input = { content: trimmed, topic, image_ids: uploads.imageIds }
      const saved = editing
        ? await communityApi.updatePost(editing.id, { ...input, version })
        : admin && onPublish ? await onPublish({ ...input, pinned }) : await communityApi.createPost(input)
      onSaved(saved, !editing)
    } catch (reason) {
      const friendly = friendlyError(reason)
      setRetryAt(friendly.retryAt)
      const versionConflict = reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT' && Boolean(editing)
      setConflict(versionConflict)
      setError(versionConflict ? 'Bài viết đã thay đổi ở nơi khác. Nội dung và ảnh của bạn vẫn được giữ. Xem bản mới nhất trước khi quyết định lưu.' : friendly.message)
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  async function reloadLatest() {
    if (!editing || submittingRef.current || Date.now() < retryAt) return
    submittingRef.current = true; setBusy(true)
    try {
      const post = await communityApi.refreshPost(editing.id)
      setLatest(post); setVersion(post.version); setConflict(false); setError(null)
    } catch (reason) {
      const friendly = friendlyError(reason)
      setError(friendly.message); setRetryAt(friendly.retryAt)
    } finally { submittingRef.current = false; setBusy(false) }
  }

  return <><AccessibleDialog open animated title={editing ? 'Sửa bài viết' : admin ? 'Viết bài từ Ban quản trị' : 'Viết bài mới'} onClose={requestClose} busy={busy || discard} stable className="nm-community-composer"
    description={admin ? editing && editing.status !== 'APPROVED' ? 'Lưu chỉnh sửa bài viết. Trạng thái hiển thị theo kết quả kiểm duyệt.' : 'Bài viết được xuất bản ngay với nhãn Ban quản trị.' : editing?.status === 'APPROVED' ? 'Sau khi sửa, bài viết sẽ được duyệt lại trước khi hiển thị.' : 'Bài viết sẽ hiển thị sau khi quản trị viên duyệt.'}
    footer={<><button type="button" className="nm-secondary-action" onClick={requestClose} disabled={busy}>Huỷ</button>
      {retryAt > 0 ? <RetryButton retryAt={retryAt} onRetry={() => { setRetryAt(0); void submit() }} /> : <button type="button" className="nm-primary-action" disabled={!canSubmit} onClick={() => void submit()}>{busy ? 'Đang gửi…' : uploads.busy ? 'Đang tải ảnh…' : editing ? 'Lưu thay đổi' : admin ? 'Đăng ngay' : 'Đăng bài'}</button>}</>}>
    <div className="nm-community-composer__body">
      {admin && <p className="nm-community-official"><SealCheck size={17} weight="fill" aria-hidden />Ban quản trị NutriMom</p>}
      <CommunitySelect label="Chủ đề" value={topic} onChange={(value) => setTopic(value as PostTopic)} options={communityTopics} disabled={busy} />
      <label className="nm-community-field">Nội dung
        <textarea rows={6} disabled={busy} value={content} placeholder={admin ? 'Bạn muốn chia sẻ điều gì với cộng đồng?' : 'Mẹ muốn chia sẻ điều gì hôm nay?'} onChange={(event) => setContent(event.target.value)} aria-invalid={tooLong} />
        <span className={`nm-community-counter${tooLong ? ' is-over' : ''}`}>{trimmed.length}/{communityLimits.postMaxChars}</span>
      </label>

      <FileUploadCard files={uploads.items.map((item) => ({ id: item.key, name: item.name, size: item.size, previewUrl: item.previewUrl, status: item.status === 'done' ? 'completed' : item.status, error: item.error }))} onFilesChange={uploads.add} onFileRemove={uploads.remove} maxFiles={communityLimits.maxImages} disabled={busy}
        renderRetry={(file) => { const item = uploads.items.find((entry) => entry.key === file.id); return item?.retryAt ? <RetryButton retryAt={item.retryAt} onRetry={() => uploads.retry(file.id)} /> : <button type="button" className="nm-community-icon-button" aria-label="Tải lại ảnh" onClick={() => uploads.retry(file.id)}><ArrowClockwise size={16} /></button> }} />
      {uploads.notice && <p className="nm-community-error" role="alert">{uploads.notice}</p>}
      {uploads.failed && <p className="nm-community-muted">Có ảnh tải lên lỗi: bấm tải lại hoặc bỏ ảnh đó để đăng bài.</p>}
      {admin && !editing && <label className="nm-community-pin-choice"><input type="checkbox" checked={pinned} disabled={busy} onChange={(event) => setPinned(event.target.checked)} /><span><strong>Ghim bài này</strong><small>Hiển thị ở đầu bảng tin. Cộng đồng có tối đa 3 bài ghim.</small></span></label>}
      {error && <p className="nm-community-error" role="alert">{error}</p>}
      {conflict && <button type="button" className="nm-secondary-action" disabled={busy || Date.now() < retryAt} onClick={() => void reloadLatest()}>Xem phiên bản mới nhất, giữ bản nháp</button>}
      {latest && <details className="nm-community-muted"><summary>Bản mới trên máy chủ — bản nháp và ảnh của bạn vẫn được giữ</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{latest.content}</p><p>Kiểm tra và điều chỉnh bản nháp trước khi bấm Lưu thay đổi.</p></details>}
    </div>
  </AccessibleDialog>
    <AccessibleDialog animated open={discard} title="Bỏ bản nháp này?" description="Nội dung và ảnh chưa đăng sẽ không được lưu. Bạn có thể tiếp tục viết để giữ lại bản nháp." onClose={() => setDiscard(false)} className="nm-community-discard"
      footer={<><button type="button" className="nm-secondary-action" onClick={() => setDiscard(false)}>Tiếp tục viết</button><button type="button" className="nm-primary-action is-danger" onClick={onClose}>Bỏ thay đổi</button></>}><p className="nm-community-muted">{editing ? 'Bài đã đăng vẫn giữ nguyên nếu bạn bỏ những thay đổi này.' : 'Bài viết này chưa được đăng lên cộng đồng.'}</p></AccessibleDialog>
  </>
}
