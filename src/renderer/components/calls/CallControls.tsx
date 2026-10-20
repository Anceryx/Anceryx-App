import React from 'react'
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff,
} from 'lucide-react'

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
}) => (
  <div className="flex items-center justify-center gap-3" role="toolbar" aria-label="Controles da chamada">
    <ControlBtn
      active={micEnabled}
      onClick={onToggleMic}
      ariaLabel={micEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
      title={micEnabled ? 'Silenciar' : 'Ativar mic'}
    >
      {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
    </ControlBtn>

    {showCamera && (
      <ControlBtn
        active={camEnabled}
        onClick={onToggleCam}
        ariaLabel={camEnabled ? 'Desligar câmera' : 'Ligar câmera'}
        title={camEnabled ? 'Desligar câmera' : 'Ligar câmera'}
      >
        {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </ControlBtn>
    )}

    <ControlBtn
      active={screenEnabled}
      onClick={onToggleScreen}
      ariaLabel={screenEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
      title={screenEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
    >
      {screenEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
    </ControlBtn>

    <ControlBtn
      active
      danger
      onClick={onHangUp}
      ariaLabel="Encerrar chamada"
      title="Encerrar"
    >
      <PhoneOff size={20} />
    </ControlBtn>
  </div>
)

export default CallControls
