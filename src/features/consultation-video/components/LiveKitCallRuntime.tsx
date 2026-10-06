import {
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  StartAudio,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  type LocalUserChoices,
} from '@livekit/components-react'
import {
  ConnectionState,
  ExternalE2EEKeyProvider,
  isE2EESupported,
  Room,
  ScreenSharePresets,
  Track,
  VideoPresets,
} from 'livekit-client'
import { CheckCircle, LockKey, Microphone, MicrophoneSlash, Monitor, PhoneDisconnect, VideoCamera, VideoCameraSlash } from '@phosphor-icons/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { VideoCredentials, VideoRoomInfo } from '../api/video-api'
import { callCapabilityError } from '../model/video-room'
import '@livekit/components-styles'

export interface CallDeviceChoices {
  username: string
  audioEnabled: boolean
  videoEnabled: boolean
  audioDeviceId: string
  videoDeviceId: string
}

interface RuntimeProps {
  info: VideoRoomInfo
  credentials: VideoCredentials | null
  choices: CallDeviceChoices | null
  displayName: string
  joining: boolean
  completing: boolean
  completeDisabled: boolean
  completeLabel: string
  joinDisabled: boolean
  joinLabel: string
  onJoin: (choices: CallDeviceChoices) => void
  onLeave: () => void
  onComplete: () => Promise<boolean>
  onUnexpectedDisconnect: () => void
  onError: (message: string) => void
  onRegisterDisposer: (dispose: (() => void) | null) => void
}

const permissionMessage = 'Không thể bật thiết bị. Hãy kiểm tra quyền camera, micro hoặc chia sẻ màn hình trong trình duyệt.'
const disposeResources = ({ room, worker }: { room: Room; worker: Worker }) => {
  room.localParticipant.trackPublications.forEach((publication) => publication.track?.stop())
  return room.disconnect().catch(() => undefined).finally(() => worker.terminate())
}

const CallStage = memo(function CallStage({ info, completing, completeDisabled, completeLabel, onLeave, onComplete, onError }: Pick<RuntimeProps, 'info' | 'completing' | 'completeDisabled' | 'completeLabel' | 'onLeave' | 'onComplete' | 'onError'>) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])
  const remoteParticipants = useRemoteParticipants()
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
  const connection = useConnectionState()
  const [toggling, setToggling] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [completionFailed, setCompletionFailed] = useState(false)
  const confirmation = useRef<HTMLDialogElement>(null)
  const screen = tracks.find((track) => track.source === Track.Source.ScreenShare)
  const remoteCamera = tracks.find((track) => !track.participant.isLocal && track.source === Track.Source.Camera)
  const localCamera = tracks.find((track) => track.participant.isLocal && track.source === Track.Source.Camera)
  const primary = screen ?? (remoteParticipants.length > 0 ? remoteCamera : undefined)
  const counterpart = info.expert ? info.user_name : info.expert_name

  useEffect(() => {
    const dialog = confirmation.current
    if (confirming && dialog && !dialog.open) dialog.showModal()
    if (!confirming && dialog?.open) dialog.close()
  }, [confirming])

  const toggle = useCallback(async (action: () => Promise<unknown>) => {
    if (toggling) return
    setToggling(true)
    try { await action() } catch { onError(permissionMessage) }
    finally { setToggling(false) }
  }, [onError, toggling])

  const connectionLabel = connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting
    ? 'Mạng gián đoạn · Đang kết nối lại…'
    : connection === ConnectionState.Connected ? 'Đã kết nối' : 'Đang kết nối…'

  return <>
    <div className="nm-call-stage" data-lk-theme="default">
      {primary ? <div className="nm-call-primary-video"><ParticipantTile trackRef={primary} />{primary === remoteCamera && (!remoteCamera.publication || remoteCamera.publication.isMuted) && <p>Camera của {counterpart || 'người tham gia'} đang tắt</p>}</div> : <div className="nm-call-waiting"><span><VideoCamera size={38} weight="duotone" /></span><h2>{connection === ConnectionState.Connecting ? 'Đang kết nối phòng…' : 'Đang chờ người còn lại'}</h2><p>{counterpart || 'Người tham gia'} sẽ xuất hiện tại đây khi vào phòng.</p></div>}
      {localCamera && <div className={`nm-call-self${isCameraEnabled ? '' : ' is-camera-off'}`}><ParticipantTile trackRef={localCamera} /><span>{isCameraEnabled ? 'Bạn' : 'Camera đang tắt'}</span></div>}
      <div className={`nm-call-connection is-${connection.toLowerCase()}`} role="status"><span aria-hidden="true" />{connectionLabel}</div>
      <RoomAudioRenderer />
      <StartAudio label="Bật âm thanh cuộc gọi" />
    </div>
    <div className="nm-call-controls" aria-label="Điều khiển cuộc gọi">
      <button type="button" disabled={toggling} aria-pressed={isMicrophoneEnabled} aria-label={isMicrophoneEnabled ? 'Tắt micro' : 'Bật micro'} onClick={() => void toggle(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>{isMicrophoneEnabled ? <Microphone size={23} /> : <MicrophoneSlash size={23} />}<span>Micro</span></button>
      <button type="button" disabled={toggling} aria-pressed={isCameraEnabled} aria-label={isCameraEnabled ? 'Tắt camera' : 'Bật camera'} onClick={() => void toggle(() => localParticipant.setCameraEnabled(!isCameraEnabled))}>{isCameraEnabled ? <VideoCamera size={23} /> : <VideoCameraSlash size={23} />}<span>Camera</span></button>
      <button type="button" disabled={toggling} aria-pressed={isScreenShareEnabled} aria-label={isScreenShareEnabled ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'} onClick={() => void toggle(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { resolution: ScreenSharePresets.h720fps15.resolution }))}><Monitor size={23} /><span>{isScreenShareEnabled ? 'Dừng chia sẻ' : 'Chia sẻ'}</span></button>
      <button type="button" className="nm-call-hangup" onClick={onLeave}><PhoneDisconnect size={23} /><span>Rời phòng</span></button>
      {info.expert && <button type="button" className="nm-call-finish" disabled={completeDisabled} onClick={() => { setCompletionFailed(false); setConfirming(true) }}><CheckCircle size={23} /><span>Hoàn tất tư vấn</span></button>}
    </div>
    <dialog ref={confirmation} className="nm-call-modal" aria-labelledby="finish-title" onClose={() => setConfirming(false)} onCancel={(event) => { if (completing) event.preventDefault() }}>
      <span className="nm-call-modal-icon"><LockKey size={24} weight="duotone" /></span><h2 id="finish-title">Hoàn tất buổi tư vấn?</h2><p>Phòng sẽ đóng cho cả hai bên. Người dùng có thể gửi đánh giá sau khi bạn xác nhận.</p>
      {completionFailed && <p className="nm-call-modal-error" role="alert">Chưa thể hoàn tất buổi tư vấn. Vui lòng kiểm tra kết nối hoặc thời gian chờ rồi thử lại.</p>}
      <div><button type="button" disabled={completing} onClick={() => setConfirming(false)} autoFocus>Tiếp tục tư vấn</button><button type="button" className="nm-call-primary" disabled={completeDisabled} onClick={() => { setCompletionFailed(false); void onComplete().then((success) => { if (!success) setCompletionFailed(true) }) }}>{completeLabel}</button></div>
    </dialog>
  </>
})

function ActiveRoom({ info, credentials, choices, completing, completeDisabled, completeLabel, onLeave, onComplete, onUnexpectedDisconnect, onError, onRegisterDisposer }: RuntimeProps & { credentials: VideoCredentials; choices: CallDeviceChoices }) {
  const [room, setRoom] = useState<Room | null>(null)
  const [fatalError, setFatalError] = useState('')
  const resources = useRef<{ room: Room; worker: Worker } | null>(null)
  const intentional = useRef(false)

  const closeRoom = useCallback(() => {
    intentional.current = true
    const current = resources.current
    resources.current = null
    if (current) void disposeResources(current)
  }, [])

  useEffect(() => {
    let cancelled = false
    let created: { room: Room; worker: Worker } | null = null
    let pendingWorker: Worker | null = null
    intentional.current = false
    void (async () => {
      try {
        const worker = new Worker(new URL('livekit-client/e2ee-worker', import.meta.url), { type: 'module' })
        pendingWorker = worker
        const keyProvider = new ExternalE2EEKeyProvider()
        const nextRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h540.resolution, frameRate: 20 },
          publishDefaults: {
            videoCodec: 'vp8',
            videoEncoding: { maxBitrate: 700_000, maxFramerate: 20 },
            screenShareEncoding: ScreenSharePresets.h720fps15.encoding,
          },
          encryption: { keyProvider, worker },
        })
        created = { room: nextRoom, worker }
        resources.current = created
        await keyProvider.setKey(credentials.encryption_key)
        await nextRoom.setE2EEEnabled(true)
        if (cancelled) return
        setRoom(nextRoom)
      } catch {
        if (created && resources.current === created) {
          resources.current = null
          await disposeResources(created)
        }
        if (!created) pendingWorker?.terminate()
        if (cancelled) return
        const message = 'Không thể thiết lập mã hóa đầu cuối. Hãy dùng Chrome hoặc Edge phiên bản mới nhất rồi thử lại.'
        setFatalError(message)
        onError(message)
      }
    })()
    onRegisterDisposer(closeRoom)
    return () => { cancelled = true; closeRoom(); onRegisterDisposer(null) }
  }, [closeRoom, credentials.encryption_key, onError, onRegisterDisposer])

  if (fatalError) return <div className="nm-call-empty is-dark" role="alert"><span><LockKey size={30} /></span><h2>Không thể bật mã hóa đầu cuối</h2><p>{fatalError}</p><button type="button" className="nm-call-primary" onClick={onLeave}>Quay lại kiểm tra thiết bị</button></div>

  if (!room) return <div className="nm-call-empty is-dark" role="status"><span className="nm-call-loader" /><h2>Đang thiết lập mã hóa…</h2><p>Khóa bảo mật chỉ được giữ trong bộ nhớ của trình duyệt.</p></div>

  return <LiveKitRoom room={room} serverUrl={credentials.server_url} token={credentials.participant_token}
    connect audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId || undefined } : false}
    video={choices.videoEnabled ? { deviceId: choices.videoDeviceId || undefined } : false}
    onError={() => onError('Kết nối hoặc thiết bị gặp sự cố. Bạn có thể rời phòng và thử vào lại.')}
    onEncryptionError={() => {
      const message = 'Mã hóa đầu cuối gặp sự cố. Cuộc gọi đã được đóng để bảo vệ riêng tư.'
      setFatalError(message); onError(message); closeRoom()
    }}
    onDisconnected={() => { if (!intentional.current) onUnexpectedDisconnect() }}>
    <CallStage info={info} completing={completing} completeDisabled={completeDisabled} completeLabel={completeLabel} onLeave={onLeave} onComplete={onComplete} onError={onError} />
  </LiveKitRoom>
}

export default function LiveKitCallRuntime(props: RuntimeProps) {
  if (props.credentials && props.choices) return <ActiveRoom {...props} credentials={props.credentials} choices={props.choices} />
  return <div className="nm-call-prejoin" data-lk-theme="default">
    <p className="nm-call-intro">Kiểm tra hình ảnh và âm thanh trước khi vào không gian tư vấn riêng tư.</p>
    <PreJoin defaults={{ username: props.displayName || 'Bạn', audioEnabled: true, videoEnabled: true }} persistUserChoices={false}
      camLabel="Camera" micLabel="Micro" userLabel="Tên của bạn" joinLabel={props.joinLabel}
      onValidate={() => !props.joinDisabled && !props.joining}
      onSubmit={(choices: LocalUserChoices) => {
        const capabilityError = callCapabilityError(window.isSecureContext, isE2EESupported())
        if (capabilityError) { props.onError(capabilityError); return }
        props.onJoin(choices as CallDeviceChoices)
      }}
      onError={() => props.onError('Hãy cho phép camera và micro trong trình duyệt. Bạn vẫn có thể tắt camera để tham gia bằng âm thanh.')} />
  </div>
}
