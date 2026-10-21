import { ArrowClockwise, ImageSquare, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityApi } from '../api/community-api'
import { useImageUploads, type UploadItem } from '../hooks/useImageUploads'
import { friendlyError } from '../model/community-errors'
import { communityLimits, communityTopics } from '../model/community-topics'
import type { CommunityPost, PostTopic } from '../model/community-types'

interface Props {
  /** null = viết bài mới. */
  editing: CommunityPost | null
  onClose: () => void
  onSaved: (post: CommunityPost, created: boolean) => void
}

const statusText: Record<UploadItem['status'], string> = {
  queued: 'Đang chờ', compressing: 'Đang nén…', uploading: 'Đang tải lên…', done: 'Xong', error: 'Lỗi',
}

/** Viết/sửa bài: văn bản + tối đa 4 ảnh. Dialog được mount lại mỗi lần mở nên state luôn sạch. */
export function PostComposerDialog({ editing, onClose, onSaved }: Props) {
  const [content, setContent] = useState(editing?.content ?? '')
  const [topic, setTopic] = useState<PostTopic>(editing?.topic ?? 'PREGNANCY')
  const [busy, setBusy] = useState(false)
  // Khoá bằng ref để bấm đúp nút Đăng bài không tạo hai bài.
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const uploads = useImageUploads(editing?.images ?? [])
  const fileRef = useRef<HTMLInputElement>(null)
  const trimmed = content.trim()
  const tooLong = trimmed.length > communityLimits.postMaxChars
  const canSubmit = Boolean(trimmed) && !tooLong && !uploads.busy && !uploads.failed && !busy

  async function submit() {
    if (!canSubmit || submittingRef.current) return
    submittingRef.current = true
    setBusy(true)
    setError(null)
    try {
      const input = { content: trimmed, topic, image_ids: uploads.imageIds }
      const saved = editing
        ? await communityApi.updatePost(editing.id, { ...input, version: editing.version })
        : await communityApi.createPost(input)
      onSaved(saved, !editing)
    } catch (reason) {
      const friendly = friendlyError(reason)
      setError(friendly.status === 409 ? 'Bài viết đã được thay đổi ở nơi khác. Hãy đóng và mở lại để sửa bản mới nhất.' : friendly.message)
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  return <AccessibleDialog open title={editing ? 'Sửa bài viết' : 'Viết bài mới'} onClose={onClose} busy={busy} stable className="nm-community-composer"
    description={editing?.status === 'APPROVED' ? 'Sau khi sửa, bài viết sẽ được duyệt lại trước khi hiển thị.' : 'Bài viết sẽ hiển thị sau khi quản trị viên duyệt.'}
    footer={<><button type="button" className="nm-secondary-action" onClick={onClose} disabled={busy}>Huỷ</button>
      <button type="button" className="nm-primary-action" disabled={!canSubmit} onClick={() => void submit()}>{busy ? 'Đang gửi…' : uploads.busy ? 'Đang tải ảnh…' : editing ? 'Lưu thay đổi' : 'Đăng bài'}</button></>}>
    <div className="nm-community-composer__body">
      <label className="nm-community-field">Chủ đề
        <select value={topic} onChange={(event) => setTopic(event.target.value as PostTopic)}>
          {communityTopics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="nm-community-field">Nội dung
        <textarea rows={6} value={content} placeholder="Mẹ muốn chia sẻ điều gì hôm nay?" onChange={(event) => setContent(event.target.value)} aria-invalid={tooLong} />
        <span className={`nm-community-counter${tooLong ? ' is-over' : ''}`}>{trimmed.length}/{communityLimits.postMaxChars}</span>
      </label>

      <div className="nm-community-uploads">
        {uploads.items.map((item) => <figure key={item.key} className={`nm-community-upload is-${item.status}`}>
          <img src={item.previewUrl} alt="" />
          <figcaption role={item.status === 'error' ? 'alert' : undefined}>{item.status === 'error' ? item.error : statusText[item.status]}</figcaption>
          <div className="nm-community-upload__tools">
            {item.status === 'error' && item.file && <button type="button" className="nm-community-icon-button" aria-label="Tải lại ảnh" onClick={() => uploads.retry(item.key)}><ArrowClockwise size={16} /></button>}
            <button type="button" className="nm-community-icon-button" aria-label="Bỏ ảnh" disabled={item.status === 'compressing' || item.status === 'uploading'} onClick={() => uploads.remove(item.key)}><X size={16} /></button>
          </div>
        </figure>)}
        {uploads.items.length < communityLimits.maxImages && <button type="button" className="nm-community-upload is-add" onClick={() => fileRef.current?.click()}>
          <ImageSquare size={26} aria-hidden="true" /><span>Thêm ảnh</span><small>{uploads.items.length}/{communityLimits.maxImages}</small>
        </button>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { if (event.target.files) uploads.add(event.target.files); event.target.value = '' }} />
      </div>
      {uploads.notice && <p className="nm-community-error" role="alert">{uploads.notice}</p>}
      {uploads.failed && <p className="nm-community-muted">Có ảnh tải lên lỗi: bấm tải lại hoặc bỏ ảnh đó để đăng bài.</p>}
      {error && <p className="nm-community-error" role="alert">{error}</p>}
    </div>
  </AccessibleDialog>
}
