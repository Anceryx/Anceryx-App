/**
 * callStore.ts
 *
 * Zustand store para o estado global de chamadas de voz/vídeo.
 *
 * ⚠️  Sem persist middleware: MediaStream refs não são serializáveis.
 *     Os streams são mantidos em refs de módulo fora do estado Zustand.
 */

import { create } from 'zustand'
import type { CallStatus, CallHistoryEntry } from '@/types/calls'
import { stopStream } from '@/services/webrtc/peerConnection'

// ── Module-level MediaStream refs ─────────────────────────────────────────────
// Ficam fora do estado Zustand para não tentar serializar MediaStream.
let localStreamRef:  MediaStream | null = null
let screenStreamRef: MediaStream | null = null
let remoteStreamRef: MediaStream | null = null

export function getLocalStream():  MediaStream | null { return localStreamRef  }
export function getScreenStream(): MediaStream | null { return screenStreamRef }
export function getRemoteStream(): MediaStream | null { return remoteStreamRef }

// ── Parâmetros reutilizados ───────────────────────────────────────────────────

export interface CallParticipantParams {
  remoteUserId:   string
  remoteUserName: string
  remoteAvatar:   string | null
  callType:       'voice' | 'video'
}

// ── Tipagem do store ──────────────────────────────────────────────────────────

interface CallState {
  callStatus:     CallStatus
  callType:       'voice' | 'video' | null
  remoteUserId:   string | null
  remoteUserName: string | null
  remoteAvatar:   string | null
  micEnabled:     boolean
  camEnabled:     boolean
  screenEnabled:  boolean
  duration:       number
  isExpanded:     boolean
  callHistory:    CallHistoryEntry[]
  streamVersion:  number
}

interface CallActions {
  startOutgoing:   (params: CallParticipantParams) => void
  receiveIncoming: (params: CallParticipantParams) => void
  acceptCall:      () => void
  rejectCall:      () => void
  cancelCall:      () => void
  connectCall:     () => void
  endCall:         () => void
  failCall:        (message?: string) => void
  missCall:        () => void
  timeoutCall:     () => void
  resetCall:       () => void
  toggleMic:       (stream: MediaStream | null) => void
  toggleCam:       (stream: MediaStream | null) => void
  toggleScreen:    (stream: MediaStream | null) => void
  setExpanded:     (v: boolean) => void
  addHistoryEntry: (entry: CallHistoryEntry) => void
  setDuration:     (n: number) => void
  setLocalStream:  (s: MediaStream | null) => void
  setScreenStream: (s: MediaStream | null) => void
  setRemoteStream: (s: MediaStream | null) => void
}

const IDLE_STATE: CallState = {
  callStatus:     'idle',
  callType:       null,
  remoteUserId:   null,
  remoteUserName: null,
  remoteAvatar:   null,
  micEnabled:     true,
  camEnabled:     true,
  screenEnabled:  false,
  duration:       0,
  isExpanded:     false,
  callHistory:    [],
  streamVersion:  0,
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCallStore = create<CallState & CallActions>()((set, get) => ({
  ...IDLE_STATE,

  // ── Iniciar chamada de saída ──────────────────────────────────────────────
  startOutgoing: (params) => set({
    callStatus:     'outgoing',
    callType:       params.callType,
    remoteUserId:   params.remoteUserId,
    remoteUserName: params.remoteUserName,
    remoteAvatar:   params.remoteAvatar,
    micEnabled:     true,
    camEnabled:     params.callType === 'video',
    screenEnabled:  false,
    duration:       0,
    isExpanded:     false,
  }),

  // ── Receber chamada de entrada ────────────────────────────────────────────
  receiveIncoming: (params) => set({
    callStatus:     'incoming',
    callType:       params.callType,
    remoteUserId:   params.remoteUserId,
    remoteUserName: params.remoteUserName,
    remoteAvatar:   params.remoteAvatar,
    micEnabled:     true,
    camEnabled:     params.callType === 'video',
    screenEnabled:  false,
    duration:       0,
    isExpanded:     false,
  }),

  // ── Aceitar chamada incoming ──────────────────────────────────────────────
  acceptCall: () => set({ callStatus: 'connecting' }),

  // ── Rejeitar chamada incoming ─────────────────────────────────────────────
  // Stream cleanup is the hook's responsibility (cleanupAll). Store only resets state.
  rejectCall: () => {
    set({ callStatus: 'rejected', isExpanded: false })
  },

  // ── Cancelar chamada de saída ─────────────────────────────────────────────
  // Stream cleanup is the hook's responsibility (cleanupAll). Store only resets state.
  cancelCall: () => {
    set({ callStatus: 'cancelled', isExpanded: false })
  },

  // ── Conectado ─────────────────────────────────────────────────────────────
  connectCall: () => set({ callStatus: 'connected', duration: 0 }),

  // ── Encerrar chamada ──────────────────────────────────────────────────────
  // Stream cleanup is the hook's responsibility (cleanupAll). Store only resets state.
  endCall: () => {
    set({ callStatus: 'ended', isExpanded: false })
  },

  // ── Falha ─────────────────────────────────────────────────────────────────
  // Stream cleanup is the hook's responsibility (cleanupAll). Store only resets state.
  failCall: (_message?: string) => {
    set((s) => ({ ...IDLE_STATE, callStatus: 'failed', callHistory: s.callHistory }))
  },

  // ── Não atendida ──────────────────────────────────────────────────────────
  // Stream cleanup is the hook's responsibility (cleanupAll). Store only resets state.
  missCall: () => {
    set((s) => ({ ...IDLE_STATE, callStatus: 'missed', callHistory: s.callHistory }))
  },

  timeoutCall: () => set({ callStatus: 'timeout', isExpanded: false }),
  resetCall: () => set((state) => ({ ...IDLE_STATE, callHistory: state.callHistory, streamVersion: state.streamVersion })),

  // ── Controles de mídia ────────────────────────────────────────────────────
  toggleMic: (stream) => {
    const next = !get().micEnabled
    if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = next })
    set({ micEnabled: next })
  },

  toggleCam: (stream) => {
    const next = !get().camEnabled
    if (stream) stream.getVideoTracks().forEach((t) => { t.enabled = next })
    set({ camEnabled: next })
  },

  toggleScreen: (stream) => {
    const next = !get().screenEnabled
    if (!next) {
      stopStream(screenStreamRef)
      screenStreamRef = null
    } else if (stream) {
      screenStreamRef = stream
    }
    set({ screenEnabled: next })
  },

  // ── UI ────────────────────────────────────────────────────────────────────
  setExpanded: (v) => set({ isExpanded: v }),

  // ── Histórico ─────────────────────────────────────────────────────────────
  addHistoryEntry: (entry) =>
    set((s) => ({ callHistory: [entry, ...s.callHistory] })),

  // ── Duração ───────────────────────────────────────────────────────────────
  setDuration: (n) => set({ duration: n }),

  // ── Streams (mantém refs de módulo sincronizados) ─────────────────────────
  setLocalStream: (s) => { localStreamRef = s; set((state) => ({ streamVersion: state.streamVersion + 1 })) },
  setScreenStream: (s) => { screenStreamRef = s; set((state) => ({ streamVersion: state.streamVersion + 1 })) },
  setRemoteStream: (s) => { remoteStreamRef = s; set((state) => ({ streamVersion: state.streamVersion + 1 })) },
}))
