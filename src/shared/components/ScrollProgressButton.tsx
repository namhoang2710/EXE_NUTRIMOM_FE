import { CaretUp } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const SCROLL_REVEAL_DISTANCE = 180

export function ScrollProgressButton() {
  const { pathname } = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let animationFrame = 0
    let heroObserver: IntersectionObserver | undefined
    const hero = document.querySelector<HTMLElement>('.home-hero')

    const updateScrollState = () => {
      animationFrame = 0
      const scrollableDistance = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      )
      const nextProgress = scrollableDistance > 0
        ? Math.min(Math.max(window.scrollY / scrollableDistance, 0), 1)
        : 0

      setProgress(nextProgress)

      if (!hero) {
        setVisible(scrollableDistance > 0 && window.scrollY >= SCROLL_REVEAL_DISTANCE)
      }
    }

    const requestScrollUpdate = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateScrollState)
      }
    }

    if (hero) {
      const headerHeight = document.querySelector<HTMLElement>('.landing-header')?.offsetHeight ?? 0
      heroObserver = new IntersectionObserver(([entry]) => {
        setVisible(entry.intersectionRatio < 0.5)
      }, {
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
        threshold: [0, 0.5, 1],
      })
      heroObserver.observe(hero)
    }

    updateScrollState()
    window.addEventListener('scroll', requestScrollUpdate, { passive: true })
    window.addEventListener('resize', requestScrollUpdate)

    return () => {
      heroObserver?.disconnect()
      window.removeEventListener('scroll', requestScrollUpdate)
      window.removeEventListener('resize', requestScrollUpdate)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [pathname])

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      className={`scroll-progress-button${visible ? ' is-visible' : ''}`}
      type="button"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Lên đầu trang"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <svg className="scroll-progress-ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="scroll-progress-ring-track" cx="32" cy="32" r="29" pathLength="100" />
        <circle
          className="scroll-progress-ring-value"
          cx="32"
          cy="32"
          r="29"
          pathLength="100"
          style={{ strokeDashoffset: 100 - progress * 100 }}
        />
      </svg>
      <span className="scroll-progress-button-core" aria-hidden="true">
        <CaretUp size={24} weight="bold" />
      </span>
    </button>
  )
}
