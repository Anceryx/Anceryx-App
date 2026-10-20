/**
 * VozSection.tsx
 *
 * Seção "Voz e Dispositivos" nas configurações do Anceryx.
 * - Enumera dispositivos de entrada e saída reais via enumerateDevices()
 * - Volume de entrada / saída (sliders locais)
 * - Teste de microfone com indicador de nível (AnalyserNode)
 * - Teste de áudio (tom de 440 Hz por 1 segundo)
 * - Todo estado é local — nada persiste no store
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Volume2, AlertTriangle, PlayCircle, StopCircle } from 'lucide-react'

// ── Helpers de layout (seguem padrão de ExperienciaSection) ──────────────────

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-semibold text-white mt-8 mb-2 first:mt-0">{children}</h3>
)

// ── Suporte a setSinkId ───────────────────────────────────────────────────────

const supportsSinkId = 'setSinkId' in HTMLMediaElement.prototype

// ── Helpers de label de dispositivo ──────────────────────────────────────────

function deviceLabel(d: MediaDeviceInfo, idx: number): string {
  return d.label.trim() !== '' ? d.label : `Dispositivo ${idx + 1}`
}

// ── Componente principal ──────────────────────────────────────────────────────

const VozSection: React.FC = () => {
  // Dispositivos
  const [devices,          setDevices]          = useState<MediaDeviceInfo[]>([])
  const [selectedInputId,  setSelectedInputId]  = useState<string>('default')
  const [selectedOutputId, setSelectedOutputId] = useState<string>('default')
  const [hasLabels,        setHasLabels]        = useState(true)

  // Volumes (0–100)
  const [inputVolume,  setInputVolume]  = useState(80)
  const [outputVolume, setOutputVolume] = useState(100)

  // Teste de microfone
  const [isTesting,  setIsTesting]  = useState(false)
  const [micLevel,   setMicLevel]   = useState(0)

  // Refs para cleanup
  const testStreamRef  = useRef<MediaStream | null>(null)
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const animFrameRef   = useRef<number>(0)

  // ── Enumeração de dispositivos ────────────────────────────────────────────

  const enumerate = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      // Verifica se os labels estão disponíveis (requer permissão prévia)
      const anyLabel = all.some((d) => d.label.trim() !== '')
      setHasLabels(anyLabel)
      setDevices(all)

      // Se o dispositivo selecionado sumiu, volta para 'default'
      const inputIds  = all.filter((d) => d.kind === 'audioinput').map((d) => d.deviceId)
      const outputIds = all.filter((d) => d.kind === 'audiooutput').map((d) => d.deviceId)
      setSelectedInputId((prev) => (inputIds.includes(prev) ? prev : 'default'))
      setSelectedOutputId((prev) => (outputIds.includes(prev) ? prev : 'default'))
    } catch {
      // Permissão negada — manter lista vazia
    }
  }, [])

  useEffect(() => {
    void enumerate()
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerate)
    }
  }, [enumerate])

  // Filtros por tipo
  const inputDevices  = devices.filter((d) => d.kind === 'audioinput')
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput')

  // ── Teste de microfone ────────────────────────────────────────────────────

  const stopMicTest = useCallback(() => {
    // Parar animação
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    // Fechar AudioContext
    if (audioCtxRef.current) {
      void audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    // Parar tracks do stream
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop())
      testStreamRef.current = null
    }
    setMicLevel(0)
    setIsTesting(false)
  }, [])

  const startMicTest = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedInputId === 'default'
          ? true
          : { deviceId: { exact: selectedInputId } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      testStreamRef.current = stream

      const ctx      = new AudioContext()
      audioCtxRef.current = ctx
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const buf = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        // normalizar 0–255 para 0–100
        setMicLevel(Math.min(100, Math.round((avg / 255) * 100 * 2.5)))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
      setIsTesting(true)
    } catch {
      // Permissão negada ou dispositivo indisponível
      setIsTesting(false)
    }
  }, [selectedInputId])

  const toggleMicTest = () => {
    if (isTesting) {
      stopMicTest()
    } else {
      void startMicTest()
    }
  }

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopMicTest()
    }
  }, [stopMicTest])

  // ── Testar áudio (tom de 440 Hz por 1 s) ────────────────────────────────

  const playTestTone = useCallback(() => {
    try {
      const ctx  = new AudioContext()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 440
      osc.type = 'sine'
      gain.gain.value = (outputVolume / 100) * 0.4
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 1)
      osc.onended = () => { void ctx.close() }
    } catch {
      // AudioContext indisponível
    }
  }, [outputVolume])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">

      {/* Aviso de permissão */}
      {!hasLabels && devices.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 mb-6">
          <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300">
            Permissão de microfone necessária para ver os nomes dos dispositivos. Os nomes serão
            exibidos corretamente após uma chamada ser iniciada.
          </p>
        </div>
      )}

      {/* ── Dispositivo de Entrada ── */}
      <SectionTitle>Dispositivo de Entrada</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">
        <div className="py-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mic size={14} className="text-zinc-400 shrink-0" />
              <p className="text-sm text-white">Microfone</p>
            </div>
          </div>
          <select
            value={selectedInputId}
            onChange={(e) => setSelectedInputId(e.target.value)}
            aria-label="Dispositivo de entrada de áudio"
            className="w-full bg-background-primary border border-border text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="default">Padrão do Sistema</option>
            {inputDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {deviceLabel(d, i)}
              </option>
            ))}
          </select>
        </div>

        {/* Volume de entrada */}
        <div className="py-3.5 border-t border-border">
          <div className="flex justify-between mb-2">
            <p className="text-sm text-white">Volume de entrada</p>
            <span className="text-xs text-zinc-400">{inputVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={inputVolume}
            onChange={(e) => setInputVolume(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer h-1.5"
            aria-label="Volume de entrada"
          />
        </div>

        {/* Teste de microfone */}
        <div className="py-3.5 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white">Teste de microfone</p>
            <button
              type="button"
              onClick={toggleMicTest}
              aria-label={isTesting ? 'Parar teste de microfone' : 'Iniciar teste de microfone'}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                isTesting
                  ? 'bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600/30'
                  : 'bg-accent/20 text-accent-secondary border border-purple-600/40 hover:bg-accent/30',
              ].join(' ')}
            >
              {isTesting
                ? <><StopCircle size={13} /> Parar teste</>
                : <><PlayCircle size={13} /> Iniciar teste</>}
            </button>
          </div>

          {/* Barra de nível */}
          <div
            className="h-2 w-full rounded-full bg-background-primary border border-border overflow-hidden"
            role="progressbar"
            aria-label="Nível do microfone"
            aria-valuenow={micLevel}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${micLevel}%`,
                background: micLevel > 80
                  ? '#ef4444'
                  : micLevel > 50
                    ? '#f59e0b'
                    : '#8b5cf6',
              }}
            />
          </div>
          {!isTesting && (
            <p className="text-xs text-zinc-500 mt-1.5">
              Clique em "Iniciar teste" e fale para verificar seu microfone.
            </p>
          )}
        </div>
      </div>

      {/* ── Dispositivo de Saída ── */}
      <SectionTitle>Dispositivo de Saída</SectionTitle>
      <div className="bg-background-secondary rounded-lg px-5 border border-border">
        <div className="py-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-zinc-400 shrink-0" />
              <p className="text-sm text-white">Saída de áudio</p>
            </div>
          </div>
          {!supportsSinkId ? (
            <p className="text-xs text-zinc-500 italic">
              Seleção de saída não suportada neste navegador — usando saída padrão do sistema.
            </p>
          ) : (
            <select
              value={selectedOutputId}
              onChange={(e) => setSelectedOutputId(e.target.value)}
              aria-label="Dispositivo de saída de áudio"
              className="w-full bg-background-primary border border-border text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value="default">Padrão do Sistema</option>
              {outputDevices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {deviceLabel(d, i)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Volume de saída */}
        <div className="py-3.5 border-t border-border">
          <div className="flex justify-between mb-2">
            <p className="text-sm text-white">Volume de saída</p>
            <span className="text-xs text-zinc-400">{outputVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={outputVolume}
            onChange={(e) => setOutputVolume(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer h-1.5"
            aria-label="Volume de saída"
          />
        </div>

        {/* Testar áudio */}
        <div className="py-3.5 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Testar áudio</p>
              <p className="text-xs text-zinc-500 mt-0.5">Toca um tom de 440 Hz por 1 segundo</p>
            </div>
            <button
              type="button"
              onClick={playTestTone}
              aria-label="Reproduzir tom de teste de áudio"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 border border-border text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <PlayCircle size={13} />
              Testar áudio
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default VozSection
