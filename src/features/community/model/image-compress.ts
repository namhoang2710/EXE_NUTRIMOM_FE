import { communityLimits } from './community-topics.ts'

export const COMPRESS_MAX_EDGE = 2048
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Kích thước sau khi thu nhỏ để cạnh dài nhất không vượt `maxEdge` (không phóng to ảnh nhỏ). */
export function fitWithin(width: number, height: number, maxEdge = COMPRESS_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Kiểm tra trước khi gửi; BE vẫn kiểm tra lại nội dung thật của file. */
export function validateImageFile(file: Pick<File, 'type' | 'size'>) {
  if (!ACCEPTED.includes(file.type)) return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'
  if (file.size > communityLimits.maxImageBytes) return 'Ảnh vượt quá 10 MB.'
  if (file.size === 0) return 'Ảnh bị rỗng.'
  return null
}

/**
 * Nén trên trình duyệt trước khi upload: giảm băng thông và thời gian xử lý ở BE. Lỗi giải mã
 * (ảnh hỏng, trình duyệt cũ) thì gửi nguyên file để BE quyết định.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const size = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size.width, size.height)
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    canvas.width = 0
    canvas.height = 0
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
