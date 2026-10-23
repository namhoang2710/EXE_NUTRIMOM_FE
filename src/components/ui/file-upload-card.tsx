'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle, CloudArrowUp, Trash, X, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Progress } from './progress'
import './file-upload-card.css'

export interface UploadedFile {
  id: string
  name: string
  size?: number
  previewUrl?: string
  status: 'queued' | 'compressing' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface Props {
  files: UploadedFile[]
  onFilesChange: (files: File[]) => void
  onFileRemove: (id: string) => void
  renderRetry?: (file: UploadedFile) => ReactNode
  maxFiles?: number
  disabled?: boolean
  className?: string
}

const statusLabels = { queued: 'Đang chờ', compressing: 'Đang chuẩn bị ảnh…', uploading: 'Đang tải lên…', completed: 'Xong', error: 'Tải lên thất bại' }
const sizeLabel = (bytes?: number) => bytes === undefined ? 'Ảnh đã đính kèm' : bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Adapted from the supplied 21st.dev card. Upload state comes from the real request, never a demo timer. */
export function FileUploadCard({ files, onFilesChange, onFileRemove, renderRetry, maxFiles = 4, disabled = false, className }: Props) {
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const reduced = useReducedMotion()
  const full = files.length >= maxFiles
  return <section className={cn('nm-file-upload', className)} aria-labelledby={id}>
    <header className="nm-file-upload__header"><span className="nm-file-upload__icon"><CloudArrowUp size={22} aria-hidden /></span><div><h3 id={id}>Ảnh bài viết</h3><p>Thêm ảnh để câu chuyện của bạn sinh động hơn.</p></div><span className="nm-file-upload__count">{files.length}/{maxFiles}</span></header>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={disabled || full} onChange={(event) => { if (event.target.files?.length) onFilesChange(Array.from(event.target.files)); event.target.value = '' }} />
    <div className={cn('nm-file-upload__drop', dragging && 'is-dragging', full && 'is-full')} onDragOver={(event) => { event.preventDefault(); if (!disabled && !full) setDragging(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled && !full && event.dataTransfer.files.length) onFilesChange(Array.from(event.dataTransfer.files)) }}>
      <CloudArrowUp size={30} aria-hidden /><strong>{full ? 'Đã chọn đủ ảnh' : 'Kéo thả ảnh vào đây'}</strong><p>JPEG, PNG, WebP · tối đa 10 MB/ảnh · {maxFiles} ảnh/bài</p>
      <Button type="button" variant="outline" size="sm" disabled={disabled || full} onClick={() => input.current?.click()}>Chọn ảnh</Button>
    </div>
    <ul className="nm-file-upload__list" aria-label="Ảnh đính kèm"><AnimatePresence initial={false}>{files.map((file) => {
      const working = file.status === 'queued' || file.status === 'compressing' || file.status === 'uploading'
      return <motion.li key={file.id} layout={reduced ? false : 'position'} initial={reduced ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : 12 }} transition={{ duration: reduced ? 0 : .18 }} className={cn('nm-file-upload__file', file.status === 'error' && 'is-error')} data-upload-state={file.status}>
        {file.previewUrl && <img src={file.previewUrl} alt={`Xem trước ${file.name}`} width={48} height={48} />}
        <div className="nm-file-upload__meta"><strong title={file.name}>{file.name}</strong><div className="nm-file-upload__status"><span>{sizeLabel(file.size)}</span><span className={file.status === 'completed' ? 'is-complete' : ''} role="status">{statusLabels[file.status]}</span></div>
          {working && <Progress value={null} aria-label={`Đang tải ${file.name}`} className="nm-file-upload__progress" />}
          {file.status === 'error' && <p role="alert">{file.error || 'Vui lòng thử lại hoặc bỏ ảnh này.'}</p>}
        </div>
        <div className="nm-file-upload__tools">{file.status === 'completed' && <CheckCircle className="nm-file-upload__complete" size={19} weight="fill" aria-hidden />}{file.status === 'error' && <><WarningCircle size={18} aria-hidden />{renderRetry?.(file)}</>}
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ ảnh ${file.name}`} disabled={disabled || file.status === 'compressing' || file.status === 'uploading'} onClick={() => onFileRemove(file.id)}>{file.status === 'completed' ? <Trash size={17} /> : <X size={17} />}</Button>
        </div>
      </motion.li>
    })}</AnimatePresence></ul>
  </section>
}
