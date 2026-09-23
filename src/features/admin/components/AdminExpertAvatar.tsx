import { useEffect, useState } from 'react'
import { getInitials } from '../model/admin-formatters'

export function AdminExpertAvatar({ name, url, size = 'small' }: { name: string; url: string | null; size?: 'small' | 'large' }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  useEffect(() => setFailedUrl(null), [url])
  const showImage = Boolean(url && failedUrl !== url)
  return <span className={`admin-avatar admin-expert-avatar ${size}`}>
    {showImage ? <img src={url ?? ''} alt={`${name} avatar`} onError={() => setFailedUrl(url)} /> : <span aria-hidden="true">{getInitials(name) || '?'}</span>}
  </span>
}
