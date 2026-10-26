import { useEffect, useRef, type CSSProperties } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { Rating } from '@/components/reui/rating'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { ReviewSummary as Summary } from '../model/review-types'
import '../styles/reviews.css'

export function ReviewSummary({ summary }: { summary: Summary }) {
  const number = useMotionValue(0), target = summary.average ?? 0
  const label = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const unsubscribe = number.on('change', value => { if (label.current) label.current.textContent = value.toFixed(1) })
    const control = animate(number, target, { duration: reduced ? 0 : .7, ease: [.22, 1, .36, 1] })
    return () => { unsubscribe(); control.stop() }
  }, [number, reduced, target])
  return <section className="nm-review-summary" aria-label="Tổng hợp đánh giá NutriMom">
    <div className="nm-review-score">
      <strong aria-label={summary.total ? `${target.toFixed(1)} trên 5 sao` : 'Chưa có đánh giá'}>{summary.total ? <span ref={label} aria-hidden="true">{target.toFixed(1)}</span> : '—'}</strong>
      <Rating rating={target} size="sm" aria-label={summary.total ? `${target.toFixed(1)} trên 5 sao` : 'Chưa có điểm đánh giá'} />
      <span>{summary.total ? `Dựa trên ${summary.total.toLocaleString('vi-VN')} đánh giá` : 'Chưa có đánh giá'}</span>
    </div>
    <Separator />
    <div className="nm-review-distribution">{[5, 4, 3, 2, 1].map((star, index) => {
      const count = summary.by_rating[String(star) as keyof Summary['by_rating']]
      const percentage = summary.total ? count / summary.total * 100 : 0
      return <div key={star} className="nm-review-distribution-row"><span>{star}<span className="sr-only"> sao</span></span><Progress key={`${count}:${summary.total}`} value={percentage} aria-label={`${star} sao: ${count} đánh giá`} className="nm-review-distribution-progress" style={{ '--review-delay': `${index * 60}ms` } as CSSProperties} /><span>{count.toLocaleString('vi-VN')}</span></div>
    })}</div>
  </section>
}
