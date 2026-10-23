import React from 'react'
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff,
} from 'lucide-react'
import { useTranslation } from '@/i18n'

interface CallControlsProps {
  micEnabled:    boolean
  camEnabled:    boolean
  screenEnabled: boolean
  /** undefined = ocultar botão de câmera (chamada de voz pura) */
  showCamera?:   boolean
  onToggleMic:    () => void
  onToggleCam:    () => void
  onToggleScreen: () => void
  onHangUp:       () => void
}

const ControlBtn: React.FC<{
  active: boolean
  danger?: boolean
  onClick: () => void
  ariaLabel: string
  title: string
  children: React.ReactNode
}> = ({ active, danger, onClick, ariaLabel, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
    aria-pressed={!danger ? active : undefined}
    className={[
      'w-12 h-12 flex items-center justify-center rounded-full transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
      danger
        ? 'bg-red-600 hover:bg-red-500 text-white'
        : active
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white/50',
    ].join(' ')}
  >
    {children}
  </button>
)

const CallControls: React.FC<CallControlsProps> = ({
  micEnabled, camEnabled, screenEnabled, showCamera = true,
  onToggleMic, onToggleCam, onToggleScreen, onHangUp,
}) => {
  const t = useTranslation()
  return (
  <div className="flex items-center justify-center gap-3" role="toolbar" aria-label={t('calls.controls')}>
    <ControlBtn
      active={micEnabled}
      onClick={onToggleMic}
      ariaLabel={micEnabled ? t('calls.muteMic') : t('calls.unmuteMic')}
      title={micEnabled ? t('calls.mute') : t('calls.unmuteMic')}
    >
      {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
    </ControlBtn>

    {showCamera && (
      <ControlBtn
        active={camEnabled}
        onClick={onToggleCam}
        ariaLabel={camEnabled ? t('calls.cameraOff') : t('calls.cameraOn')}
        title={camEnabled ? t('calls.cameraOff') : t('calls.cameraOn')}
      >
        {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </ControlBtn>
    )}

    <ControlBtn
      active={screenEnabled}
      onClick={onToggleScreen}
      ariaLabel={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
      title={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
    >
      {screenEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
    </ControlBtn>

    <ControlBtn
      active
      danger
      onClick={onHangUp}
      ariaLabel={t('calls.end')}
      title={t('calls.end')}
    >
      <PhoneOff size={20} />
    </ControlBtn>
  </div>
  )
}

export default CallControls
