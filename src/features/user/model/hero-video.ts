export type HeroVideoState =
  'idle' | 'playing' | 'paused' | 'blocked' | 'failed'

/** The poster stays underneath while the first/last half second fades. */
export function heroVideoOpacity(time: number, duration: number) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0)
    return 0
  return Math.max(0, Math.min(1, time / 0.5, (duration - time) / 0.5))
}

interface PlaybackOptions {
  source: string
  onState: (state: HeroVideoState) => void
  defer?: (task: () => void) => () => void
  frame?: (task: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
  timeout?: (task: () => void, delay: number) => number
  clearTimeout?: (handle: number) => void
}

/** One decoder, one animation loop; visibility changes never replace the source. */
export function createHeroVideoPlayback(
  video: HTMLVideoElement,
  options: PlaybackOptions,
) {
  const frame = options.frame ?? window.requestAnimationFrame.bind(window)
  const cancelFrame =
    options.cancelFrame ?? window.cancelAnimationFrame.bind(window)
  const timeout = options.timeout ?? window.setTimeout.bind(window)
  const clearTimeout = options.clearTimeout ?? window.clearTimeout.bind(window)
  const defer =
    options.defer ??
    ((task) => {
      const handle = timeout(task, 0)
      return () => clearTimeout(handle)
    })
  let wanted = false,
    disposed = false,
    attached = false,
    failed = false,
    blocked = false
  let pendingPlay = false,
    playGeneration = 0
  let frameHandle: number | null = null,
    restartHandle: number | null = null
  let cancelDeferred: (() => void) | null = null
  let state: HeroVideoState = 'idle',
    previousOpacity = -1

  const publish = (next: HeroVideoState) => {
    if (!disposed && state !== next) {
      state = next
      options.onState(next)
    }
  }
  function opacity(value: number) {
    if (Math.abs(previousOpacity - value) < 0.005) return
    previousOpacity = value
    video.style.opacity = String(value)
  }
  function stopFrames() {
    if (frameHandle !== null) cancelFrame(frameHandle)
    frameHandle = null
  }
  function stopPending() {
    cancelDeferred?.()
    cancelDeferred = null
    if (restartHandle !== null) clearTimeout(restartHandle)
    restartHandle = null
  }
  function tick() {
    frameHandle = null
    if (disposed || !wanted || video.paused || video.ended) return
    opacity(heroVideoOpacity(video.currentTime, video.duration))
    frameHandle = frame(tick)
  }
  function playing() {
    if (disposed || !wanted) {
      video.pause()
      return
    }
    publish('playing')
    if (frameHandle === null) frameHandle = frame(tick)
  }
  function play() {
    if (!wanted || disposed || failed || blocked || pendingPlay) return
    if (!video.paused && !video.ended) {
      playing()
      return
    }
    if (video.ended) {
      video.currentTime = 0
      opacity(0)
    }
    const generation = ++playGeneration
    pendingPlay = true
    void video.play().then(
      () => {
        if (disposed || generation !== playGeneration) {
          if (!wanted) video.pause()
          return
        }
        pendingPlay = false
        playing()
      },
      () => {
        if (disposed || generation !== playGeneration) return
        pendingPlay = false
        blocked = true
        stopFrames()
        publish('blocked')
      },
    )
  }
  function paused() {
    stopFrames()
    if (!failed) publish('paused')
  }
  function ended() {
    stopFrames()
    opacity(0)
    if (restartHandle !== null) clearTimeout(restartHandle)
    if (!wanted || disposed) return
    restartHandle = timeout(() => {
      restartHandle = null
      if (wanted && !disposed) {
        video.currentTime = 0
        play()
      }
    }, 100)
  }
  function error() {
    failed = true
    wanted = false
    playGeneration++
    pendingPlay = false
    stopFrames()
    stopPending()
    opacity(0)
    video.pause()
    publish('failed')
    if (attached) {
      attached = false
      video.removeAttribute('src')
      video.load()
    }
  }
  video.addEventListener('playing', playing)
  video.addEventListener('pause', paused)
  video.addEventListener('ended', ended)
  video.addEventListener('error', error)

  return {
    setActive(active: boolean, userInitiated = false) {
      if (disposed || failed) return
      wanted = active
      if (userInitiated) blocked = false
      if (!active) {
        playGeneration++
        pendingPlay = false
        stopPending()
        stopFrames()
        video.pause()
        return
      }
      if (userInitiated) {
        cancelDeferred?.()
        cancelDeferred = null
      }
      if (blocked || cancelDeferred || restartHandle !== null) return
      if (attached) {
        play()
        return
      }
      if (userInitiated) {
        attached = true
        video.muted = true
        video.defaultMuted = true
        video.src = options.source
        play()
        return
      }
      cancelDeferred = defer(() => {
        cancelDeferred = null
        if (!wanted || disposed) return
        attached = true
        video.muted = true
        video.defaultMuted = true
        video.src = options.source
        play()
      })
    },
    dispose() {
      disposed = true
      wanted = false
      playGeneration++
      stopPending()
      stopFrames()
      video.removeEventListener('playing', playing)
      video.removeEventListener('pause', paused)
      video.removeEventListener('ended', ended)
      video.removeEventListener('error', error)
      video.pause()
      // Drop the decoder/buffer on route exit. Pausing in-view does not reload it.
      if (attached) {
        video.removeAttribute('src')
        video.load()
      }
    },
  }
}
