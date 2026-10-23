import { useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { CommunityImage } from '../model/community-types'

/** Lưới 1–4 ảnh; ảnh tải lười, có kích thước sẵn để không giật layout; bấm để xem lớn. */
export function PostImages({ images }: { images: CommunityImage[] }) {
  const [viewing, setViewing] = useState<CommunityImage | null>(null)
  if (!images.length) return null
  return <>
    <div className={`nm-community-images is-${Math.min(images.length, 4)}`}>
      {images.map((image, index) => <button key={image.id} type="button" className="nm-community-image" onClick={() => setViewing(image)} aria-label={`Xem ảnh ${index + 1}`}>
        <img src={image.url} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" />
      </button>)}
    </div>
    <AccessibleDialog animated open={viewing !== null} title="Xem ảnh" onClose={() => setViewing(null)} className="nm-community-viewer">
      {viewing && <img src={viewing.url} alt="" width={viewing.width} height={viewing.height} decoding="async" />}
    </AccessibleDialog>
  </>
}
