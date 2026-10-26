import { ArrowClockwise, ChatsCircle } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'

/** Nút Thử lại bị khoá tới mốc Retry-After (429) để người dùng không bấm dồn. */
export function RetryButton({ retryAt, onRetry }: { retryAt: number; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const waiting = retryAt > now
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(retryAt - now, 1000))
    return () => window.clearTimeout(timer)
  }, [waiting, retryAt, now])
  return <button type="button" className="nm-secondary-action" disabled={waiting} onClick={onRetry}>
    <ArrowClockwise size={17} aria-hidden="true" />{waiting ? `Thử lại sau ${Math.ceil((retryAt - now) / 1000)} giây` : 'Thử lại'}
  </button>
}

export function FeedError({ message, retryAt, onRetry }: { message: string; retryAt: number; onRetry: () => void }) {
  return <div className="nm-community-state" role="alert"><p>{message}</p><RetryButton retryAt={retryAt} onRetry={onRetry} /></div>
}

export function FeedEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="nm-community-state is-empty">
    <ChatsCircle size={40} weight="duotone" aria-hidden="true" /><h2>{title}</h2><p>{text}</p>{action}
  </div>
}
