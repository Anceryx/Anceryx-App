import { communityApi, type VoiceConnectionState } from '@/services/communityApi'
import { realtimeClient, type VoiceSignalEvent } from '@/services/realtimeClient'
import { detachTracksFromPeer } from '@/utils/media'
import { LocalizedUiError } from '@/utils/localizedError'

type Listener = () => void

class CommunityVoiceClient {
  private communityId: string | null = null
  private channelId: string | null = null
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private peers = new Map<string, RTCPeerConnection>()
  private remoteAudio = new Map<string, HTMLAudioElement>()
  private remoteScreenStreams = new Map<string, MediaStream>()
  private listeners = new Set<Listener>()
  private signalUnsubscribe: (() => void) | null = null
  private statusUnsubscribe: (() => void) | null = null
  private audioContext: AudioContext | null = null
  private speakingFrame: number | null = null
  private iceServers: RTCIceServer[] = []
  private pendingIce = new Map<string, RTCIceCandidateInit[]>()
  status: VoiceConnectionState = 'idle'
  muted = false
  deafened = false
  speakingUserIds = new Set<string>()
  isScreenSharing = false

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener()
    return () => this.listeners.delete(listener)
  }

  getRemoteScreenShares(): Array<{ userId: string; stream: MediaStream }> {
    return [...this.remoteScreenStreams.entries()].map(([userId, stream]) => ({ userId, stream }))
  }

  getLocalScreenShare(): MediaStream | null {
    return this.screenStream
  }

  get isLocallySpeaking(): boolean {
    return this.speakingUserIds.has('me')
  }

  removePeer(userId: string): void {
    const peer = this.peers.get(userId)
    peer?.close()
    this.peers.delete(userId)
    this.remoteAudio.get(userId)?.remove()
    this.remoteAudio.delete(userId)
    const screen = this.remoteScreenStreams.get(userId)
    screen?.getTracks().forEach((track) => track.stop())
    this.remoteScreenStreams.delete(userId)
    this.pendingIce.delete(userId)
    this.emit()
  }

  async join(communityId: string, channelId: string): Promise<void> {
    await this.leave()
    this.status = 'connecting'
    this.emit()
    let joinRequested = false
    try {
      await realtimeClient.waitUntilConnected()
      this.communityId = communityId
      this.channelId = channelId
      const config = await communityApi.getWebrtcConfig()
      this.iceServers = config.iceServers
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.setupSpeakingDetector()
      joinRequested = true
      await communityApi.joinVoice(communityId, channelId, { selfMuted: this.muted, selfDeafened: this.deafened })
      this.signalUnsubscribe = realtimeClient.subscribe('voice.signal', (event) => void this.handleSignal(event, config.iceServers))
      this.statusUnsubscribe = realtimeClient.subscribeStatus((status) => {
        if (!this.communityId || !this.channelId) return
        if (status === 'reconnecting' || status === 'disconnected') { this.status = 'reconnecting'; this.closePeers(); this.emit() }
        if (status === 'connected' && this.status === 'reconnecting') void communityApi.joinVoice(this.communityId, this.channelId, { selfMuted: this.muted, selfDeafened: this.deafened }).then(() => { this.status = 'connected'; this.emit() }).catch(() => { this.status = 'disconnected'; this.emit() })
      })
      this.status = 'connected'
      this.emit()
    } catch (error) {
      this.signalUnsubscribe?.()
      this.signalUnsubscribe = null
      this.statusUnsubscribe?.()
      this.statusUnsubscribe = null
      this.closePeers()
      this.status = error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission-denied' : 'disconnected'
      this.stopLocalTracks()
      this.stopScreenShareTracks()
      this.stopSpeakingDetector()
      this.communityId = null
      this.channelId = null
      if (joinRequested) await communityApi.leaveVoice(communityId).catch(() => undefined)
      this.emit()
      throw error
    }
  }

  async leave(): Promise<void> {
    const currentCommunity = this.communityId
    this.signalUnsubscribe?.()
    this.signalUnsubscribe = null
    this.statusUnsubscribe?.()
    this.statusUnsubscribe = null
    this.closePeers()
    this.stopLocalTracks()
    this.stopScreenShareTracks()
    this.communityId = null
    this.channelId = null
    this.speakingUserIds.clear()
    this.pendingIce.clear()
    this.stopSpeakingDetector()
    if (currentCommunity) await communityApi.leaveVoice(currentCommunity).catch(() => undefined)
    this.status = 'disconnected'
    this.emit()
  }

  async setMuted(value: boolean): Promise<void> {
    this.muted = value
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = !value })
    if (this.communityId) await communityApi.updateVoiceMe(this.communityId, { selfMuted: value }).catch(() => undefined)
    this.emit()
  }

  async setDeafened(value: boolean): Promise<void> {
    this.deafened = value
    for (const audio of this.remoteAudio.values()) audio.muted = value
    if (this.communityId) await communityApi.updateVoiceMe(this.communityId, { selfDeafened: value }).catch(() => undefined)
    this.emit()
  }

  async startScreenShare(fps: 15 | 30 | 60 = 30): Promise<void> {
    if (!this.communityId || !this.channelId) throw new LocalizedUiError('__i18n:communityVoice.channelRequiredForScreenShare')
    if (!navigator.mediaDevices?.getDisplayMedia) throw new LocalizedUiError('__i18n:calls.screenShareUnsupported')
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: fps, max: fps } }, audio: false })
    const track = this.screenStream.getVideoTracks()[0]
    track.addEventListener('ended', () => { void this.stopScreenShare() }, { once: true })
    for (const peer of this.peers.values()) {
      peer.addTrack(track, this.screenStream)
    }
    this.isScreenSharing = true
    await Promise.all([...this.peers.keys()].map((userId) => this.callPeer(userId).catch(() => undefined)))
    this.emit()
  }

  async stopScreenShare(): Promise<void> {
    const stream = this.screenStream
    this.screenStream = null
    if (!stream) return
    await Promise.all([...this.peers.values()].map((peer) => detachTracksFromPeer(peer, stream)))
    stream.getTracks().forEach((track) => track.stop())
    this.isScreenSharing = false
    await Promise.all([...this.peers.keys()].map((userId) => this.callPeer(userId).catch(() => undefined)))
    this.emit()
  }

  async callPeer(userId: string): Promise<void> {
    const peer = await this.getPeer(userId)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    this.sendSignal(userId, 'offer', offer)
  }

  private async handleSignal(event: VoiceSignalEvent, iceServers: RTCIceServer[]): Promise<void> {
    if (event.payload.communityId !== this.communityId || event.payload.channelId !== this.channelId) return
    const peer = await this.getPeer(event.payload.fromUserId, iceServers)
    if (event.payload.kind === 'offer') {
      await peer.setRemoteDescription(event.payload.data as RTCSessionDescriptionInit)
      await this.flushIce(event.payload.fromUserId, peer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      this.sendSignal(event.payload.fromUserId, 'answer', answer)
    } else if (event.payload.kind === 'answer') {
      await peer.setRemoteDescription(event.payload.data as RTCSessionDescriptionInit)
      await this.flushIce(event.payload.fromUserId, peer)
    } else {
      const candidate = event.payload.data as RTCIceCandidateInit
      if (peer.remoteDescription) await peer.addIceCandidate(candidate)
      else this.pendingIce.set(event.payload.fromUserId, [...(this.pendingIce.get(event.payload.fromUserId) ?? []), candidate])
    }
  }

  private async getPeer(userId: string, iceServers: RTCIceServer[] = this.iceServers): Promise<RTCPeerConnection> {
    const existing = this.peers.get(userId)
    if (existing) return existing
    const peer = new RTCPeerConnection({ iceServers })
    this.localStream?.getTracks().forEach((track) => this.localStream && peer.addTrack(track, this.localStream))
    this.screenStream?.getTracks().forEach((track) => this.screenStream && peer.addTrack(track, this.screenStream))
    peer.onicecandidate = (event) => { if (event.candidate) this.sendSignal(userId, 'ice', event.candidate.toJSON()) }
    peer.ontrack = (event) => {
      if (event.track.kind === 'video') {
        const stream = event.streams[0] ?? new MediaStream([event.track])
        this.remoteScreenStreams.set(userId, stream)
        event.track.addEventListener('ended', () => {
          if (this.remoteScreenStreams.get(userId) !== stream) return
          this.remoteScreenStreams.delete(userId)
          this.emit()
        }, { once: true })
        event.track.addEventListener('mute', () => {
          if (this.remoteScreenStreams.get(userId) !== stream) return
          this.remoteScreenStreams.delete(userId)
          this.emit()
        })
        event.track.addEventListener('unmute', () => {
          if (event.track.readyState !== 'ended') {
            this.remoteScreenStreams.set(userId, stream)
            this.emit()
          }
        })
        this.emit()
        return
      }
      if (event.track.kind === 'audio') {
        const audio = this.remoteAudio.get(userId) ?? document.createElement('audio')
        audio.autoplay = true
        audio.muted = this.deafened
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track])
        if (!this.remoteAudio.has(userId)) document.body.appendChild(audio)
        this.remoteAudio.set(userId, audio)
      }
    }
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.connectionState)) {
        peer.close(); this.peers.delete(userId); this.remoteAudio.get(userId)?.remove(); this.remoteAudio.delete(userId); this.remoteScreenStreams.delete(userId); this.pendingIce.delete(userId); this.emit()
      }
    }
    this.peers.set(userId, peer)
    return peer
  }

  private sendSignal(targetUserId: string, kind: 'offer' | 'answer' | 'ice', data: unknown): void {
    if (!this.communityId || !this.channelId) return
    realtimeClient.sendVoiceSignal({ communityId: this.communityId, channelId: this.channelId, targetUserId, kind, data })
  }

  private setupSpeakingDetector(): void {
    if (!this.localStream) return
    this.stopSpeakingDetector()
    const context = new AudioContext()
    this.audioContext = context
    const analyser = context.createAnalyser()
    const source = context.createMediaStreamSource(this.localStream)
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!this.localStream) { this.stopSpeakingDetector(); return }
      analyser.getByteFrequencyData(data)
      const speaking = data.reduce((sum, value) => sum + value, 0) / data.length > 18 && !this.muted
      this.speakingUserIds = speaking ? new Set(['me']) : new Set()
      this.emit()
      this.speakingFrame = requestAnimationFrame(tick)
    }
    tick()
  }

  private stopLocalTracks(): void {
    this.localStream?.getTracks().forEach((track) => track.stop())
    this.localStream = null
  }

  private stopScreenShareTracks(): void {
    this.screenStream?.getTracks().forEach((track) => track.stop())
    this.screenStream = null
    this.isScreenSharing = false
  }

  private async flushIce(userId: string, peer: RTCPeerConnection): Promise<void> {
    for (const candidate of this.pendingIce.get(userId) ?? []) await peer.addIceCandidate(candidate)
    this.pendingIce.delete(userId)
  }

  private closePeers(): void {
    for (const peer of this.peers.values()) peer.close()
    this.peers.clear()
    for (const audio of this.remoteAudio.values()) { audio.srcObject = null; audio.remove() }
    this.remoteAudio.clear()
    for (const stream of this.remoteScreenStreams.values()) stream.getTracks().forEach((track) => track.stop())
    this.remoteScreenStreams.clear()
    this.pendingIce.clear()
  }

  private stopSpeakingDetector(): void {
    if (this.speakingFrame !== null) cancelAnimationFrame(this.speakingFrame)
    this.speakingFrame = null
    if (this.audioContext) void this.audioContext.close().catch(() => undefined)
    this.audioContext = null
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const communityVoiceClient = new CommunityVoiceClient()
