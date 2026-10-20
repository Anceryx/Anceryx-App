export type CallMode = 'voice' | 'video'
export interface MediaPermissionError { kind: 'denied' | 'not-found' | 'in-use' | 'unknown'; message: string }

export async function getUserMedia(mode: CallMode): Promise<{ stream: MediaStream } | { error: MediaPermissionError }> {
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false }) }
  } catch (error) { return { error: parseMediaError(error) } }
}

export async function getDisplayMedia(): Promise<{ stream: MediaStream } | { error: MediaPermissionError }> {
  if (!navigator.mediaDevices?.getDisplayMedia) return { error: { kind: 'unknown', message: 'Compartilhamento de tela não é compatível com este dispositivo.' } }
  try { return { stream: await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30 } }, audio: false }) } }
  catch (error) { return { error: parseMediaError(error) } }
}

export function stopStream(stream: MediaStream | null): void { stream?.getTracks().forEach((track) => track.stop()) }
export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection { return new RTCPeerConnection({ iceServers }) }

function parseMediaError(error: unknown): MediaPermissionError {
  if (error instanceof DOMException) {
    if (['NotAllowedError', 'PermissionDeniedError'].includes(error.name)) return { kind: 'denied', message: 'Permissão de mídia negada.' }
    if (['NotFoundError', 'DevicesNotFoundError'].includes(error.name)) return { kind: 'not-found', message: 'Dispositivo de mídia não encontrado.' }
    if (['NotReadableError', 'TrackStartError'].includes(error.name)) return { kind: 'in-use', message: 'Dispositivo de mídia em uso.' }
  }
  return { kind: 'unknown', message: 'Não foi possível acessar o dispositivo.' }
}
