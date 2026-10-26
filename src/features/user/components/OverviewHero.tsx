import { ArrowDown, ArrowUpRight, Pause, Play } from '@phosphor-icons/react'
import { useContext, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { createHeroVideoPlayback, type HeroVideoState } from '../model/hero-video'
import '@/styles/fonts.css'
import '@/styles/theme.css'
import '../styles/overview-hero.css'

import { OverviewEntryContext } from '../model/overview-entry-context'

const movie = `${import.meta.env.BASE_URL}media/overview/welcome-landscape-v2.mp4`
const poster = `${import.meta.env.BASE_URL}media/overview/welcome-landscape-v2.webp`

export function OverviewHero({
  title,
  subtitle,
  name,
  error,
  onRetry,
}: {
  title?: string
  subtitle: string
  name?: string | null
  error?: string
  onRetry?: () => void
}) {
  const root = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null)
  const entry = useContext(OverviewEntryContext)
  const reducedMotion = useReducedMotion()
  const [playbackState, setPlaybackState] = useState<HeroVideoState>('idle')
  const playbackRef = useRef<ReturnType<typeof createHeroVideoPlayback> | null>(null)
  const userPaused = useRef(false)
  const userRequested = useRef(false)
  const reveal = entry === 'stable' || entry === 'ready'
  const emphasized = name && title?.endsWith(name) ? name : null
  const lead = emphasized
    ? title?.slice(0, -emphasized.length).trimEnd()
    : title

  useEffect(() => {
    const element = video.current,
      section = root.current
    if (!element || !section) return
    let inView = !('IntersectionObserver' in window),
      pageActive = true
    const playback = createHeroVideoPlayback(element, {
      source: movie,
      onState: setPlaybackState,
      // Give text, navigation and the poster first use of the connection/main thread.
      defer: (task) => {
        if (typeof window.requestIdleCallback === 'function') {
          const handle = window.requestIdleCallback(task, { timeout: 1200 })
          return () => window.cancelIdleCallback(handle)
        }
        const handle = window.setTimeout(task, 200)
        return () => window.clearTimeout(handle)
      },
    })
    playbackRef.current = playback
    const reconcile = () =>
      playback.setActive(
        inView && pageActive && !userPaused.current && (!reducedMotion || userRequested.current) && document.visibilityState === 'visible',
      )
    const visibility = () => reconcile()
    const pageHide = () => {
      pageActive = false
      reconcile()
    }
    const pageShow = () => {
      pageActive = true
      reconcile()
    }
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting
              reconcile()
            },
            { threshold: 0 },
          )
        : null
    observer?.observe(section)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', pageHide)
    window.addEventListener('pageshow', pageShow)
    reconcile()
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', pageHide)
      window.removeEventListener('pageshow', pageShow)
      playback.dispose()
      playbackRef.current = null
    }
  }, [reducedMotion])

  function togglePlayback() {
    const pause = playbackState === 'playing'
    userPaused.current = pause
    userRequested.current = !pause
    playbackRef.current?.setActive(!pause, true)
  }

  return (
    <section
      ref={root}
      className={`nm-overview-hero${entry !== 'stable' ? ' is-login-entry' : ''}`}
      aria-label="Tổng quan hôm nay"
    >
      <div className="nm-overview-hero__landscape" aria-hidden="true">
        <img
          className="nm-overview-hero__poster"
          src={poster}
          width={1928}
          height={1072}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <video
          ref={video}
          className="nm-overview-hero__video"
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        />
      </div>
      <div className="nm-overview-hero__veil" aria-hidden="true" />
      <header className="nm-overview-hero__content">
        <span className="nm-overview-hero__eyebrow">Tổng quan hôm nay</span>
        {reveal && title ? (
          <div className="nm-overview-hero__personal">
            <h1 id="overview-greeting">
              {lead}
              {emphasized && (
                <>
                  {' '}
                  <em>{emphasized}</em>
                </>
              )}
            </h1>
            <p className="nm-overview-hero__description">{subtitle}</p>
            <div className="nm-overview-hero__actions">
              <Link className="nm-overview-hero__cta" to="/app#calendar">
                Xem lịch chăm sóc
                <ArrowDown size={18} aria-hidden="true" />
              </Link>
              <Link className="nm-overview-hero__link" to="/app/nutrition">
                Khám phá dinh dưỡng
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : reveal && error ? (
          <div className="nm-overview-hero__error" role="status">
            <p>Chưa tải được thông tin chào mừng.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={onRetry}
            >
              Thử lại
            </button>
          </div>
        ) : reveal ? (
          <div
            className="nm-overview-hero__skeleton"
            role="status"
            aria-label="Đang tải thông tin tổng quan"
          >
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="nm-overview-hero__reserved" />
        )}
      </header>
      <div className="nm-overview-hero__footer">
        <span>Một ngày mới, cùng NutriMom.</span>
      </div>
      {playbackState !== 'failed' && <button className="nm-overview-hero__playback" type="button"
        onClick={togglePlayback} aria-label={playbackState === 'playing' ? 'Tạm dừng video nền' : 'Phát video nền'}>
        {playbackState === 'playing' ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        {playbackState === 'playing' ? 'Tạm dừng' : 'Phát video'}
      </button>}
    </section>
  )
}
