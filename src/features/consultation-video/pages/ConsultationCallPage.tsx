import { ArrowLeft, ArrowClockwise, Camera, CheckCircle, CircleNotch, Microphone, MicrophoneSlash, Monitor, PhoneDisconnect, ShieldCheck, VideoCamera, VideoCameraSlash } from '@phosphor-icons/react'
import { LiveKitRoom, ParticipantTile, PreJoin, RoomAudioRenderer, StartAudio, useConnectionState, useLocalParticipant, useTracks, type LocalUserChoices } from '@livekit/components-react'
import { ConnectionState, ExternalE2EEKeyProvider, isE2EESupported, Room, Track, VideoPresets } from 'livekit-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { consultationSpecialtyLabels } from '@/features/consultation/model/consultation-types'
import { videoApi, type VideoCredentials, type VideoRoomInfo } from '../api/video-api'
import { remainingLabel, roomMessage } from '../model/video-room'
import '@livekit/components-styles'
import '../styles/video-room.css'

type ActiveCall = { room: Room; worker: Worker; credentials: VideoCredentials; choices: LocalUserChoices }
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function CallStage({ info, onLeave, onComplete, completing }: { info: VideoRoomInfo; onLeave: () => void; onComplete: () => void; completing: boolean }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }])
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
  const connection = useConnectionState()
  const [deviceError, setDeviceError] = useState('')
  const remote = tracks.find(t => t.source === Track.Source.ScreenShare) ?? tracks.find(t => !t.participant.isLocal)
  const local = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera)
  const counterpart = info.expert ? info.user_name : info.expert_name
  const [confirming, setConfirming] = useState(false)
  const confirmation = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (confirming) confirmation.current?.showModal() }, [confirming])
  const [toggling, setToggling] = useState(false)
  async function toggle(action: () => Promise<unknown>) {
    if (toggling) return
    setToggling(true); setDeviceError('')
    try { await action() } catch { setDeviceError('Chưa thể bật thiết bị. Hãy kiểm tra quyền camera, micro hoặc chia sẻ màn hình trong trình duyệt.') }
    finally { setToggling(false) }
  }
  return <>
    <div className="nm-call-stage" data-lk-theme="default">
      {remote ? <ParticipantTile trackRef={remote} className="nm-call-remote" /> : <div className="nm-call-waiting"><span><VideoCamera size={38} weight="duotone" /></span><h2>{connection === ConnectionState.Connecting ? 'Đang kết nối phòng…' : 'Đang chờ người còn lại'}</h2><p>{counterpart || 'Người tham gia'} sẽ xuất hiện tại đây khi vào phòng.</p></div>}
      {local && <div className="nm-call-self"><ParticipantTile trackRef={local} /><span>Bạn</span></div>}
      <div className="nm-call-connection" role="status">{connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting ? 'Mạng gián đoạn · Đang kết nối lại…' : connection === ConnectionState.Connected ? 'Đã kết nối' : 'Đang kết nối…'}</div>
      <RoomAudioRenderer />
      <StartAudio label="Bật âm thanh cuộc gọi" />
    </div>
    {deviceError && <p className="nm-call-alert" role="alert">{deviceError}</p>}
    <div className="nm-call-controls" aria-label="Điều khiển cuộc gọi">
      <button type="button" disabled={toggling} aria-pressed={isMicrophoneEnabled} aria-label={isMicrophoneEnabled ? 'Tắt micro' : 'Bật micro'} onClick={() => void toggle(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>{isMicrophoneEnabled ? <Microphone size={23} /> : <MicrophoneSlash size={23} />}<span>Micro</span></button>
      <button type="button" disabled={toggling} aria-pressed={isCameraEnabled} aria-label={isCameraEnabled ? 'Tắt camera' : 'Bật camera'} onClick={() => void toggle(() => localParticipant.setCameraEnabled(!isCameraEnabled))}>{isCameraEnabled ? <VideoCamera size={23} /> : <VideoCameraSlash size={23} />}<span>Camera</span></button>
      <button type="button" disabled={toggling} aria-pressed={isScreenShareEnabled} onClick={() => void toggle(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled))}><Monitor size={23} /><span>{isScreenShareEnabled ? 'Dừng chia sẻ' : 'Chia sẻ'}</span></button>
      <button type="button" className="nm-call-hangup" onClick={onLeave}><PhoneDisconnect size={23} /><span>Rời phòng</span></button>
      {info.expert && <button type="button" className="nm-call-finish" disabled={completing} onClick={() => setConfirming(true)}><CheckCircle size={23} /><span>Hoàn tất tư vấn</span></button>}
    </div>
    {confirming && <dialog ref={confirmation} className="nm-call-modal" aria-labelledby="finish-title" onCancel={event => { if (completing) event.preventDefault(); else setConfirming(false) }}><h2 id="finish-title">Hoàn tất buổi tư vấn?</h2><p>Phòng sẽ đóng cho cả hai bên. Người dùng có thể gửi đánh giá sau khi bạn xác nhận.</p><div><button type="button" disabled={completing} onClick={() => setConfirming(false)} autoFocus>Tiếp tục tư vấn</button><button type="button" className="nm-call-primary" disabled={completing} onClick={onComplete}>{completing ? 'Đang hoàn tất…' : 'Xác nhận hoàn tất'}</button></div></dialog>}
  </>
}

export function ConsultationCallPage() {
  const { requestId = '' } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const back = location.pathname.startsWith('/expert/') ? '/expert?section=schedule' : '/app/consultations/history'
  const [info, setInfo] = useState<VideoRoomInfo | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [call, setCall] = useState<ActiveCall | null>(null)
  const [left, setLeft] = useState(false)
  const [now, setNow] = useState(Date.now())
  const active = useRef<ActiveCall | null>(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  const currentRequest = useRef(requestId)
  currentRequest.current = requestId
  const clockOffset = useRef(0)
  const previewError = useCallback(() => {
    setError('Hãy cho phép camera và micro trong trình duyệt. Bạn vẫn có thể tắt camera để tham gia bằng âm thanh.')
  }, [])
  const canJoin = Boolean(info?.can_join && !joining)
  const validatePreview = useCallback(() => canJoin, [canJoin])
  const connectionError = useCallback(() => {
    setError('Kết nối hoặc thiết bị gặp sự cố. Bạn có thể rời phòng và thử vào lại.')
  }, [])
  const dispose = useCallback(() => {
    const previous = active.current
    active.current = null
    if (previous) void previous.room.disconnect().finally(() => previous.worker.terminate())
    setCall(null)
  }, [])
  const encryptionError = useCallback(() => {
    dispose()
    setError('Chưa thể thiết lập mã hóa cuộc gọi. Hãy thử vào lại phòng hoặc dùng Chrome/Edge mới nhất.')
  }, [dispose])
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await videoApi.info(requestId, signal)
      if (signal?.aborted || !mounted.current) return
      clockOffset.current = Date.parse(next.server_time) - Date.now()
      setInfo(next)
      if (next.state === 'ENDED' || !next.configured) dispose()
    } catch (err) {
      if (signal?.aborted || !mounted.current) return
      if (err instanceof ApiClientError && [401, 403, 404].includes(err.status)) { dispose(); setInfo(null) }
      setError(err instanceof Error ? err.message : 'Chưa thể tải phòng tư vấn.')
    }
  }, [requestId, dispose])
  useEffect(() => {
    mounted.current = true
    setInfo(null); setCall(null); setError(''); setLeft(false)
    const controller = new AbortController()
    void refresh(controller.signal)
    const poll = window.setInterval(() => { void refresh(controller.signal) }, 5000)
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset.current), 1000)
    const unload = () => { void active.current?.room.disconnect() }
    window.addEventListener('pagehide', unload)
    return () => {
      mounted.current = false; controller.abort(); clearInterval(poll); clearInterval(timer)
      window.removeEventListener('pagehide', unload)
      const current = active.current; active.current = null
      if (current) void current.room.disconnect().finally(() => current.worker.terminate())
    }
  }, [refresh])
  useEffect(() => {
    if (call && now >= Date.parse(call.credentials.closes_at)) { dispose(); setLeft(true) }
  }, [call, now, dispose])
  async function join(choices: LocalUserChoices) {
    if (pending.current || !info?.can_join) return
    pending.current = true; setJoining(true); setError('')
    let room: Room | undefined
    let worker: Worker | undefined
    try {
      if (!window.isSecureContext) throw new Error('Hãy mở NutriMom bằng HTTPS để sử dụng camera và micro.')
      if (!isE2EESupported()) throw new Error('Trình duyệt chưa hỗ trợ cuộc gọi được mã hóa. Hãy dùng phiên bản Chrome hoặc Edge mới nhất.')
      const credentials = await videoApi.join(requestId)
      if (!mounted.current || currentRequest.current !== requestId) return
      worker = new Worker(new URL('livekit-client/e2ee-worker', import.meta.url), { type: 'module' })
      const keyProvider = new ExternalE2EEKeyProvider()
      room = new Room({ adaptiveStream: true, dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h540.resolution },
        publishDefaults: { videoCodec: 'vp8', videoEncoding: { maxBitrate: 700_000, maxFramerate: 20 } },
        encryption: { keyProvider, worker },
      })
      await keyProvider.setKey(credentials.encryption_key)
      await room.setE2EEEnabled(true)
      if (!mounted.current || currentRequest.current !== requestId) { await room.disconnect(); worker.terminate(); return }
      const current = { room, worker, credentials, choices }
      active.current = current; setCall(current); setLeft(false)
    } catch (err) {
      if (room) await room.disconnect()
      worker?.terminate()
      if (mounted.current) setError(err instanceof Error ? err.message : 'Chưa thể vào phòng tư vấn.')
    } finally { pending.current = false; if (mounted.current) setJoining(false) }
  }
  async function complete() {
    if (pending.current) return
    pending.current = true; setCompleting(true); setError('')
    try { await videoApi.complete(requestId); dispose(); setLeft(true); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa thể hoàn tất tư vấn.') }
    finally { pending.current = false; if (mounted.current) setCompleting(false) }
  }
  return <main className="nm-call-page">
    <header className="nm-call-header"><Link to={back} onClick={dispose} className="nm-call-back"><ArrowLeft size={19} />Quay lại lịch tư vấn</Link><Link to={back} className="nm-call-brand">NutriMom<span>Tư vấn trực tuyến</span></Link><span className="nm-call-private"><ShieldCheck size={18} />Phòng riêng tư</span></header>
    <div className="nm-call-layout">
      <section className="nm-call-main">
        <div className="nm-call-title"><div><p>ĐỒNG HÀNH CÙNG BẠN</p><h1>{call ? 'Buổi tư vấn của bạn' : 'Sẵn sàng cho buổi tư vấn'}</h1></div>{call && info?.closes_at && <span className="nm-call-timer" aria-label="Thời gian còn lại">{remainingLabel(info.closes_at, now)}</span>}</div>
        {error && <div className="nm-call-alert" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); void refresh() }}><ArrowClockwise size={17} />Thử lại</button></div>}
        {!info && !error && <div className="nm-call-empty"><CircleNotch size={30} className="nm-call-spinner" /><p>Đang chuẩn bị phòng tư vấn…</p></div>}
        {info && call && <LiveKitRoom room={call.room} serverUrl={call.credentials.server_url} token={call.credentials.participant_token}
          connect audio={call.choices.audioEnabled ? { deviceId: call.choices.audioDeviceId || undefined } : false}
          video={call.choices.videoEnabled ? { deviceId: call.choices.videoDeviceId || undefined } : false}
          onError={connectionError} onEncryptionError={encryptionError}
          onDisconnected={() => { if (active.current?.room === call.room) { dispose(); setLeft(true) } }}>
          <CallStage info={info} onLeave={() => { dispose(); setLeft(true) }} onComplete={() => void complete()} completing={completing} />
        </LiveKitRoom>}
        {info && !call && info.state !== 'ENDED' && info.state !== 'UNAVAILABLE' && info.state !== 'UNSCHEDULED' && <div className="nm-call-prejoin" data-lk-theme="default">
          <p className="nm-call-intro">{left ? 'Bạn đã rời phòng. Có thể vào lại trong thời gian của lịch hẹn.' : roomMessage(info.state)}</p>
          <PreJoin defaults={{ username: user?.displayName || 'Bạn', audioEnabled: true, videoEnabled: true }}
            persistUserChoices={false} camLabel="Camera" micLabel="Micro" userLabel="Tên của bạn"
            joinLabel={joining ? 'Đang chuẩn bị…' : info.can_join ? 'Vào phòng tư vấn' : 'Chưa đến giờ vào phòng'}
            onValidate={validatePreview} onSubmit={choices => void join(choices)}
            onError={previewError} />
          {!info.can_join && info.opens_at && <p className="nm-call-opening">Phòng mở lúc {dateTime(info.opens_at)}</p>}
          {joining && <p role="status">Đang chuẩn bị kết nối riêng tư…</p>}
        </div>}
        {info && ['ENDED', 'UNAVAILABLE', 'UNSCHEDULED'].includes(info.state) && <div className="nm-call-empty"><span><VideoCamera size={36} weight="duotone" /></span><h2>{info.state === 'ENDED' ? 'Buổi tư vấn đã kết thúc' : 'Phòng chưa sẵn sàng'}</h2><p>{roomMessage(info.state)}</p><Link to={back} className="nm-call-primary">Về lịch tư vấn</Link></div>}
      </section>
      <aside className="nm-call-sidebar"><span className="nm-call-sidebar-icon"><Camera size={25} weight="duotone" /></span><h2>Thông tin buổi tư vấn</h2>{info && <><dl><div><dt>Chuyên gia</dt><dd>{info.expert_name || 'Chưa được phân công'}</dd></div><div><dt>Người đặt lịch</dt><dd>{info.user_name || 'Người dùng'}</dd></div><div><dt>Chuyên khoa</dt><dd>{consultationSpecialtyLabels[info.specialty]}</dd></div>{info.opens_at && <div><dt>Thời gian mở phòng</dt><dd>{dateTime(info.opens_at)}</dd></div>}</dl>{info.note && <div className="nm-call-note"><h3>Ghi chú đặt lịch</h3><p>{info.note}</p></div>}</>}<div className="nm-call-help"><ShieldCheck size={22} /><div><h3>Không gian riêng cho hai người</h3><p>Cuộc gọi được mã hóa đầu cuối khi kết nối. Camera và micro chỉ được bật khi bạn cho phép. Buổi gọi không được ghi hình.</p></div></div><p className="nm-call-tip">Dùng tai nghe và chọn nơi yên tĩnh để trò chuyện rõ hơn.</p></aside>
    </div>
  </main>
}
