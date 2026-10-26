import { useCallback, useEffect, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError } from '../model/community-errors'
import { communityLimits } from '../model/community-topics'
import type { CommunityImage } from '../model/community-types'
import { compressImage, validateImageFile } from '../model/image-compress'

export type UploadStatus = 'queued' | 'compressing' | 'uploading' | 'done' | 'error'

export interface UploadItem {
  key: string
  previewUrl: string
  status: UploadStatus
  error?: string
  retryAt?: number
  /** id ảnh trên BE sau khi upload xong. */
  imageId?: string
  file?: File
  name: string
  size?: number
}

let sequence = 0

/**
 * Ảnh của bài viết. Tải **tuần tự** từng ảnh (không bắn song song) để không dồn request và không
 * vượt rate limit upload; mỗi ảnh có trạng thái và nút thử lại riêng. URL xem trước được thu hồi khi
 * xoá ảnh hoặc unmount để không rò bộ nhớ.
 */
export function useImageUploads(initial: CommunityImage[] = []) {
  const [items, setItems] = useState<UploadItem[]>(() => initial.map((image) => ({
    key: `existing-${image.id}`, previewUrl: image.url, status: 'done', imageId: image.id, name: `Ảnh ${initial.indexOf(image) + 1}`,
  })))
  const [notice, setNotice] = useState<string | null>(null)
  const itemsRef = useRef(items)
  const runningRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const ownedUrls = useRef(new Set<string>())
  const mounted = useRef(true)
  const cooldown = useRef(0)

  // Cập nhật ref ngay (không chờ render) để vòng tải tuần tự luôn thấy trạng thái mới nhất.
  const update = (key: string, patch: Partial<UploadItem>) => {
    itemsRef.current = itemsRef.current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    setItems(itemsRef.current)
  }

  const pump = useCallback(async () => {
    if (runningRef.current) return
    if (Date.now() < cooldown.current) {
      itemsRef.current = itemsRef.current.map((item) => item.status === 'queued' ? { ...item, status: 'error', error: 'Vui lòng chờ trước khi tải lại ảnh.', retryAt: cooldown.current } : item)
      setItems(itemsRef.current)
      return
    }
    runningRef.current = true
    try {
      for (;;) {
        const next = itemsRef.current.find((item) => item.status === 'queued')
        if (!next?.file) break
        update(next.key, { status: 'compressing', error: undefined })
        const blob = await compressImage(next.file)
        if (!mounted.current) return
        update(next.key, { status: 'uploading' })
        const controller = new AbortController()
        controllerRef.current = controller
        try {
          const uploaded = await communityApi.uploadImage(blob, next.file.name.replace(/\.[^.]+$/, '') + '.jpg', controller.signal)
          update(next.key, { status: 'done', imageId: uploaded.id, file: undefined })
        } catch (reason) {
          if (controller.signal.aborted) return
          const error = friendlyError(reason)
          update(next.key, { status: 'error', error: error.message })
          // 429: dừng cả hàng đợi, người dùng tự bấm thử lại sau.
          if (error.status === 429) {
            cooldown.current = error.retryAt
            itemsRef.current = itemsRef.current.map((item) => (item.status === 'queued' || item.key === next.key ? { ...item, status: 'error', error: error.message, retryAt: error.retryAt } : item))
            setItems(itemsRef.current)
            break
          }
        }
      }
    } finally {
      runningRef.current = false
    }
  }, [])

  const add = useCallback((files: FileList | File[]) => {
    const room = communityLimits.maxImages - itemsRef.current.length
    const accepted: UploadItem[] = []
    const problems: string[] = []
    for (const file of Array.from(files)) {
      if (accepted.length >= room) { problems.push(`Tối đa ${communityLimits.maxImages} ảnh mỗi bài.`); break }
      const invalid = validateImageFile(file)
      if (invalid) { problems.push(`${file.name}: ${invalid}`); continue }
      const previewUrl = URL.createObjectURL(file)
      ownedUrls.current.add(previewUrl)
      accepted.push({ key: `new-${++sequence}`, previewUrl, status: 'queued', file, name: file.name, size: file.size })
    }
    setNotice(problems.length ? problems.join(' ') : null)
    if (accepted.length) {
      itemsRef.current = [...itemsRef.current, ...accepted]
      setItems(itemsRef.current)
      void pump()
    }
  }, [pump])

  const remove = useCallback((key: string) => {
    const item = itemsRef.current.find((entry) => entry.key === key)
    if (item && ownedUrls.current.has(item.previewUrl)) {
      URL.revokeObjectURL(item.previewUrl)
      ownedUrls.current.delete(item.previewUrl)
    }
    itemsRef.current = itemsRef.current.filter((entry) => entry.key !== key)
    setItems(itemsRef.current)
  }, [])

  const retry = useCallback((key: string) => {
    if (Date.now() < cooldown.current) return
    itemsRef.current = itemsRef.current.map((item) => (item.key === key && item.file ? { ...item, status: 'queued', error: undefined } : item))
    setItems(itemsRef.current)
    void pump()
  }, [pump])

  useEffect(() => {
    mounted.current = true
    const urls = ownedUrls.current
    return () => {
      mounted.current = false
      controllerRef.current?.abort()
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  const busy = items.some((item) => item.status === 'queued' || item.status === 'compressing' || item.status === 'uploading')
  const failed = items.some((item) => item.status === 'error')
  const imageIds = items.filter((item) => item.status === 'done' && item.imageId).map((item) => item.imageId as string)
  return { items, add, remove, retry, busy, failed, imageIds, notice }
}
