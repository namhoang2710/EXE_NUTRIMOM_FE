import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'

const Panel = lazy(() => import('./FooterReviewsPanel').then(module => ({ default: module.FooterReviewsPanel })))
export function FooterReviews() {
  const target = useRef<HTMLDivElement>(null)
  const visible = useInView(target, { margin: '200px' })
  const [activated, setActivated] = useState(false)
  useEffect(() => { if (visible) setActivated(true) }, [visible])
  return <div ref={target} className="landing-footer-column nm-footer-reviews"><h2>Đánh giá NutriMom</h2><Suspense fallback={<p role="status">Đang tải đánh giá…</p>}>{activated ? <Panel visible={visible} /> : <p className="nm-review-muted">Trải nghiệm được chia sẻ bởi khách hàng.</p>}</Suspense></div>
}
