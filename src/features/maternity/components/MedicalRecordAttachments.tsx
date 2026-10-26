import { DownloadSimple, FileText } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { usePaymentCooldown } from '@/features/payment/hooks/usePaymentCooldown'
import { filesApi, recordsApi } from '@/features/maternity/api/domain-api'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { MedicalRecord } from '@/types/domain'
import { resolveRecordAttachments, previewableAttachments } from '../model/record-attachments'
import { createObjectUrlLease } from '../model/object-url-lease'

type Attachment = NonNullable<MedicalRecord['attachments']>[number]

interface Props {
  recordId: string
  attachmentCount: number
  attachments?: Attachment[]
  onDownload: (fileId: string, name?: string) => void
  initiallyOpen?: boolean
}

export function MedicalRecordAttachments({ recordId, attachmentCount, attachments, onDownload, initiallyOpen = false }: Props) {
  const cooldown = usePaymentCooldown('medical-records')
  const cooldownRef = useRef(cooldown)
  cooldownRef.current = cooldown
  const panelId = useId()
  const [expanded, setExpanded] = useState(initiallyOpen)
  const [loading, setLoading] = useState(false)
  const [detailFailed, setDetailFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [files, setFiles] = useState<Attachment[]>(attachments ?? [])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setExpanded(initiallyOpen)
    setSelected(null)
  }, [recordId, initiallyOpen])

  useEffect(() => {
    setFiles([]); setPreviews({}); setSelected(null); setFailed(false); setDetailFailed(false)
    if (!expanded || attachmentCount === 0) return
    if (cooldownRef.current.blocked) { setLoading(false); setFailed(true); setDetailFailed(true); return }
    setLoading(true)
    let active = true
    const controller = new AbortController()
    const objectUrls = createObjectUrlLease()

    async function load() {
      try {
        let available: Attachment[]
        try {
          available = await resolveRecordAttachments({ recordId, count: attachmentCount, opened: expanded, provided: attachments }, (id) => recordsApi.get(id, controller.signal))
        } catch (reason) { if (active) { cooldownRef.current.handleRateLimit(reason); setDetailFailed(true) } throw reason }
        if (!active) return
        setFiles(available)
        const results = await Promise.allSettled(previewableAttachments(available).map(async (file) => {
          const url = await filesApi.previewImage(file.id, controller.signal)
          if (!objectUrls.retain(url)) throw new Error('Đã đóng hồ sơ.')
          return [file.id, url] as const
        }))
        if (!active) return
        setPreviews(Object.fromEntries(results.filter((result): result is PromiseFulfilledResult<readonly [string, string]> => result.status === 'fulfilled').map((result) => result.value)))
        for (const result of results) if (result.status === 'rejected') { cooldownRef.current.handleRateLimit(result.reason); setFailed(true) }
      } catch {
        if (active) setFailed(true)
      } finally { if (active) setLoading(false) }
    }

    void load()
    return () => {
      active = false
      controller.abort()
      objectUrls.release()
    }
  }, [recordId, attachmentCount, attachments, expanded, retry])

  if (attachmentCount === 0) return null
  const selectedFile = files.find((file) => file.id === selected)

  return <div className="record-attachments"><button className="attachment-button" type="button" disabled={!expanded && cooldown.remaining > 0} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Đóng đính kèm' : `Mở đính kèm (${attachmentCount})`}</button>
    {expanded && <div id={panelId} aria-busy={loading} className="record-attachment-list">
    {loading && <small role="status">Đang tải tệp đính kèm...</small>}
    {files.map((file) => <div className="record-attachment" key={file.id}>
      {previews[file.id] ? <button className="record-thumbnail" type="button" onClick={() => setSelected(file.id)} aria-label={`Xem ảnh ${file.file_name}`}><img src={previews[file.id]} alt={file.file_name} width="96" height="72" loading="lazy" /></button> : <span className="record-file-icon"><FileText size={22} aria-hidden="true" /></span>}
      <span className="record-file-name">{file.file_name}</span>
      <button className="attachment-button" type="button" disabled={cooldown.remaining > 0} onClick={() => onDownload(file.id, file.file_name)} aria-label={`Tải ${file.file_name}`}><DownloadSimple size={16} aria-hidden="true" />Tải tệp</button>
    </div>)}
    {failed && <div role="alert"><small className="field-hint">{detailFailed ? 'Không thể tải danh sách tệp đính kèm.' : 'Không thể xem trước một số ảnh. Bạn vẫn có thể tải tệp.'}</small><button className="attachment-button" type="button" disabled={loading || cooldown.remaining > 0} onClick={() => setRetry((value) => value + 1)}>{cooldown.remaining > 0 ? `Thử lại sau ${cooldown.remaining} giây` : 'Thử lại'}</button></div>}
    {selectedFile && previews[selectedFile.id] && <AccessibleDialog open title={`Xem ảnh ${selectedFile.file_name}`} onClose={() => setSelected(null)} className="record-image-dialog" footer={<button className="secondary-button" type="button" onClick={() => onDownload(selectedFile.id, selectedFile.file_name)}><DownloadSimple size={18} />Tải ảnh gốc</button>}><img src={previews[selectedFile.id]} alt={selectedFile.file_name} /></AccessibleDialog>}
    </div>}
  </div>
}
