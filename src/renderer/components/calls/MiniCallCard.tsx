/**
 * MiniCallCard.tsx
 *
 * Painel flutuante compacto exibido durante uma chamada ativa.
 * Aparece abaixo do ConversationHeader sem cobrir a navegação principal.
 * Suporta todos os estados do callStore.
 */

import React, { useEffect, useState } from 'react'
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff, Phone,
  Maximize2,
  PhoneIncoming,
} from 'lucide-react'
import { useCallStore } from '@/store/callStore'
import { useCall } from '@/hooks/useCall'
import { Avatar } from '@/components/ui/index'

/** Formata segundos em MM:SS (ou HH:MM:SS se ≥ 1h) */
function formatDuration(secs: number): string {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0')
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ── Botão de controle compacto ─────────────────────────────────────────────────

interface CtrlBtnProps {
  onClick: () => void
  title: string
  ariaLabel: string
  danger?: boolean
  active?: boolean
  children: React.ReactNode
}

const CtrlBtn: React.FC<CtrlBtnProps> = ({ onClick, title, ariaLabel, danger, active = true, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel}
    aria-pressed={!danger ? active : undefined}
    className={[
      'w-9 h-9 flex items-center justify-center rounded-full transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
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

// ── Pontos animados ────────────────────────────────────────────────────────────

const AnimatedDots: React.FC = () => {
  const [dot, setDot] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500)
    return () => clearInterval(id)
  }, [])
  return <span aria-hidden="true">{'.'.repeat(dot)}</span>
}

// ── MiniCallCard ──────────────────────────────────────────────────────────────

const MiniCallCard: React.FC = () => {
  const {
    callStatus,
    callType,
    remoteUserName,
    remoteAvatar,
    micEnabled,
    camEnabled,
    screenEnabled,
    duration,
  } = useCallStore()

  const call = useCall()

  // Estados terminais: auto-remover após 2 s
  useEffect(() => {
    if (['ended', 'rejected', 'cancelled', 'timeout', 'failed', 'missed'].includes(callStatus)) {
      const id = setTimeout(() => {
        useCallStore.getState().resetCall()
      }, 2000)
      return () => clearTimeout(id)
    }
  }, [callStatus])

  // Não renderizar quando idle
  if (callStatus === 'idle') return null

  const isVideo = callType === 'video'
  const name    = remoteUserName ?? '…'

  return (
    <>
      {/* Keyframe animation injetada inline */}
      <style>{`
        @keyframes mini-call-slide-down {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .mini-call-enter {
          animation: mini-call-slide-down 200ms ease-out both;
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Chamada com ${name}`}
        className={[
          'mini-call-enter',
          'fixed top-[72px] left-1/2 z-[90]',
          'max-w-[400px] w-[calc(100%-2rem)]',
          'pointer-events-none',
          // Use inline transform to maintain -translate-x-1/2 alongside animation
        ].join(' ')}
        style={{ transform: 'translateX(-50%)' }}
      >
        <div
          className={[
            'pointer-events-auto',
            'bg-background-secondary border border-border',
            'rounded-2xl shadow-2xl overflow-hidden',
          ].join(' ')}
        >
          {/* ── INCOMING ──────────────────────────────────────────────── */}
          {callStatus === 'incoming' && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar src={remoteAvatar} name={name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm truncate">{name}</p>
                <p className="text-text-secondary text-xs">
                  Chamada de {isVideo ? 'vídeo' : 'voz'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={call.reject}
                  title="Recusar chamada"
                  aria-label="Recusar chamada"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <PhoneOff size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => { void call.accept() }}
                  title="Atender chamada"
                  aria-label="Atender chamada"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                >
                  <PhoneIncoming size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── OUTGOING / RINGING ────────────────────────────────────── */}
          {(callStatus === 'outgoing') && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar src={remoteAvatar} name={name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm truncate">{name}</p>
                <p className="text-text-secondary text-xs">
                  Chamando<AnimatedDots />
                </p>
              </div>
              <CtrlBtn
                onClick={call.hangUp}
                title="Cancelar chamada"
                ariaLabel="Cancelar chamada"
                danger
              >
                <PhoneOff size={16} />
              </CtrlBtn>
            </div>
          )}

          {/* ── CONNECTING ────────────────────────────────────────────── */}
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar src={remoteAvatar} name={name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm truncate">{name}</p>
                <p className="text-text-secondary text-xs">
                  Conectando<AnimatedDots />
                </p>
              </div>
              <CtrlBtn
                onClick={call.hangUp}
                title="Cancelar"
                ariaLabel="Cancelar chamada"
                danger
              >
                <PhoneOff size={16} />
              </CtrlBtn>
            </div>
          )}

          {/* ── CONNECTED ─────────────────────────────────────────────── */}
          {callStatus === 'connected' && (
            <div className="px-4 py-3">
              {/* Linha superior: avatar + nome + duração */}
              <div className="flex items-center gap-3 mb-2.5">
                <Avatar src={remoteAvatar} name={name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-sm truncate">{name}</p>
                  <p className="text-accent text-xs font-mono">
                    Em chamada • {formatDuration(duration)}
                  </p>
                </div>
              </div>
              {/* Controles */}
              <div
                className="flex items-center justify-center gap-2"
                role="toolbar"
                aria-label="Controles da chamada"
              >
                <CtrlBtn
                  onClick={call.toggleMic}
                  title={micEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
                  ariaLabel={micEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
                  active={micEnabled}
                >
                  {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </CtrlBtn>

                {isVideo && (
                  <CtrlBtn
                    onClick={call.toggleCam}
                    title={camEnabled ? 'Desligar câmera' : 'Ligar câmera'}
                    ariaLabel={camEnabled ? 'Desligar câmera' : 'Ligar câmera'}
                    active={camEnabled}
                  >
                    {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                  </CtrlBtn>
                )}

                <CtrlBtn
                  onClick={() => { void call.toggleScreen() }}
                  title={screenEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
                  ariaLabel={screenEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
                  active={screenEnabled}
                >
                  {screenEnabled ? <MonitorOff size={16} /> : <Monitor size={16} />}
                </CtrlBtn>

                <CtrlBtn
                  onClick={() => useCallStore.getState().setExpanded(true)}
                  title="Expandir chamada"
                  ariaLabel="Expandir chamada"
                  active
                >
                  <Maximize2 size={16} />
                </CtrlBtn>

                <CtrlBtn
                  onClick={call.hangUp}
                  title="Encerrar chamada"
                  ariaLabel="Encerrar chamada"
                  danger
                >
                  <PhoneOff size={16} />
                </CtrlBtn>
              </div>
            </div>
          )}

          {/* ── ENDED ─────────────────────────────────────────────────── */}
          {callStatus === 'ended' && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/50">
                <Phone size={16} />
              </div>
              <p className="text-text-secondary text-sm">Chamada encerrada</p>
            </div>
          )}

          {/* ── FAILED ────────────────────────────────────────────────── */}
          {callStatus === 'failed' && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-red-600/20 text-red-400">
                <PhoneOff size={16} />
              </div>
              <p className="text-text-secondary text-sm">Não foi possível conectar</p>
            </div>
          )}

          {/* ── MISSED ────────────────────────────────────────────────── */}
          {callStatus === 'missed' && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-red-600/20 text-red-400">
                <PhoneOff size={16} />
              </div>
              <p className="text-text-secondary text-sm">Chamada não atendida</p>
            </div>
          )}
          {callStatus === 'rejected' && <div className="px-4 py-3 text-sm text-text-secondary">Chamada recusada</div>}
          {callStatus === 'cancelled' && <div className="px-4 py-3 text-sm text-text-secondary">Chamada cancelada</div>}
          {callStatus === 'timeout' && <div className="px-4 py-3 text-sm text-text-secondary">Tempo de chamada esgotado</div>}
        </div>
      </div>
    </>
  )
}

export default MiniCallCard
