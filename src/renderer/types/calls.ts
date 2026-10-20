/**
 * calls.ts
 *
 * Tipos centrais para o sistema de chamadas de voz/vídeo do Anceryx.
 * Utilizado pelo callStore, useCall e componentes de UI de chamada.
 */

// ── Status de chamada ─────────────────────────────────────────────────────────

export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'cancelled'
  | 'timeout'
  | 'failed'
  | 'missed'

// ── Histórico de chamada ──────────────────────────────────────────────────────

export interface CallHistoryEntry {
  id:             string
  callType:       'voice' | 'video'
  status:         'completed' | 'missed' | 'rejected' | 'cancelled'
  startedAt:      number
  endedAt?:       number
  durationSeconds?: number
  remoteUserId:   string
  remoteUserName: string
  remoteAvatar:   string | null
}

// ── Eventos de chamada (para signaling futuro) ────────────────────────────────
// Estas uniões discriminadas documentam os eventos que o signaling
// WebSocket precisará trocar quando o backend estiver disponível.

/** Eventos originados no cliente e enviados ao servidor de signaling. */
export type CallEvent =
  | { type: 'CALL_INITIATE'; toUserId: string; callType: 'voice' | 'video'; callId: string }
  | { type: 'CALL_ACCEPT';   callId: string }
  | { type: 'CALL_REJECT';   callId: string }
  | { type: 'CALL_CANCEL';   callId: string }
  | { type: 'CALL_END';      callId: string }
  | { type: 'CALL_ICE_CANDIDATE'; callId: string; candidate: RTCIceCandidateInit }
  | { type: 'CALL_SDP_OFFER';     callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'CALL_SDP_ANSWER';    callId: string; sdp: RTCSessionDescriptionInit }

/** Eventos recebidos do servidor de signaling. */
export type WebRTCEvent =
  | { type: 'INCOMING_CALL';  callId: string; fromUserId: string; fromUserName: string; fromAvatar: string | null; callType: 'voice' | 'video' }
  | { type: 'CALL_ACCEPTED';  callId: string }
  | { type: 'CALL_REJECTED';  callId: string }
  | { type: 'CALL_CANCELLED'; callId: string }
  | { type: 'CALL_ENDED';     callId: string }
  | { type: 'CALL_FAILED';    callId: string; reason?: string }
  | { type: 'ICE_CANDIDATE';  callId: string; candidate: RTCIceCandidateInit }
  | { type: 'SDP_OFFER';      callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'SDP_ANSWER';     callId: string; sdp: RTCSessionDescriptionInit }
