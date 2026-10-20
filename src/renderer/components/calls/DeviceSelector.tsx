/**
 * DeviceSelector.tsx
 *
 * Botão split: botão principal liga/desliga mic ou câmera;
 * seta abre popover com lista de dispositivos disponíveis.
 *
 * Suporta troca de audioinput, audiooutput (via setSinkId quando disponível)
 * e videoinput sem interromper a chamada.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff,
  Video, VideoOff,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DeviceSelectorProps {
  type: 'audio' | 'video'
  enabled: boolean
  onToggle: () => void
  stream: MediaStream | null
  onDeviceChange: (deviceId: string, kind: 'audioinput' | 'audiooutput' | 'videoinput') => void
  onOpenVoiceSettings?: () => void
}

interface DeviceGroups {
  audioinput:  MediaDeviceInfo[]
  audiooutput: MediaDeviceInfo[]
  videoinput:  MediaDeviceInfo[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const supportsSinkId = 'setSinkId' in HTMLMediaElement.prototype

function deviceLabel(d: MediaDeviceInfo, idx: number): string {
  return d.label.trim() !== '' ? d.label : `Dispositivo ${idx + 1}`
}

// ── Componente ─────────────────────────────────────────────────────────────────

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  type, enabled, onToggle, stream: _stream,
  onDeviceChange, onOpenVoiceSettings,
}) => {
  const [devices,        setDevices]        = useState<DeviceGroups>({ audioinput: [], audiooutput: [], videoinput: [] })
  const [selectedInput,  setSelectedInput]  = useState<string>('default')
  const [selectedOutput, setSelectedOutput] = useState<string>('default')
  const [isOpen,         setIsOpen]         = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<HTMLButtonElement>(null)

  // ── Enumerar dispositivos ────────────────────────────────────────────────
  const enumerate = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices({
        audioinput:  all.filter((d) => d.kind === 'audioinput'),
        audiooutput: all.filter((d) => d.kind === 'audiooutput'),
        videoinput:  all.filter((d) => d.kind === 'videoinput'),
      })
    } catch {
      // Permissão negada ou API indisponível — manter lista vazia
    }
  }, [])

  useEffect(() => {
    void enumerate()

    const handler = () => {
      void enumerate()
    }
    navigator.mediaDevices.addEventListener('devicechange', handler)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler)
    }
  }, [enumerate])

  // ── Fechar popover ao clicar fora ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        chevronRef.current && !chevronRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // ── Selecionar dispositivo ────────────────────────────────────────────────
  const handleSelect = useCallback((deviceId: string, kind: 'audioinput' | 'audiooutput' | 'videoinput') => {
    if (kind === 'audioinput')  setSelectedInput(deviceId)
    if (kind === 'audiooutput') setSelectedOutput(deviceId)
    if (kind === 'videoinput')  setSelectedInput(deviceId)
    onDeviceChange(deviceId, kind)
    setIsOpen(false)
  }, [onDeviceChange])

  // ── Ícones ────────────────────────────────────────────────────────────────
  const MainIcon = type === 'audio'
    ? (enabled ? Mic    : MicOff)
    : (enabled ? Video  : VideoOff)

  const isActive = enabled

  return (
    <div className="relative flex items-center">
      {/* ── Botão principal ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          type === 'audio'
            ? (enabled ? 'Silenciar microfone' : 'Ativar microfone')
            : (enabled ? 'Desligar câmera'     : 'Ligar câmera')
        }
        aria-pressed={isActive}
        title={
          type === 'audio'
            ? (enabled ? 'Silenciar' : 'Ativar mic')
            : (enabled ? 'Desligar câmera' : 'Ligar câmera')
        }
        className={[
          'w-12 h-12 flex items-center justify-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          'rounded-l-full',
          isActive
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white/50',
        ].join(' ')}
      >
        <MainIcon size={20} />
      </button>

      {/* ── Seta chevron ───────────────────────────────────────────── */}
      <button
        ref={chevronRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Selecionar dispositivo"
        title="Selecionar dispositivo"
        aria-expanded={isOpen}
        className={[
          'w-6 h-12 flex items-center justify-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          'rounded-r-full border-l border-white/10',
          isActive
            ? 'bg-white/15 hover:bg-white/25 text-white'
            : 'bg-white/8 hover:bg-white/15 text-white/40',
        ].join(' ')}
      >
        <ChevronDown size={14} />
      </button>

      {/* ── Popover ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="menu"
          aria-label="Dispositivos de áudio"
          className={[
            'absolute bottom-full mb-2 left-0',
            'bg-background-secondary border border-border rounded-xl shadow-2xl',
            'p-3 min-w-[240px] z-[200]',
          ].join(' ')}
        >
          {/* ── AUDIOINPUT ─────────────────────────────────────────── */}
          {type === 'audio' && (
            <>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1.5 px-1">
                Microfone
              </p>
              {devices.audioinput.length === 0 ? (
                <p className="text-xs text-text-secondary px-1 py-1">Nenhum dispositivo encontrado</p>
              ) : (
                devices.audioinput.map((d, i) => (
                  <button
                    key={d.deviceId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedInput === d.deviceId}
                    onClick={() => handleSelect(d.deviceId, 'audioinput')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="w-4 shrink-0">
                      {selectedInput === d.deviceId && <Check size={14} className="text-accent" />}
                    </span>
                    <span className="truncate">{deviceLabel(d, i)}</span>
                  </button>
                ))
              )}

              {/* ── Separator ─────────────────────────────────────── */}
              <div className="my-2 border-t border-border" />

              {/* ── AUDIOOUTPUT ───────────────────────────────────── */}
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1.5 px-1">
                Saída de áudio
              </p>
              {!supportsSinkId ? (
                <p className="text-xs text-text-secondary px-1 py-1 italic">
                  Saída padrão do sistema (troca não suportada neste navegador)
                </p>
              ) : devices.audiooutput.length === 0 ? (
                <p className="text-xs text-text-secondary px-1 py-1">Nenhum dispositivo encontrado</p>
              ) : (
                devices.audiooutput.map((d, i) => (
                  <button
                    key={d.deviceId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedOutput === d.deviceId}
                    onClick={() => handleSelect(d.deviceId, 'audiooutput')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="w-4 shrink-0">
                      {selectedOutput === d.deviceId && <Check size={14} className="text-accent" />}
                    </span>
                    <span className="truncate">{deviceLabel(d, i)}</span>
                  </button>
                ))
              )}

              {/* ── Voice Settings link ────────────────────────────── */}
              <div className="mt-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onOpenVoiceSettings?.()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors text-left"
                >
                  <Settings size={14} className="shrink-0" />
                  <span>Configurações de voz</span>
                </button>
              </div>
            </>
          )}

          {/* ── VIDEOINPUT ─────────────────────────────────────────── */}
          {type === 'video' && (
            <>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1.5 px-1">
                Câmera
              </p>
              {devices.videoinput.length === 0 ? (
                <p className="text-xs text-text-secondary px-1 py-1">Nenhum dispositivo encontrado</p>
              ) : (
                devices.videoinput.map((d, i) => (
                  <button
                    key={d.deviceId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedInput === d.deviceId}
                    onClick={() => handleSelect(d.deviceId, 'videoinput')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="w-4 shrink-0">
                      {selectedInput === d.deviceId && <Check size={14} className="text-accent" />}
                    </span>
                    <span className="truncate">{deviceLabel(d, i)}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DeviceSelector
