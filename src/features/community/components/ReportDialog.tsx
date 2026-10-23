import { useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { communityApi } from '../api/community-api'
import { friendlyError } from '../model/community-errors'
import { communityLimits, reportReasons } from '../model/community-topics'
import type { ReportReason } from '../model/community-types'
import { RetryButton } from './FeedStatus'

interface Props {
  postId: string | null
  onClose: () => void
}

/** Báo cáo bài viết. Báo cáo lặp lại cũng là thành công (BE không tạo bản ghi trùng). */
export function ReportDialog({ postId, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>('SPAM')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const sendingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [retryAt, setRetryAt] = useState(0)

  function close() {
    if (busy) return
    setReason('SPAM'); setNote(''); setError(null); setDone(false); setRetryAt(0)
    onClose()
  }

  async function submit() {
    if (!postId || sendingRef.current || Date.now() < retryAt) return
    sendingRef.current = true
    setBusy(true)
    setError(null)
    try {
      await communityApi.report(postId, reason, note.trim())
      setDone(true)
    } catch (reason) {
      const error = friendlyError(reason); setError(error.message); setRetryAt(error.retryAt)
    } finally {
      sendingRef.current = false
      setBusy(false)
    }
  }

  return <AccessibleDialog animated open={postId !== null} title="Báo cáo bài viết" description="Báo cáo được gửi cho quản trị viên. Người đăng không biết ai đã báo cáo." onClose={close} busy={busy}
    footer={done
      ? <button type="button" className="nm-primary-action" onClick={close}>Đóng</button>
      : <><button type="button" className="nm-secondary-action" onClick={close} disabled={busy}>Huỷ</button>{retryAt ? <RetryButton retryAt={retryAt} onRetry={() => void submit()} /> : <button type="button" className="nm-primary-action" onClick={() => void submit()} disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>}</>}>
    {done
      ? <p role="status" className="nm-community-success">Cảm ơn bạn! Báo cáo đã được ghi nhận và sẽ được xem xét.</p>
      : <div className="nm-community-report">
        <fieldset>
          <legend>Lý do</legend>
          {reportReasons.map((item) => <label key={item.value} className="nm-community-radio">
            <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />{item.label}
          </label>)}
        </fieldset>
        <label className="nm-community-field">Ghi chú (không bắt buộc)
          <textarea rows={3} value={note} maxLength={communityLimits.noteMaxChars} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error && <p className="nm-community-error" role="alert">{error}</p>}
      </div>}
  </AccessibleDialog>
}
