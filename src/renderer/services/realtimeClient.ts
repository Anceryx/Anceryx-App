import { API_BASE_URL } from '@/services/mediaApi'
import type { DirectMessageDto } from '@/services/messagesApi'
import type { CommunityVoiceRealtimePayload } from '@/utils/communityVoiceRealtime'
import { RealtimeTransport, type RealtimeSocketLike, type TransportStatus } from './realtimeTransport'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface RealtimeUserDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isOfficial?: boolean
}

export interface RealtimePostDto {
  id: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  editedAt: string | Date | null
  author: RealtimeUserDto
  likeCount: number
  commentCount: number
  viewerHasLiked: boolean
  viewerHasSaved?: boolean
  isPinnedToProfile?: boolean
  mediaUrl: string | null
  mediaType: 'image' | 'gif' | 'video' | null
  mediaWidth: number | null
  mediaHeight: number | null
}

export interface RealtimeCommentDto {
  id: string
  postId: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  editedAt: string | Date | null
  author: RealtimeUserDto
}

export interface RealtimeForumTopicDto {
  id: string
  forumId: string
  authorUserId: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  isResolved: boolean
  createdAt: string | Date
  updatedAt: string | Date
  editedAt: string | Date | null
}

export interface RealtimeForumReplyDto {
  id: string
  forumId: string
  topicId: string
  authorUserId: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  editedAt: string | Date | null
}

export interface RealtimeCommunityMessageDto {
  id: string
  communityId: string
  channelId: string
  authorUserId: string
  content: string
  contentType: 'text' | 'gif' | 'sticker'
  stickerKey: string | null
  mediaUrl: string | null
  createdAt: string | Date
  author: RealtimeUserDto
  replyTo: { messageId: string; author: Pick<RealtimeUserDto, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null; excerpt: string | null; deleted: boolean } | null
}

export type RealtimeVoiceStateDto = CommunityVoiceRealtimePayload

export interface RealtimeModerationNoticeDto {
  noticeId: string
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface VoiceSignalPayload {
  communityId: string
  channelId: string
  fromUserId: string
  kind: 'offer' | 'answer' | 'ice'
  data: unknown
}

export type VoiceSignalEvent = { type: 'voice.signal'; payload: VoiceSignalPayload }

export type RealtimeEvent =
  | { type: 'connection.ready'; payload: { userId: string; presence: Array<{ userId: string; status: 'online' | 'offline' }> } }
  | { type: 'presence.updated'; payload: { userId: string; status: 'online' | 'offline' } }
  | { type: 'dm.message.created'; payload: DirectMessageDto }
  | { type: 'dm.typing.updated'; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: 'moderation.notice.created'; payload: RealtimeModerationNoticeDto }
  | { type: 'post.created'; payload: RealtimePostDto }
  | { type: 'post.updated'; payload: RealtimePostDto }
  | { type: 'post.deleted'; payload: { postId: string } }
  | { type: 'post.like.updated'; payload: { postId: string; userId: string; liked: boolean; likeCount: number } }
  | { type: 'post.comment.created'; payload: RealtimeCommentDto }
  | { type: 'post.comment.updated'; payload: RealtimeCommentDto }
  | { type: 'post.comment.deleted'; payload: { postId: string; commentId: string } }
  | { type: 'forum.topic.created'; payload: RealtimeForumTopicDto }
  | { type: 'forum.topic.updated'; payload: RealtimeForumTopicDto }
  | { type: 'forum.topic.deleted'; payload: { forumId: string; topicId: string } }
  | { type: 'forum.topic.state.updated'; payload: { forumId: string; topicId: string; flag: 'isPinned' | 'isLocked' | 'isResolved'; value: boolean } }
  | { type: 'forum.reply.created'; payload: RealtimeForumReplyDto }
  | { type: 'forum.reply.updated'; payload: RealtimeForumReplyDto }
  | { type: 'forum.reply.deleted'; payload: { forumId: string; topicId: string; replyId: string } }
  | { type: 'community.message.created'; payload: RealtimeCommunityMessageDto }
  | { type: 'community.audit.updated'; payload: { communityId: string } }
  | { type: 'voice.user.joined'; payload: RealtimeVoiceStateDto }
  | { type: 'voice.user.left'; payload: { communityId: string; channelId: string; userId: string } }
  | { type: 'voice.state.updated'; payload: RealtimeVoiceStateDto }
  | VoiceSignalEvent
  | { type: 'call.incoming'; payload: { callId: string; caller: RealtimeUserDto; callType: 'voice' | 'video' } }
  | { type: 'call.accepted'; payload: { callId: string; userId: string } }
  | { type: 'call.rejected'; payload: { callId: string; userId: string } }
  | { type: 'call.ended'; payload: { callId: string; userId: string; reason: 'ended' | 'cancelled' | 'disconnect' | 'timeout' } }
  | { type: 'call.sdp'; payload: { callId: string; fromUserId: string; description: RTCSessionDescriptionInit } }
  | { type: 'call.ice'; payload: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit } }
  | { type: 'notification.created'; payload: { id: string; type: 'post.comment' | 'post.reaction' | 'forum.reply' | 'post.created' | 'follow.new' | 'follow.request' | 'follow.accepted' | 'forum.event_reminder' | 'forum.moderation.case' | 'forum.appeal' | 'badge.awarded'; actorUserId: string; resourceId: string; createdAt: string } }
  | { type: 'error'; payload: { code: string; message: string } }

type Listener<T extends RealtimeEvent['type']> = (event: Extract<RealtimeEvent, { type: T }>) => void
type StatusListener = (status: RealtimeStatus) => void

class RealtimeClient {
  private token: string | null = null
  private status: RealtimeStatus = 'idle'
  private readonly listeners = new Map<RealtimeEvent['type'], Set<(event: RealtimeEvent) => void>>()
  private readonly statusListeners = new Set<StatusListener>()
  private readonly transport = new RealtimeTransport(
    API_BASE_URL.replace(/^http/, 'ws'),
    (url, protocols) => new WebSocket(url, protocols) as unknown as RealtimeSocketLike,
    (data) => this.handleMessage(data),
    (status: TransportStatus) => this.setStatus(status),
  )

  connect(token: string | null): void {
    if (!token) {
      this.disconnect()
      return
    }
    this.token = token
    this.transport.connect(token)
  }

  disconnect(): void {
    this.token = null
    this.transport.disconnect()
  }

  subscribe<T extends RealtimeEvent['type']>(type: T, listener: Listener<T>): () => void {
    const set = this.listeners.get(type) ?? new Set<(event: RealtimeEvent) => void>()
    set.add(listener as (event: RealtimeEvent) => void)
    this.listeners.set(type, set)
    return () => {
      set.delete(listener as (event: RealtimeEvent) => void)
      if (set.size === 0) this.listeners.delete(type)
    }
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  getStatus(): RealtimeStatus {
    return this.status
  }

  waitUntilConnected(timeoutMs = 10_000): Promise<void> {
    if (this.status === 'connected') return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => { unsubscribe(); reject(new Error('Realtime indisponivel.')) }, timeoutMs)
      const unsubscribe = this.subscribeStatus((status) => {
        if (status !== 'connected') return
        window.clearTimeout(timeout)
        unsubscribe()
        resolve()
      })
    })
  }

  sendTypingStart(conversationId: string): void {
    this.send({ type: 'dm.typing.start', payload: { conversationId } })
  }

  sendTypingStop(conversationId: string): void {
    this.send({ type: 'dm.typing.stop', payload: { conversationId } })
  }

  sendVoiceSignal(payload: {
    communityId: string
    channelId: string
    targetUserId: string
    kind: 'offer' | 'answer' | 'ice'
    data: unknown
  }): void {
    this.send({ type: 'voice.signal', payload })
  }

  initiateCall(callId: string, targetUserId: string, callType: 'voice' | 'video'): void { this.send({ type: 'call.initiate', payload: { callId, targetUserId, callType } }) }
  acceptCall(callId: string): void { this.send({ type: 'call.accept', payload: { callId } }) }
  rejectCall(callId: string): void { this.send({ type: 'call.reject', payload: { callId } }) }
  endCall(callId: string): void { this.send({ type: 'call.end', payload: { callId } }) }
  sendCallSdp(callId: string, targetUserId: string, description: RTCSessionDescriptionInit): void { this.send({ type: 'call.sdp', payload: { callId, targetUserId, description } }) }
  sendCallIce(callId: string, targetUserId: string, candidate: RTCIceCandidateInit): void { this.send({ type: 'call.ice', payload: { callId, targetUserId, candidate } }) }

  private send(payload: unknown): void {
    this.transport.send(JSON.stringify(payload))
  }

  private handleMessage(data: string): void {
    let parsed: RealtimeEvent
    try {
      parsed = JSON.parse(data) as RealtimeEvent
      if (!parsed || typeof parsed.type !== 'string') return
    } catch {
      return
    }
    this.listeners.get(parsed.type)?.forEach((listener) => {
      try { listener(parsed) } catch { /* One consumer must not block other realtime listeners. */ }
    })
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return
    this.status = status
    this.statusListeners.forEach((listener) => {
      try { listener(status) } catch { /* One consumer must not block other status listeners. */ }
    })
  }
}

export const realtimeClient = new RealtimeClient()
