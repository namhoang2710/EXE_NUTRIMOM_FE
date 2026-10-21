import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import {
  lastGuidePage,
  nutritionGuide,
  readGuidePage,
  rememberGuidePage,
} from '../model/nutrition-guide'
import { NutritionButton } from './NutritionUI'
import { NutritionGuideIllustration } from './NutritionGuideIllustration'
import '../styles/nutrition-guide.css'

export function NutritionGuideDialog({
  open,
  onClose,
  accountId,
}: {
  open: boolean
  onClose: () => void
  accountId: string
}) {
  const [page, setPage] = useState(() => {
    try {
      return readGuidePage(localStorage, accountId)
    } catch {
      return 0
    }
  })
  const [direction, setDirection] = useState(1)
  const [changing, setChanging] = useState(false)
  const navigating = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const openRef = useRef(open)
  openRef.current = open
  const reduced = useReducedMotion()
  const current = nutritionGuide[page]
  useEffect(() => {
    navigating.current = false
    setChanging(false)
  }, [open])

  function go(next: number) {
    if (
      !open ||
      navigating.current ||
      next < 0 ||
      next > lastGuidePage ||
      next === page
    )
      return
    navigating.current = true
    setChanging(true)
    setDirection(next > page ? 1 : -1)
    setPage(next)
    try {
      rememberGuidePage(localStorage, accountId, next)
    } catch {
      /* Keep this visit usable without browser storage. */
    }
  }
  function settled() {
    navigating.current = false
    setChanging(false)
    if (!openRef.current || !heading.current) return
    const body = heading.current.closest('.nm-dialog-body')
    if (body) body.scrollTop = 0
    heading.current.focus({ preventScroll: true })
  }
  return (
    <AccessibleDialog
      open={open}
      animated
      title="Hướng dẫn dinh dưỡng"
      description="Chào mừng bạn đến với tính năng cá nhân hóa từng bữa ăn."
      closeLabel="Đóng hướng dẫn"
      onClose={onClose}
      initialFocusRef={heading}
      className="nutrition-dialog nutrition-guide"
      footer={
        <>
          <NutritionButton
            disabled={page === 0 || changing}
            onClick={() => go(page - 1)}
          >
            <ArrowLeft size={17} />
            Trang trước
          </NutritionButton>
          <span
            className="nutrition-guide-counter"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span aria-hidden="true">
              {page}
              <span>/{lastGuidePage}</span>
            </span>
            <span className="sr-only">
              {page === 0
                ? 'Trang chào mừng'
                : `Trang ${page} trên ${lastGuidePage}`}
              : {current.title}
            </span>
          </span>
          <NutritionButton
            className="is-primary"
            disabled={changing}
            onClick={() => (page === lastGuidePage ? onClose() : go(page + 1))}
          >
            {page === lastGuidePage ? (
              <>
                Đã hiểu
                <Check size={17} />
              </>
            ) : (
              <>
                Trang sau
                <ArrowRight size={17} />
              </>
            )}
          </NutritionButton>
        </>
      }
    >
      <div className="nutrition-guide-toolbar">
        <span className="nutrition-eyebrow">
          {page === 0 ? 'Mình cùng bắt đầu nhé' : 'Từng bước cùng bạn'}
        </span>
        {page > 0 && (
          <NutritionButton
            className="nutrition-text-link"
            disabled={changing}
            onClick={() => go(0)}
          >
            <ArrowCounterClockwise size={15} />
            Xem lại từ đầu
          </NutritionButton>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.article
          key={current.id}
          data-guide-page={page}
          custom={direction}
          className="nutrition-guide-page"
          variants={{
            enter: (dir: number) => ({
              opacity: reduced ? 1 : 0,
              x: reduced ? 0 : dir * 16,
            }),
            ready: { opacity: 1, x: 0 },
            exit: (dir: number) => ({
              opacity: reduced ? 1 : 0,
              x: reduced ? 0 : -dir * 16,
            }),
          }}
          initial="enter"
          animate="ready"
          exit="exit"
          transition={{ duration: reduced ? 0 : 0.18 }}
          onAnimationComplete={(phase) => {
            if (phase === 'ready') settled()
          }}
        >
          <h3 ref={heading} tabIndex={-1}>
            {current.title}
          </h3>
          <p className="nutrition-guide-intro">{current.intro}</p>
          <NutritionGuideIllustration scene={current.id} />
          <ol className="nutrition-guide-steps">
            {current.steps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <aside className="nutrition-guide-result">
            <CheckCircle size={21} weight="duotone" aria-hidden="true" />
            <div>
              <h4>Bạn sẽ thấy gì?</h4>
              <p>{current.expected}</p>
            </div>
          </aside>
        </motion.article>
      </AnimatePresence>
    </AccessibleDialog>
  )
}
