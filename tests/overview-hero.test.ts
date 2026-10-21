import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createHeroVideoPlayback,
  heroVideoOpacity,
} from '../src/features/user/model/hero-video.ts'

class FakeVideo extends EventTarget {
  paused = true
  ended = false
  currentTime = 0
  duration = 14
  muted = false
  defaultMuted = false
  style = { opacity: '0' }
  source = ''
  sourceWrites = 0
  playCalls = 0
  loads = 0
  rejectPlay = false
  set src(value: string) {
    this.source = value
    this.sourceWrites++
  }
  get src() {
    return this.source
  }
  play() {
    this.playCalls++
    if (this.rejectPlay) {
      this.rejectPlay = false
      return Promise.reject(new Error('Autoplay blocked'))
    }
    this.paused = false
    this.ended = false
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  }
  pause() {
    if (!this.paused) {
      this.paused = true
      this.dispatchEvent(new Event('pause'))
    }
  }
  removeAttribute(name: string) {
    if (name === 'src') this.source = ''
  }
  load() {
    this.loads++
  }
}
function setup() {
  const video = new FakeVideo(),
    states: string[] = []
  const frames = new Map<number, FrameRequestCallback>(),
    timers = new Map<number, { task: () => void; delay: number }>(),
    deferred = new Map<number, () => void>()
  let next = 0
  const playback = createHeroVideoPlayback(
    video as unknown as HTMLVideoElement,
    {
      source: '/hero.mp4',
      onState: (state) => states.push(state),
      frame: (task) => {
        frames.set(++next, task)
        return next
      },
      cancelFrame: (id) => {
        frames.delete(id)
      },
      timeout: (task, delay) => {
        timers.set(++next, { task, delay })
        return next
      },
      clearTimeout: (id) => {
        timers.delete(id)
      },
      defer: (task) => {
        const id = ++next
        deferred.set(id, task)
        return () => {
          deferred.delete(id)
        }
      },
    },
  )
  const start = async () => {
    const jobs = [...deferred.values()]
    deferred.clear()
    jobs.forEach((job) => job())
    await Promise.resolve()
  }
  const frame = () => {
    const jobs = [...frames.values()]
    frames.clear()
    jobs.forEach((job) => job(0))
  }
  return { video, playback, states, frames, timers, deferred, start, frame }
}
test('hero fades over each half second and handles missing duration without invalid opacity', () => {
  assert.equal(heroVideoOpacity(0, 14), 0)
  assert.equal(heroVideoOpacity(0.25, 14), 0.5)
  assert.equal(heroVideoOpacity(0.5, 14), 1)
  assert.equal(heroVideoOpacity(7, 14), 1)
  assert.equal(heroVideoOpacity(13.75, 14), 0.5)
  assert.equal(heroVideoOpacity(14, 14), 0)
  assert.equal(heroVideoOpacity(15, 14), 0)
  assert.equal(heroVideoOpacity(0, Number.NaN), 0)
  assert.equal(heroVideoOpacity(Number.NaN, 14), 0)
})
test('StrictMode cleanup before deferred load makes no media request', () => {
  const f = setup()
  f.playback.setActive(true)
  assert.equal(f.deferred.size, 1)
  f.playback.dispose()
  assert.equal(f.deferred.size, 0)
  assert.equal(f.video.sourceWrites, 0)
  assert.equal(f.video.loads, 0)
})
test('explicit play keeps the user gesture instead of waiting for idle loading', async () => {
  const f = setup()
  f.playback.setActive(true, true)
  assert.equal(f.deferred.size, 0)
  assert.equal(f.video.sourceWrites, 1)
  assert.equal(f.video.playCalls, 1)
  await Promise.resolve()
  assert.equal(f.states.at(-1), 'playing')
  f.playback.dispose()
})
test('offscreen/hidden pauses stop all animation work; returning reuses the same source', async () => {
  const f = setup()
  f.playback.setActive(true)
  await f.start()
  assert.equal(f.video.sourceWrites, 1)
  assert.equal(f.frames.size, 1)
  assert.equal(f.video.muted, true)
  f.video.currentTime = 0.25
  f.frame()
  assert.equal(f.video.style.opacity, '0.5')
  f.playback.setActive(false)
  assert.equal(f.video.paused, true)
  assert.equal(f.frames.size, 0)
  f.playback.setActive(true)
  await Promise.resolve()
  assert.equal(f.video.sourceWrites, 1)
  assert.equal(f.video.loads, 0)
  assert.equal(f.frames.size, 1)
  f.playback.setActive(true)
  assert.equal(f.frames.size, 1)
  f.playback.dispose()
  assert.equal(f.frames.size, 0)
  assert.equal(f.video.source, '')
  assert.equal(f.video.loads, 1)
})
test('manual loop waits 100ms then seeks to zero without reloading the file', async () => {
  const f = setup()
  f.playback.setActive(true)
  await f.start()
  f.video.currentTime = 14
  f.video.ended = true
  f.video.paused = true
  f.video.dispatchEvent(new Event('ended'))
  assert.equal(f.video.style.opacity, '0')
  assert.equal(f.frames.size, 0)
  const pending = [...f.timers.values()]
  assert.equal(pending.length, 1)
  assert.equal(pending[0].delay, 100)
  pending[0].task()
  await Promise.resolve()
  assert.equal(f.video.currentTime, 0)
  assert.equal(f.video.sourceWrites, 1)
  assert.equal(f.video.loads, 0)
  assert.equal(f.video.playCalls, 2)
  f.playback.dispose()
})
test('leaving during the loop gap cancels restart and releases everything on unmount', async () => {
  const f = setup()
  f.playback.setActive(true)
  await f.start()
  f.video.ended = true
  f.video.dispatchEvent(new Event('ended'))
  f.playback.setActive(false)
  assert.equal(f.timers.size, 0)
  const count = f.states.length
  f.playback.dispose()
  f.video.dispatchEvent(new Event('playing'))
  assert.equal(f.states.length, count)
  assert.equal(f.frames.size, 0)
})
test('autoplay rejection is not retried until the user asks to play', async () => {
  const f = setup()
  f.video.rejectPlay = true
  f.playback.setActive(true)
  await f.start()
  assert.equal(f.states.at(-1), 'blocked')
  f.playback.setActive(false)
  f.playback.setActive(true)
  assert.equal(f.video.playCalls, 1)
  f.playback.setActive(true, true)
  await Promise.resolve()
  assert.equal(f.states.at(-1), 'playing')
  assert.equal(f.video.sourceWrites, 1)
  f.playback.dispose()
})
test('media errors settle on the poster without retries or retained decoder work', async () => {
  const f = setup()
  f.playback.setActive(true)
  await f.start()
  f.video.dispatchEvent(new Event('error'))
  assert.equal(f.states.at(-1), 'failed')
  assert.equal(f.video.style.opacity, '0')
  assert.equal(f.frames.size, 0)
  assert.equal(f.video.source, '')
  f.playback.setActive(true, true)
  assert.equal(f.video.playCalls, 1)
  f.playback.dispose()
})
