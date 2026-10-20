import { communityApi } from '@/services/communityApi'
import { realtimeClient } from '@/services/realtimeClient'
import { useCallStore, getLocalStream, getScreenStream, getRemoteStream } from '@/store/callStore'
import { useUIStore } from '@/store/uiStore'
import { createPeerConnection, getDisplayMedia, getUserMedia, stopStream } from './peerConnection'

let callId: string | null = null
let remoteUserId: string | null = null
let peer: RTCPeerConnection | null = null
let iceServers: RTCIceServer[] = []
let pendingCandidates: RTCIceCandidateInit[] = []
let initialized = false
let disconnectTimer: number | null = null

async function ensureConfig(): Promise<void> { if (!iceServers.length) iceServers = (await communityApi.getWebrtcConfig()).iceServers }
function cleanup(): void {
  if (disconnectTimer !== null) window.clearTimeout(disconnectTimer)
  disconnectTimer = null
  peer?.close(); peer = null; pendingCandidates = []
  stopStream(getLocalStream()); stopStream(getScreenStream()); stopStream(getRemoteStream())
  const store = useCallStore.getState(); store.setLocalStream(null); store.setScreenStream(null); store.setRemoteStream(null)
  callId = null; remoteUserId = null
}
function failCall(): void { cleanup(); useCallStore.getState().failCall() }
async function createPeer(): Promise<RTCPeerConnection> {
  await ensureConfig()
  peer?.close()
  peer = createPeerConnection(iceServers)
  const stream = getLocalStream(); if (stream) stream.getTracks().forEach((track) => peer?.addTrack(track, stream))
  const screenStream = getScreenStream(); if (screenStream) screenStream.getTracks().forEach((track) => peer?.addTrack(track, screenStream))
  peer.onicecandidate = (event) => { if (event.candidate && callId && remoteUserId) realtimeClient.sendCallIce(callId, remoteUserId, event.candidate.toJSON()) }
  peer.ontrack = (event) => { const remote = event.streams[0] ?? getRemoteStream() ?? new MediaStream(); if (!event.streams[0]) remote.addTrack(event.track); useCallStore.getState().setRemoteStream(remote) }
  peer.onconnectionstatechange = () => {
    if (peer?.connectionState === 'connected') useCallStore.getState().connectCall()
    if (peer?.connectionState === 'disconnected') {
      if (disconnectTimer !== null) window.clearTimeout(disconnectTimer)
      disconnectTimer = window.setTimeout(() => { if (peer?.connectionState === 'disconnected') failCall() }, 5000)
    } else if (peer?.connectionState === 'connected' && disconnectTimer !== null) {
      window.clearTimeout(disconnectTimer); disconnectTimer = null
    } else if (peer?.connectionState === 'failed') failCall()
  }
  return peer
}
async function setRemote(description: RTCSessionDescriptionInit): Promise<void> {
  const current = peer ?? await createPeer(); await current.setRemoteDescription(description)
  for (const candidate of pendingCandidates.splice(0)) await current.addIceCandidate(candidate)
}
async function sendOffer(): Promise<void> {
  if (!peer || !callId || !remoteUserId) return
  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)
  realtimeClient.sendCallSdp(callId, remoteUserId, offer)
}

function ensureListeners(): void {
  if (initialized) return; initialized = true
  realtimeClient.subscribe('call.incoming', ({ payload }) => {
    if (useCallStore.getState().callStatus !== 'idle') { realtimeClient.rejectCall(payload.callId); return }
    callId = payload.callId; remoteUserId = payload.caller.id
    useCallStore.getState().receiveIncoming({ remoteUserId: payload.caller.id, remoteUserName: payload.caller.displayName, remoteAvatar: payload.caller.avatarUrl, callType: payload.callType })
  })
  realtimeClient.subscribe('call.accepted', ({ payload }) => { if (payload.callId !== callId) return; void (async () => { useCallStore.getState().acceptCall(); await createPeer(); await sendOffer() })().catch(failCall) })
  realtimeClient.subscribe('call.rejected', ({ payload }) => { if (payload.callId === callId) { cleanup(); useCallStore.getState().rejectCall() } })
  realtimeClient.subscribe('call.ended', ({ payload }) => { if (payload.callId === callId) { cleanup(); if (payload.reason === 'timeout') useCallStore.getState().timeoutCall(); else if (payload.reason === 'cancelled') useCallStore.getState().cancelCall(); else if (payload.reason === 'disconnect') useCallStore.getState().failCall(); else useCallStore.getState().endCall() } })
  realtimeClient.subscribe('call.sdp', ({ payload }) => { if (payload.callId !== callId) return; void (async () => { await setRemote(payload.description); if (payload.description.type === 'offer') { const answer = await peer!.createAnswer(); await peer!.setLocalDescription(answer); if (callId && remoteUserId) realtimeClient.sendCallSdp(callId, remoteUserId, answer) } })().catch(failCall) })
  realtimeClient.subscribe('call.ice', ({ payload }) => { if (payload.callId !== callId) return; if (!peer?.remoteDescription) pendingCandidates.push(payload.candidate); else void peer.addIceCandidate(payload.candidate).catch(failCall) })
  realtimeClient.subscribe('error', ({ payload }) => { if (callId && payload.code.startsWith('CALL_')) failCall() })
  realtimeClient.subscribeStatus((status) => { if (status === 'disconnected' && callId) { cleanup(); useCallStore.getState().failCall() } })
  window.addEventListener('beforeunload', () => { if (callId) realtimeClient.endCall(callId); cleanup() })
}

export const dmCallClient = {
  initialize: ensureListeners,
  async start(params: { remoteUserId: string; remoteUserName: string; remoteAvatar: string | null; callType: 'voice' | 'video' }) {
    ensureListeners(); cleanup(); await Promise.all([ensureConfig(), realtimeClient.waitUntilConnected()])
    const media = await getUserMedia(params.callType); if ('error' in media) throw new Error(media.error.message)
    callId = crypto.randomUUID(); remoteUserId = params.remoteUserId
    const store = useCallStore.getState(); store.setLocalStream(media.stream); store.startOutgoing(params)
    realtimeClient.initiateCall(callId, params.remoteUserId, params.callType)
  },
  async accept() {
    if (!callId) return; const store = useCallStore.getState(); const media = await getUserMedia(store.callType ?? 'voice'); if ('error' in media) throw new Error(media.error.message)
    store.setLocalStream(media.stream); store.acceptCall(); await createPeer(); realtimeClient.acceptCall(callId)
  },
  reject() { if (callId) realtimeClient.rejectCall(callId); cleanup(); useCallStore.getState().rejectCall() },
  end() { const status = useCallStore.getState().callStatus; if (callId) realtimeClient.endCall(callId); cleanup(); if (status === 'outgoing' || status === 'connecting') useCallStore.getState().cancelCall(); else useCallStore.getState().endCall() },
  toggleMic() { useCallStore.getState().toggleMic(getLocalStream()) },
  toggleCam() { useCallStore.getState().toggleCam(getLocalStream()) },
  async replaceLocalStream(stream: MediaStream) {
    const previous = getLocalStream()
    let addedTrack = false
    if (peer) {
      for (const track of stream.getTracks()) {
        const sender = peer.getSenders().find((item) => item.track?.kind === track.kind)
        if (sender) await sender.replaceTrack(track)
        else { peer.addTrack(track, stream); addedTrack = true }
      }
    }
    useCallStore.getState().setLocalStream(stream)
    stopStream(previous)
    if (addedTrack) await sendOffer()
  },
  async toggleScreen() {
    const store = useCallStore.getState()
    if (store.screenEnabled) {
      const screen = getScreenStream()
      const tracks = screen?.getTracks() ?? []
      for (const track of tracks) {
        const sender = peer?.getSenders().find((item) => item.track === track)
        if (sender && peer) peer.removeTrack(sender)
      }
      stopStream(screen)
      store.setScreenStream(null)
      store.toggleScreen(null)
      await sendOffer()
      return
    }
    const media = await getDisplayMedia()
    if ('error' in media) {
      useUIStore.getState().addNotification(media.error.message, 'error')
      return
    }
    store.setScreenStream(media.stream)
    store.toggleScreen(media.stream)
    const track = media.stream.getVideoTracks()[0]
    if (track && peer) {
      peer.addTrack(track, media.stream)
      await sendOffer()
    }
    track?.addEventListener('ended', () => void dmCallClient.toggleScreen(), { once: true })
  },
}
