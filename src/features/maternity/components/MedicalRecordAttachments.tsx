import { DownloadSimple, FileText, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { filesApi, recordsApi } from '@/features/maternity/api/domain-api'
import type { MedicalRecord } from '@/types/domain'

type Attachment = NonNullable<MedicalRecord['attachments']>[number]
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface Props {
  recordId: string
  attachmentCount: number
  attachments?: Attachment[]
  onDownload: (fileId: string) => void
}

export function MedicalRecordAttachments({ recordId, attachmentCount, attachments, onDownload }: Props) {
  const [files, setFiles] = useState<Attachment[]>(attachments ?? [])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selected) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [selected])

  useEffect(() => {
    if (attachmentCount === 0) return
    let active = true
    const controller = new AbortController()
    const objectUrls: string[] = []

    async function load() {
      try {
        const available = attachments?.length ? attachments : (await recordsApi.get(recordId)).attachments ?? []
        if (!active) return
        setFiles(available)
        const results = await Promise.allSettled(available.filter((file) => imageTypes.has(file.mime_type) && file.status === 'READY').map(async (file) => {
          const url = await filesApi.previewImage(file.id, controller.signal)
          if (!active) { URL.revokeObjectURL(url); throw new Error('Đã đóng hồ sơ.') }
          objectUrls.push(url)
          return [file.id, url] as const
        }))
        if (!active) return
        setPreviews(Object.fromEntries(results.filter((result): result is PromiseFulfilledResult<readonly [string, string]> => result.status === 'fulfilled').map((result) => result.value)))
        if (results.some((result) => result.status === 'rejected')) setFailed(true)
      } catch {
        if (active) setFailed(true)
      }
    }

    void load()
    return () => {
      active = false
      controller.abort()
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [recordId, attachmentCount, attachments])

  if (attachmentCount === 0) return null
  const selectedFile = files.find((file) => file.id === selected)

  return <div className="record-attachments">
    {files.map((file) => <div className="record-attachment" key={file.id}>
      {previews[file.id] ? <button className="record-thumbnail" type="button" onClick={() => setSelected(file.id)} aria-label={`Xem ảnh ${file.file_name}`}><img src={previews[file.id]} alt={file.file_name} width="96" height="72" loading="lazy" /></button> : <span className="record-file-icon"><FileText size={22} aria-hidden="true" /></span>}
      <span className="record-file-name">{file.file_name}</span>
      <button className="attachment-button" type="button" onClick={() => onDownload(file.id)} aria-label={`Tải ${file.file_name}`}><DownloadSimple size={16} aria-hidden="true" />Tải tệp</button>
    </div>)}
    {failed && <small className="field-hint">Không thể xem trước một số ảnh. Bạn vẫn có thể tải tệp.</small>}
    {selectedFile && previews[selectedFile.id] && createPortal(<div className="record-image-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="record-image-viewer" role="dialog" aria-modal="true" aria-label={`Xem ảnh ${selectedFile.file_name}`} onClick={(event) => event.stopPropagation()}><div className="record-image-toolbar"><strong>{selectedFile.file_name}</strong><div><button type="button" onClick={() => onDownload(selectedFile.id)}><DownloadSimple size={18} />Tải ảnh gốc</button><button type="button" aria-label="Đóng ảnh" onClick={() => setSelected(null)}><X size={20} /></button></div></div><img src={previews[selectedFile.id]} alt={selectedFile.file_name} /></section></div>, document.body)}
  </div>
}
