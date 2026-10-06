import { ArrowClockwise, ArrowLeft, CalendarBlank, CheckCircle, CircleNotch, ShieldCheck, Star, VideoCamera, X } from '@phosphor-icons/react'
import { TfiInfoAlt } from 'react-icons/tfi'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { consultationSpecialtyLabels } from '@/features/consultation/model/consultation-types'
import { videoApi, type VideoCredentials, type VideoRoomInfo } from '../api/video-api'
import type { CallDeviceChoices } from '../components/LiveKitCallRuntime'
import { VideoCooldownError, videoRequestCoordinator, type VideoAction } from '../model/request-coordinator'
import { canOfferPostCallReview, effectiveRoomState, nextCallTimeWarning, nextRoomBoundary, postCallPath, remainingLabel, roomMessage, shouldRefreshOnForeground } from '../model/video-room'
import '../styles/video-room.css'

const LiveKitCallRuntime = lazy(() => import('../components/LiveKitCallRuntime'))
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const CallSidebar = memo(function CallSidebar({ info }: { info: VideoRoomInfo | null }) {
  return <aside className="nm-call-sidebar">
    <span className="nm-call-sidebar-icon"><TfiInfoAlt size={24} aria-hidden="true" /></span><h2>Thông tin buổi tư vấn</h2>
    {info && <><dl><div><dt>Chuyên gia</dt><dd>{info.expert_name || 'Chưa được phân công'}</dd></div><div><dt>Người đặt lịch</dt><dd>{info.user_name || 'Người dùng'}</dd></div><div><dt>Chuyên khoa</dt><dd>{consultationSpecialtyLabels[info.specialty]}</dd></div>{info.opens_at && <div><dt>Thời gian mở phòng</dt><dd>{dateTime(info.opens_at)}</dd></div>}</dl>{info.note && <div className="nm-call-note"><h3>Ghi chú đặt lịch</h3><p>{info.note}</p></div>}</>}
    <div className="nm-call-help"><ShieldCheck size={22} /><div><h3>Không gian riêng cho hai người</h3><p>Cuộc gọi được mã hóa đầu cuối trước khi kết nối. Camera và micro chỉ bật khi bạn cho phép. Buổi gọi không được ghi hình.</p></div></div><p className="nm-call-tip">Dùng tai nghe và chọn nơi yên tĩnh để trò chuyện rõ hơn.</p>
  </aside>
})

function RuntimeFallback() {
  return <div className="nm-call-empty is-dark" role="status"><CircleNotch size={30} className="nm-call-spinner" /><p>Đang tải phòng gọi bảo mật…</p></div>
}

function CallSessionClock({ closesAt, clockOffset, shownWarnings }: { closesAt: string; clockOffset: number; shownWarnings: { current: Set<number> } }) {
  const [now, setNow] = useState(() => Date.now() + clockOffset)
  const [warning, setWarning] = useState<ReturnType<typeof nextCallTimeWarning>>(null)
  useEffect(() => {
    const tick = () => {
      const serverNow = Date.now() + clockOffset
      setNow(serverNow)
      const nextWarning = nextCallTimeWarning(Date.parse(closesAt) - serverNow, shownWarnings.current)
      if (nextWarning) {
        shownWarnings.current.add(nextWarning.minutes)
        setWarning(nextWarning)
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [closesAt, clockOffset, shownWarnings])
  return <div className="nm-call-session-clock">
    {warning && <div className={`nm-call-time-warning is-${warning.tone}`} role="status" aria-live={warning.tone === 'urgent' ? 'assertive' : 'polite'} aria-atomic="true">
      <span>{warning.message}</span>
      <button type="button" onClick={() => setWarning(null)} aria-label="Đóng cảnh báo thời gian"><X size={17} /></button>
    </div>}
    <span className="nm-call-timer" aria-label="Thời gian còn lại">{remainingLabel(closesAt, now)}</span>
  </div>
}

const EndedCallScreen = memo(function EndedCallScreen({ info, requestId, expert, canReview }: { info: VideoRoomInfo; requestId: string; expert: boolean; canReview: boolean }) {
  const historyPath = postCallPath(requestId, false, false)
  return <div className="nm-call-empty nm-call-ended">
    <span><CheckCircle size={38} weight="duotone" /></span>
    <h2>Buổi tư vấn đã kết thúc</h2>
    {expert ? <>
      <p>Buổi tư vấn với {info.user_name || 'người dùng'} đã khép lại. Thông tin buổi hẹn được lưu trong lịch làm việc của bạn.</p>
      <div className="nm-call-ended-summary"><CalendarBlank size={20} /><span>{consultationSpecialtyLabels[info.specialty]}</span></div>
      <Link to="/expert?section=schedule" className="nm-call-primary">Về lịch tư vấn</Link>
    </> : canReview ? <>
      <p>Cảm ơn bạn đã tham gia buổi tư vấn. Vui lòng đánh giá trải nghiệm và chuyên gia để NutriMom có thể cải thiện chất lượng dịch vụ.</p>
      <div className="nm-call-ended-actions">
        <Link to={postCallPath(requestId, false, true)} className="nm-call-primary"><Star size={18} weight="fill" />Đánh giá chuyên gia</Link>
        <Link to={historyPath} className="nm-call-secondary">Về lịch tư vấn</Link>
      </div>
    </> : <>
      <p>{roomMessage('ENDED')}</p>
      <Link to={historyPath} className="nm-call-primary">Về lịch tư vấn</Link>
    </>}
  </div>
})

export function ConsultationCallPage() {
  const { requestId = '' } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const routeIsExpert = location.pathname.startsWith('/expert/')
  const back = routeIsExpert ? '/expert?section=schedule' : '/app/consultations/history'
  const [info, setInfo] = useState<VideoRoomInfo | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [credentials, setCredentials] = useState<VideoCredentials | null>(null)
  const [choices, setChoices] = useState<CallDeviceChoices | null>(null)
  const [left, setLeft] = useState(false)
  const [forcedEnded, setForcedEnded] = useState(false)
  const [cooldowns, setCooldowns] = useState<Partial<Record<VideoAction, number>>>({})
  const [cooldownTick, setCooldownTick] = useState(Date.now())
  const [infoRetryAvailable, setInfoRetryAvailable] = useState(false)
  const mounted = useRef(false)
  const lastFetchedAt = useRef(0)
  const clockOffset = useRef(0)
  const shownTimeWarnings = useRef(new Set<number>())
  const warningRequestId = useRef(requestId)
  const runtimeDisposer = useRef<(() => void) | null>(null)

  if (warningRequestId.current !== requestId) {
    warningRequestId.current = requestId
    shownTimeWarnings.current.clear()
  }

  const disposeCall = useCallback(() => {
    runtimeDisposer.current?.()
    runtimeDisposer.current = null
    setCredentials(null)
    setChoices(null)
  }, [])

  const registerDisposer = useCallback((dispose: (() => void) | null) => { runtimeDisposer.current = dispose }, [])
  const showRuntimeError = useCallback((message: string) => { setError(message); setInfoRetryAvailable(false) }, [])

  const handleCooldown = useCallback((requestError: unknown) => {
    if (!(requestError instanceof VideoCooldownError)) return false
    setCooldowns((current) => ({ ...current, [requestError.action]: requestError.retryAt }))
    setCooldownTick(Date.now())
    setInfoRetryAvailable(requestError.action === 'info')
    setError('Bạn đã thao tác quá nhanh. Vui lòng chờ hết thời gian đếm ngược rồi thử lại.')
    return true
  }, [])

  const loadInfo = useCallback(async () => {
    setInfoRetryAvailable(false)
    try {
      const result = await videoRequestCoordinator.run(requestId, 'info', (signal) => videoApi.info(requestId, signal))
      if (!mounted.current || result.stale) return null
      const next = result.value
      clockOffset.current = Date.parse(next.server_time) - Date.now()
      lastFetchedAt.current = Date.now()
      setInfo(next)
      setError('')
      setInfoRetryAvailable(false)
      setForcedEnded(false)
      if (next.state === 'ENDED' || !next.configured) disposeCall()
      return next
    } catch (requestError) {
      if (!mounted.current || (requestError instanceof ApiClientError && requestError.code === 'REQUEST_ABORTED')) return null
      if (handleCooldown(requestError)) return null
      if (requestError instanceof ApiClientError && [401, 403, 404].includes(requestError.status)) { disposeCall(); setInfo(null) }
      setInfoRetryAvailable(true)
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể tải phòng tư vấn.')
      return null
    }
  }, [disposeCall, handleCooldown, requestId])

  useEffect(() => {
    mounted.current = true
    setInfo(null); setError(''); setLeft(false); setForcedEnded(false); setCredentials(null); setChoices(null); setCooldowns({}); setInfoRetryAvailable(false)
    void loadInfo()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && shouldRefreshOnForeground(lastFetchedAt.current, Date.now())) void loadInfo()
    }
    const onPageHide = () => disposeCall()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onPageHide)
      runtimeDisposer.current?.()
      runtimeDisposer.current = null
      videoRequestCoordinator.dispose(requestId)
    }
  }, [disposeCall, loadInfo, requestId])

  useEffect(() => {
    if (!info) return
    const serverNow = Date.now() + clockOffset.current
    const boundary = nextRoomBoundary(info, serverNow)
    if (!boundary) return
    let timeout = 0
    let cancelled = false
    const waitForBoundary = () => {
      const remaining = boundary.at - (Date.now() + clockOffset.current)
      timeout = window.setTimeout(() => {
        if (cancelled) return
        if (boundary.at > Date.now() + clockOffset.current) { waitForBoundary(); return }
        if (boundary.type === 'open') void loadInfo()
        else { setForcedEnded(true); disposeCall() }
      }, Math.max(0, Math.min(remaining, 2_147_483_647)))
    }
    waitForBoundary()
    return () => { cancelled = true; window.clearTimeout(timeout) }
  }, [disposeCall, info, loadInfo])

  useEffect(() => {
    const actions: VideoAction[] = ['info', 'join', 'complete']
    if (!actions.some((action) => (cooldowns[action] ?? 0) > Date.now())) return
    const timer = window.setInterval(() => {
      const tick = Date.now()
      setCooldownTick(tick)
      setCooldowns((current) => {
        const active = Object.entries(current).filter(([, retryAt]) => retryAt > tick)
        return active.length === Object.keys(current).length ? current : Object.fromEntries(active) as Partial<Record<VideoAction, number>>
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldowns])

  const state = useMemo(() => forcedEnded || !info ? (forcedEnded ? 'ENDED' : null) : effectiveRoomState(info, Date.now() + clockOffset.current), [forcedEnded, info])
  const canReview = Boolean(info && canOfferPostCallReview(info, Date.now() + clockOffset.current))

  const cooldownSeconds = useCallback((action: VideoAction) => Math.max(0, Math.ceil(((cooldowns[action] ?? 0) - cooldownTick) / 1000)), [cooldownTick, cooldowns])
  const actionCooling = useCallback((action: VideoAction) => cooldownSeconds(action) > 0, [cooldownSeconds])

  const join = useCallback(async (nextChoices: CallDeviceChoices) => {
    if (!info?.can_join || actionCooling('join')) return
    setJoining(true); setError(''); setInfoRetryAvailable(false)
    try {
      const result = await videoRequestCoordinator.run(requestId, 'join', (signal) => videoApi.join(requestId, signal))
      if (!mounted.current || result.stale) return
      setChoices(nextChoices); setCredentials(result.value); setLeft(false)
    } catch (requestError) {
      if (!(requestError instanceof ApiClientError && requestError.code === 'REQUEST_ABORTED') && !handleCooldown(requestError)) { setInfoRetryAvailable(false); setError(requestError instanceof Error ? requestError.message : 'Chưa thể vào phòng tư vấn.') }
    } finally { if (mounted.current) setJoining(false) }
  }, [actionCooling, handleCooldown, info?.can_join, requestId])

  const complete = useCallback(async () => {
    if (!info?.expert || actionCooling('complete')) return false
    setCompleting(true); setError(''); setInfoRetryAvailable(false)
    try {
      const result = await videoRequestCoordinator.run(requestId, 'complete', (signal) => videoApi.complete(requestId, signal))
      if (!mounted.current || result.stale) return true
      disposeCall()
      setLeft(false)
      setForcedEnded(true)
      setInfo((current) => current ? { ...current, state: 'ENDED', can_join: false, consultation_status: 'COMPLETED' } : current)
      return true
    } catch (requestError) {
      if (!mounted.current || (requestError instanceof ApiClientError && requestError.code === 'REQUEST_ABORTED')) return true
      if (!handleCooldown(requestError)) { setInfoRetryAvailable(false); setError(requestError instanceof Error ? requestError.message : 'Chưa thể hoàn tất buổi tư vấn.') }
      return false
    } finally { if (mounted.current) setCompleting(false) }
  }, [actionCooling, disposeCall, handleCooldown, info?.expert, requestId])

  const leave = useCallback(() => { disposeCall(); setLeft(true); setError(''); setInfoRetryAvailable(false) }, [disposeCall])
  const disconnected = useCallback(() => {
    disposeCall(); setLeft(true); setInfoRetryAvailable(false); setError('Kết nối đã đóng. Đang kiểm tra trạng thái buổi tư vấn…')
    void loadInfo()
  }, [disposeCall, loadInfo])

  const retry = useCallback(() => { if (!actionCooling('info')) { setInfoRetryAvailable(false); setError(''); void loadInfo() } }, [actionCooling, loadInfo])
  const joinLabel = actionCooling('join') ? `Thử lại sau ${cooldownSeconds('join')}s` : joining ? 'Đang chuẩn bị…' : info?.can_join ? 'Vào phòng tư vấn' : 'Chưa đến giờ vào phòng'
  const completeLabel = completing ? 'Đang hoàn tất…' : actionCooling('complete') ? `Thử lại sau ${cooldownSeconds('complete')}s` : 'Xác nhận hoàn tất'
  const title = credentials ? 'Buổi tư vấn của bạn' : state === 'ENDED' ? 'Buổi tư vấn đã kết thúc' : 'Sẵn sàng cho buổi tư vấn'

  return <main className="nm-call-page">
    <header className="nm-call-header"><Link to={back} onClick={disposeCall} className="nm-call-back"><ArrowLeft size={19} />Quay lại lịch tư vấn</Link><Link to={back} onClick={disposeCall} className="nm-call-brand">NutriMom<span>Tư vấn trực tuyến</span></Link><span className="nm-call-private"><ShieldCheck size={18} />Phòng riêng tư</span></header>
    <div className="nm-call-layout">
      <section className="nm-call-main">
        <div className="nm-call-title"><div><p>ĐỒNG HÀNH CÙNG BẠN</p><h1>{title}</h1></div></div>
        {credentials && info?.closes_at && <CallSessionClock key={requestId} closesAt={info.closes_at} clockOffset={clockOffset.current} shownWarnings={shownTimeWarnings} />}
        {error && <div className="nm-call-alert" role="alert"><span>{error}</span>{infoRetryAvailable && <button type="button" disabled={actionCooling('info')} onClick={retry}><ArrowClockwise size={17} />{actionCooling('info') ? `${cooldownSeconds('info')}s` : 'Thử lại'}</button>}</div>}
        {!info && !error && <div className="nm-call-empty"><CircleNotch size={30} className="nm-call-spinner" /><p>Đang chuẩn bị phòng tư vấn…</p></div>}
        {info && state && ['READY', 'SCHEDULED'].includes(state) && <>
          {left && !credentials && <p className="nm-call-left-note" role="status">Bạn đã rời phòng. Bạn có thể vào lại trước khi lịch kết thúc.</p>}
          <Suspense fallback={<RuntimeFallback />}><LiveKitCallRuntime info={info} credentials={credentials} choices={choices} displayName={user?.displayName || 'Bạn'} joining={joining} completing={completing} completeDisabled={completing || actionCooling('complete')} completeLabel={completeLabel} joinDisabled={!info.can_join || actionCooling('join')} joinLabel={joinLabel} onJoin={join} onLeave={leave} onComplete={complete} onUnexpectedDisconnect={disconnected} onError={showRuntimeError} onRegisterDisposer={registerDisposer} /></Suspense>
          {!info.can_join && info.opens_at && <p className="nm-call-opening">Phòng mở lúc {dateTime(info.opens_at)}</p>}
          {actionCooling('complete') && <p className="nm-call-cooldown" role="status">Có thể hoàn tất lại sau {cooldownSeconds('complete')} giây.</p>}
        </>}
        {info && state === 'ENDED' && <EndedCallScreen info={info} requestId={requestId} expert={info.expert} canReview={canReview} />}
        {info && state && ['UNAVAILABLE', 'UNSCHEDULED'].includes(state) && <div className="nm-call-empty"><span><VideoCamera size={36} weight="duotone" /></span><h2>Phòng chưa sẵn sàng</h2><p>{roomMessage(state)}</p><Link to={back} className="nm-call-primary">Về lịch tư vấn</Link></div>}
      </section>
      <CallSidebar info={info} />
    </div>
  </main>
}
