/**
 * CallOverlay.tsx
 *
 * Modal em tela cheia para chamada expandida.
 * Lê estado do callStore; ações vêm de useCall().
 * Inclui botão Minimizar que define isExpanded=false.
 * DeviceSelector substitui os botões simples de mic/câmera.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PhoneCall, AlertCircle, Minimize2, Monitor, MonitorOff, PhoneOff } from 'lucide-react'
import { useCallStore, getLocalStream, getRemoteStream, getScreenStream } from '@/store/callStore'
import { useCall } from '@/hooks/useCall'
import { getUserMedia } from '@/services/webrtc/peerConnection'
import { dmCallClient } from '@/services/webrtc/dmCallClient'
import DeviceSelector from './DeviceSelector'
import VideoTile from './VideoTile'
import { Avatar } from '@/components/ui/index'
import { useTranslation } from '@/i18n'

interface CallOverlayProps {
  onOpenVoiceSettings?: () => void
}

/** Formata segundos em MM:SS */
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const CallOverlay: React.FC<CallOverlayProps> = ({ onOpenVoiceSettings }) => {
  const t = useTranslation()
  // ── Estado do store ──────────────────────────────────────────────────────
  const {
    callStatus,
    callType,
    remoteUserId,
    remoteUserName,
    micEnabled,
    camEnabled,
    screenEnabled,
    duration,
    streamVersion,
  } = useCallStore()

  const call = useCall()

  const isVideo = callType === 'video'

  // Streams (refs de módulo)
  const localStream  = getLocalStream()
  const screenStream = getScreenStream()
  const remoteStream = getRemoteStream()

  // Ref para o elemento de áudio remoto (futuro: quando existir stream remoto real)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  // Dados do usuário remoto
  const remoteName = remoteUserName ?? t('calls.user')
  const remoteAvatar = call.remoteAvatar

  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
  }, [callStatus, remoteStream, streamVersion])

  // Pulsar indicador de "conectando"
  const [dot, setDot] = useState(0)
  useEffect(() => {
    if (callStatus !== 'connecting') { setDot(0); return }
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500)
    return () => clearInterval(id)
  }, [callStatus])

  const dotsStr = '.'.repeat(dot)

  // ── Troca de dispositivo ─────────────────────────────────────────────────
  const handleDeviceChange = useCallback(async (
    deviceId: string,
    kind: 'audioinput' | 'audiooutput' | 'videoinput',
  ) => {
    if (kind === 'audiooutput') {
      // Aplicar saída de áudio ao elemento remoto se disponível
      if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
        try {
          await (remoteAudioRef.current as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
            .setSinkId(deviceId)
        } catch {
          // Silencioso — não interromper chamada
        }
      }
      return
    }

    // Para audioinput / videoinput: obter novo stream com o deviceId exato
    const constraints: MediaStreamConstraints =
      kind === 'audioinput'
        ? { audio: { deviceId: { exact: deviceId } }, video: camEnabled }
        : { audio: micEnabled, video: { deviceId: { exact: deviceId } } }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      // Parar tracks antigas somente após adquirir o novo stream
      const currentStream = getLocalStream()
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop())
      }
      // Atualizar ref de módulo via store
      await dmCallClient.replaceLocalStream(newStream)

      // Sincronizar mute state
      newStream.getAudioTracks().forEach((t) => { t.enabled = micEnabled })
      newStream.getVideoTracks().forEach((t) => { t.enabled = camEnabled })
    } catch {
      // Não conseguiu obter o dispositivo — manter estado atual
    }
  }, [camEnabled, micEnabled])

  // Alias via getUserMedia do peerConnection para padronizar (evita duplicação de lógica)
  void getUserMedia // used indirectly above via navigator.mediaDevices

  // ── Status legado para compatibilidade com texto ──────────────────────────
  const legacyStatus =
    callStatus === 'connected'  ? 'active'     :
    callStatus === 'connecting' ? 'connecting' :
    callStatus === 'outgoing'   ? 'connecting' :
    callStatus === 'failed'     ? 'error'      : 'idle'

  return (
    <div
      className="titlebar-overlay fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ background: '#0a0a0c' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('calls.withUser', { name: remoteName })}
    >
      {/* Elemento de áudio oculto para stream remoto (futuro signaling) */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} aria-hidden="true" />

      {/* ── Botão Minimizar ──────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => useCallStore.getState().setExpanded(false)}
          aria-label={t('calls.minimize')}
          title={t('calls.minimize')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Minimize2 size={18} />
        </button>
      </div>

      {/* ── MODO VÍDEO ───────────────────────────────────────────────────── */}
      {isVideo && (
        <>
          {/* Vídeo remoto (área principal) — sem stream real sem signaling */}
          <div className="flex-1 relative">
            <VideoTile
              stream={remoteStream}
              label={remoteName}
              avatar={remoteAvatar}
              variant="full"
              className="absolute inset-0 w-full h-full"
            />

            {/* Compartilhamento de tela sobreposição */}
            {screenEnabled && screenStream && (
              <div className="absolute inset-0">
                <VideoTile
                  stream={screenStream}
                  label={t('calls.yourScreen')}
                  variant="full"
                  className="w-full h-full"
                />
              </div>
            )}

            {/* PiP — vídeo local */}
            <div className="absolute bottom-24 right-4 w-36 h-28">
              <VideoTile
                stream={localStream}
                mirror
                label={t('common.you')}
                variant="pip"
                camDisabled={!remoteStream?.getVideoTracks().length}
                className="w-full h-full"
              />
            </div>

            {/* Info topo */}
            <div className="absolute top-0 left-0 right-0 px-5 pt-5 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
              <div>
                <p className="text-white font-semibold text-base leading-tight">{remoteName}</p>
                <p className="text-white/60 text-sm">
                  {legacyStatus === 'connecting'
                    ? `${t('calls.connecting')}${dotsStr}`
                    : legacyStatus === 'active'
                      ? formatDuration(duration)
                      : legacyStatus === 'error'
                        ? t('calls.callError')
                        : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Controles inferiores */}
          <div className="shrink-0 px-6 py-5 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-3" role="toolbar" aria-label={t('calls.controls')}>
              <DeviceSelector
                type="audio"
                enabled={micEnabled}
                onToggle={call.toggleMic}
                stream={localStream}
                onDeviceChange={(id, kind) => { void handleDeviceChange(id, kind) }}
                onOpenVoiceSettings={onOpenVoiceSettings}
              />

              <DeviceSelector
                type="video"
                enabled={camEnabled}
                onToggle={call.toggleCam}
                stream={localStream}
                onDeviceChange={(id, kind) => { void handleDeviceChange(id, kind) }}
              />

              {/* Compartilhamento de tela */}
              <button
                type="button"
                onClick={() => { void call.toggleScreen() }}
                aria-label={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
                title={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
                aria-pressed={screenEnabled}
                className={[
                  'w-12 h-12 flex items-center justify-center rounded-full transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                  screenEnabled
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white/50',
                ].join(' ')}
              >
                {screenEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>

              {/* Encerrar */}
              <button
                type="button"
                onClick={call.hangUp}
                aria-label={t('calls.end')}
                title={t('calls.end')}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODO VOZ ─────────────────────────────────────────────────────── */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          {/* Avatar grande */}
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              boxShadow: legacyStatus === 'active'
                ? '0 0 0 8px rgba(139,92,246,0.15), 0 0 0 16px rgba(139,92,246,0.07)'
                : 'none',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            <Avatar src={remoteAvatar} name={remoteName} size="lg" />
          </div>

          {/* Nome e status */}
          <div className="text-center">
            <p className="text-white text-2xl font-bold mb-1">{remoteName}</p>
            <div className="flex items-center justify-center gap-1.5 text-white/60 text-sm">
              {legacyStatus === 'connecting' && (
                <>
                  <PhoneCall size={14} className="animate-pulse" />
                  <span>{t('calls.connecting')}{dotsStr}</span>
                </>
              )}
              {legacyStatus === 'active' && (
                <span>{formatDuration(duration)}</span>
              )}
              {legacyStatus === 'error' && (
                <>
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-red-400">{t('calls.connectFailed')}</span>
                </>
              )}
            </div>
          </div>

          {/* Aviso: sem signaling */}
          {legacyStatus === 'active' && (
            <p className="text-xs text-white/30 text-center max-w-xs">
              {t('calls.localPreview')}
            </p>
          )}

          {/* Controles */}
          <div className="flex items-center justify-center gap-3" role="toolbar" aria-label={t('calls.controls')}>
            <DeviceSelector
              type="audio"
              enabled={micEnabled}
              onToggle={call.toggleMic}
              stream={localStream}
              onDeviceChange={(id, kind) => { void handleDeviceChange(id, kind) }}
              onOpenVoiceSettings={onOpenVoiceSettings}
            />

            {/* Compartilhamento de tela */}
            <button
              type="button"
              onClick={() => { void call.toggleScreen() }}
              aria-label={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
              title={screenEnabled ? t('calls.stopSharing') : t('calls.shareScreen')}
              aria-pressed={screenEnabled}
              className={[
                'w-12 h-12 flex items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                screenEnabled
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/50',
              ].join(' ')}
            >
              {screenEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>

            {/* Encerrar */}
            <button
              type="button"
              onClick={call.hangUp}
              aria-label={t('calls.end')}
              title={t('calls.end')}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CallOverlay
